"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  FIELD_FRAME_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_EMPHASIS_CLASS,
} from "@/lib/styles/forms";
import { cn } from "@/lib/utils";

const recoverySchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type RecoveryValues = z.infer<typeof recoverySchema>;

interface ForgotPasswordFormProps {
  className?: string;
}

export function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<RecoveryValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (values: RecoveryValues) => {
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setInfo("Check your email for a link to reset your password.");
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
            Sending reset link...
          </>
        ) : (
          "Send reset link"
        )}
      </Button>
    </form>
  );
}


