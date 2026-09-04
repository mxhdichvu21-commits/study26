import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Bạn chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: currentProfile } = await admin
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !currentProfile ||
      currentProfile.role !== "admin" ||
      currentProfile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Không có quyền quản trị." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const userId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const isActive = body?.isActive;

    if (
      !userId ||
      typeof isActive !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ." },
        { status: 400 }
      );
    }

    if (userId === user.id && !isActive) {
      return NextResponse.json(
        {
          error:
            "Không thể tự khóa tài khoản quản trị hiện tại.",
        },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("profiles")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isActive,
    });
  } catch (error) {
    console.error("ADMIN TOGGLE USER ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật tài khoản.",
      },
      { status: 500 }
    );
  }
}
