import {
  AuthTokensSchema,
  LoginBodySchema,
  RefreshBodySchema,
  RegisterBodySchema,
} from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterBodyDto extends createZodDto(RegisterBodySchema) {}
export class LoginBodyDto extends createZodDto(LoginBodySchema) {}
export class RefreshBodyDto extends createZodDto(RefreshBodySchema) {}
export class AuthTokensDto extends createZodDto(AuthTokensSchema) {}
