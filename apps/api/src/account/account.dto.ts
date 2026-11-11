import {
  AccountSchema,
  AccountSessionListSchema,
  SessionIdParamSchema,
  UpdateAccountBodySchema,
} from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class AccountDto extends createZodDto(AccountSchema) {}
export class UpdateAccountBodyDto extends createZodDto(UpdateAccountBodySchema) {}
export class SessionIdParamDto extends createZodDto(SessionIdParamSchema) {}
export class AccountSessionListDto extends createZodDto(
  AccountSessionListSchema,
) {}
