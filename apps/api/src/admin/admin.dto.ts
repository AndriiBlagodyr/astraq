import {
  CreateReviewAccessBodySchema,
  QueueStatusSchema,
  RetryDeadResultSchema,
  ReviewAccessCredentialsSchema,
  ReviewAccessIdParamSchema,
  ReviewAccessListSchema,
  ReviewAccessSchema,
  UpdateReviewAccessBodySchema,
} from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class QueueStatusDto extends createZodDto(QueueStatusSchema) {}
export class RetryDeadResultDto extends createZodDto(RetryDeadResultSchema) {}

export class ReviewAccessDto extends createZodDto(ReviewAccessSchema) {}
export class ReviewAccessListDto extends createZodDto(ReviewAccessListSchema) {}
export class ReviewAccessCredentialsDto extends createZodDto(
  ReviewAccessCredentialsSchema,
) {}
export class CreateReviewAccessBodyDto extends createZodDto(
  CreateReviewAccessBodySchema,
) {}
export class UpdateReviewAccessBodyDto extends createZodDto(
  UpdateReviewAccessBodySchema,
) {}
export class ReviewAccessIdParamDto extends createZodDto(
  ReviewAccessIdParamSchema,
) {}
