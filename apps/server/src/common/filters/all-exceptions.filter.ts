import {
  Catch,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { toApiError } from '../helpers/api-error';
import { describeError } from '../helpers/describe-error';

/** Answers every HTTP error with the same format (ApiError from @gwent/shared) and logs the 5xx. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Sends the error response for an exception thrown during a request.
   *
   * @param exception - Value thrown while handling the request.
   * @param host - Current request context.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const body = toApiError(exception);
    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const request = http.getRequest<Request>();
      this.logger.error(`${request.method} ${request.url} failed`, describeError(exception));
    }
    http.getResponse<Response>().status(body.statusCode).json(body);
  }
}
