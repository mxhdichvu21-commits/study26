import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lessonId = String(body?.lessonId || "").trim();

    if (!lessonId) {
      return NextResponse.json({ error: "Thiếu lessonId." }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { data: recipient } = await admin
      .from("lesson_recipients")
      .select("lesson_id, student_id")
      .eq("lesson_id", lessonId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (!recipient) {
      return NextResponse.json(
        { error: "Bạn không được giao bài học này." },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from("lesson_views")
      .upsert(
        {
          lesson_id: lessonId,
          student_id: user.id,
        },
        {
          onConflict: "lesson_id,student_id",
        }
      )
      .select("lesson_id, student_id, viewed_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      viewedAt: data.viewed_at,
    });
  } catch (error) {
    console.error("LESSON VIEW ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể đánh dấu đã xem.",
      },
      { status: 500 }
    );
  }
}
