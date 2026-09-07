import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        announcement: null,
      });
    }

    const now = new Date().toISOString();

    const { data: announcements, error } = await admin
      .from("system_announcements")
      .select(
        "id, title, description, type, starts_at, ends_at, image_path, created_at"
      )
      .eq("is_active", true)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (error) {
      console.error(
        "UNREAD ANNOUNCEMENT QUERY ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
          announcement: null,
        },
        { status: 500 }
      );
    }

    if (!announcements?.length) {
      return NextResponse.json({
        announcement: null,
      });
    }

    const ids = announcements.map(
      (item) => item.id
    );

    const { data: reads, error: readsError } =
      await admin
        .from("system_announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id)
        .in("announcement_id", ids);

    if (readsError) {
      console.error(
        "ANNOUNCEMENT READ QUERY ERROR:",
        readsError
      );

      return NextResponse.json(
        {
          error: readsError.message,
          announcement: null,
        },
        { status: 500 }
      );
    }

    const readIds = new Set(
      (reads ?? []).map(
        (item) => item.announcement_id
      )
    );

    const unread =
      announcements.find(
        (item) => !readIds.has(item.id)
      ) ?? null;

    if (!unread) {
      return NextResponse.json({
        announcement: null,
      });
    }

    let imageUrl: string | null = null;

    if (unread.image_path) {
      const { data: signed, error: signedError } =
        await admin.storage
          .from("materials")
          .createSignedUrl(
            unread.image_path,
            60 * 60
          );

      if (signedError) {
        console.error(
          "ANNOUNCEMENT IMAGE SIGNED URL ERROR:",
          signedError
        );
      } else {
        imageUrl =
          signed?.signedUrl ?? null;
      }
    }

    return NextResponse.json({
      announcement: {
        ...unread,
        image_url: imageUrl,
      },
    });
  } catch (error) {
    console.error(
      "GET UNREAD ANNOUNCEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải thông báo.",
        announcement: null,
      },
      { status: 500 }
    );
  }
}
