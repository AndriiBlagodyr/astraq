import { MarketStatusSchema } from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class MarketStatusDto extends createZodDto(MarketStatusSchema) {}
