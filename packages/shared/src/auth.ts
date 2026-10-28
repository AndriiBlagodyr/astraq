import { z } from "zod";

const email = z.email().max(254).transform((v) => v.trim().toLowerCase());
const password = z.string().min(12).max(128);

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

export type RegisterBody = z.infer<typeof RegisterBodySchema>;
export type LoginBody = z.infer<typeof LoginBodySchema>;
export type RefreshBody = z.infer<typeof RefreshBodySchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
