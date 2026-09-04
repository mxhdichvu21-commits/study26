import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { classId, studentId } = await request.json();

    if (!classId || !studentId) {
      return NextResponse.json(
        { error: "Thiếu classId hoặc studentId." },
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

    const { data: student } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", studentId)
      .single();

    if (
      !student ||
      student.role !== "student" ||
      !student.is_active
    ) {
      return NextResponse.json(
        { error: "Học sinh không hợp lệ." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("class_members")
      .insert({
        class_id: classId,
        user_id: studentId,
        role: "student",
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({
          success: true,
          alreadyJoined: true,
        });
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      alreadyJoined: false,
    });
  } catch (error) {
    console.error("ADD STUDENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể thêm học sinh.",
      },
      { status: 500 }
    );
  }
}
