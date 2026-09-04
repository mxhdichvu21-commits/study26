import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JoinRoom from "@/components/student/join-room";

export default async function StudentRoomsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    profile.role !== "student" ||
    !profile.is_active
  ) {
    redirect("/");
  }

  return <JoinRoom />;
}
