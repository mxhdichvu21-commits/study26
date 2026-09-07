import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: Context
) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const { data: announcement } = await admin
      .from("system_announcements")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!announcement) {
      return NextResponse.json(
        { error: "Không tìm thấy thông báo." },
        { status: 404 }
      );
    }

    const { error } = await admin
      .from("system_announcement_reads")
      .upsert(
        {
          announcement_id: id,
          user_id: user.id,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: "announcement_id,user_id",
        }
      );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MARK ANNOUNCEMENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể đánh dấu thông báo.",
      },
      { status: 500 }
    );
  }
}
