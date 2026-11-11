import { HttpStatus } from '@nestjs/common';
import type { ApiError } from '@gwent/shared';

/** Error code of a request whose body failed its schema. */
export const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR';

/** Error code used when an HTTP status has no known name. */
export const UNKNOWN_ERROR_CODE = 'UNKNOWN_ERROR';

/** Response for the database errors a request can cause, by Prisma error code. */
export const DATABASE_ERRORS: Readonly<Record<string, ApiError>> = {
  P2025: { statusCode: HttpStatus.NOT_FOUND, error: 'NOT_FOUND', message: 'Not found' },
  P2003: {
    statusCode: HttpStatus.NOT_FOUND,
    error: 'NOT_FOUND',
    message: 'Related record not found',
  },
  P2002: { statusCode: HttpStatus.CONFLICT, error: 'CONFLICT', message: 'Record already exists' },
};

/** Response for any error the application does not expect. */
export const INTERNAL_ERROR: ApiError = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  error: 'INTERNAL_SERVER_ERROR',
  message: 'Internal error',
};
