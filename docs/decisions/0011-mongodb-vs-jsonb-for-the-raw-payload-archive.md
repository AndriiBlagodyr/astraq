# ADR 0011: MongoDB vs Postgres JSONB for the raw payload archive

- Status: Accepted
- Date: 2026-11-25

## Context

Ingestion reads a provider's answer, turns it into bars and corporate actions, and throws the answer away. When a stored bar later looks wrong there is nothing left to say whether the provider sent it or the adapter misread it, and a fixed adapter can't be run over what it got wrong. Phase 4 item 7 keeps the answers: an append-only archive of raw provider responses, expiring after a while, that can be replayed through the normalizer. Its exit criterion is that replaying one archived payload reproduces the stored bars exactly.

The roadmap planned this as the place MongoDB enters, through a second Prisma client, and asked for this ADR to compare it honestly with a `JSONB` column in the Postgres that is already there: "if JSONB wins, drop Mongo and say so".

What the archive holds decides most of it:

- **Write once, read rarely.** A few documents per job, a few megabytes a day for a real universe. Nothing serves a request from it.
- **No fixed shape.** Alpaca's bars page, Alpaca's corporate actions, and Yahoo's chart response have nothing in common, and each changes when its owner changes it.
- **Exact text matters.** The adapters read prices out of the response's text so that no number passes through a float (ADR 0010). A replay has to read the same text.
- **It expires.** Old answers are worth nothing once the bars they produced have been checked a few hundred times by use.

### Options considered

| Option | Verdict |
|---|---|
| **MongoDB, one collection, the official `mongodb` driver** | **Chosen**, for reasons that are only partly technical (section 1). |
| A `raw_payloads` table in Postgres with a `jsonb` column | Would work, and is the smaller system. Not chosen; section 1 says what it does better. |
| MongoDB through Prisma's MongoDB connector | What the roadmap planned. Not possible on the Prisma in use (section 2). |
| MongoDB through Mongoose | Its value is schemas and models over documents. The archive has one envelope and a body with no schema on purpose. |
| Files in object storage (S3, R2), one per response | The right home for large write-once blobs at scale. Another service and no query at all; nothing here is large enough to need it. |

## Decision

### 1. MongoDB, and what JSONB would have done better

Compared on the archive alone:

| | Postgres `jsonb` | MongoDB |
|---|---|---|
| New moving parts | None | A database to run, back up, and deploy |
| Exact numbers | `jsonb` stores a number as `numeric`: `412.105` stays `412.105` | A JSON number becomes a double. Exactness needs `Decimal128`, which no provider's JSON maps to by itself |
| Expiry | A scheduled `DELETE`, or a hypertable with a retention policy | A TTL index: the database deletes a document when the date in a field has passed |
| Shape that varies | Fine | Fine |
| Query inside the body | `->`, `@>`, a GIN index | Dotted paths, a multikey index |
| Join to the bars it produced | In one query | In application code |
| Where the bytes go | Into the transactional database: its backups, its WAL, its cache | Somewhere else |

JSONB wins the first two rows and the join, MongoDB wins expiry by a little and the last row. **On technical merit alone the archive belongs in Postgres**, and a team that wanted only an archive should put it there.

It goes to MongoDB anyway, for two reasons that are this project's:

