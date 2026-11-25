import { Logger, type OnModuleDestroy } from '@nestjs/common';
import { type Collection, type Document, MongoClient } from 'mongodb';
import type { ProviderName } from '../provider/market-data-provider';
import {
  type CaptureCall,
  type CapturedExchange,
  capturing,
} from '../provider/capture';

// The raw payload archive (ROADMAP Phase 4 item 7, ADR 0011): every answer
// a provider gave to ingestion, as it came, kept for a while.
//
// What it is for: when a stored bar looks wrong, the answer it was read
// from says whether the provider sent it or the adapter misread it, and
// `archive replay` runs the adapter over that answer again. It is not a
// source of truth and nothing reads it to serve a request.

/**
 * One archived answer, as stored in the `raw_payloads` collection.
 *
 * The envelope is the same for every provider; `payload` is whatever the
 * provider sent, parsed, and has no schema here: it differs by provider
 * and changes when they change it. It is there to look at and to query
 * (`{"payload.bars.AAPL": {$exists: true}}`). Its numbers are doubles, so
 * the replay reads `response.body`, the text they were parsed from.
 */
export type RawPayloadDocument = {
  /** The envelope's version: raise it when these fields change meaning. */
  v: 1;
  provider: ProviderName;
  /** The call on the provider contract this answered, and its place in it. */
  capture: {
    id: string;
    seq: number;
    operation: CaptureCall['operation'];
    tickers: string[];
    from: string;
    to: string;
    /** The clock the adapter built its requests with. */
    clock: Date;
  };
  request: { url: string };
  response: { status: number; bytes: number; body: string };
  /** The body as a document, or null when it isn't JSON or is too large. */
  payload: Document | null;
  fetchedAt: Date;
  /** When MongoDB deletes it (a TTL index; see `MongoRawArchive`). */
  expiresAt: Date;
};

/** One call's worth of the archive, for a list. */
export type CaptureSummary = {
  id: string;
  provider: ProviderName;
  operation: CaptureCall['operation'];
  tickers: string[];
  from: string;
  to: string;
  fetchedAt: Date;
  exchanges: number;
  bytes: number;
  statuses: number[];
};

/**
 * Where ingestion keeps what the provider answered. The class is the DI
 * token; `MongoRawArchive` is the real one and `NoRawArchive` stands in
 * where no MongoDB is configured (`raw-archive.module.ts`).
 */
export abstract class RawArchive {
  /** Whether anything is kept at all. */
  abstract readonly enabled: boolean;

  /**
   * Runs one call on the provider contract and archives every answer it
   * got. Resolves or rejects exactly as `work` does: a failure to archive
   * is logged and never reaches the caller, and what was answered before a
   * failed call is kept like any other.
   */
  abstract capture<Result>(
    call: CaptureCall,
    work: () => Promise<Result>,
  ): Promise<Result>;

  /** The newest captures, optionally only those that asked for `ticker`. */
  abstract captures(filter: {
    ticker?: string;
    limit: number;
  }): Promise<CaptureSummary[]>;

  /** A capture's exchanges in the order they were made; empty if unknown. */
  abstract exchanges(captureId: string): Promise<CapturedExchange[]>;
}

/** Keeps nothing: provider calls run as if there were no archive. */
export class NoRawArchive extends RawArchive {
  readonly enabled = false;

  capture<Result>(_call: CaptureCall, work: () => Promise<Result>) {
    return work();
  }

  async captures(): Promise<CaptureSummary[]> {
    return [];
  }

