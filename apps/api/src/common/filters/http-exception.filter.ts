import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance: string;
  timestamp: string;
}

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

    const problem: ProblemDetail = {
      type: `https://httpstatuses.io/${status}`,
      title: HttpStatus[status] ?? 'Unknown Error',
      status,
      detail: message,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(problem);
  }
}
