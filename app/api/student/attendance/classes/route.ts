import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Bạn chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: memberships } =
      await supabase
        .from("class_members")
        .select(
          "class_id, role"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "role",
          "student"
        );

    const classIds =
      [
        ...new Set(
          (memberships || []).map(
            (item) =>
              item.class_id
          )
        ),
      ];

    if (!classIds.length) {
      return NextResponse.json({
        classes: [],
      });
    }

    const { data: classes, error } =
      await supabase
        .from("classes")
        .select(
          "id, name, code"
        )
        .in(
          "id",
          classIds
        )
        .order(
          "name",
          {
            ascending: true,
          }
        );

    if (error) {
      throw error;
    }

    return NextResponse.json({
      classes: classes || [],
    });
  } catch (error) {
    console.error(
      "STUDENT ATTENDANCE CLASSES ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể tải lớp học.",
      },
      { status: 500 }
    );
  }
}
