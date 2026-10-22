import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { loadAlpacaEnv } from '../alpaca/alpaca.env';
import { MarketDataRepository } from '../market-data.repository';
import { BootstrapService } from './bootstrap.service';

/** The bootstrap CLI's container. Not imported by `AppModule`. */
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: AlpacaClient,
      useFactory: () => new AlpacaClient(loadAlpacaEnv()),
    },
    MarketDataRepository,
    BootstrapService,
  ],
})
export class BootstrapModule {}
