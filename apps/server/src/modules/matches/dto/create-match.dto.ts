import { CreateMatchSchema } from '@gwent/shared';
import { createZodDto } from 'nestjs-zod';

/** Match body, validated with the schema shared with the frontend. */
export class CreateMatchDto extends createZodDto(CreateMatchSchema) {}
