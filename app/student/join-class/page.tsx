import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JoinClassForm from "@/components/student/join-class-form";

export default async function JoinClassPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student" || !profile.is_active) {
    redirect("/");
  }

  return <JoinClassForm />;
}
