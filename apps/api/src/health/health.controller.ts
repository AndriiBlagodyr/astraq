import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    // Future: check DB connectivity, Redis, etc.
    return { status: 'ok' };
  }
}
