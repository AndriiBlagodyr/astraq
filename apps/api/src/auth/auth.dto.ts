import {
  AuthTokensSchema,
  ChangePasswordBodySchema,
  LoginBodySchema,
  RefreshBodySchema,
  RegisterBodySchema,
} from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterBodyDto extends createZodDto(RegisterBodySchema) {}
export class LoginBodyDto extends createZodDto(LoginBodySchema) {}
export class RefreshBodyDto extends createZodDto(RefreshBodySchema) {}
export class AuthTokensDto extends createZodDto(AuthTokensSchema) {}
export class ChangePasswordBodyDto extends createZodDto(ChangePasswordBodySchema) {}
