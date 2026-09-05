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
        { error: "Bạn chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: members } =
      await supabase
        .from("class_members")
        .select("class_id")
        .eq("user_id", user.id)
        .eq("role", "student");

    const classIds = [
      ...new Set(
        (members || []).map(
          (item) => item.class_id
        )
      ),
    ];

    if (!classIds.length) {
      return NextResponse.json({
        rooms: [],
      });
    }

    const { data: rooms, error } =
      await supabase
        .from("rooms")
        .select(
          "id, class_id, name, code, status, started_at"
        )
        .in("class_id", classIds)
        .eq("status", "live")
        .order("started_at", {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    const { data: classes } =
      await supabase
        .from("classes")
        .select("id, name, code")
        .in("id", classIds);

    const classMap = new Map(
      (classes || []).map(
        (item) => [item.id, item]
      )
    );

    return NextResponse.json({
      rooms: (rooms || []).map(
        (room) => ({
          ...room,
          className:
            classMap.get(room.class_id)
              ?.name || "Lớp học",
        })
      ),
    });
  } catch (error) {
    console.error(
      "ACTIVE ATTENDANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể tải phòng điểm danh.",
      },
      { status: 500 }
    );
  }
}
