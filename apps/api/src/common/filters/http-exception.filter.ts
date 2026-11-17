import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Problem, ValidationIssue } from '@astraq/shared';
import type { Request, Response } from 'express';
import {
  ZodSerializationException,
  ZodValidationException,
} from 'nestjs-zod';
import { ZodError } from 'zod';
import { ConflictError, DomainError, NotFoundError } from '../domain-errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = statusOf(exception);
    // A domain error's message is written for the user, like an
    // HttpException's; anything else may describe internals.
    const message =
      exception instanceof HttpException || exception instanceof DomainError
        ? exception.message
        : 'Internal server error';

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unknown error',
        exception instanceof Error ? exception.stack : undefined,
      );
      // A response that failed its own schema has an empty message: the
      // fields that were wrong are in the Zod error it carries.
      if (exception instanceof ZodSerializationException) {
        const cause = exception.getZodError();
        this.logger.error(
          `Response failed its schema on ${request.method} ${request.url}: ${
            cause instanceof ZodError
              ? JSON.stringify(cause.issues)
              : String(cause)
          }`,
        );
      }
    }

    const problem: Problem = {
      type: `https://httpstatuses.io/${status}`,
      title: HttpStatus[status] ?? 'Unknown Error',
      status,
      detail: message,
      instance: request.url,
      timestamp: new Date().toISOString(),
      errors: validationIssues(exception),
    };

    response.status(status).json(problem);
  }
}

/**
 * The status an exception answers with. Repositories raise domain errors
 * (`common/domain-errors.ts`) that know nothing about HTTP; this is where
 * each kind gets its status, so services don't catch and rethrow them.
 */
function statusOf(exception: unknown): number {
  if (exception instanceof HttpException) return exception.getStatus();
  if (exception instanceof NotFoundError) return HttpStatus.NOT_FOUND;
  if (exception instanceof ConflictError) return HttpStatus.CONFLICT;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/** The failed checks behind a request-validation 400, if that's what this is. */
function validationIssues(exception: unknown): ValidationIssue[] | undefined {
  if (!(exception instanceof ZodValidationException)) return undefined;
  const error = exception.getZodError();
  if (!(error instanceof ZodError)) return undefined;

  return error.issues.map((issue) => ({
    // Zod allows symbol keys; request inputs never have them.
    path: issue.path.filter((key) => typeof key !== 'symbol'),
    message: issue.message,
  }));
}
