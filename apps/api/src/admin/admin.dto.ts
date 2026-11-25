import { QueueStatusSchema, RetryDeadResultSchema } from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class QueueStatusDto extends createZodDto(QueueStatusSchema) {}
export class RetryDeadResultDto extends createZodDto(RetryDeadResultSchema) {}
