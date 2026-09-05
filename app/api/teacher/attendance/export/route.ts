import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

function formatVietnamDate(
  value: string | null
) {
  if (!value) return "";

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      timeZone:
        "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(new Date(value));
}

function formatVietnamTime(
  value: string | null
) {
  if (!value) return "";

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      timeZone:
        "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  ).format(new Date(value));
}

function formatVietnamDateTime(
  value: string | null
) {
  if (!value) return "";

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      timeZone:
        "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  ).format(new Date(value));
}

export async function GET(
  request: Request
) {
  try {
    const url = new URL(
      request.url
    );

    const classId =
      url.searchParams.get(
        "classId"
      );

    const studentId =
      url.searchParams.get(
        "studentId"
      );

    if (!classId) {
      return NextResponse.json(
        { error: "Thiếu classId." },
        { status: 400 }
      );
    }

    const supabase =
      await createClient();

    const admin =
      createAdminClient();

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

    const { data: teacher } =
      await admin
        .from("profiles")
        .select(
          "id, role, is_active"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (
      !teacher ||
      teacher.role !==
        "teacher" ||
      teacher.is_active ===
        false
    ) {
      return NextResponse.json(
        {
          error:
            "Bạn không có quyền xuất điểm danh.",
        },
        { status: 403 }
      );
    }

    const { data: classRow } =
      await admin
        .from("classes")
        .select(
          "id, name, code, teacher_id"
        )
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

    const { data: members } =
      await admin
        .from("class_members")
        .select("user_id, role")
        .eq("class_id", classId)
        .eq("role", "student");

    let memberIds =
      (members || []).map(
        (item) => item.user_id
      );

    if (studentId) {
      memberIds =
        memberIds.filter(
          (id) =>
            id === studentId
        );
    }

    if (!memberIds.length) {
      const csv =
        "\uFEFF" +
        [
          [
            "STT",
            "Họ tên học sinh",
            "Email",
            "Tên lớp",
            "Mã phòng",
            "Ngày",
            "Giờ điểm danh",
            "Thời gian đầy đủ",
            "Trạng thái",
          ]
            .map(csvEscape)
            .join(","),
        ].join("\r\n");

      return new Response(
        csv,
        {
          headers: {
            "Content-Type":
              "text/csv; charset=utf-8",
            "Content-Disposition":
              `attachment; filename*=UTF-8''diem-danh-${encodeURIComponent(
                classRow.name
              )}.csv`,
          },
        }
      );
    }

    const [
      profilesResult,
      studentsResult,
      roomsResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, full_name"
        )
        .in("id", memberIds),

      admin
        .from("students")
        .select("id")
        .in("id", memberIds),

      admin
        .from("rooms")
        .select(
          "id, class_id, code"
        )
        .eq("class_id", classId),
    ]);

    const profiles =
      profilesResult.data || [];

    const rooms =
      roomsResult.data || [];

    const roomIds =
      rooms.map(
        (room) => room.id
      );

    const profileMap =
      new Map(
        profiles.map(
          (profile) => [
            profile.id,
            profile,
          ]
        )
      );

    const roomMap =
      new Map(
        rooms.map(
          (room) => [
            room.id,
            room,
          ]
        )
      );

    const { data: sessions } =
      roomIds.length
        ? await admin
            .from("sessions")
            .select(
              "id, room_id, started_at"
            )
            .in(
              "room_id",
              roomIds
            )
        : { data: [] };

    const sessionIds =
      (sessions || []).map(
        (session) =>
          session.id
      );

    const sessionMap =
      new Map(
        (sessions || []).map(
          (session) => [
            session.id,
            session,
          ]
        )
      );

    const { data: attendance } =
      sessionIds.length
        ? await admin
            .from("attendance")
            .select(
              "id, session_id, student_id, status, joined_at"
            )
            .in(
              "session_id",
              sessionIds
            )
            .in(
              "student_id",
              memberIds
            )
            .order(
              "joined_at",
              {
                ascending: true,
              }
            )
        : { data: [] };

    const emailMap =
      new Map<string, string>();

    const profileRows =
      profiles || [];

    for (
      const profile of profileRows
    ) {
      /*
       * profiles hiện tại không có email.
       * Email sẽ được lấy từ Auth Admin API.
       */
    }

    const {
      data: authUsersResult,
      error: authUsersError,
    } =
      await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (
      !authUsersError &&
      authUsersResult?.users
    ) {
      for (
        const authUser of
          authUsersResult.users
      ) {
        if (
          memberIds.includes(
            authUser.id
          )
        ) {
          emailMap.set(
            authUser.id,
            authUser.email ||
              ""
          );
        }
      }
    }

    const rows: string[] = [];

    let index = 1;

    for (
      const item of
        attendance || []
    ) {
      const session =
        sessionMap.get(
          item.session_id
        );

      const room = session
        ? roomMap.get(
            session.room_id
          )
        : null;

      const profile =
        profileMap.get(
          item.student_id
        );

      rows.push(
        [
          index++,
          profile?.full_name ||
            "Chưa cập nhật tên",
          emailMap.get(
            item.student_id
          ) || "",
          classRow.name,
          room?.code || "",
          formatVietnamDate(
            item.joined_at
          ),
          formatVietnamTime(
            item.joined_at
          ),
          formatVietnamDateTime(
            item.joined_at
          ),
          item.status === "late"
            ? "Đi muộn"
            : "Đã điểm danh",
        ]
          .map(csvEscape)
          .join(",")
      );
    }

    const header = [
      "STT",
      "Họ tên học sinh",
      "Email",
      "Tên lớp",
      "Mã phòng",
      "Ngày",
      "Giờ điểm danh",
      "Thời gian đầy đủ",
      "Trạng thái",
    ]
      .map(csvEscape)
      .join(",");

    const csv =
      "\uFEFF" +
      [header, ...rows].join(
        "\r\n"
      );

    const dateStamp =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      )
        .format(new Date())
        .replaceAll(
          "/",
          "-"
        );

    return new Response(
      csv,
      {
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",
          "Content-Disposition":
            `attachment; filename*=UTF-8''diem-danh-${encodeURIComponent(
              classRow.name
            )}-${dateStamp}.csv`,
          "Cache-Control":
            "no-store",
        },
      }
    );
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
