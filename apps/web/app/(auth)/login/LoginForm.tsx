"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Feedback, FormField, Input, buttonVariants } from "@astraq/ui";
import { LoginBodySchema, type LoginBody } from "@astraq/shared";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginBody>({
    resolver: zodResolver(LoginBodySchema),
  });

  const onSubmit = async (data: LoginBody) => {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setServerError(body.error ?? "Sign-in failed. Please try again.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <FormField label="Email" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          {...register("email")}
        />
      </FormField>

      <FormField label="Password" error={errors.password?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
      </FormField>

      {serverError && (
        <Feedback tone="danger" title="Sign-in failed" description={serverError} />
      )}

      <Button type="submit" loading={isSubmitting} className="w-full">
        Sign in
      </Button>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Link
          href="/forgot-password"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Forgot password?
        </Link>
        <Link href="/register" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Create account
        </Link>
      </footer>
    </form>
  );
}
