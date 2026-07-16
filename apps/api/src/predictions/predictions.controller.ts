import { Controller, Get } from '@nestjs/common';
import { PredictionsService } from './predictions.service';

@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('summary')
  getSummary() {
    return this.predictionsService.getSummary();
  }
}
