import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim().slice(0, 50)
        : "";

    const dateOfBirth =
      typeof body.dateOfBirth === "string"
        ? body.dateOfBirth.trim()
        : "";

    const avatarUrl =
      typeof body.avatarUrl === "string" && body.avatarUrl.trim()
        ? body.avatarUrl.trim()
        : null;

    if (!fullName) {
      return NextResponse.json(
        { error: "Tên hiển thị không được để trống." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Kiểm tra profile thực sự thuộc tài khoản đang đăng nhập
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Không tìm thấy hồ sơ tài khoản." },
        { status: 404 }
      );
    }

    // Lưu tên + avatar vào profiles
    const { data: updatedProfile, error: updateError } = await admin
      .from("profiles")
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id)
      .select("id, role, full_name, avatar_url")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Ngày sinh đang được lưu trong user_metadata
    const { error: metadataError } =
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          date_of_birth: dateOfBirth,
        },
      });

    if (metadataError) {
      return NextResponse.json(
        { error: metadataError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("PROFILE_UPDATE_ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lỗi máy chủ.",
      },
      { status: 500 }
    );
  }
}
