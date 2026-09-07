import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const classId = new URL(request.url).searchParams.get("classId")?.trim();

    if (!classId) {
      return NextResponse.json({ error: "Thiếu classId." }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "teacher" || profile.is_active === false) {
      return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
    }

    const { data: classRow } = await admin
      .from("classes")
      .select("id, teacher_id")
      .eq("id", classId)
      .maybeSingle();

    if (!classRow || classRow.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không quản lý lớp này." },
        { status: 403 }
      );
    }

    const { data: members, error } = await admin
      .from("class_members")
      .select("user_id")
      .eq("class_id", classId)
      .eq("role", "student");

    if (error) throw error;

    const ids = (members ?? []).map((x) => x.user_id);

    const { data: profiles } = ids.length
      ? await admin
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ids)
      : { data: [] };

    return NextResponse.json({
      students: ids.map((id) => {
        const p = (profiles ?? []).find((x) => x.id === id);
        return {
          id,
          full_name: p?.full_name ?? "Học sinh",
          avatar_url: p?.avatar_url ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("TEACHER LEARNING STUDENTS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách học sinh.",
      },
      { status: 500 }
    );
  }
}
