import {
  CandleSeriesSchema,
  CandlesQuerySchema,
  SymbolListSchema,
  SymbolSearchQuerySchema,
  TickerParamSchema,
} from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class SymbolSearchQueryDto extends createZodDto(
  SymbolSearchQuerySchema,
) {}
export class SymbolListDto extends createZodDto(SymbolListSchema) {}
export class TickerParamDto extends createZodDto(TickerParamSchema) {}
export class CandlesQueryDto extends createZodDto(CandlesQuerySchema) {}
export class CandleSeriesDto extends createZodDto(CandleSeriesSchema) {}
