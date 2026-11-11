import { SaveDeckSchema } from '@gwent/shared';
import { createZodDto } from 'nestjs-zod';

/** Deck body, validated with the schema shared with the frontend. */
export class SaveDeckDto extends createZodDto(SaveDeckSchema) {}
