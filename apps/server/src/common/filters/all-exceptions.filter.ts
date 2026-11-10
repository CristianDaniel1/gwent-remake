import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { ApiError } from '@gwent/shared';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';

/** Every error response has the same format (ApiError from @gwent/shared). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toApiError(exception);
    if (body.statusCode >= 500) this.logger.error(exception);
    response.status(body.statusCode).json(body);
  }

  private toApiError(exception: unknown): ApiError {
    if (exception instanceof ZodValidationException) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'ValidationError',
        message: 'Invalid data',
        details: exception.getZodError(),
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : String((res as { message?: unknown }).message ?? exception.message);
      const details = typeof res === 'object' ? (res as { details?: unknown }).details : undefined;
      return {
        statusCode: status,
        error: exception.name,
        message,
        ...(details !== undefined ? { details } : {}),
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'Internal error',
    };
  }
}
