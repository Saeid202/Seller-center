"use client";

import Link from "next/link";
import { Suspense } from "react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ForgotPasswordPageInner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Myshop
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
          <p className="text-sm text-slate-600">
            Enter your email address and we&apos;ll send you a secure link to create a new
            password.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forgot password</CardTitle>
            <CardDescription>
              You&apos;ll receive an email with instructions to finish resetting your password.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          Remembered it?{" "}
          <Link className="font-medium text-slate-900 underline underline-offset-4" href="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ForgotPasswordPageInner />
    </Suspense>
  );
}


