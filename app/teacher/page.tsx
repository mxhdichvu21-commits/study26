"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  House,
  LogOut,
  Settings,
  Users,
  Video,
  GraduationCap,
  CircleHelp,
} from "lucide-react";
import "./teacher.css";
import Study26Sidebar from "@/components/shared/study26-sidebar";

type TeacherDashboard = {
  teacher: { id: string; name: string; avatar_url?: string | null } | null;
  stats: { totalClasses: number; totalStudents: number; todaySchedules: number; teachingMinutes: number };
  classes: { id: string; name: string; studentCount: number; scheduleText?: string; status?: "live" | "upcoming" | "finished"; roomCode?: string | null }[];
  todaySchedules: { id: string; classId: string; className: string;
    roomId?: string | null; roomCode?: string | null; startTime: string; endTime: string; status?: "live" | "upcoming" | "finished" }[];
  activities: { id: string; title: string; description?: string; createdAt: string }[];
  notifications: { id: string; title: string; description?: string; createdAt: string }[];
  weeklyStats: { label: string; classes: number; students: number }[];
};

const EMPTY: TeacherDashboard = { teacher: null, stats: { totalClasses: 0, totalStudents: 0, todaySchedules: 0, teachingMinutes: 0 }, classes: [], todaySchedules: [], activities: [], notifications: [], weeklyStats: [] };

function duration(minutes: number) { return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function time(value: string) { return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)); }
function date(value: string) { return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)); }
function initial(name?: string | null) { return name?.trim().charAt(0).toUpperCase() || "G"; }

