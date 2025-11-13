"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-600">
          Track orders once you start receiving purchase requests from buyers.
        </p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900">No orders yet</CardTitle>
          <CardDescription>
            When buyers submit purchase requests, they will appear here for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Need to add more products first? Head back to the product catalog.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/dashboard/products">Go to products</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



