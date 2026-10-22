import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CandlesRepository } from './candles.repository';
import { SymbolsController } from './symbols.controller';
import { SymbolsRepository } from './symbols.repository';
import { SymbolsService } from './symbols.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SymbolsController],
  providers: [SymbolsService, SymbolsRepository, CandlesRepository],
})
export class SymbolsModule {}
