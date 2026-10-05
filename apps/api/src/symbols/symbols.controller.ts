import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiProblemResponses } from '../common/problem';
import {
  CandleSeriesDto,
  CandlesQueryDto,
  SymbolListDto,
  SymbolSearchQueryDto,
} from './symbols.dto';
import { SymbolsService } from './symbols.service';

@ApiTags('symbols')
@ApiProblemResponses()
@Controller('symbols')
export class SymbolsController {
  constructor(private readonly symbols: SymbolsService) {}

  @Get()
  @ApiOperation({
    operationId: 'searchSymbols',
    summary: 'Find symbols by ticker prefix or name',
  })
  @ZodResponse({ status: 200, type: SymbolListDto })
  search(@Query() query: SymbolSearchQueryDto) {
    return this.symbols.search(query.query);
  }

  @Get(':ticker/candles')
  @ApiOperation({
    operationId: 'getDailyCandles',
    summary: 'Daily candles, adjusted for splits (and dividends) on request',
  })
  @ZodResponse({ status: 200, type: CandleSeriesDto })
  candles(@Param('ticker') ticker: string, @Query() query: CandlesQueryDto) {
    return this.symbols.dailyCandles(ticker, query);
  }
}
