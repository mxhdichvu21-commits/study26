import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { error: "Thiếu roomId." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("room_id", roomId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({
        checkedIn: false,
      });
    }

    const { data: attendance } = await supabase
      .from("attendance")
      .select("id")
      .eq("session_id", session.id)
      .eq("student_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      checkedIn: !!attendance,
    });
  } catch (error) {
    console.error("ATTENDANCE STATUS ERROR:", error);

    return NextResponse.json(
      { error: "Không thể kiểm tra điểm danh." },
      { status: 500 }
    );
  }
}
