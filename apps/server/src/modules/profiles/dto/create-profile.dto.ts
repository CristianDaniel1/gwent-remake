import { CreateProfileSchema } from '@gwent/shared';
import { createZodDto } from 'nestjs-zod';

/** Profile body, validated with the schema shared with the frontend. */
export class CreateProfileDto extends createZodDto(CreateProfileSchema) {}
