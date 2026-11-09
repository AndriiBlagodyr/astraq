import {
  CandleSeriesSchema,
  CandlesQuerySchema,
  ReturnSeriesSchema,
  ReturnsQuerySchema,
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
export class ReturnsQueryDto extends createZodDto(ReturnsQuerySchema) {}
export class ReturnSeriesDto extends createZodDto(ReturnSeriesSchema) {}
