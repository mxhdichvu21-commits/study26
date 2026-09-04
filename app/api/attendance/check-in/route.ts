import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getVietnamDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getPreviousDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setDate(date.getDate() - 1);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roomId =
      typeof body.roomId === "string" ? body.roomId : "";

    if (!roomId) {
      return NextResponse.json(
        { error: "Thiếu roomId." },
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      profile.role !== "student" ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { error: "Tài khoản học sinh không hợp lệ." },
        { status: 403 }
      );
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("id, class_id, status")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng học." },
        { status: 404 }
      );
    }

    if (room.status !== "live") {
      return NextResponse.json(
        { error: "Buổi học đã kết thúc hoặc chưa bắt đầu." },
        { status: 409 }
      );
    }

    const { data: member } = await supabase
      .from("class_members")
      .select("class_id, user_id")
      .eq("class_id", room.class_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: "Bạn không thuộc lớp học này." },
        { status: 403 }
      );
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("id, room_id, started_at, ended_at")
      .eq("room_id", roomId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json(
        { error: "Không tìm thấy buổi học đang diễn ra." },
        { status: 409 }
      );
    }

    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("id, status, joined_at")
      .eq("session_id", session.id)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existingAttendance) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        streak: null,
        attendance: existingAttendance,
      });
    }

    const checkedAt = new Date().toISOString();

    const { data: attendance, error: attendanceError } =
      await supabase
        .from("attendance")
        .insert({
          session_id: session.id,
          student_id: user.id,
          status: "present",
          joined_at: checkedAt,
        })
        .select("id, status, joined_at")
        .single();

    if (attendanceError) {
      console.error("ATTENDANCE INSERT ERROR:", attendanceError);

      return NextResponse.json(
        {
          error:
            "Không thể điểm danh. " + attendanceError.message,
        },
        { status: 500 }
      );
    }

    const today = getVietnamDate();

    const { data: streak } = await supabase
      .from("streaks")
      .select(
        "student_id, current_streak, longest_streak, last_activity_date"
      )
      .eq("student_id", user.id)
      .maybeSingle();

    let currentStreak = 1;
    let longestStreak = 1;

    if (streak) {
      const current = streak.current_streak ?? 0;
      const longest = streak.longest_streak ?? 0;
      const lastDate = streak.last_activity_date;

      if (lastDate === today) {
        currentStreak = Math.max(current, 1);
      } else if (lastDate === getPreviousDate(today)) {
        currentStreak = current + 1;
      } else {
        currentStreak = 1;
      }

      longestStreak = Math.max(longest, currentStreak);

      const { error: updateStreakError } = await supabase
        .from("streaks")
        .update({
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_activity_date: today,
        })
        .eq("student_id", user.id);

      if (updateStreakError) {
        console.error(
          "STREAK UPDATE ERROR:",
          updateStreakError
        );
      }
    } else {
      const { error: insertStreakError } = await supabase
        .from("streaks")
        .insert({
          student_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
        });

      if (insertStreakError) {
        console.error(
          "STREAK INSERT ERROR:",
          insertStreakError
        );
      }
    }

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      attendance,
      streak: {
        currentStreak,
        longestStreak,
        date: today,
      },
    });
  } catch (error) {
    console.error("CHECK-IN ERROR:", error);

    return NextResponse.json(
      { error: "Không thể thực hiện điểm danh." },
      { status: 500 }
    );
  }
}
