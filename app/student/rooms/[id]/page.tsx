import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentLiveClassroom from "@/components/student/student-live-classroom";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StudentRoomPage({
  params,
}: Props) {
  const { id } = await params;

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
    redirect("/student");
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select(`
      id,
      class_id,
      name,
      code,
      status
    `)
    .eq("id", id)
    .single();

  if (roomError || !room) {
    redirect("/student");
  }

  if (room.status !== "live") {
    redirect("/student");
  }

  const { data: member } = await supabase
    .from("class_members")
    .select("class_id, user_id")
    .eq("class_id", room.class_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    redirect("/student");
  }

  return (
    <StudentLiveClassroom
      roomId={room.id}
      roomTitle={room.name}
    />
  );
}
