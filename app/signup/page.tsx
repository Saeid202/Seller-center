'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentSession } from "@/lib/auth/session";

function SignupPageInner() {
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
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Create your seller account</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign up to start managing your products and profile.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Enter your details to create a seller account.</CardDescription>
          </CardHeader>

          <CardContent>
            <SignupForm redirectTo={redirectToParam} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            className="font-medium text-slate-900 underline underline-offset-4"
            href={redirectToParam ? `/login?redirectTo=${encodeURIComponent(redirectToParam)}` : "/login"}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <SignupPageInner />
    </Suspense>
  );
}
