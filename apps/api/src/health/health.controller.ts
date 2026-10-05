import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiProblemResponses } from '../common/problem';
import { PrismaService } from '../database/prisma.service';
import { HealthStatusDto } from './health.dto';

@ApiTags('health')
@ApiProblemResponses()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ operationId: 'getLiveness', summary: 'The process is up' })
  @ZodResponse({ status: 200, type: HealthStatusDto })
  live() {
    return { status: 'ok' as const };
  }

  @Get('ready')
  @ApiOperation({
    operationId: 'getReadiness',
    summary: 'The API can serve requests (its database answers)',
  })
  @ZodResponse({ status: 200, type: HealthStatusDto })
  async ready() {
    if (!(await this.prisma.isReachable())) {
      throw new ServiceUnavailableException('Database is unreachable');
    }
    return { status: 'ok' as const };
  }
}
