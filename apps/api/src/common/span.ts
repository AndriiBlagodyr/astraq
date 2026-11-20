import { HttpException, Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
} from '@opentelemetry/api';

// Spans the api makes itself, beside the ones the instrumentations make
// (src/tracing.ts). This file needs only the OpenTelemetry API: without a
// tracer provider, in tests and the CLIs, every call here is a no-op.

const tracer = trace.getTracer('veracand-api');

/**
 * Runs `work` inside a span named `name`, so the SQL and anything else it
 * starts are the span's children. The span ends when `work` settles.
 *
 * A failure is recorded on the span. It marks the span as an error unless
 * it is a 4xx the api chose to answer with: a refused order is an outcome,
 * and a trace view that paints it red would hide the real failures.
 */
export function inSpan<T>(
  name: string,
  attributes: Attributes,
  work: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await work(span);
    } catch (error) {
      const refused = error instanceof HttpException && error.getStatus() < 500;
      if (error instanceof Error) span.recordException(error);
      if (!refused) span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Sends the spans still in the batch when the app shuts down, after the
 * last request has finished: a redeploy would otherwise drop the final
 * seconds of every trace. Nothing to do when tracing is off.
 */
@Injectable()
export class TracingShutdown implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    // The global provider is a proxy in front of the SDK's, when there is one.
    const proxy = trace.getTracerProvider() as { getDelegate?: () => unknown };
    const provider = proxy.getDelegate?.() as
      | { shutdown?: () => Promise<void> }
      | undefined;
    await provider?.shutdown?.();
  }
}
