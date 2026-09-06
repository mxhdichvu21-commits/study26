import Link from "next/link";
import LiveRoomBanner from "@/components/student/live-room-banner";
import StudentLiveRefresh from "@/components/student/student-live-refresh";
import StudentAttendancePanel from "@/components/student/student-attendance-panel";
import { redirect } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Clock3,
  Flame,
  LogOut,
  Target,
  Trophy,
  Video,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import "./student-dashboard.css";

export const dynamic = "force-dynamic";

type ClassView = {
  id: string;
  name: string;
  code: string | null;
  teacherName: string;
  progress: number;
};

type ScheduleView = {
  id: string;
  className: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  roomId: string | null;
  roomName: string | null;
  roomCode: string | null;
  roomStatus: string | null;
};

type AssignmentView = {
  id: string;
  title: string;
  className: string;
  dueAt: string | null;
};

function vnDayBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts
      .filter((item) => item.type !== "literal")
      .map((item) => [item.type, item.value])
  );

  const day = `${values.year}-${values.month}-${values.day}`;

  return {
    start: new Date(`${day}T00:00:00+07:00`),
    end: new Date(`${day}T23:59:59.999+07:00`),
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}h ${mins}m`;
}

function getInitial(name: string | null | undefined) {
  return (name?.trim().charAt(0) || "H").toUpperCase();
}

export default async function StudentDashboard() {
  const auth = await getCurrentProfile();

  if (!auth) {
    redirect("/login");
  }

  if (auth.profile.role !== "student") {
    if (auth.profile.role === "teacher") redirect("/teacher");
    if (auth.profile.role === "admin") redirect("/admin");
    redirect("/login");
  }

  const supabase = await createClient();
  const studentId = auth.profile.id;

  const { data: membershipRows, error: membershipError } = await supabase
    .from("class_members")
    .select("class_id, joined_at")
    .eq("user_id", studentId);

  if (membershipError) {
    console.error("STUDENT MEMBERSHIP ERROR:", membershipError);
  }

  const classIds = [
    ...new Set((membershipRows ?? []).map((item) => item.class_id).filter(Boolean)),
  ];

  let rawClasses: Array<{
    id: string;
    name: string;
    code: string | null;
    teacher_id: string | null;
  }> = [];

  if (classIds.length) {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, code, teacher_id")
      .in("id", classIds)
      .order("name", { ascending: true });

    if (error) {
      console.error("STUDENT CLASSES ERROR:", error);
    }

    rawClasses = data ?? [];
  }

  const teacherIds = [
    ...new Set(rawClasses.map((item) => item.teacher_id).filter(Boolean)),
  ] as string[];

  let teacherProfiles: Array<{ id: string; full_name: string | null }> = [];

  if (teacherIds.length) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds);

    if (error) {
      console.error("STUDENT TEACHERS ERROR:", error);
    }

    teacherProfiles = data ?? [];
  }

  const teacherNameById = new Map(
    teacherProfiles.map((teacher) => [teacher.id, teacher.full_name || "Giáo viên"])
  );

  const classNameById = new Map(
    rawClasses.map((item) => [item.id, item.name])
  );

  let lessons: Array<{ id: string; class_id: string }> = [];

  if (classIds.length) {
    const { data, error } = await supabase
      .from("lessons")
      .select("id, class_id")
      .in("class_id", classIds);

    if (error) {
      console.error("STUDENT LESSONS ERROR:", error);
    }

    lessons = data ?? [];
  }

  const lessonClassById = new Map(
    lessons.map((lesson) => [lesson.id, lesson.class_id])
  );

  const { data: studyProgress, error: studyProgressError } = await supabase
    .from("study_progress")
    .select("lesson_id, completed_at, last_slide_position")
    .eq("student_id", studentId);

  if (studyProgressError) {
    console.error("STUDENT STUDY PROGRESS ERROR:", studyProgressError);
  }

  const completedLessons =
    (studyProgress ?? []).filter((item) => item.completed_at !== null).length;

  const activeLessons = (studyProgress ?? []).length;

  const completedByClass = new Map<string, number>();
  const progressByClass = new Map<string, number>();

  for (const lesson of lessons) {
    progressByClass.set(
      lesson.class_id,
      (progressByClass.get(lesson.class_id) ?? 0) + 1
    );
  }

  for (const item of studyProgress ?? []) {
    if (item.completed_at === null) continue;
    const classId = lessonClassById.get(item.lesson_id);
    if (!classId) continue;
    completedByClass.set(
      classId,
      (completedByClass.get(classId) ?? 0) + 1
    );
  }

  const classes: ClassView[] = rawClasses.map((item) => {
    const totalLessons = progressByClass.get(item.id) ?? 0;
    const completed = completedByClass.get(item.id) ?? 0;

    return {
      id: item.id,
      name: item.name,
      code: item.code,
      teacherName: item.teacher_id
        ? teacherNameById.get(item.teacher_id) || "Giáo viên"
        : "Giáo viên",
      progress:
        totalLessons > 0
          ? Math.round((completed / totalLessons) * 100)
          : 0,
    };
  });

  let rawAssignments: Array<{
    id: string;
    class_id: string;
    title: string;
    due_at: string | null;
    points: number | null;
    status: string | null;
  }> = [];

  if (classIds.length) {
    const { data, error } = await supabase
      .from("assignments")
      .select("id, class_id, title, due_at, points, status")
      .in("class_id", classIds)
      .order("due_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("STUDENT ASSIGNMENTS ERROR:", error);
    }

    rawAssignments = data ?? [];
  }

  const assignmentIds = rawAssignments.map((item) => item.id);

  let submissions: Array<{
    assignment_id: string;
    status: string | null;
  }> = [];

  if (assignmentIds.length) {
    const { data, error } = await supabase
      .from("submissions")
      .select("assignment_id, status")
      .eq("student_id", studentId)
      .in("assignment_id", assignmentIds);

    if (error) {
      console.error("STUDENT SUBMISSIONS ERROR:", error);
    }

    submissions = data ?? [];
  }

  const submittedAssignmentIds = new Set(
    submissions.map((item) => item.assignment_id)
  );

  const pendingAssignments: AssignmentView[] = rawAssignments
    .filter((item) => !submittedAssignmentIds.has(item.id))
    .map((item) => ({
      id: item.id,
      title: item.title,
      className: classNameById.get(item.class_id) || "Lớp học",
      dueAt: item.due_at,
    }));

  let gradeRows: Array<{ submission_id: string; score: number | null }> = [];

  if (submissions.length) {
    const submissionIds = submissions.map((item) => item.assignment_id);

    const { data: studentSubmissions, error: submissionError } = await supabase
      .from("submissions")
      .select("id, assignment_id")
      .eq("student_id", studentId)
      .in("assignment_id", submissionIds);

    if (submissionError) {
      console.error("STUDENT GRADED SUBMISSIONS ERROR:", submissionError);
    }

    const ids = (studentSubmissions ?? []).map((item) => item.id);

    if (ids.length) {
      const { data, error } = await supabase
        .from("grades")
        .select("submission_id, score")
        .in("submission_id", ids);

      if (error) {
        console.error("STUDENT GRADES ERROR:", error);
      }

      gradeRows = data ?? [];
    }
  }

  const scores = gradeRows
    .map((item) => Number(item.score))
    .filter((score) => Number.isFinite(score));

  const averageScore =
    scores.length > 0
      ? Number(
          (
            scores.reduce((sum, score) => sum + score, 0) / scores.length
          ).toFixed(1)
        )
      : 0;

  const { data: streak, error: streakError } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak")
    .eq("student_id", studentId)
    .maybeSingle();

  if (streakError) {
    console.error("STUDENT STREAK ERROR:", streakError);
  }

  const { start: todayStart, end: todayEnd } = vnDayBounds();

  let rawSchedules: Array<{
    id: string;
    class_id: string;
    starts_at: string;
    ends_at: string;
    room_id: string | null;
  }> = [];

  if (classIds.length) {
    const { data, error } = await supabase
      .from("schedules")
      .select("id, class_id, starts_at, ends_at, room_id")
      .in("class_id", classIds)
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString())
      .order("starts_at", { ascending: true });

    if (error) {
      console.error("STUDENT SCHEDULES ERROR:", error);
    }

    rawSchedules = data ?? [];
  }

  const scheduleRoomIds = [
    ...new Set(rawSchedules.map((item) => item.room_id).filter(Boolean)),
  ] as string[];

  let roomRows: Array<{
    id: string;
    name: string | null;
    code: string | null;
    teacher_id: string | null;
    status: string | null;
  }> = [];

  if (scheduleRoomIds.length) {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, code, teacher_id, status")
      .in("id", scheduleRoomIds);

    if (error) {
      console.error("STUDENT SCHEDULE ROOMS ERROR:", error);
    }

    roomRows = data ?? [];
  }

  const roomById = new Map(roomRows.map((room) => [room.id, room]));

  const scheduleTeacherIds = [
    ...new Set(
      [
        ...rawClasses.map((item) => item.teacher_id),
        ...roomRows.map((item) => item.teacher_id),
      ].filter(Boolean)
    ),
  ] as string[];

  if (scheduleTeacherIds.length > teacherProfiles.length) {
    const missingTeacherIds = scheduleTeacherIds.filter(
      (id) => !teacherNameById.has(id)
    );

    if (missingTeacherIds.length) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", missingTeacherIds);

      if (error) {
        console.error("STUDENT SCHEDULE TEACHERS ERROR:", error);
      }

      for (const teacher of data ?? []) {
        teacherNameById.set(
          teacher.id,
          teacher.full_name || "Giáo viên"
        );
      }
    }
  }

  const todaySchedules: ScheduleView[] = rawSchedules.map((item) => {
    const room = item.room_id ? roomById.get(item.room_id) : undefined;
    const classRecord = rawClasses.find(
      (classItem) => classItem.id === item.class_id
    );

    const teacherName =
      (room?.teacher_id && teacherNameById.get(room.teacher_id)) ||
      (classRecord?.teacher_id &&
        teacherNameById.get(classRecord.teacher_id)) ||
      "Giáo viên";

    return {
      id: item.id,
      className: classNameById.get(item.class_id) || "Lớp học",
      teacherName,
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      roomId: item.room_id,
      roomName: room?.name || null,
      roomCode: room?.code || null,
      roomStatus: room?.status || null,
    };
  });

  const { data: roomMemberships, error: roomMembershipError } = await supabase
    .from("room_members")
    .select("joined_at, left_at")
    .eq("user_id", studentId);

  if (roomMembershipError) {
    console.error("STUDENT ROOM TIME ERROR:", roomMembershipError);
  }

  let studySeconds = 0;
  const now = Date.now();

  for (const session of roomMemberships ?? []) {
    const joinedAt = new Date(session.joined_at).getTime();
    if (!Number.isFinite(joinedAt)) continue;

    const leftAt = session.left_at
      ? new Date(session.left_at).getTime()
      : now;

    if (!Number.isFinite(leftAt) || leftAt <= joinedAt) continue;

    studySeconds += leftAt - joinedAt;
  }

  const studyMinutes = Math.floor(studySeconds / 60000);

  const assignmentTitleById = new Map(
    rawAssignments.map((item) => [item.id, item.title])
  );

  const { data: deadlines, error: deadlinesError } = await supabase
    .from("deadlines")
    .select("id, assignment_id, due_at, reminder_at")
    .eq("user_id", studentId)
    .order("due_at", { ascending: true })
    .limit(10);

  if (deadlinesError) {
    console.error("STUDENT DEADLINES ERROR:", deadlinesError);
  }

  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select("id, title, body, type, is_read, created_at")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (notificationsError) {
    console.error("STUDENT NOTIFICATIONS ERROR:", notificationsError);
  }

  const currentStreak = Math.max(0, Number(streak?.current_streak ?? 0));
  const longestStreak = Math.max(0, Number(streak?.longest_streak ?? 0));

  const achievementCount =
    Number(currentStreak > 0) +
    Number(completedLessons > 0) +
    Number(scores.length > 0);

  return (
    <div className="student-shell">
      <aside className="student-sidebar">
        <div>
          <div className="student-brand">
            <Link href="/" className="student-brand-link">
              <img
                src="/images/study26-logo.png"
                alt="Study26"
                className="student-brand-logo"
              />
            </Link>
            <div className="student-brand-role">Học sinh</div>
          </div>

          <nav className="student-nav">
            <Link href="/student" className="student-nav-item active">
              <BookOpen size={18} />
              <span>Trang chủ</span>
            </Link>

            <Link href="/student/join-room" className="student-nav-item">
              <Video size={18} />
              <span>Vào phòng</span>
            </Link>

            <a href="#classes" className="student-nav-item">
              <BookOpen size={18} />
              <span>Lớp học</span>
            </a>

            <a href="#schedule" className="student-nav-item">
              <CalendarDays size={18} />
              <span>Lịch học</span>
            </a>

            <a href="#lessons" className="student-nav-item">
              <BookOpen size={18} />
              <span>Bài học</span>
            </a>

            <a href="#assignments" className="student-nav-item">
              <Target size={18} />
              <span>Bài tập</span>
            </a>

            <a href="#notifications" className="student-nav-item">
              <Bell size={18} />
              <span>Thông báo</span>
              {notifications && notifications.length > 0 ? (
                <span className="student-nav-badge">
                  {notifications.length}
                </span>
              ) : null}
            </a>

            <a href="#achievements" className="student-nav-item">
              <Trophy size={18} />
              <span>Thành tích</span>
            </a>
          </nav>
        </div>

        <Link href="/login" className="student-nav-item student-logout">
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </Link>
      </aside>

      <main className="student-main">
        <StudentAttendancePanel />
        <StudentLiveRefresh />
        <LiveRoomBanner />

        <header className="student-topbar">
          <div>
            <span className="student-kicker">DASHBOARD</span>
            <h1>
              Xin chào, {auth.profile.full_name || "Học sinh"}! 👋
            </h1>
            <p>Chúc bạn có một ngày học tập thật hiệu quả!</p>
          </div>

          <div className="student-topbar-actions">
            <div className="student-streak-mini">
              <Flame size={18} />
              <div>
                <span>Chuỗi học tập</span>
                <strong>{currentStreak} ngày</strong>
              </div>
            </div>

            <Link href="#notifications" className="student-icon-button">
              <Bell size={19} />
              {notifications && notifications.length > 0 ? (
                <span>{notifications.length}</span>
              ) : null}
            </Link>

            <Link href="/profile" className="student-profile-button">
              <div className="student-avatar">
                {auth.profile.avatar_url ? (
                  <img
                    src={auth.profile.avatar_url}
                    alt="Ảnh đại diện"
                  />
                ) : (
                  getInitial(auth.profile.full_name)
                )}
              </div>

              <div>
                <strong>{auth.profile.full_name || "Học sinh"}</strong>
                <span>Học sinh</span>
              </div>
            </Link>
          </div>
        </header>

        <section className="student-stats">
          <div className="student-stat-card">
            <div className="student-stat-icon blue">
              <BookOpen size={21} />
            </div>
            <div>
              <span>Lớp học của bạn</span>
              <strong>{classes.length}</strong>
              <small>
                {classes.length > 0
                  ? "Đang tham gia"
                  : "Chưa tham gia lớp nào"}
              </small>
            </div>
          </div>

          <div className="student-stat-card">
            <div className="student-stat-icon green">
              <Target size={21} />
            </div>
            <div>
              <span>Bài tập cần làm</span>
              <strong>{pendingAssignments.length}</strong>
              <small>
                {pendingAssignments.length > 0
                  ? "Cần hoàn thành"
                  : "Không có bài tập"}
              </small>
            </div>
          </div>

          <div className="student-stat-card">
            <div className="student-stat-icon orange">
              <Trophy size={21} />
            </div>
            <div>
              <span>Điểm trung bình</span>
              <strong>{averageScore.toFixed(1)}</strong>
              <small>
                {scores.length > 0
                  ? `Từ ${scores.length} bài đã chấm`
                  : "Chưa có điểm"}
              </small>
            </div>
          </div>

          <div className="student-stat-card">
            <div className="student-stat-icon purple">
              <Clock3 size={21} />
            </div>
            <div>
              <span>Thời gian học</span>
              <strong>{formatDuration(studyMinutes)}</strong>
              <small>
                {studyMinutes > 0
                  ? "Thời gian trong phòng học"
                  : "Chưa có thời gian học"}
              </small>
            </div>
          </div>
        </section>

        <section className="student-streak-card">
          <div>
            <span className="student-section-kicker">
              <Flame size={15} /> CHUỖI HỌC TẬP
            </span>
            <h2>
              {currentStreak > 0
                ? `${currentStreak} ngày liên tiếp`
                : "Bắt đầu chuỗi học tập của bạn"}
            </h2>
            <p>
              {currentStreak > 0
                ? `Kỷ lục hiện tại: ${longestStreak} ngày.`
                : "Khi bạn có hoạt động học tập được ghi nhận, chuỗi sẽ xuất hiện tại đây."}
            </p>
          </div>

          <div className="student-streak-values">
            <div>
              <span>Hiện tại</span>
              <strong>{currentStreak}</strong>
              <small>ngày</small>
            </div>
            <div>
              <span>Kỷ lục</span>
              <strong>{longestStreak}</strong>
              <small>ngày</small>
            </div>
          </div>
        </section>

        <section className="student-grid-2" id="classes">
          <section className="student-card">
            <div className="student-card-header">
              <div>
                <span className="student-section-kicker">CLASSES</span>
                <h2>Lớp học đang tham gia</h2>
              </div>
              <Link href="/student/classes">Xem tất cả</Link>
            </div>

            {classes.length === 0 ? (
              <div className="student-empty-state">
                Bạn chưa tham gia lớp học nào.
              </div>
            ) : (
              <div className="student-list">
                {classes.map((item) => (
                  <div className="student-list-row" key={item.id}>
                    <div className="student-row-icon">
                      <BookOpen size={18} />
                    </div>

                    <div className="student-row-main">
                      <strong>{item.name}</strong>
                      <span>
                        {item.teacherName}
                        {item.code ? ` • Mã lớp: ${item.code}` : ""}
                      </span>
                    </div>

                    <div className="student-progress-wrap">
                      <div className="student-progress">
                        <span style={{ width: `${item.progress}%` }} />
                      </div>
                      <small>{item.progress}%</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="student-card" id="schedule">
            <div className="student-card-header">
              <div>
                <span className="student-section-kicker">TODAY</span>
                <h2>Lịch học hôm nay</h2>
              </div>
            </div>

            {todaySchedules.length === 0 ? (
              <div className="student-empty-state">
                Chưa có lịch học nào.
              </div>
            ) : (
              <div className="student-list">
                {todaySchedules.map((item) => {
                  const nowDate = new Date();
                  const startDate = new Date(item.startsAt);
                  const endDate = new Date(item.endsAt);
                  const ended = nowDate >= endDate;
                  const live = nowDate >= startDate && nowDate < endDate;

                  return (
                    <div className="student-list-row" key={item.id}>
                      <div className="student-row-icon schedule">
                        <CalendarDays size={18} />
                      </div>

                      <div className="student-row-main">
                        <strong>{item.className}</strong>
                        <span>
                          {item.teacherName} • {formatTime(item.startsAt)} -{" "}
                          {formatTime(item.endsAt)}
                          {item.roomName ? ` • ${item.roomName}` : ""}
                        </span>

                        <em className={live ? "live" : ended ? "ended" : ""}>
                          {ended
                            ? "Đã kết thúc"
                            : live
                              ? "Đang diễn ra"
                              : "Sắp diễn ra"}
                        </em>
                      </div>

                      <div className="student-room-actions">
                        {item.roomId ? (
                          <span className="student-room-code">
                            {item.roomCode || "Phòng"}
                          </span>
                        ) : null}

                        {item.roomId && !ended ? (
                          <Link
                            href={`/student/rooms/${encodeURIComponent(item.roomId)}`}
                            className="student-join-button"
                          >
                            <Video size={14} />
                            Vào phòng
                          </Link>
                        ) : item.roomId ? (
                          <span className="student-status-pill">
                            Đã kết thúc
                          </span>
                        ) : (
                          <span className="student-status-pill">
                            Chưa có phòng
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <section className="student-grid-2">
          <section className="student-card" id="assignments">
            <div className="student-card-header">
              <div>
                <span className="student-section-kicker">ASSIGNMENTS</span>
                <h2>Bài tập cần làm</h2>
              </div>
              <Link href="/student/assignments">Xem bài tập</Link>
            </div>

            {pendingAssignments.length === 0 ? (
              <div className="student-empty-state">
                Chưa có bài tập cần làm.
              </div>
            ) : (
              <div className="student-list">
                {pendingAssignments.map((item) => (
                  <Link
                    href={`/student/assignments/${encodeURIComponent(item.id)}`}
                    className="student-list-row clickable"
                    key={item.id}
                  >
                    <div className="student-row-icon assignment">
                      <Target size={18} />
                    </div>

                    <div className="student-row-main">
                      <strong>{item.title}</strong>
                      <span>{item.className}</span>
                      <em>
                        {item.dueAt
                          ? `Hạn: ${formatDate(item.dueAt)} • ${formatTime(item.dueAt)}`
                          : "Chưa đặt hạn nộp"}
                      </em>
                    </div>

                    <span className="student-status-pill">Chưa làm</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="student-card" id="lessons">
            <div className="student-card-header">
              <div>
                <span className="student-section-kicker">LEARNING</span>
                <h2>Tiến độ học tập</h2>
              </div>
            </div>

            <div className="student-learning-summary">
              <div className="student-learning-percent">
                {lessons.length > 0
                  ? Math.round((completedLessons / lessons.length) * 100)
                  : 0}
                %
              </div>

              <div>
                <strong>Hoàn thành bài học</strong>
                <span>
                  {completedLessons} / {lessons.length} bài
                </span>
              </div>
            </div>

            <div className="student-progress large">
              <span
                style={{
                  width: `${
                    lessons.length > 0
                      ? Math.round((completedLessons / lessons.length) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="student-learning-grid">
              <div>
                <span>Bài đã bắt đầu</span>
                <strong>{activeLessons}</strong>
              </div>
              <div>
                <span>Bài đã hoàn thành</span>
                <strong>{completedLessons}</strong>
              </div>
            </div>
          </section>
        </section>

        <section className="student-grid-2" id="notifications">
          <section className="student-card">
            <div className="student-card-header">
              <div>
                <span className="student-section-kicker">DEADLINES</span>
                <h2>Deadline</h2>
              </div>
            </div>

            {deadlines?.length ? (
              <div className="student-list">
                {deadlines.map((item) => (
                  <div className="student-list-row" key={item.id}>
                    <div className="student-row-icon deadline">
                      <Clock3 size={18} />
                    </div>

                    <div className="student-row-main">
                      <strong>
                        {item.assignment_id
                          ? assignmentTitleById.get(item.assignment_id) || "Bài tập"
                          : "Hạn nộp bài tập"}
                      </strong>
                      <span>
                        {formatDate(item.due_at)} • {formatTime(item.due_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="student-empty-state">
                Chưa có deadline.
              </div>
            )}
          </section>

          <section className="student-card">
            <div className="student-card-header">
              <div>
                <span className="student-section-kicker">NOTIFICATIONS</span>
                <h2>Thông báo mới</h2>
              </div>
            </div>

            {notifications?.length ? (
              <div className="student-list">
                {notifications.map((item) => (
                  <div className="student-list-row" key={item.id}>
                    <div className="student-row-icon notification">
                      <Bell size={18} />
                    </div>

                    <div className="student-row-main">
                      <strong>{item.title}</strong>
                      <span>{item.body || "Thông báo từ hệ thống."}</span>
                      <em>{formatDate(item.created_at)}</em>
                    </div>

                    {!item.is_read ? (
                      <span className="student-new-pill">Mới</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="student-empty-state">
                Chưa có thông báo mới.
              </div>
            )}
          </section>
        </section>

        <section className="student-card" id="achievements">
          <div className="student-card-header">
            <div>
              <span className="student-section-kicker">ACHIEVEMENTS</span>
              <h2>Thành tích của bạn</h2>
            </div>

            {longestStreak > 0 ? (
              <span className="student-status-pill">
                Kỷ lục {longestStreak} ngày
              </span>
            ) : null}
          </div>

          {achievementCount === 0 ? (
            <div className="student-empty-state">
              Chưa có thành tích.
            </div>
          ) : (
            <div className="student-achievement-grid">
              {currentStreak > 0 ? (
                <div className="student-achievement">
                  <div className="student-achievement-icon">
                    <Flame size={22} />
                  </div>
                  <strong>{currentStreak} ngày</strong>
                  <span>Chuỗi học tập hiện tại</span>
                </div>
              ) : null}

              {completedLessons > 0 ? (
                <div className="student-achievement">
                  <div className="student-achievement-icon">
                    <BookOpen size={22} />
                  </div>
                  <strong>{completedLessons}</strong>
                  <span>Bài học đã hoàn thành</span>
                </div>
              ) : null}

              {scores.length > 0 ? (
                <div className="student-achievement">
                  <div className="student-achievement-icon">
                    <Trophy size={22} />
                  </div>
                  <strong>{averageScore.toFixed(1)}</strong>
                  <span>Điểm trung bình hiện tại</span>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
