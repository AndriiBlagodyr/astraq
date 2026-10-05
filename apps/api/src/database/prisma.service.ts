import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../common/env';
import { PrismaClient } from '../generated/prisma/client';

/**
 * The api's one Prisma client, backed by a node-postgres pool. It connects
 * lazily on the first query, so the app (and `openapi:emit`) boots without a
 * database; `/health/ready` is what reports whether one is reachable.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }

  /** True when a trivial query round-trips. Logs the cause instead of throwing. */
  async isReachable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn({ err: error }, 'Database readiness check failed');
      return false;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
