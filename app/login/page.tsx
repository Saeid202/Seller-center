'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentSession } from "@/lib/auth/session";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    void getCurrentSession().then((session) => {
      if (session) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  const redirectToParam = searchParams.get("redirectTo") ? searchParams.get("redirectTo") : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Myshop
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in with your seller credentials to manage your products.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use the email and password associated with your seller account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <LoginForm redirectTo={redirectToParam} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            className="font-medium text-slate-900 underline underline-offset-4"
            href={redirectToParam ? `/signup?redirectTo=${encodeURIComponent(redirectToParam)}` : "/signup"}
          >
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginPageInner />
    </Suspense>
  );
}
