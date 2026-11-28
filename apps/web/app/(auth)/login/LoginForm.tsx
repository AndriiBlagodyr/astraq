"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Feedback,
  FormField,
  Input,
  PasswordInput,
  buttonVariants,
} from "@astraq/ui";
import { LoginBodySchema, type LoginBody } from "@astraq/shared";
import { postAuth } from "@/lib/auth-client";

export function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginBody>({
    resolver: zodResolver(LoginBodySchema),
    defaultValues: { email: defaultEmail ?? "" },
  });

  const onSubmit = async (data: LoginBody) => {
    setServerError(null);
    const result = await postAuth("login", data);
    if (!result.ok) {
      setServerError(result.error ?? "Sign-in failed. Please try again.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    // method="post": a submit before the page hydrates is a native one, and
    // the default GET would put the email and password in the URL.
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-4"
    >
      <FormField label="Email" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          // Also in the server's HTML, so the field is filled before hydration.
          defaultValue={defaultEmail}
          {...register("email")}
        />
      </FormField>

      <FormField label="Password" error={errors.password?.message}>
        <PasswordInput
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

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        <Link href="/register" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Create account
        </Link>
      </footer>
    </form>
  );
}
