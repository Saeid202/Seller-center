import Link from "next/link";

export default function DashboardIndex() {
  const quickLinkClasses =
    "inline-flex items-center justify-start gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10";

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Welcome back! Use the navigation on the left to manage your profile information, add new products,
          and keep your catalog up to date. Start by choosing one of the quick links below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/profile" className={quickLinkClasses}>
          Manage profile
        </Link>
        <Link href="/dashboard/products" className={quickLinkClasses}>
          View products
        </Link>
      </div>
    </div>
  );
}

