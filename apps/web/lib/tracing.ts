import { context, propagation, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, TracerProvider } from "@opentelemetry/sdk-trace";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { env } from "./env";

// OpenTelemetry tracing for the web server (ROADMAP Phase 3 item 7), the
// twin of apps/api/src/tracing.ts. Node only: instrumentation.ts imports it
// when the server starts, never the browser and never the edge runtime.
//
// Next.js makes the spans for a request, its rendering, and its server
// actions once a tracer provider is registered. What this adds is the hop
// to the api: `fetch` in Node is undici, and its instrumentation makes a
// span per call and writes the `traceparent` header, which the api reads.
// So one trace runs from the browser's request through the action and the
// api's handler to each SQL statement.
//
// Off without `OTEL_EXPORTER_OTLP_ENDPOINT` (lib/env.ts gives it a local
// default in development).

export function startTracing(): void {
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  context.setGlobalContextManager(new AsyncLocalStorageContextManager());
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  trace.setGlobalTracerProvider(
    new TracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "veracand-web",
        ...(env.COMMIT_SHA && { [ATTR_SERVICE_VERSION]: env.COMMIT_SHA }),
      }),
      spanProcessors: [
        new BatchSpanProcessor({
          exporter: new OTLPTraceExporter({
            url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
          }),
        }),
      ],
    })
  );

  registerInstrumentations({
    instrumentations: [
      // Only calls made while serving a request: not the exporter's own
      // posts, and not the health polling behind /status.
      new UndiciInstrumentation({ requireParentforSpans: true }),
    ],
  });
}
