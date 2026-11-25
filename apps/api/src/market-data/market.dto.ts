import { DataQualityReportSchema, MarketStatusSchema } from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class MarketStatusDto extends createZodDto(MarketStatusSchema) {}
export class DataQualityReportDto extends createZodDto(
  DataQualityReportSchema,
) {}