export default function TeacherPage() {
  const router = useRouter();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const res = await fetch("/api/teacher/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Không thể tải dữ liệu giáo viên.");
      setData({ ...EMPTY, ...json, stats: { ...EMPTY.stats, ...(json.stats || {}) }, classes: Array.isArray(json.classes) ? json.classes : [], todaySchedules: Array.isArray(json.todaySchedules) ? json.todaySchedules : [], activities: Array.isArray(json.activities) ? json.activities : [], notifications: Array.isArray(json.notifications) ? json.notifications : [], weeklyStats: Array.isArray(json.weeklyStats) ? json.weeklyStats : [] });
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); const id = window.setInterval(() => void load(), 30000); return () => window.clearInterval(id); }, []);

  const name = data.teacher?.name || "Giáo viên";

  return <div className="teacher-page">
    <Study26Sidebar role="teacher" active="Trang chủ" name={name} />

    <main className="teacher-main">
      <header className="teacher-header">
        <div><h1>Xin chào, {name}! 👋</h1><p>Chào mừng bạn trở lại Study26</p></div>
        <div className="teacher-header-right">
          <button type="button" className="teacher-notification" onClick={() => router.push("/teacher")}>♧{data.notifications.length > 0 && <span>{data.notifications.length}</span>}</button>
          <button type="button" className="teacher-profile" onClick={() => router.push("/profile")}>
            {data.teacher?.avatar_url ? <img src={data.teacher.avatar_url} alt="Avatar" /> : <div className="avatar-fallback">{initial(name)}</div>}
            <div><strong>{name}</strong><span>Giáo viên</span></div><i>⌄</i>
          </button>
        </div>
      </header>

      {error && <div className="teacher-error"><span>{error}</span><button type="button" onClick={() => void load()}>Thử lại</button></div>}

      <section className="teacher-stats">
        <Stat icon={<BookOpen size={20} />} title="Tổng số lớp" value={loading ? "..." : data.stats.totalClasses} tone="purple" />
        <Stat icon={<Users size={20} />} title="Tổng học sinh" value={loading ? "..." : data.stats.totalStudents} tone="green" />
        <Stat icon={<CalendarDays size={20} />} title="Lịch học hôm nay" value={loading ? "..." : data.stats.todaySchedules} tone="blue" />
        <Stat icon={<Clock3 size={20} />} title="Tổng thời lượng" value={loading ? "..." : duration(data.stats.teachingMinutes)} tone="orange" />
      </section>

      <section className="teacher-middle">
        <Card title="Lớp học của bạn" action="Xem tất cả →" onAction={() => router.push("/teacher/classes")}>
          {data.classes.length === 0 ? <Empty text="Bạn chưa có lớp học nào." /> : <div className="class-list">{data.classes.map((item) => <div className="class-row" key={item.id}>
            <div className="class-icon">▤</div><div className="class-content"><strong>{item.name}</strong><span>{item.studentCount} học sinh{item.scheduleText ? ` • ${item.scheduleText}` : ""}</span></div>
            <span className={`status ${item.status || "upcoming"}`}>{item.status === "live" ? "● Đang diễn ra" : item.status === "finished" ? "Đã kết thúc" : "Sắp diễn ra"}</span>
            <button type="button" className="more" onClick={() => router.push(`/teacher/classes/${item.id}`)}>⋮</button>
          </div>)}</div>}
        </Card>

        <Card title="Lịch dạy hôm nay" action="Xem lịch" onAction={() => router.push("/teacher/classes")}>
          {data.todaySchedules.length === 0 ? <Empty text="Hôm nay chưa có lịch dạy." /> : <div className="schedule-list">{data.todaySchedules.map((item) => <div className="schedule-row" key={item.id}>
            <div className="schedule-time"><strong>{time(item.startTime)}</strong><span>–</span><strong>{time(item.endTime)}</strong></div><div className="schedule-icon"><CalendarDays size={18} /></div><div className="schedule-details"><strong>{item.className}</strong><span>{item.roomCode ? `Phòng: ${item.roomCode}` : "Chưa có phòng"}</span></div>
            {item.roomCode && <button type="button" className="join-room" onClick={() => item.roomId
                          ? router.push(`/teacher/rooms/${encodeURIComponent(item.roomId)}`)
                          : router.push(`/teacher/classes/${encodeURIComponent(item.classId)}`)}>▣</button>}
          </div>)}</div>}
          {data.todaySchedules.length > 0 && <button type="button" className="schedule-footer" onClick={() => router.push("/teacher/classes")}><CalendarDays size={16} /> Xem tất cả lịch dạy</button>}
        </Card>
      </section>

      <section className="teacher-bottom">
        <div className="teacher-card activity-card"><div className="teacher-card-header"><h2>Thống kê hoạt động</h2><span className="period-label">7 ngày qua</span></div>
          <div className="chart-legend"><span><i className="blue-dot" />Số lớp đã dạy</span><span><i className="green-dot" />Số học sinh tham gia</span></div>
          {data.weeklyStats.length === 0 ? <Empty text="Chưa có dữ liệu hoạt động." /> : <div className="activity-chart"><div className="chart-columns">{data.weeklyStats.map((item) => <div className="chart-column" key={item.label}><div className="bar-group"><div className="chart-bar blue" style={{ height: `${Math.max(3, item.classes)}%` }} /><div className="chart-bar green" style={{ height: `${Math.max(3, item.students)}%` }} /></div><span>{item.label}</span></div>)}</div></div>}
        </div>

        <Card title="Thông báo mới" action="Xem tất cả" onAction={() => router.push("/teacher")}>
          {data.notifications.length === 0 ? <Empty text="Chưa có thông báo mới." /> : <div className="notification-list">{data.notifications.slice(0, 4).map((item) => <div className="notification-row" key={item.id}><div className="notification-icon">♧</div><div><strong>{item.title}</strong><span>{item.description || "Không có nội dung"}</span></div><time>{date(item.createdAt)}</time></div>)}</div>}
        </Card>
      </section>
    </main>
  </div>;
}

function Nav({ active, icon, text, badge, onClick }: { active?: boolean; icon: ReactNode; text: string; badge?: number; onClick: () => void }) { return <button type="button" className={`teacher-nav-item ${active ? "active" : ""}`} onClick={onClick}><span>{icon}</span>{text}{badge ? <b>{badge}</b> : null}</button>; }
function Stat({ icon, title, value, tone }: { icon: ReactNode; title: string; value: string | number; tone: string }) { return <div className="teacher-stat"><div className={`teacher-stat-icon ${tone}`}>{icon}</div><div><span>{title}</span><strong>{value}</strong><small>Dữ liệu hiện tại</small></div></div>; }
function Card({ title, action, onAction, children }: { title: string; action: string; onAction: () => void; children: React.ReactNode }) { return <div className="teacher-card"><div className="teacher-card-header"><h2>{title}</h2><button type="button" onClick={onAction}>{action}</button></div>{children}</div>; }
function Empty({ text }: { text: string }) { return <div className="teacher-empty">{text}</div>; }
