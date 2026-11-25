import { Module } from '@nestjs/common';
import { env } from '../../common/env';
import { MongoRawArchive, NoRawArchive, RawArchive } from './raw-archive';

/**
 * The raw payload archive, in MongoDB where `MONGODB_URL` says there is
 * one and nowhere otherwise (`common/env.ts`: development defaults to the
 * MongoDB that `pnpm infra:up` starts). The api server, the CLIs, and the
 * worker all get it through `IngestionService`.
 */
@Module({
  providers: [
    {
      provide: RawArchive,
      useFactory: (): RawArchive =>
        env.MONGODB_URL === null
          ? new NoRawArchive()
          : new MongoRawArchive(env.MONGODB_URL, env.RAW_ARCHIVE_DAYS),
    },
  ],
  exports: [RawArchive],
})
export class RawArchiveModule {}
