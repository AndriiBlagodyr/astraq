import { z } from "zod";
import { emailAddress as email, passwordString as password } from "./primitives";

export const RegisterBodySchema = z
  .object({ email, password })
  .meta({ id: "RegisterBody" });

export const LoginBodySchema = z
  .object({ email, password })
  .meta({ id: "LoginBody" });

export const RefreshBodySchema = z
  .object({ refreshToken: z.string().min(1) })
  .meta({ id: "RefreshBody" });

/** Both tokens returned on register / login / refresh. The web BFF puts these in HttpOnly cookies. */
export const AuthTokensSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .meta({ id: "AuthTokens" });

/**
 * Body of `POST /api/auth/password`. The answer is a new token pair: every
 * session of the account ends, and this one starts again.
 */
export const ChangePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: password,
  })
  .meta({ id: "ChangePasswordBody" });

export type RegisterBody = z.infer<typeof RegisterBodySchema>;
export type LoginBody = z.infer<typeof LoginBodySchema>;
export type RefreshBody = z.infer<typeof RefreshBodySchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>;
