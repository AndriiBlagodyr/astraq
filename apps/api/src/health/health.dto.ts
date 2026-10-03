import { HealthStatusSchema } from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class HealthStatusDto extends createZodDto(HealthStatusSchema) {}
