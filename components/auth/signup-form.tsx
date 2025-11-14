"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  FIELD_FRAME_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_EMPHASIS_CLASS,
} from "@/lib/styles/forms";
import { cn } from "@/lib/utils";

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
  redirectTo?: string | null;
  className?: string;
}

export function SignupForm({ redirectTo, className }: SignupFormProps) {
  const router = useRouter();
  const callbackUrl = redirectTo ?? "/dashboard";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: SignupValues) => {
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session && data.user) {
        const now = new Date().toISOString();
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            full_name: values.fullName,
            created_at: now,
            updated_at: now,
          });

        if (profileError) {
          setError(profileError.message);
          return;
        }

        router.replace(callbackUrl);
        router.refresh();
        return;
      }

      setInfo("Account created. Please verify your email before signing in.");
      form.reset();
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn("space-y-6", className)}
      noValidate
    >
      <div className={FIELD_FRAME_CLASS}>
        <Label className={FIELD_LABEL_CLASS} htmlFor="fullName">
          Full name
        </Label>
        <Input
          id="fullName"
          placeholder="Jane Doe"
          autoComplete="name"
          {...form.register("fullName")}
          aria-invalid={Boolean(form.formState.errors.fullName)}
          className={INPUT_EMPHASIS_CLASS}
        />
        {form.formState.errors.fullName ? (
          <p className="text-sm text-red-600">{form.formState.errors.fullName.message}</p>
        ) : null}
      </div>

      <div className={FIELD_FRAME_CLASS}>
        <Label className={FIELD_LABEL_CLASS} htmlFor="email">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="seller@example.com"
          autoComplete="email"
          {...form.register("email")}
          aria-invalid={Boolean(form.formState.errors.email)}
          className={INPUT_EMPHASIS_CLASS}
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className={FIELD_FRAME_CLASS}>
        <Label className={FIELD_LABEL_CLASS} htmlFor="password">
          Password
        </Label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          autoComplete="new-password"
          {...form.register("password")}
          aria-invalid={Boolean(form.formState.errors.password)}
          className={INPUT_EMPHASIS_CLASS}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      <div className={FIELD_FRAME_CLASS}>
        <Label className={FIELD_LABEL_CLASS} htmlFor="confirmPassword">
          Confirm password
        </Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="••••••••"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
          aria-invalid={Boolean(form.formState.errors.confirmPassword)}
          className={INPUT_EMPHASIS_CLASS}
        />
        {form.formState.errors.confirmPassword ? (
          <p className="text-sm text-red-600">
            {form.formState.errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <span>{error}</span>
        </Alert>
      ) : null}

      {info ? (
        <Alert>
          <span>{info}</span>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
