import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
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

    const { data: memberships, error: membershipError } = await supabase
      .from("class_members")
      .select("class_id")
      .eq("user_id", user.id);

    if (membershipError) {
      throw membershipError;
    }

    const classIds = (memberships ?? []).map((item) => item.class_id);

    if (classIds.length === 0) {
      return NextResponse.json({ rooms: [] });
    }

    const { data: rooms, error: roomError } = await supabase
      .from("rooms")
      .select(`
        id,
        class_id,
        name,
        code,
        status,
        scheduled_at,
        classes (
          id,
          name,
          code
        )
      `)
      .in("class_id", classIds)
      .eq("status", "live")
      .order("started_at", { ascending: false });

    if (roomError) {
      throw roomError;
    }

    return NextResponse.json({
      rooms: rooms ?? [],
    });
  } catch (error) {
    console.error("LIVE ROOMS ERROR:", error);

    return NextResponse.json(
      { error: "Không thể tải phòng đang học." },
      { status: 500 }
    );
  }
}
