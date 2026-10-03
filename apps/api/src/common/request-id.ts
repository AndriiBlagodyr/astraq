import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const REQUEST_ID_HEADER = 'x-request-id';

// The id lands in every log line, so a caller-supplied value must be short
// and plain: no spaces, newlines, or control characters.
const SAFE_REQUEST_ID = /^[\w.-]{1,128}$/;

/**
 * Reuses the caller's `x-request-id` when it is safe, otherwise makes a new
 * one, and echoes it on the response so a client can quote it in a bug report
 * and find the matching log lines.
 */
export function assignRequestId(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming)
      ? incoming
      : randomUUID();

  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}
