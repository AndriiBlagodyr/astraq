import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiProblemResponses } from '../common/problem';
import { HealthStatusDto } from './health.dto';

@ApiTags('health')
@ApiProblemResponses()
@Controller('health')
export class HealthController {
  @Get('live')
  @ApiOperation({ operationId: 'getLiveness', summary: 'The process is up' })
  @ZodResponse({ status: 200, type: HealthStatusDto })
  live() {
    return { status: 'ok' as const };
  }

  @Get('ready')
  @ApiOperation({
    operationId: 'getReadiness',
    summary: 'The API can serve requests',
  })
  @ZodResponse({ status: 200, type: HealthStatusDto })
  ready() {
    // Phase 1 deploy step: check the database here.
    return { status: 'ok' as const };
  }
}
