import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Problem, ValidationIssue } from '@astraq/shared';
import { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unknown error',
        exception instanceof Error ? exception.stack : undefined,
      );
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
