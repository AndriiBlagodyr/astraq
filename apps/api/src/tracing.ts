import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
  ExpressInstrumentation,
  ExpressLayerType,
} from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { env } from './common/env';
import { REQUEST_ID_HEADER } from './common/request-id';

// OpenTelemetry tracing for the api (ROADMAP Phase 3 item 7), wired by hand
// from the SDK's parts instead of `sdk-node`, so each part is visible:
//
// - a tracer provider that batches finished spans to an OTLP endpoint
//   (Jaeger locally, `pnpm infra:up`);
// - a context manager (AsyncLocalStorage), which is what makes a span the
//   parent of whatever its async work starts;
// - the W3C propagator, which reads the web's `traceparent` header so the
//   api's spans join the trace the browser's request began;
// - three instrumentations: `http` (a span per request), `express` (names it
//   by its route), and `pg` (a span per SQL statement Prisma's driver runs).
//
// `main.ts` imports this file before anything else: an instrumentation
// patches a module when it is first required, and Nest, Express, and `pg`
// are all required by the imports that follow. The CLIs (bootstrap, the
// syncs, the OpenAPI emit) don't import it and aren't traced.
//
// Off without `OTEL_EXPORTER_OTLP_ENDPOINT` (env.ts gives it a local default
// in development). Spans made through `@opentelemetry/api` are then no-ops.

if (env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager());
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  trace.setGlobalTracerProvider(
    new TracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'veracand-api',
        ...(env.COMMIT_SHA && { [ATTR_SERVICE_VERSION]: env.COMMIT_SHA }),
      }),
      spanProcessors: [
        new BatchSpanProcessor({
          exporter: new OTLPTraceExporter({
            url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
          }),
        }),
      ],
    }),
  );

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation({
        // Probes arrive every few seconds and say nothing.
        ignoreIncomingRequestHook: (request) =>
          request.url?.startsWith('/health') ?? false,
        // The id the logs carry (request-id.ts), so a trace leads to its
        // log lines and a log line to its trace.
        applyCustomAttributesOnSpan: (span, _request, response) => {
          if (!('getHeader' in response)) return;
          const id = response.getHeader(REQUEST_ID_HEADER);
          if (typeof id === 'string') span.setAttribute('http.request.id', id);
        },
      }),
      // Kept for the route in the request span's name; a span per
      // middleware and router layer is noise around the one that matters.
      new ExpressInstrumentation({
        ignoreLayersType: [
          ExpressLayerType.MIDDLEWARE,
          ExpressLayerType.ROUTER,
          ExpressLayerType.REQUEST_HANDLER,
        ],
      }),
      // Only inside a request: the pool's own housekeeping isn't a trace.
      new PgInstrumentation({ requireParentSpan: true }),
    ],
  });
}
