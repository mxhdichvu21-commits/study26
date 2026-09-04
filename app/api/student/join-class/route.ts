import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    if (!code) {
      return NextResponse.json(
        { error: "Vui lòng nhập mã lớp." },
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "student" ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { error: "Tài khoản học sinh không hợp lệ." },
        { status: 403 }
      );
    }

    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select(`
        id,
        name,
        code,
        subject_id
      `)
      .ilike("code", code)
      .maybeSingle();

    if (classError) {
      console.error("CLASS LOOKUP ERROR:", classError);

      return NextResponse.json(
        { error: "Không thể tìm lớp học." },
        { status: 500 }
      );
    }

    if (!classData) {
      return NextResponse.json(
        { error: "Mã lớp không tồn tại. Hãy kiểm tra lại mã lớp." },
        { status: 404 }
      );
    }

    const { data: existingMember, error: existingError } = await supabase
      .from("class_members")
      .select("class_id, user_id")
      .eq("class_id", classData.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error("MEMBERSHIP LOOKUP ERROR:", existingError);

      return NextResponse.json(
        { error: "Không thể kiểm tra thành viên lớp." },
        { status: 500 }
      );
    }

    if (existingMember) {
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        class: classData,
      });
    }

    const { error: insertError } = await supabase
      .from("class_members")
      .insert({
        class_id: classData.id,
        user_id: user.id,
      });

    if (insertError) {
      console.error("JOIN CLASS ERROR:", insertError);

      return NextResponse.json(
        { error: `Không thể tham gia lớp: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      class: classData,
    });
  } catch (error) {
    console.error("JOIN CLASS API ERROR:", error);

    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tham gia lớp." },
      { status: 500 }
    );
  }
}
