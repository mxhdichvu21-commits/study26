import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import ProfileClient from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const auth = await getCurrentProfile();

  if (!auth) {
    redirect("/login");
  }

  if (
    auth.profile.role !== "student" &&
    auth.profile.role !== "teacher"
  ) {
    redirect("/");
  }

  const dateOfBirth =
    typeof auth.user.user_metadata?.date_of_birth === "string"
      ? auth.user.user_metadata.date_of_birth
      : "";

  return (
    <ProfileClient
      fullName={auth.profile.full_name || ""}
      email={auth.user.email || ""}
      dateOfBirth={dateOfBirth}
      avatarUrl={auth.profile.avatar_url || null}
      role={auth.profile.role}
    />
  );
}
