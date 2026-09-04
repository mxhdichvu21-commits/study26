import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LiveClassroom from "@/components/teacher/live-classroom";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TeacherRoomPage({
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

  if (!profile || !profile.is_active || profile.role !== "teacher") {
    redirect("/");
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, teacher_id, name, code, status")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (!room) {
    redirect("/teacher/classes");
  }

  if (room.status === "ended") {
    redirect("/teacher/classes");
  }

  return (
    <LiveClassroom
      roomId={room.id}
      roomName={room.name}
    />
  );
}
