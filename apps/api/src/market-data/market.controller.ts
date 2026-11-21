import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiProblemResponses } from '../common/problem';
import { MarketCalendarService } from './market-calendar.service';
import { MarketStatusDto } from './market.dto';

/**
 * The market's clock as the order rules read it. Public like the symbol
 * endpoints: it serves the exchange's opening hours, nothing of a user's.
 */
@ApiTags('market')
@ApiProblemResponses()
@Controller('market')
export class MarketController {
  constructor(private readonly calendar: MarketCalendarService) {}

  @Get('status')
  @ApiOperation({
    operationId: 'getMarketStatus',
    summary: 'Whether the US equity market is open, and the next session',
  })
  @ZodResponse({ status: 200, type: MarketStatusDto })
  status() {
    return this.calendar.status();
  }
}
