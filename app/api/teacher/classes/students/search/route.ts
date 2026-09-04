import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);

    const classId = url.searchParams.get("classId");
    const q = (url.searchParams.get("q") || "").trim();

    if (!classId) {
      return NextResponse.json(
        { error: "Thiếu classId." },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: teacher } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      !teacher ||
      teacher.role !== "teacher" ||
      !teacher.is_active
    ) {
      return NextResponse.json(
        { error: "Không có quyền." },
        { status: 403 }
      );
    }

    const { data: classData } = await supabase
      .from("classes")
      .select("id, teacher_id")
      .eq("id", classId)
      .single();

    if (!classData || classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Không quản lý lớp này." },
        { status: 403 }
      );
    }

    let query = supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, is_active")
      .eq("role", "student")
      .eq("is_active", true);

    if (q) {
      query = query.ilike("full_name", `%${q}%`);
    }

    const { data: students, error } = await query
      .order("full_name")
      .limit(30);

    if (error) {
      throw error;
    }

    const { data: members } = await supabase
      .from("class_members")
      .select("user_id")
      .eq("class_id", classId);

    const memberIds = new Set(
      (members ?? []).map((item) => item.user_id)
    );

    return NextResponse.json({
      students: (students ?? []).map((student) => ({
        ...student,
        alreadyJoined: memberIds.has(student.id),
      })),
    });
  } catch (error) {
    console.error("SEARCH STUDENTS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tìm học sinh.",
      },
      { status: 500 }
    );
  }
}
