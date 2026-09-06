"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  House,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  Video,
  BarChart3,
  FolderOpen,
} from "lucide-react";

type Role = "teacher" | "student" | "admin";

type MenuItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export default function Study26Sidebar({
  role,
  active,
  name,
}: {
  role: Role;
  active: string;
  name?: string | null;
}) {
  const teacherMenu: MenuItem[] = [
    {
      href: "/teacher",
      label: "Trang chủ",
      icon: <House size={21} strokeWidth={2} />,
    },
    {
      href: "/teacher/classes",
      label: "Lớp học",
      icon: <BookOpen size={21} strokeWidth={2} />,
    },
    {
      href: "/teacher/classes",
      label: "Học sinh",
      icon: <Users size={21} strokeWidth={2} />,
    },
    {
      href: "/teacher/classes",
      label: "Bài học",
      icon: <FileText size={21} strokeWidth={2} />,
    },
    {
      href: "/teacher/classes",
      label: "Bài tập",
      icon: <ClipboardCheck size={21} strokeWidth={2} />,
    },
    {
      href: "/teacher/schedule",
      label: "Lịch dạy",
      icon: <CalendarDays size={21} strokeWidth={2} />,
    },
    {
      href: "/teacher/rooms",
      label: "Phòng học",
      icon: <Video size={21} strokeWidth={2} />,
    },
    {
      href: "/teacher/notifications",
      label: "Thông báo",
      icon: <Bell size={21} strokeWidth={2} />,
    },
  ];

  const studentMenu: MenuItem[] = [
    {
      href: "/student",
      label: "Trang chủ",
      icon: <House size={21} strokeWidth={2} />,
    },
    {
      href: "/student/classes",
      label: "Lớp học",
      icon: <BookOpen size={21} strokeWidth={2} />,
    },
    {
      href: "/student/rooms",
      label: "Phòng học",
      icon: <Video size={21} strokeWidth={2} />,
    },
    {
      href: "/student/assignments",
      label: "Bài tập",
      icon: <ClipboardCheck size={21} strokeWidth={2} />,
    },
    {
      href: "/student/attendance",
      label: "Điểm danh",
      icon: <CalendarDays size={21} strokeWidth={2} />,
    },
    {
      href: "/student/join-room",
      label: "Vào phòng",
      icon: <Video size={21} strokeWidth={2} />,
    },
  ];

  const adminMenu: MenuItem[] = [
    {
      href: "/admin",
      label: "Trang chủ",
      icon: <House size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/users",
      label: "Người dùng",
      icon: <Users size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/classes",
      label: "Lớp học",
      icon: <BookOpen size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/rooms",
      label: "Phòng học",
      icon: <Video size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/subjects",
      label: "Môn học",
      icon: <GraduationCap size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/lessons",
      label: "Bài học",
      icon: <FileText size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/materials",
      label: "Tài liệu",
      icon: <FolderOpen size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/schedule",
      label: "Lịch dạy",
      icon: <CalendarDays size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/reports",
      label: "Báo cáo",
      icon: <BarChart3 size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/statistics",
      label: "Thống kê",
      icon: <BarChart3 size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/roles",
      label: "Vai trò & phân quyền",
      icon: <ShieldCheck size={21} strokeWidth={2} />,
    },
    {
      href: "/admin/settings",
      label: "Cài đặt",
      icon: <Settings size={21} strokeWidth={2} />,
    },
  ];

  const menu =
    role === "teacher"
      ? teacherMenu
      : role === "student"
        ? studentMenu
        : adminMenu;

  const roleLabel =
    role === "teacher"
      ? "Giáo viên"
      : role === "student"
        ? "Học sinh"
        : "Quản trị hệ thống";

  const roleHome =
    role === "teacher"
      ? "/teacher"
      : role === "student"
        ? "/student"
        : "/admin";

  return (
    <aside className="study26-sidebar">
      <div className="study26-sidebar-top">
        <Link
          href={roleHome}
          className="study26-brand"
        >
          <div className="study26-brand-icon">
            <GraduationCap
              size={25}
              strokeWidth={2}
            />
          </div>

          <div className="study26-brand-text">
            <strong>Study26</strong>
            <span>Dạy học trực tuyến</span>
          </div>
        </Link>

        <nav className="study26-sidebar-nav">
          {menu.map((item) => {
            const isActive =
              active === item.label ||
              active === item.href;

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`study26-sidebar-item ${
                  isActive ? "active" : ""
                }`}
              >
                <span className="study26-sidebar-icon">
                  {item.icon}
                </span>

                <span className="study26-sidebar-label">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="study26-sidebar-bottom">
        <Link
          href="/profile"
          className="study26-account"
        >
          <div className="study26-account-avatar">
            {(name?.trim().charAt(0) ||
              roleLabel.charAt(0))
              .toUpperCase()}
          </div>

          <div className="study26-account-info">
            <strong>
              {name || roleLabel}
            </strong>

            <span>{roleLabel}</span>
          </div>

          <Settings
            size={18}
            strokeWidth={2}
          />
        </Link>

        <Link
          href="/login"
          className="study26-sidebar-logout"
        >
          <LogOut
            size={20}
            strokeWidth={2}
          />
          <span>Đăng xuất</span>
        </Link>
      </div>
    </aside>
  );
}
