import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentServerUser } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { Database } from "@/types/database";

export const metadata: Metadata = {
  title: "Profile",
};

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function ProfilePage() {
  const user = await getCurrentServerUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error);
  }

  const fallbackProfile: Profile = {
    id: user.id,
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    company_name: null,
    phone: null,
    website: null,
    bio: null,
    avatar_url: null,
    created_at: null,
    updated_at: null,
  };

  const profileData = profile ?? fallbackProfile;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-600">
          Update your personal information and let buyers know who you are.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seller details</CardTitle>
          <CardDescription>
            This information will be visible to buyers when they view your products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profileData} />
        </CardContent>
      </Card>
    </div>
  );
}

