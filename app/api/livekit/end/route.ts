import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

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
        { error: "Bạn chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("id, teacher_id, status")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng." },
        { status: 404 }
      );
    }

    if (room.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Chỉ giáo viên của phòng mới có thể kết thúc lớp." },
        { status: 403 }
      );
    }

    await supabase
      .from("rooms")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    await supabase
      .from("room_members")
      .update({
        left_at: new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .is("left_at", null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LIVEKIT END ERROR:", error);

    return NextResponse.json(
      { error: "Không thể kết thúc phòng." },
      { status: 500 }
    );
  }
}
