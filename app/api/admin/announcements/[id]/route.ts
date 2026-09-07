import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

async function getAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { admin, user: null, profile: null };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  return { admin, user, profile };
}

export async function PATCH(
  request: Request,
  context: Context
) {
  try {
    const { admin, user, profile } = await getAdmin();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    if (
      !profile ||
      profile.role !== "admin" ||
      profile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Không có quyền." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};

    if (typeof body?.isActive === "boolean") {
      updates.is_active = body.isActive;
    }

    if (typeof body?.title === "string") {
      const value = body.title.trim();

      if (!value) {
        return NextResponse.json(
          { error: "Tiêu đề không được để trống." },
          { status: 400 }
        );
      }

      updates.title = value;
    }

    if (typeof body?.description === "string") {
      const value = body.description.trim();

      if (!value) {
        return NextResponse.json(
          { error: "Nội dung không được để trống." },
          { status: 400 }
        );
      }

      updates.description = value;
    }

    if (typeof body?.type === "string") {
      if (
        !["info", "important", "warning"].includes(
          body.type
        )
      ) {
        return NextResponse.json(
          { error: "Loại thông báo không hợp lệ." },
          { status: 400 }
        );
      }

      updates.type = body.type;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: "Không có thay đổi." },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("system_announcements")
      .update(updates)
      .eq("id", id)
      .select(
        "id, title, description, type, is_active, starts_at, ends_at, created_at"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      announcement: data,
    });
  } catch (error) {
    console.error("UPDATE SYSTEM ANNOUNCEMENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật thông báo.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: Context
) {
  try {
    const { admin, user, profile } = await getAdmin();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    if (
      !profile ||
      profile.role !== "admin" ||
      profile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Không có quyền." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const { error } = await admin
      .from("system_announcements")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE SYSTEM ANNOUNCEMENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể xóa thông báo.",
      },
      { status: 500 }
    );
  }
}
