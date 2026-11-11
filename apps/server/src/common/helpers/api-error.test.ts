import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client';
import { errorCodeFor, toApiError } from './api-error';

/**
 * Builds the error Prisma throws for a failed query.
 *
 * @param code - Prisma error code.
 * @returns The Prisma error.
 */
const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('query failed', { code, clientVersion: 'test' });

describe('errorCodeFor', () => {
  it.each([
    [400, 'BAD_REQUEST'],
    [404, 'NOT_FOUND'],
    [422, 'UNPROCESSABLE_ENTITY'],
    [500, 'INTERNAL_SERVER_ERROR'],
  ])('names status %i as %s', (status, code) => {
    expect(errorCodeFor(status)).toBe(code);
  });

  it('falls back to UNKNOWN_ERROR for a status without a name', () => {
    expect(errorCodeFor(599)).toBe('UNKNOWN_ERROR');
  });
});

describe('toApiError', () => {
  it('answers a schema failure with VALIDATION_ERROR and the issues', () => {
    const { error } = z.object({ name: z.string() }).safeParse({});
    if (!error) throw new Error('expected the schema to fail');
    expect(toApiError(new ZodValidationException(error))).toMatchObject({
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'Invalid data',
      details: expect.anything(),
    });
  });

  it('keeps the status and message of an HTTP exception, with a stable code', () => {
    expect(toApiError(new NotFoundException('Deck not found'))).toEqual({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: 'Deck not found',
    });
  });

  it('keeps the details of an HTTP exception', () => {
    const exception = new UnprocessableEntityException({ message: 'Invalid deck', details: [1] });
    expect(toApiError(exception)).toEqual({
      statusCode: 422,
      error: 'UNPROCESSABLE_ENTITY',
      message: 'Invalid deck',
      details: [1],
    });
  });

  it('answers a validation pipe failure (invalid UUID) with BAD_REQUEST', () => {
    expect(toApiError(new BadRequestException('Validation failed'))).toMatchObject({
      statusCode: 400,
      error: 'BAD_REQUEST',
    });
  });

  it.each([
    ['P2025', 404, 'NOT_FOUND'],
    ['P2003', 404, 'NOT_FOUND'],
    ['P2002', 409, 'CONFLICT'],
  ])('maps the database error %s to %i', (code, statusCode, error) => {
    expect(toApiError(prismaError(code))).toMatchObject({ statusCode, error });
  });

  it('hides unknown database errors and any other error behind a generic 500', () => {
    const generic = { statusCode: 500, error: 'INTERNAL_SERVER_ERROR', message: 'Internal error' };
    expect(toApiError(prismaError('P1001'))).toEqual(generic);
    expect(toApiError(new Error('secret connection string'))).toEqual(generic);
  });
});
