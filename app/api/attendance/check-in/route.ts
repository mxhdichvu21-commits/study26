import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const classId =
      typeof body?.classId === "string"
        ? body.classId.trim()
        : "";

    if (!classId) {
      return NextResponse.json(
        {
          error:
            "Vui lòng chọn lớp trước khi điểm danh.",
        },
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

    const { data: profile } =
      await supabase
        .from("profiles")
        .select(
          "id, role, is_active"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (
      !profile ||
      profile.role !== "student" ||
      profile.is_active !== true
    ) {
      return NextResponse.json(
        {
          error:
            "Tài khoản học sinh không hợp lệ.",
        },
        { status: 403 }
      );
    }

    /*
     * classId do client gửi lên nhưng KHÔNG được tin trực tiếp.
     * Phải kiểm tra auth.uid() có thực sự thuộc lớp đó.
     */
    const { data: membership } =
      await supabase
        .from("class_members")
        .select(
          "class_id, user_id, role"
        )
        .eq("class_id", classId)
        .eq("user_id", user.id)
        .eq("role", "student")
        .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "Bạn không thuộc lớp học này.",
        },
        { status: 403 }
      );
    }

    const { data: classData } =
      await supabase
        .from("classes")
        .select("id, name, code")
        .eq("id", classId)
        .maybeSingle();

    if (!classData) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy lớp học.",
        },
        { status: 404 }
      );
    }

    /*
     * Không nhận joined_at từ client.
     *
     * attendance_date được database sinh từ
     * joined_at theo Asia/Ho_Chi_Minh.
     */

    const { data: existing } =
      await supabase
        .from("attendance")
        .select(
          "id, student_id, class_id, status, joined_at"
        )
        .eq("student_id", user.id)
        .eq("class_id", classId)
        .eq(
          "attendance_date",
          new Intl.DateTimeFormat(
            "en-CA",
            {
              timeZone:
                "Asia/Ho_Chi_Minh",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }
          ).format(new Date())
        )
        .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        message:
          "Bạn đã điểm danh hôm nay.",
        attendance: existing,
      });
    }

    /*
     * Chỉ insert student_id + class_id + status.
     * joined_at để PostgreSQL tự dùng DEFAULT now().
     */
    const {
      data: attendance,
      error,
    } = await supabase
      .from("attendance")
      .insert({
        student_id: user.id,
        class_id: classId,
        status: "present",
      })
      .select(
        "id, student_id, class_id, status, joined_at"
      )
      .single();

    /*
     * Nếu database đã có unique index và hai request
     * chạy đồng thời, xử lý duplicate như điểm danh thành công.
     */
    if (
      error &&
      error.code === "23505"
    ) {
      const { data: duplicate } =
        await supabase
          .from("attendance")
          .select(
            "id, student_id, class_id, status, joined_at"
          )
          .eq(
            "student_id",
            user.id
          )
          .eq(
            "class_id",
            classId
          )
          .order("joined_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (duplicate) {
        return NextResponse.json({
          success: true,
          alreadyCheckedIn: true,
          message:
            "Bạn đã điểm danh hôm nay.",
          attendance: duplicate,
        });
      }
    }

    if (error) {
      console.error(
        "ATTENDANCE INSERT ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Không thể điểm danh. " +
            error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        alreadyCheckedIn: false,
        message:
          "Đã điểm danh thành công.",
        attendance: {
          id: attendance.id,
          student_id:
            attendance.student_id,
          class_id:
            attendance.class_id,
          status:
            attendance.status,
          joined_at:
            attendance.joined_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CHECK-IN ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể thực hiện điểm danh.",
      },
      { status: 500 }
    );
  }
}
