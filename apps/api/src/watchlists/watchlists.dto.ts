import {
  AddWatchlistItemBodySchema,
  ReorderWatchlistBodySchema,
  WatchlistIdParamSchema,
  WatchlistItemParamSchema,
  WatchlistListSchema,
  WatchlistNameBodySchema,
  WatchlistSchema,
} from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class WatchlistIdParamDto extends createZodDto(WatchlistIdParamSchema) {}
export class WatchlistItemParamDto extends createZodDto(
  WatchlistItemParamSchema,
) {}
export class WatchlistNameBodyDto extends createZodDto(
  WatchlistNameBodySchema,
) {}
export class AddWatchlistItemBodyDto extends createZodDto(
  AddWatchlistItemBodySchema,
) {}
export class ReorderWatchlistBodyDto extends createZodDto(
  ReorderWatchlistBodySchema,
) {}
export class WatchlistListDto extends createZodDto(WatchlistListSchema) {}
export class WatchlistDto extends createZodDto(WatchlistSchema) {}
