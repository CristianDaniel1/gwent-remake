import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiError } from '@gwent/shared';
import { ZodValidationException } from 'nestjs-zod';
import { Prisma } from '../../generated/prisma/client';
import {
  DATABASE_ERRORS,
  INTERNAL_ERROR,
  UNKNOWN_ERROR_CODE,
  VALIDATION_ERROR_CODE,
} from '../constants/api-errors.constants';

/**
 * Gives the stable error code of an HTTP status.
 *
 * @param status - HTTP status.
 * @returns The status name in UPPER_SNAKE_CASE (e.g. NOT_FOUND).
 */
export const errorCodeFor = (status: number): string => {
  const statusName: string | undefined = HttpStatus[status];
  return statusName ?? UNKNOWN_ERROR_CODE;
};

/**
 * Reads the message and details of an HTTP exception.
 *
 * @param exception - Exception thrown by a controller, pipe or service.
 * @returns The exception in the API error format.
 */
const fromHttpException = (exception: HttpException): ApiError => {
  const statusCode = exception.getStatus();
  const error = errorCodeFor(statusCode);
  const responseBody = exception.getResponse();
  if (typeof responseBody === 'string') return { statusCode, error, message: responseBody };
  const { message, details } = responseBody as { message?: unknown; details?: unknown };
  return {
    statusCode,
    error,
    message: String(message ?? exception.message),
    ...(details !== undefined && { details }),
  };
};

/**
 * Converts any exception into the API error format.
 *
 * @param exception - Value thrown while handling the request.
 * @returns The error response; unknown errors become a generic 500.
 */
export const toApiError = (exception: unknown): ApiError => {
  if (exception instanceof ZodValidationException) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      error: VALIDATION_ERROR_CODE,
      message: 'Invalid data',
      details: exception.getZodError(),
    };
  }
  if (exception instanceof HttpException) return fromHttpException(exception);
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return DATABASE_ERRORS[exception.code] ?? INTERNAL_ERROR;
  }
  return INTERNAL_ERROR;
};
