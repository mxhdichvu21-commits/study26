import Link from "next/link";
import { Bell, BookOpen, CalendarDays, LayoutDashboard, Users, Video, LogOut, BarChart3 } from "lucide-react";

const navItems = ["Trang chủ", "Người dùng", "Giảng viên", "Học sinh", "Lớp học", "Phòng học", "Môn học", "Bài học", "Tài liệu", "Danh mục", "Lịch dạy", "Báo cáo", "Thống kê", "Cài đặt", "Vai trò & phân quyền", "Nhật ký hoạt động"];
const stats = [["Tổng số lớp", "128"], ["Tổng học sinh", "2.456"], ["Tổng giảng viên", "86"], ["Tổng bài học", "532"]];
const name = "Admin";
const roleLabel = "Quản trị hệ thống";
const subtitle = "Tổng quan hệ thống Study26";

export default function Dashboard() {
  const courses = ["Toán 9 - Hình học","Tiếng Anh giao tiếp","Hóa học 11 - Cơ bản","Lập trình Python cơ bản","Vật lý 10 - Năng lượng"];
  const times = ["09:00 - 10:30","14:00 - 15:30","19:30 - 21:00"];
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><Link className="logo" href="/" aria-label="Study26"><img src="/images/study26-logo.png" alt="Study26" className="brand-logo"/></Link><div className="brand-sub">{roleLabel}</div></div>
      <nav className="side-nav">
        {navItems.map((item, i) => <a key={item} className={i === 0 ? "active" : ""} href="#"><span>{item}</span></a>)}
      </nav>
      <a className="side-nav logout" href="/login"><LogOut size={18}/><span>Đăng xuất</span></a>
    </aside>
    <main className="main">
      <div className="topbar">
        <div><h1>Xin chào, {name} 👋</h1><p>{subtitle}</p></div>
        <div className="user"><div className="avatar">{name[0]}</div><div><b>{name}</b><div className="brand-sub">{roleLabel}</div></div><Bell size={18}/></div>
      </div>
      <div className="stats">
        {stats.map(([title,value], i) => <div className="stat" key={title}><div className="stat-icon">{i===0?<LayoutDashboard/>:i===1?<Users/>:i===2?<CalendarDays/>:<BarChart3/>}</div><div><label>{title}</label><strong>{value}</strong></div></div>)}
      </div>
      <div className="grid2">
        <div className="card"><div className="section-title"><h3>Lớp học của bạn</h3><a className="link" href="#">Xem tất cả</a></div>
          <div className="list">{courses.map((x,i)=><div className="list-item" key={x}><div className="list-main"><div className="mini-icon"><BookOpen size={19}/></div><div><b>{x}</b><div style={{fontSize:13,color:"#7c8799",marginTop:4}}>{i%2===0?"25 học sinh":"30 học sinh"} • Thứ {i+2}, 19:30</div></div></div><span className="pill">{i===0?"Đang diễn ra":"Sắp diễn ra"}</span></div>)}</div>
        </div>
        <div className="card"><div className="section-title"><h3>Lịch học hôm nay</h3><a className="link" href="#">Xem lịch</a></div>
          <div className="list">{times.map((t,i)=><div className="list-item" key={t}><div><b>{t}</b><div style={{fontSize:13,color:"#7c8799",marginTop:5}}>{courses[i]}</div></div><Video size={22} color="#1463ff"/></div>)}</div>
        </div>
      </div>
      <div className="grid2">
        <div className="card"><div className="section-title"><h3>Thống kê hoạt động</h3><span className="pill">7 ngày qua</span></div>
          <div className="bar-chart">{[45,72,55,66,50,68,60].map((h,i)=><div className="bar-col" key={i}><div className="bar-wrap"><div className="bar" style={{height:`${h}%`}}/></div><div className="bar-label">{25+i}/05</div></div>)}</div>
        </div>
        <div className="card"><div className="section-title"><h3>Thông báo mới</h3><a className="link" href="#">Xem tất cả</a></div>
          <div className="list">{["Có lịch học mới","Học sinh đã tham gia lớp","Bài tập mới được giao"].map((x,i)=><div className="list-item" key={x}><div className="list-main"><div className="mini-icon"><Bell size={18}/></div><div><b>{x}</b><div style={{fontSize:12,color:"#8a94a8",marginTop:4}}>{i+2} phút trước</div></div></div></div>)}</div>
        </div>
      </div>
    </main>
  </div>;
}
