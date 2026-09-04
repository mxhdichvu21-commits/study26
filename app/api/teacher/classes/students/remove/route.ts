import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  try {
    const { classId, studentId } = await request.json();

    if (!classId || !studentId) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu." },
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

    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", classId)
      .eq("user_id", studentId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("REMOVE STUDENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể xóa học sinh.",
      },
      { status: 500 }
    );
  }
}
