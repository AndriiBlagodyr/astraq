"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Feedback, FormField, Input, buttonVariants } from "@astraq/ui";
import { RegisterBodySchema, type RegisterBody } from "@astraq/shared";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterBody>({
    resolver: zodResolver(RegisterBodySchema),
  });

  const onSubmit = async (data: RegisterBody) => {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setServerError(body.error ?? "Registration failed. Please try again.");
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

      <FormField
        label="Password"
        description="At least 12 characters."
        error={errors.password?.message}
      >
        <Input
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
      </FormField>

      {serverError && (
        <Feedback tone="danger" title="Registration failed" description={serverError} />
      )}

      <Button type="submit" loading={isSubmitting} className="w-full">
        Create account
      </Button>

      <footer className="flex border-t border-border pt-5">
        <Link
          href="/login"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Already have an account? Sign in
        </Link>
      </footer>
    </form>
  );
}
