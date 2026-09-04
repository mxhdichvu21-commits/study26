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

    const { data: member } = await supabase
      .from("room_members")
      .select("room_id, user_id, joined_at, left_at")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .is("left_at", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (member) {
      await supabase
        .from("room_members")
        .update({
          left_at: new Date().toISOString(),
        })
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .eq("joined_at", member.joined_at);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LIVEKIT LEAVE ERROR:", error);

    return NextResponse.json(
      { error: "Không thể ghi nhận rời phòng." },
      { status: 500 }
    );
  }
}
