import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const url = new URL(request.url);
    const classId = (url.searchParams.get("classId") || "").trim();
    const q = (url.searchParams.get("q") || "").trim();

    if (!classId) {
      return NextResponse.json(
        { error: "Thiếu classId." },
        { status: 400 }
      );
    }

    if (!q) {
      return NextResponse.json({
        students: [],
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: teacher } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      !teacher ||
      teacher.role !== "teacher" ||
      !teacher.is_active
    ) {
      return NextResponse.json(
        { error: "Không có quyền." },
        { status: 403 }
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

    const normalizedEmail = q.toLowerCase();

    const admin = createAdminClient();

    let foundUser:
      | {
          id: string;
          email?: string | null;
        }
      | null = null;

    for (let page = 1; page <= 20; page++) {
      const { data, error } =
        await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (error) {
        console.error(
          "SEARCH AUTH USERS ERROR:",
          error
        );

        return NextResponse.json(
          { error: "Không thể tìm tài khoản học sinh." },
          { status: 500 }
        );
      }

      const users = data?.users ?? [];

      const exactUser = users.find(
        (item) =>
          (item.email || "").trim().toLowerCase() ===
          normalizedEmail
      );

      if (exactUser) {
        foundUser = {
          id: exactUser.id,
          email: exactUser.email,
        };
        break;
      }

      if (users.length < 1000) {
        break;
      }
    }

    if (!foundUser) {
      return NextResponse.json({
        students: [],
      });
    }

    const { data: student, error: studentError } = await admin
      .from("profiles")
      .select(
        "id, full_name, avatar_url, role, is_active"
      )
      .eq("id", foundUser.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({
        students: [],
      });
    }

    if (
      student.role !== "student" ||
      !student.is_active
    ) {
      return NextResponse.json({
        students: [],
      });
    }

    const { data: member } = await admin
      .from("class_members")
      .select("user_id")
      .eq("class_id", classId)
      .eq("user_id", student.id)
      .maybeSingle();

    return NextResponse.json({
      students: [
        {
          ...student,
          email: foundUser.email || "",
          alreadyJoined: !!member,
        },
      ],
    });
  } catch (error) {
    console.error(
      "SEARCH STUDENTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tìm học sinh.",
      },
      { status: 500 }
    );
  }
}