- **Learning a document database is a stated goal** (`AGENTS.md`, mission 1), and this is the smallest real workload to learn it on: an envelope to design, indexes to choose, a TTL, an aggregation. Phase 6 brings news and possibly the research journal, which are better fits; arriving there with MongoDB already running and understood is worth more than arriving with a table.
- **The archive is the one dataset that can be lost.** Keeping it out of Postgres keeps megabytes of write-once text out of the database whose backups and restore time matter (Phase 3 item 8, Phase 10's restore drill).

The cost is accepted with open eyes: one more service. To keep that cost from becoming a dependency, **MongoDB is optional everywhere** (section 5). If it turns out to be a burden in production, the archive is switched off by removing one variable, and moving it to a `jsonb` table is a change behind one class (`RawArchive`).

The exact-number row is handled by not relying on MongoDB for it: the response's text is stored as a string and that is what a replay reads (section 3).

### 2. The official driver, not Prisma

The roadmap said "check that the Prisma major in use supports MongoDB before Phase 4 starts". It doesn't. Prisma 7 runs every query through a driver adapter (`@prisma/adapter-pg` here), and there is none for MongoDB: with 7.10 a `provider = "mongodb"` schema validates and generates a client, and the client then imports a query compiler (`query_compiler_fast_bg.mongodb`) that the package doesn't ship. MongoDB support returns in Prisma 8, which is a release candidate today.

So the archive uses the `mongodb` package directly (`apps/api/src/market-data/archive/raw-archive.ts`). For this collection little is lost. Prisma never had migrations for MongoDB, so the indexes would have been created by hand either way, and a model can't describe a body whose point is to have no model. What the driver gives up is one query style across both databases; with one collection and four operations that is not much.

The 2026-10-03 decision "Prisma everywhere on the Node side" now reads: Prisma for Postgres. Revisit when Prisma 8 is stable and Phase 6 adds collections with real shapes.

### 3. The document

One document per HTTP answer, in `raw_payloads`:

```js
{
  v: 1,                                  // the envelope's version
  provider: "alpaca",
  capture: {                             // the call this answered
    id: "0c7d…",                         // one per call on the provider contract
    seq: 0,                              // the answer's place in it (pages)
    operation: "dailyBars",
    tickers: ["AAPL", "NVDA"],
    from: "2026-11-19", to: "2026-11-24",
    clock: ISODate(…)                    // the time the adapter built its URLs with
  },
  request:  { url: "https://data.alpaca.markets/v2/stocks/bars?…" },
  response: { status: 200, bytes: 18234, body: "{\"bars\":{…" },
  payload:  { bars: { AAPL: [ … ] }, next_page_token: null },
  fetchedAt: ISODate(…),
  expiresAt: ISODate(…)
}
```

- **The envelope is fixed and versioned; `payload` is whatever came.** That is the "schema varies by provider and version" of the roadmap: the part we own has a version number, the part we don't has no schema.
- **The body is stored twice.** `response.body` is the text, byte for byte, and is what a replay parses. `payload` is the same thing as a document, to look at in Mongo Express and to query (`{"payload.bars.AAPL": {$exists: true}}`); its numbers are doubles and nothing computes with them. A body over half the 16 MB document limit keeps only its text; one over the limit is not archived and a warning says so.
- **An answer is archived with its question.** The tickers and range live several calls above the `fetch` that gets the bytes. They reach it through an `AsyncLocalStorage` scope (`provider/capture.ts`) opened by `IngestionService` around each call on the contract, so no adapter knows it is being archived.
- **Every answer is kept, failures included.** A 429 or a 403 with its body is exactly what one wants to read afterwards.
- **Request headers are not stored**: Alpaca's keys travel there. No URL carries a secret.

Indexes, created on first use (`createIndexes` does nothing when they exist):

- `{ expiresAt: 1 }` with `expireAfterSeconds: 0`: the TTL. Each document carries its own expiry (`fetchedAt` + `RAW_ARCHIVE_DAYS`, 90 by default), so changing the setting affects new documents only.
- `{ "capture.id": 1, "capture.seq": 1 }`, unique: one capture in order.
- `{ "capture.tickers": 1, fetchedAt: -1 }`: multikey, one entry per ticker, for "what did we get for AAPL lately".

### 4. Append-only, and replay

The code inserts and reads; MongoDB's TTL task deletes. Nothing updates. That is a convention of one class, not a permission: the local MongoDB has no users. A deployed one should give the api a role with `insert` and `find` only.

`pnpm --filter @astraq/api archive replay <capture id>` builds the adapter that made the capture, gives it a `fetch` that answers from the archived exchanges and the capture's clock, calls the contract with the capture's tickers and range, and compares the rows with the stored ones field by field, as decimals. It is the contract tests' replay (`provider/fixtures.ts`) pointed at production's recordings instead of a fixture. It writes nothing.

Two things about it are worth knowing:

- **A capture is replayed whole, not one document at a time.** Yahoo needs two responses to produce one series (the bars, and the splits since), and Alpaca pages. The unit that reproduces rows is the call.
- **A difference isn't always a fault.** The database holds the latest answer for a session and the archive holds every answer. A bar the provider corrected the next day differs from the capture made before the correction, and should.

### 5. Optional, and never in the way

- `MONGODB_URL` unset means no archive: `NoRawArchive` runs the provider call as if nothing wrapped it. Development defaults to the MongoDB in compose; tests and production archive only when told to.
- A write is not awaited until the call ends, the driver gives up finding a server after three seconds, and a failed write is a warning in the log. **A MongoDB that is down never fails a job.**
- The api server connects on the first write, not at boot.

## Consequences

- A fifth piece of infrastructure locally (`mongo`, and `mongo-express` on <http://localhost:8081>), and an optional one to deploy. Backups of it are deliberately not planned: it expires by itself.
- The archive costs each ingestion call one string copy per response and an insert. A ten-year backfill of one symbol is about 300 kB archived.
- `payload` doubles the stored size. If that matters at a real universe's volume, drop it: nothing reads it but people.
- A replay needs the adapter as it is now. An adapter changed since a capture replays with today's reading of the old answer, which is the point when the change was a fix and a surprise when it wasn't.
- Rows are still written only by ingestion. A replay that writes (re-normalising a range after an adapter fix) is not built; when it is needed it belongs in `IngestionService`, fed by `replay`.
- The comparison in section 1 stays true: if MongoDB gains no second use by the end of Phase 6, move the archive to a `jsonb` table and remove the service.
