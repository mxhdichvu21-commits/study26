import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function vnDayRange(offset = 0) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const v = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const base = new Date(`${v.year}-${v.month}-${v.day}T00:00:00+07:00`);
  base.setUTCDate(base.getUTCDate() + offset);
  const end = new Date(base);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  return { start: base, end };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, is_active, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin" || profile.is_active === false) {
      return NextResponse.json({ error: "Không có quyền quản trị." }, { status: 403 });
    }

    const today = vnDayRange(0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const range = vnDayRange(i - 6);
      return {
        ...range,
        label: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(range.start),
      };
    });

    const [
      usersCount,
      studentsCount,
      teachersCount,
      classesCount,
      lessonsCount,
      liveRoomsCount,
      schedulesTodayCount,
      submissionsCount,
      completedLessonsCount,
      materialsCount,
      roomMembersWeek,
      classesAll,
      classesRecent,
      lessonsRecent,
      assignmentsRecent,
      roomsRecent,
      allNotifications,
    ] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("is_active", true),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher").eq("is_active", true),
      admin.from("classes").select("id", { count: "exact", head: true }),
      admin.from("lessons").select("id", { count: "exact", head: true }),
      admin.from("rooms").select("id", { count: "exact", head: true }).eq("status", "live"),
      admin.from("schedules").select("id", { count: "exact", head: true }).gte("starts_at", today.start.toISOString()).lte("starts_at", today.end.toISOString()),
      admin.from("submissions").select("id", { count: "exact", head: true }),
      admin.from("study_progress").select("lesson_id", { count: "exact", head: true }).not("completed_at", "is", null),
      admin.from("materials").select("id", { count: "exact", head: true }),
      admin.from("room_members").select("user_id, joined_at, left_at").gte("joined_at", days[0].start.toISOString()).lte("joined_at", days[6].end.toISOString()).order("joined_at", { ascending: false }).limit(5000),
      admin.from("classes").select("id, name"),
      admin.from("classes").select("id, name, created_at").order("created_at", { ascending: false }).limit(10),
      admin.from("lessons").select("id, title, created_at, class_id").order("created_at", { ascending: false }).limit(10),
      admin.from("assignments").select("id, title, created_at, class_id").order("created_at", { ascending: false }).limit(10),
      admin.from("rooms").select("id, name, code, status, created_at, class_id").order("created_at", { ascending: false }).limit(10),
      admin.from("notifications").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    const memberResult = await admin.from("class_members").select("class_id, user_id");
    const memberCounts = new Map<string, number>();
    for (const row of memberResult.data ?? []) memberCounts.set(row.class_id, (memberCounts.get(row.class_id) ?? 0) + 1);

    const allClassRows = (classesAll.data ?? []) as Array<{ id: string; name: string }>;
    const classNameById = new Map(allClassRows.map((c) => [c.id, c.name]));

    const topClasses = allClassRows
      .map((c) => ({ id: c.id, name: c.name, student_count: memberCounts.get(c.id) ?? 0 }))
      .sort((a, b) => b.student_count - a.student_count || a.name.localeCompare(b.name, "vi"))
      .slice(0, 5);

    const activityRows = roomMembersWeek.data ?? [];
    const activityChart = days.map((day) => {
      const rows = activityRows.filter((row) => {
        const t = new Date(row.joined_at).getTime();
        return t >= day.start.getTime() && t <= day.end.getTime();
      });
      return { date: day.label, learning: rows.length, activeUsers: new Set(rows.map((r) => r.user_id)).size };
    });

    const buckets = new Map<string, number>();
    for (const c of allClassRows) {
      const count = memberCounts.get(c.id) ?? 0;
      const label = count === 0 ? "0 học sinh" : count <= 5 ? "1–5 học sinh" : count <= 10 ? "6–10 học sinh" : "11+ học sinh";
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    }
    const order = ["0 học sinh", "1–5 học sinh", "6–10 học sinh", "11+ học sinh"];
    const classDistribution = order.filter((k) => buckets.has(k)).map((label) => ({ label, count: buckets.get(label) ?? 0 }));

    const recentActivities = [
      ...((classesRecent.data ?? []) as Array<{ id: string; name: string; created_at: string }>).map((x) => ({ id: `class-${x.id}`, title: `Lớp học được tạo: ${x.name}`, description: "Lớp học mới trong hệ thống.", created_at: x.created_at })),
      ...((lessonsRecent.data ?? []) as Array<{ id: string; title: string; created_at: string; class_id: string }>).map((x) => ({ id: `lesson-${x.id}`, title: `Bài học mới: ${x.title}`, description: classNameById.get(x.class_id) ?? "", created_at: x.created_at })),
      ...((assignmentsRecent.data ?? []) as Array<{ id: string; title: string; created_at: string; class_id: string }>).map((x) => ({ id: `assignment-${x.id}`, title: `Bài tập mới: ${x.title}`, description: classNameById.get(x.class_id) ?? "", created_at: x.created_at })),
      ...((roomsRecent.data ?? []) as Array<{ id: string; name: string; created_at: string; class_id: string }>).map((x) => ({ id: `room-${x.id}`, title: `Phòng học mới: ${x.name}`, description: classNameById.get(x.class_id) ?? "", created_at: x.created_at })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

    return NextResponse.json({
      admin: { id: user.id, name: profile.full_name || user.email || "Admin" },
      stats: {
        totalClasses: classesCount.count ?? 0,
        totalStudents: studentsCount.count ?? 0,
        totalTeachers: teachersCount.count ?? 0,
        totalLessons: lessonsCount.count ?? 0,
        learningToday: activityChart[6]?.learning ?? 0,
        activeRooms: liveRoomsCount.count ?? 0,
        todaySchedules: schedulesTodayCount.count ?? 0,
        completedLessons: completedLessonsCount.count ?? 0,
        sharedDocuments: materialsCount.count ?? 0,
        totalSubmissions: submissionsCount.count ?? 0,
      },
      recentActivities,
      topClasses,
      announcements: (allNotifications.data ?? []).map((x) => ({ id: x.id, title: x.title, description: x.body, created_at: x.created_at })),
      activityChart,
      classDistribution,
    });
  } catch (error) {
    console.error("ADMIN DASHBOARD ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải dữ liệu Admin." }, { status: 500 });
  }
}
