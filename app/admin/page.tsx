"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./admin.css";

type DashboardData = {
  admin?: { id: string; name: string };
  stats: {
    totalClasses: number;
    totalStudents: number;
    totalTeachers: number;
    totalLessons: number;
    learningToday: number;
    activeRooms: number;
    todaySchedules: number;
    completedLessons: number;
    sharedDocuments: number;
    totalSubmissions: number;
  };
  recentActivities: { id: string; title: string; description?: string; created_at: string }[];
  topClasses: { id: string; name: string; student_count: number }[];
  announcements: { id: string; title: string; description?: string; created_at: string }[];
  activityChart: { date: string; learning: number; activeUsers: number }[];
  classDistribution: { label: string; count: number }[];
};

const emptyData: DashboardData = {
  stats: {
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalLessons: 0,
    learningToday: 0,
    activeRooms: 0,
    todaySchedules: 0,
    completedLessons: 0,
    sharedDocuments: 0,
    totalSubmissions: 0,
  },
  recentActivities: [],
  topClasses: [],
  announcements: [],
  activityChart: [],
  classDistribution: [],
};

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="admin-icon">{children}</span>;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export default function AdminDashboard() {
  const router = useRouter();
  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("ADMIN LOGOUT ERROR:", error);
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/dashboard", {
        method: "GET",
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Không thể tải dữ liệu Admin");

      setData({
        ...emptyData,
        ...json,
        stats: { ...emptyData.stats, ...(json.stats || {}) },
        recentActivities: Array.isArray(json.recentActivities) ? json.recentActivities : [],
        topClasses: Array.isArray(json.topClasses) ? json.topClasses : [],
        announcements: Array.isArray(json.announcements) ? json.announcements : [],
        activityChart: Array.isArray(json.activityChart) ? json.activityChart : [],
        classDistribution: Array.isArray(json.classDistribution) ? json.classDistribution : [],
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const adminName = data.admin?.name || "Admin";

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-logo">
            <div className="admin-logo-icon">🎓</div>
            <div><strong>Study26</strong><span>Admin Panel</span></div>
          </div>

          <nav className="admin-nav">
            <button className="admin-nav-item active"><Icon>⌂</Icon>Trang chủ</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/users")}><Icon>♙</Icon>Người dùng</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/users?role=teacher")}><Icon>♙</Icon>Giảng viên</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/users?role=student")}><Icon>♙</Icon>Học sinh</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/classes")}><Icon>▤</Icon>Lớp học</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/rooms")}><Icon>▣</Icon>Phòng học</button>

            <div className="admin-section-title">NỘI DUNG</div>
            <button className="admin-nav-item" onClick={() => router.push("/admin/subjects")}><Icon>◈</Icon>Môn học</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/lessons")}><Icon>▤</Icon>Bài học</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/materials")}><Icon>▧</Icon>Tài liệu</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/subjects")}><Icon>☷</Icon>Danh mục</button>

            <div className="admin-section-title">HOẠT ĐỘNG</div>
            <button className="admin-nav-item" onClick={() => router.push("/admin/schedule")}><Icon>▦</Icon>Lịch dạy</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/reports")}><Icon>◫</Icon>Báo cáo</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/statistics")}><Icon>▥</Icon>Thống kê</button>

            <div className="admin-section-title">HỆ THỐNG</div>
            <button className="admin-nav-item" onClick={() => router.push("/admin/settings")}><Icon>⚙</Icon>Cài đặt</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/roles")}><Icon>♙</Icon>Vai trò &amp; phân quyền</button>
            <button className="admin-nav-item" onClick={() => router.push("/admin/activity")}><Icon>☷</Icon>Nhật ký hoạt động</button>
          </nav>
        </div>

        <button className="admin-logout" onClick={handleLogout}><Icon>↪</Icon>Đăng xuất</button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Xin chào, {adminName} 👋</h1>
            <p>Tổng quan hệ thống Study26</p>
          </div>
          <div className="admin-header-right">
            <div className="admin-search"><span>⌕</span><input placeholder="Tìm kiếm..." /></div>
            <button className="admin-bell">♧</button>
            <button className="admin-profile" onClick={() => router.push("/profile")}>
              <div className="admin-avatar">{adminName.charAt(0).toUpperCase()}</div>
              <div><strong>{adminName}</strong><span>Quản trị hệ thống</span></div>
              <span>⌄</span>
            </button>
          </div>
        </header>

        {error && <div className="admin-error"><span>{error}</span><button onClick={() => void loadDashboard()}>Thử lại</button></div>}

        <section className="admin-stats">
          <StatCard icon="🎓" label="Tổng số lớp" value={loading ? "..." : data.stats.totalClasses} color="purple" />
          <StatCard icon="♙" label="Tổng học sinh" value={loading ? "..." : data.stats.totalStudents} color="green" />
          <StatCard icon="♙" label="Tổng giảng viên" value={loading ? "..." : data.stats.totalTeachers} color="blue" />
          <StatCard icon="▤" label="Tổng bài học" value={loading ? "..." : data.stats.totalLessons} color="orange" />
          <StatCard icon="▥" label="Lượt học hôm nay" value={loading ? "..." : data.stats.learningToday} color="pink" />
        </section>

        <section className="admin-middle">
          <div className="admin-card chart-card">
            <div className="card-header"><h2>Biểu đồ hoạt động</h2><span className="chart-range">7 ngày gần nhất</span></div>
            <div className="legend"><span><i className="blue-dot" />Lượt học</span><span><i className="green-dot" />Người dùng hoạt động</span></div>
            {data.activityChart.length === 0 ? <div className="empty-admin">Chưa có dữ liệu hoạt động.</div> : <SimpleChart data={data.activityChart} />}
          </div>

          <div className="admin-card distribution-card">
            <div className="card-header"><h2>Phân bổ lớp học</h2></div>
            {data.classDistribution.length === 0 ? <div className="empty-admin">Chưa có dữ liệu lớp học.</div> : <div className="distribution-list">{data.classDistribution.map((item) => <div className="distribution-item" key={item.label}><span>{item.label}</span><strong>{item.count}</strong></div>)}</div>}
          </div>

          <div className="admin-card quick-card">
            <div className="card-header"><h2>Thống kê nhanh</h2></div>
            <QuickItem icon="◉" label="Phòng học đang hoạt động" value={data.stats.activeRooms} />
            <QuickItem icon="▦" label="Lịch dạy hôm nay" value={data.stats.todaySchedules} />
            <QuickItem icon="✓" label="Bài học đã hoàn thành" value={data.stats.completedLessons} />
            <QuickItem icon="▧" label="Tài liệu đã chia sẻ" value={data.stats.sharedDocuments} />
          </div>
        </section>

        <section className="admin-bottom">
          <AdminListCard title="Hoạt động gần đây" empty="Chưa có hoạt động gần đây.">
            {data.recentActivities.map((item) => <div className="activity-item" key={item.id}><div className="activity-dot" /><div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}</div><time>{formatTime(item.created_at)}</time></div>)}
          </AdminListCard>

          <AdminListCard title="Top lớp học nhiều học sinh" empty="Chưa có lớp học.">
            {data.topClasses.map((item, index) => <div className="top-class-item" key={item.id}><strong className="rank">{index + 1}</strong><div className="top-class-icon">▣</div><div className="top-class-info"><strong>{item.name}</strong><span>{item.student_count} học sinh</span></div></div>)}
          </AdminListCard>

          <AdminListCard title="Thông báo hệ thống" empty="Chưa có thông báo hệ thống.">
            {data.announcements.map((item) => <div className="announcement-item" key={item.id}><div className="announcement-icon">♢</div><div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}</div><time>{formatTime(item.created_at)}</time></div>)}
          </AdminListCard>
        </section>

        <footer className="admin-footer">© {new Date().getFullYear()} Study26. Tất cả quyền được bảo lưu.</footer>
      </main>
    </div>
  );
}

function AdminListCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <div className="admin-card"><div className="card-header"><h2>{title}</h2></div>{hasChildren ? <div className="admin-list">{children}</div> : <div className="empty-admin">{empty}</div>}</div>;
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return <div className="stat-card"><div className={`stat-card-icon ${color}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>Dữ liệu thực tế</small></div></div>;
}

function QuickItem({ icon, label, value }: { icon: string; label: string; value: number }) {
  return <div className="quick-item"><div className="quick-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function SimpleChart({ data }: { data: { date: string; learning: number; activeUsers: number }[] }) {
  const max = Math.max(1, ...data.flatMap((item) => [item.learning, item.activeUsers]));
  return <div className="simple-chart"><div className="chart-bars">{data.map((item) => { const learning = (item.learning / max) * 100; const active = (item.activeUsers / max) * 100; return <div className="chart-column" key={item.date}><div className="bars"><div className="bar blue" style={{ height: `${learning}%` }} /><div className="bar green" style={{ height: `${active}%` }} /></div><span>{item.date}</span></div>; })}</div></div>;
}
