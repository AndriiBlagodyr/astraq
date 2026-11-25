import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiProblemResponses } from '../common/problem';
import { MarketCalendarService } from './market-calendar.service';
import { DataQualityReportDto, MarketStatusDto } from './market.dto';
import { DataQualityService } from './quality/data-quality.service';

/**
 * The market's clock as the order rules read it, and the state of the
 * stored bars. Public like the symbol endpoints: the exchange's opening
 * hours and the health of shared data, nothing of a user's.
 */
@ApiTags('market')
@ApiProblemResponses()
@Controller('market')
export class MarketController {
  constructor(
    private readonly calendar: MarketCalendarService,
    private readonly quality: DataQualityService,
  ) {}

  @Get('status')
  @ApiOperation({
    operationId: 'getMarketStatus',
    summary: 'Whether the US equity market is open, and the next session',
  })
  @ZodResponse({ status: 200, type: MarketStatusDto })
  status() {
    return this.calendar.status();
  }

  @Get('data-quality')
  @ApiOperation({
    operationId: 'getDataQuality',
    summary: 'The latest data quality check of the stored daily bars',
  })
  @ZodResponse({ status: 200, type: DataQualityReportDto })
  dataQuality() {
    return this.quality.latest();
  }
}
