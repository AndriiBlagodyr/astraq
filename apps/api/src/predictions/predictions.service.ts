import { Injectable } from '@nestjs/common';

export interface PredictionSummary {
  trend: string;
  confidence: number;
  message: string;
}

@Injectable()
export class PredictionsService {
  getSummary(): PredictionSummary {
    return {
      trend: 'neutral',
      confidence: 0.0,
      message: 'Prediction summary endpoint placeholder',
    };
  }
}
