import {
  CandleSeriesSchema,
  CandlesQuerySchema,
  SymbolListSchema,
  SymbolSearchQuerySchema,
} from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class SymbolSearchQueryDto extends createZodDto(
  SymbolSearchQuerySchema,
) {}
export class SymbolListDto extends createZodDto(SymbolListSchema) {}
export class CandlesQueryDto extends createZodDto(CandlesQuerySchema) {}
export class CandleSeriesDto extends createZodDto(CandleSeriesSchema) {}
