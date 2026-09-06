import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function vietnamDayRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) throw new Error("Không xác định được ngày hiện tại.");
  return {
    start: new Date(`${year}-${month}-${day}T00:00:00+07:00`),
    end: new Date(`${year}-${month}-${day}T23:59:59.999+07:00`),
  };
}

function dayKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function statusForRange(startsAt: string, endsAt: string) {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "upcoming" as const;
  if (now >= start && now <= end) return "live" as const;
  if (now > end) return "finished" as const;
  return "upcoming" as const;
}

function formatSchedule(startsAt: string, endsAt: string) {
  const fmt = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return `${fmt.format(new Date(startsAt))} - ${fmt.format(new Date(endsAt))}`;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "teacher" || !profile.is_active) {
      return NextResponse.json({ error: "Tài khoản không có quyền giáo viên." }, { status: 403 });
    }

    const admin = createAdminClient();

    const [classesRes, schedulesRes, roomsRes, notificationsRes] = await Promise.all([
      admin.from("classes").select("id, name, code, created_at").eq("teacher_id", user.id).order("created_at", { ascending: false }),
      admin.from("schedules").select("id, class_id, room_id, starts_at, ends_at, created_at").eq("teacher_id", user.id).order("starts_at", { ascending: true }),
      admin.from("rooms").select("id, class_id, teacher_id, name, code, status, scheduled_at, created_at").eq("teacher_id", user.id).order("created_at", { ascending: false }),
      admin.from("notifications").select("id, title, body, type, is_read, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    if (classesRes.error) throw classesRes.error;
    if (schedulesRes.error) throw schedulesRes.error;
    if (roomsRes.error) throw roomsRes.error;
    if (notificationsRes.error) throw notificationsRes.error;

    const classes = classesRes.data ?? [];
    const schedules = schedulesRes.data ?? [];
    const rooms = roomsRes.data ?? [];
    const notifications = notificationsRes.data ?? [];
    const classIds = classes.map((c) => c.id);

    let members: { class_id: string; user_id: string }[] = [];
    if (classIds.length) {
      const membersRes = await admin.from("class_members").select("class_id, user_id").in("class_id", classIds);
      if (membersRes.error) throw membersRes.error;
      members = membersRes.data ?? [];
    }

    const studentIds = new Set(members.map((m) => m.user_id));
    const studentsByClass = new Map<string, number>();
    for (const m of members) studentsByClass.set(m.class_id, (studentsByClass.get(m.class_id) ?? 0) + 1);

    const today = vietnamDayRange();
    const todaySchedules = schedules.filter((s) => {
      const start = new Date(s.starts_at);
      return start >= today.start && start <= today.end;
    });

    const classMap = new Map(classes.map((c) => [c.id, c]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const dashboardClasses = classes.slice(0, 10).map((c) => {
      const schedule = schedules.find((s) => s.class_id === c.id && new Date(s.ends_at).getTime() >= Date.now());
      const liveRoom = rooms.find((r) => r.class_id === c.id && r.status === "live");
      const activeRoom = liveRoom ?? rooms.find((r) => r.class_id === c.id && r.status !== "ended");
      return {
        id: c.id,
        name: c.name,
        studentCount: studentsByClass.get(c.id) ?? 0,
        scheduleText: schedule ? formatSchedule(schedule.starts_at, schedule.ends_at) : undefined,
        status: schedule ? statusForRange(schedule.starts_at, schedule.ends_at) : liveRoom ? "live" : "upcoming",
        roomCode: activeRoom?.code ?? null,
      };
    });

    const dashboardSchedules = todaySchedules.map((s) => {
      const room = s.room_id ? roomMap.get(s.room_id) : rooms.find((r) => r.class_id === s.class_id && r.status !== "ended");
      return {
        id: s.id,
        classId: s.class_id,
        className: classMap.get(s.class_id)?.name ?? "Lớp học",
        roomCode: room?.code ?? null,
        startTime: s.starts_at,
        endTime: s.ends_at,
        status: statusForRange(s.starts_at, s.ends_at),
      };
    });

    const weeklyStats = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = dayKey(date);
      const daySchedules = schedules.filter((s) => dayKey(new Date(s.starts_at)) === key);
      const dayStudents = new Set<string>();
      for (const schedule of daySchedules) {
        for (const member of members) {
          if (member.class_id === schedule.class_id) dayStudents.add(member.user_id);
        }
      }
      return {
        label: new Intl.DateTimeFormat("vi-VN", { weekday: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date),
        classes: daySchedules.length,
        students: dayStudents.size,
      };
    });

    const teachingMinutes = schedules.reduce((total, s) => {
      const start = new Date(s.starts_at).getTime();
      const end = new Date(s.ends_at).getTime();
      return Number.isFinite(start) && Number.isFinite(end) && end > start ? total + Math.floor((end - start) / 60000) : total;
    }, 0);

    const activities = [
      ...classes.slice(0, 6).map((c) => ({ id: `class-${c.id}`, title: "Lớp học", description: `Lớp ${c.name}`, createdAt: c.created_at })),
      ...rooms.slice(0, 6).map((r) => ({ id: `room-${r.id}`, title: "Phòng học", description: `${r.name} • ${r.code}`, createdAt: r.created_at })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    return NextResponse.json({
      teacher: { id: profile.id, name: profile.full_name || "Giáo viên", avatar_url: profile.avatar_url ?? null },
      stats: {
        totalClasses: classes.length,
        totalStudents: studentIds.size,
        todaySchedules: todaySchedules.length,
        teachingMinutes,
      },
      classes: dashboardClasses,
      todaySchedules: dashboardSchedules,
      activities,
      notifications: notifications.map((n) => ({ id: n.id, title: n.title, description: n.body, createdAt: n.created_at })),
      weeklyStats,
    });
  } catch (error) {
    console.error("TEACHER DASHBOARD ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải dashboard giáo viên." }, { status: 500 });
  }
}