  async exchanges(): Promise<CapturedExchange[]> {
    return [];
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** MongoDB refuses a document over 16 MB; the envelope needs a little. */
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

/** The document an exchange is stored as. Exported for the tests. */
export function toDocument(
  exchange: CapturedExchange,
  keepDays: number,
): RawPayloadDocument | null {
  const bytes = Buffer.byteLength(exchange.body);
  if (bytes > MAX_DOCUMENT_BYTES) return null;
  return {
    v: 1,
    provider: exchange.provider,
    capture: {
      id: exchange.captureId,
      seq: exchange.seq,
      operation: exchange.call.operation,
      tickers: exchange.call.tickers,
      from: exchange.call.range.from,
      to: exchange.call.range.to,
      clock: exchange.clock,
    },
    request: { url: exchange.url },
    response: { status: exchange.status, bytes, body: exchange.body },
    // Stored twice, as text and as a document, so only when both fit.
    payload: bytes * 2 > MAX_DOCUMENT_BYTES ? null : asDocument(exchange.body),
    fetchedAt: exchange.fetchedAt,
    expiresAt: new Date(exchange.fetchedAt.getTime() + keepDays * DAY_MS),
  };
}

function asDocument(body: string): Document | null {
  try {
    const parsed: unknown = JSON.parse(body);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function toExchange(document: RawPayloadDocument): CapturedExchange {
  const { capture } = document;
  return {
    provider: document.provider,
    captureId: capture.id,
    seq: capture.seq,
    call: {
      operation: capture.operation,
      tickers: capture.tickers,
      range: { from: capture.from, to: capture.to },
    },
    clock: capture.clock,
    url: document.request.url,
    status: document.response.status,
    body: document.response.body,
    fetchedAt: document.fetchedAt,
  };
}

/**
 * The archive in MongoDB, on the official driver (ADR 0011 says why not
 * Prisma). One collection, and two operations on it: insert, and the
 * delete MongoDB does itself when a document's `expiresAt` passes. Nothing
 * here updates or removes a document, which is what append-only means
 * without a database user to enforce it.
 *
 * It connects on the first write, not at boot, and a write is not waited
 * for until the capture ends: a MongoDB that is down costs ingestion a few
 * seconds and a warning, never a failed job.
 */
export class MongoRawArchive extends RawArchive implements OnModuleDestroy {
  readonly enabled = true;
  private readonly logger = new Logger(MongoRawArchive.name);
  private readonly client: MongoClient;
  private collection: Promise<Collection<RawPayloadDocument>> | null = null;
  private readonly writes = new Set<Promise<void>>();

  constructor(
    url: string,
    /** How long an answer is kept. */
    private readonly keepDays: number,
  ) {
    super();
    // Three seconds to find the server, not the driver's thirty: nothing
    // that archives should wait that long to learn it can't.
    this.client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
  }

  async capture<Result>(
    call: CaptureCall,
    work: () => Promise<Result>,
  ): Promise<Result> {
    try {
      return await capturing(call, (exchange) => this.keep(exchange), work);
    } finally {
      // A CLI exits right after its last call: the writes must be over.
      await Promise.all(this.writes);
    }
  }

  private keep(exchange: CapturedExchange): void {
    const document = toDocument(exchange, this.keepDays);
    if (document === null) {
      this.logger.warn(`Not archived, too large: ${exchange.url}`);
      return;
    }
    const write = this.ready()
      .then((collection) => collection.insertOne(document))
      .then(
        () => undefined,
        (error: unknown) => {
          this.logger.warn(
            `Not archived: ${exchange.url}: ` +
              (error instanceof Error ? error.message : String(error)),
          );
        },
      )
      .finally(() => this.writes.delete(write));
    this.writes.add(write);
  }

  /**
   * The collection, with its indexes made once per process. `createIndex`
   * does nothing when the index is already there, so this is the whole
   * migration story: there is no schema to migrate.
   *
   * - `expiresAt` with `expireAfterSeconds: 0` is the TTL index: MongoDB's
   *   background task (it runs every minute) deletes a document once the
   *   date in that field has passed.
   * - `capture.id, capture.seq` reads one capture in order, and being
   *   unique keeps a retried insert from storing an answer twice.
   * - `capture.tickers, fetchedAt` is a multikey index: one entry per
   *   ticker in the array, so "what did we get for AAPL lately" doesn't
   *   scan every batch.
   */
  private ready(): Promise<Collection<RawPayloadDocument>> {
    if (this.collection === null) {
      const opening = (async () => {
        const collection = this.client
          .db()
          .collection<RawPayloadDocument>('raw_payloads');
        await collection.createIndexes([
          { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
          { key: { 'capture.id': 1, 'capture.seq': 1 }, unique: true },
          { key: { 'capture.tickers': 1, fetchedAt: -1 } },
        ]);
        return collection;
      })();
      this.collection = opening;
      // A failed connection isn't kept: the next write tries again.
      opening.catch(() => {
        if (this.collection === opening) this.collection = null;
      });
    }
    return this.collection;
  }

  async captures(filter: {
    ticker?: string;
    limit: number;
  }): Promise<CaptureSummary[]> {
    const collection = await this.ready();
    const rows = await collection
      .aggregate<Omit<CaptureSummary, 'id'> & { _id: string }>([
        ...(filter.ticker ? [{ $match: { 'capture.tickers': filter.ticker } }] : []),
        { $sort: { 'capture.id': 1, 'capture.seq': 1 } },
        {
          $group: {
            _id: '$capture.id',
            provider: { $first: '$provider' },
            operation: { $first: '$capture.operation' },
            tickers: { $first: '$capture.tickers' },
            from: { $first: '$capture.from' },
            to: { $first: '$capture.to' },
            fetchedAt: { $first: '$fetchedAt' },
            exchanges: { $sum: 1 },
            bytes: { $sum: '$response.bytes' },
            statuses: { $addToSet: '$response.status' },
          },
        },
        { $sort: { fetchedAt: -1 } },
        { $limit: filter.limit },
      ])
      .toArray();
    return rows.map(({ _id, ...row }) => ({ id: _id, ...row }));
  }

  async exchanges(captureId: string): Promise<CapturedExchange[]> {
    const collection = await this.ready();
    const documents = await collection
      .find({ 'capture.id': captureId }, { projection: { payload: 0 } })
      .sort({ 'capture.seq': 1 })
      .toArray();
    return documents.map(toExchange);
  }

  /** Deletes everything archived. For the tests. */
  async clear(): Promise<void> {
    await (await this.ready()).deleteMany({});
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.writes);
    await this.client.close();
  }
}
