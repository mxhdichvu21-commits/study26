import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

function formatVietnamDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatVietnamTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatVietnamDateTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getVietnamToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getStatusLabel(
  attendance: {
    status: string;
  } | null
) {
  if (!attendance) {
    return "Vắng";
  }

  if (attendance.status === "late") {
    return "Đi muộn";
  }

  return "Đã điểm danh";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const classId = (
      url.searchParams.get("classId") || ""
    ).trim();

    const dateParam = (
      url.searchParams.get("date") || ""
    ).trim();

    if (!classId) {
      return NextResponse.json(
        { error: "Thiếu classId." },
        { status: 400 }
      );
    }

    const selectedDate =
      /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : getVietnamToday();

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

    const { data: teacher } = await admin
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !teacher ||
      teacher.role !== "teacher" ||
      teacher.is_active === false
    ) {
      return NextResponse.json(
        {
          error:
            "Bạn không có quyền xuất điểm danh.",
        },
        { status: 403 }
      );
    }

    const { data: classRow } = await admin
      .from("classes")
      .select("id, name, code, teacher_id")
      .eq("id", classId)
      .eq("teacher_id", user.id)
      .maybeSingle();

    if (!classRow) {
      return NextResponse.json(
        {
          error:
            "Bạn không quản lý lớp này.",
        },
        { status: 403 }
      );
    }

    // Lấy toàn bộ học sinh của lớp.
    const { data: members, error: membersError } =
      await admin
        .from("class_members")
        .select("user_id, role")
        .eq("class_id", classId)
        .eq("role", "student");

    if (membersError) {
      throw membersError;
    }

    const memberIds = (members ?? []).map(
      (member) => member.user_id
    );

    const [
      profilesResult,
      studentsResult,
      attendanceResult,
    ] = await Promise.all([
      memberIds.length
        ? admin
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", memberIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      memberIds.length
        ? admin
            .from("students")
            .select("id, student_code")
            .in("id", memberIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      admin
        .from("attendance")
        .select(
          "id, student_id, class_id, status, joined_at, left_at, attendance_date"
        )
        .eq("class_id", classId)
        .eq("attendance_date", selectedDate)
        .order("joined_at", {
          ascending: true,
        }),
    ]);

    if (profilesResult.error) {
      throw profilesResult.error;
    }

    if (studentsResult.error) {
      throw studentsResult.error;
    }

    if (attendanceResult.error) {
      throw attendanceResult.error;
    }

    const profiles = profilesResult.data ?? [];
    const students = studentsResult.data ?? [];
    const attendanceRows = attendanceResult.data ?? [];

    const profileMap = new Map(
      profiles.map((profile) => [
        profile.id,
        profile,
      ])
    );

    const studentMap = new Map(
      students.map((student) => [
        student.id,
        student,
      ])
    );

    const attendanceMap = new Map<
      string,
      (typeof attendanceRows)[number]
    >();

    for (const attendance of attendanceRows) {
      // Nếu vì bất kỳ lý do gì có nhiều dòng,
      // lấy dòng điểm danh mới nhất.
      if (!attendanceMap.has(attendance.student_id)) {
        attendanceMap.set(
          attendance.student_id,
          attendance
        );
      }
    }

    // Lấy email từ Supabase Auth.
    const emailMap = new Map<string, string>();

    if (memberIds.length) {
      for (let page = 1; page <= 20; page++) {
        const { data, error } =
          await admin.auth.admin.listUsers({
            page,
            perPage: 1000,
          });

        if (error) {
          console.error(
            "EXPORT AUTH USERS ERROR:",
            error
          );
          break;
        }

        const users = data?.users ?? [];

        for (const authUser of users) {
          if (memberIds.includes(authUser.id)) {
            emailMap.set(
              authUser.id,
              authUser.email || ""
            );
          }
        }

        if (users.length < 1000) {
          break;
        }
      }
    }

    const header = [
      "STT",
      "Họ tên học sinh",
      "Email",
      "Tên lớp",
      "Mã lớp",
      "Ngày",
      "Giờ điểm danh",
      "Thời gian đầy đủ",
      "Trạng thái",
      "Mã học sinh",
    ]
      .map(csvEscape)
      .join(",");

    const rows: string[] = [];

    // Xuất TOÀN BỘ học sinh.
    // Người chưa điểm danh cũng xuất với trạng thái "Vắng".
    memberIds.forEach((studentId, index) => {
      const profile = profileMap.get(studentId);
      const student = studentMap.get(studentId);
      const attendance =
        attendanceMap.get(studentId) ?? null;

      rows.push(
        [
          index + 1,
          profile?.full_name ||
            "Chưa cập nhật tên",
          emailMap.get(studentId) || "",
          classRow.name,
          classRow.code,
          formatVietnamDate(
            attendance?.joined_at ?? null
          ) || selectedDate.split("-").reverse().join("/"),
          formatVietnamTime(
            attendance?.joined_at ?? null
          ),
          formatVietnamDateTime(
            attendance?.joined_at ?? null
          ),
          getStatusLabel(attendance),
          student?.student_code || "",
        ]
          .map(csvEscape)
          .join(",")
      );
    });

    const csv =
      "\uFEFF" +
      [header, ...rows].join("\r\n");

    const safeClassName =
      classRow.name
        .replace(/[\\/:*?"<>|]/g, "-")
        .trim() || "lop-hoc";

    const fileDate =
      selectedDate.replaceAll("-", "-");

    return new Response(csv, {
      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",
        "Content-Disposition":
          `attachment; filename*=UTF-8''diem-danh-${encodeURIComponent(
            safeClassName
          )}-${fileDate}.csv`,
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error(
      "ATTENDANCE EXPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể xuất điểm danh.",
      },
      { status: 500 }
    );
  }
}
