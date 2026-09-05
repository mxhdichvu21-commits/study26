import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const classId =
      searchParams.get("classId") || "";

    if (!classId) {
      return NextResponse.json(
        { error: "Thiếu classId." },
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

    const { data: classData } = await supabase
      .from("classes")
      .select("id, teacher_id")
      .eq("id", classId)
      .single();

    if (!classData || classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không quản lý lớp này." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, code, status")
      .eq("class_id", classId)
      .eq("teacher_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      rooms: data || [],
    });
  } catch (error) {
    console.error(
      "GET SCHEDULE ROOMS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải phòng học.",
      },
      { status: 500 }
    );
  }
}
