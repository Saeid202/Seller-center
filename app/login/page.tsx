'use client'
import Link from "next/link";
import { redirect, useSearchParams } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentSession } from "@/lib/auth/session";
import { useEffect } from "react";





export default function LoginPage() {

  const searchParams = useSearchParams()

  useEffect(()=>{
  getCurrentSession().then((session) => {
    if (session) {
        redirect("/dashboard/products");
      }
  });
  },[])

  
 
  

  const redirectToParam = searchParams.get("redirectTo") ? searchParams.get("redirectTo"): null   
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
            <LoginForm  redirectTo={redirectToParam} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          Don&lsquo;t have an account?{" "}
          <a
            className="font-medium text-slate-900 underline underline-offset-4"
            href="https://supabase.com/docs/guides/auth"
            rel="noreferrer"
            target="_blank"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

