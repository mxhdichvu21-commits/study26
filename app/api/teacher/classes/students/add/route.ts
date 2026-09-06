import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const classId = String(body?.classId ?? "").trim();
    const studentEmail = String(
      body?.studentEmail ?? ""
    )
      .trim()
      .toLowerCase();

    if (!classId || !studentEmail) {
      return NextResponse.json(
        {
          error: "Thiếu classId hoặc email học sinh.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    if (
      !classData ||
      classData.teacher_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Không quản lý lớp này." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // Tìm tài khoản trong Supabase Auth
    let authStudent = null;

    for (let page = 1; page <= 20; page++) {
      const { data, error } =
        await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (error) {
        console.error(
          "ADD STUDENT AUTH SEARCH ERROR:",
          error
        );

        return NextResponse.json(
          {
            error:
              "Không thể tìm tài khoản học sinh.",
          },
          { status: 500 }
        );
      }

      authStudent = (data?.users ?? []).find(
        (item) =>
          (item.email ?? "")
            .trim()
            .toLowerCase() === studentEmail
      );

      if (authStudent) {
        break;
      }

      if ((data?.users ?? []).length < 1000) {
        break;
      }
    }

    if (!authStudent) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy tài khoản với email này.",
        },
        { status: 404 }
      );
    }

    const studentId = authStudent.id;

    // Kiểm tra profile
    const { data: existingProfile } = await admin
      .from("profiles")
      .select(
        "id, full_name, avatar_url, role, is_active"
      )
      .eq("id", studentId)
      .maybeSingle();

    let student = existingProfile;

    // Nếu Auth có user nhưng profiles chưa có,
    // tạo profile student tự động.
    if (!student) {
      const metadataName =
        typeof authStudent.user_metadata?.full_name ===
        "string"
          ? authStudent.user_metadata.full_name.trim()
          : "";

      const fallbackName =
        metadataName ||
        (authStudent.email
          ? authStudent.email.split("@")[0]
          : "Học sinh");

      const { data: createdProfile, error: profileError } =
        await admin
          .from("profiles")
          .insert({
            id: studentId,
            full_name: fallbackName,
            role: "student",
            is_active: true,
          })
          .select(
            "id, full_name, avatar_url, role, is_active"
          )
          .single();

      if (profileError) {
        // Có thể profile vừa được tạo đồng thời
        // bởi trigger hoặc request khác.
        if (profileError.code === "23505") {
          const { data: retryProfile } = await admin
            .from("profiles")
            .select(
              "id, full_name, avatar_url, role, is_active"
            )
            .eq("id", studentId)
            .single();

          student = retryProfile;
        } else {
          console.error(
            "CREATE STUDENT PROFILE ERROR:",
            profileError
          );

          return NextResponse.json(
            {
              error:
                "Không thể tạo hồ sơ học sinh: " +
                profileError.message,
            },
            { status: 500 }
          );
        }
      } else {
        student = createdProfile;
      }
    }

    if (!student) {
      return NextResponse.json(
        {
          error:
            "Không thể tạo hồ sơ học sinh.",
        },
        { status: 500 }
      );
    }

    // Không cho thêm tài khoản không phải student
    if (student.role !== "student") {
      // Nếu profile tồn tại nhưng role đang sai,
      // không tự ý đổi role.
      return NextResponse.json(
        {
          error:
            "Tài khoản này không có vai trò học sinh.",
        },
        { status: 400 }
      );
    }

    if (!student.is_active) {
      return NextResponse.json(
        {
          error:
            "Tài khoản học sinh này đang bị khóa.",
        },
        { status: 400 }
      );
    }

    // Kiểm tra đã thuộc lớp chưa
    const { data: existingMember } = await admin
      .from("class_members")
      .select("user_id")
      .eq("class_id", classId)
      .eq("user_id", studentId)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        student: {
          id: studentId,
          full_name: student.full_name,
          email: authStudent.email ?? studentEmail,
        },
      });
    }

    // Thêm vào lớp
    const { error: insertError } = await admin
      .from("class_members")
      .insert({
        class_id: classId,
        user_id: studentId,
        role: "student",
      });

    if (insertError) {
      console.error(
        "ADD STUDENT INSERT ERROR:",
        insertError
      );

      if (insertError.code === "23505") {
        return NextResponse.json({
          success: true,
          alreadyJoined: true,
          student: {
            id: studentId,
            full_name: student.full_name,
            email:
              authStudent.email ?? studentEmail,
          },
        });
      }

      return NextResponse.json(
        {
          error:
            insertError.message ||
            "Không thể thêm học sinh.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      student: {
        id: studentId,
        full_name: student.full_name,
        email: authStudent.email ?? studentEmail,
      },
    });
  } catch (error) {
    console.error("ADD STUDENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể thêm học sinh.",
      },
      { status: 500 }
    );
  }
}
