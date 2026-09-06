"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./profile.css";

type Role = "student" | "teacher";

type Props = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  avatarUrl: string | null;
  role: Role;
};

export default function ProfileClient({
  fullName,
  email,
  dateOfBirth,
  avatarUrl,
  role,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState(fullName);
  const [dob, setDob] = useState(dateOfBirth);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const initials = useMemo(() => {
    const value = name.trim() || (role === "teacher" ? "Giáo viên" : "Học sinh");
    return value
      .split(/\s+/)
      .slice(-2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();
  }, [name, role]);

  const roleLabel = role === "teacher" ? "Giáo viên" : "Học sinh";

  async function handleAvatarChange(file: File | null) {
    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      setMessage("Chỉ nhận JPG, JPEG, PNG hoặc WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Ảnh phải nhỏ hơn hoặc bằng 5MB.");
      return;
    }

    setAvatarFile(file);
    setAvatar(URL.createObjectURL(file));
    setMessage("");
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      let finalAvatar = avatar;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);

        const uploadResponse = await fetch("/api/profile/avatar", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Không thể tải ảnh lên.");
        }

        finalAvatar = uploadData.avatarUrl;
        setAvatar(finalAvatar);
        setAvatarFile(null);
      }

      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: name.trim(),
          dateOfBirth: dob,
          avatarUrl: finalAvatar,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể lưu thông tin.");
      }

      setMessage("Đã lưu thay đổi.");

      // Refresh dữ liệu server để trang chủ nhận tên/avatar mới
      router.refresh();

      // Sau khi lưu thành công, quay về đúng trang theo vai trò
      setTimeout(() => {
        router.push(role === "teacher" ? "/teacher" : "/student");
      }, 250);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi lưu."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="profile-shell">
      <aside className="profile-sidebar">
        <div className="profile-brand">
          <div className="profile-brand-logo">S</div>
          <div>
            <div className="profile-brand-name">Study26</div>
            <div className="profile-brand-sub">Nền tảng học tập</div>
          </div>
        </div>

        <nav className="profile-nav">
          <a href={role === "teacher" ? "/teacher" : "/student"}>
            <span>⌂</span>
            <span>Trang chủ</span>
          </a>

          {role === "teacher" && (
            <a href="/teacher/rooms">
              <span>＋</span>
              <span>Tạo phòng</span>
            </a>
          )}

          <a href={role === "teacher" ? "/teacher" : "/student"}>
            <span>◫</span>
            <span>Đặt lịch</span>
          </a>

          <a href="/notifications">
            <span>◉</span>
            <span>Thông báo</span>
          </a>

          <a href="/notes">
            <span>▤</span>
            <span>Ghi chú</span>
          </a>

          <a href={role === "teacher" ? "/teacher/attendance" : "/student"}>
            <span>✓</span>
            <span>Điểm danh</span>
          </a>

          <button type="button" onClick={handleLogout}>
            <span>↪</span>
            <span>Đăng xuất</span>
          </button>
        </nav>
      </aside>

      <main className="profile-main">
        <header className="profile-header">
          <div>
            <div className="profile-header-small">TÀI KHOẢN</div>
            <h1>Hồ sơ tài khoản</h1>
            <p>Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.</p>
          </div>

          <div className="profile-header-user">
            <button
              type="button"
              className="profile-header-avatar"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" />
              ) : (
                initials
              )}
            </button>

            <div>
              <strong>{name || roleLabel}</strong>
              <span>{roleLabel}</span>
            </div>

            <div className="profile-bell">♢</div>
          </div>
        </header>

        <div className="profile-content">
          <section className="profile-left">
            <div className="profile-summary-card">
              <div className="profile-summary-top">
                <div className="profile-large-avatar">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" />
                  ) : (
                    initials
                  )}
                  <label className="profile-camera">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        handleAvatarChange(e.target.files?.[0] || null)
                      }
                    />
                    📷
                  </label>
                </div>
              </div>

              <h2>{name || roleLabel}</h2>

              <span className="profile-role-badge">
                {roleLabel}
              </span>

              <p className="profile-email">{email}</p>

              <div className="profile-quote">
                “Học tập mỗi ngày, tiến bộ mỗi ngày.”
              </div>

              <div className="profile-stats">
                <div>
                  <strong>{role === "teacher" ? "0" : "0"}</strong>
                  <span>{role === "teacher" ? "Lớp học" : "Bài học"}</span>
                </div>
                <div>
                  <strong>0</strong>
                  <span>{role === "teacher" ? "Học sinh" : "Bài tập"}</span>
                </div>
                <div>
                  <strong>0</strong>
                  <span>Điểm danh</span>
                </div>
              </div>

              <div className="profile-account-info">
                <div className="profile-section-title">
                  Thông tin tài khoản
                </div>

                <div className="profile-info-row">
                  <span>Email</span>
                  <strong>{email}</strong>
                </div>

                <div className="profile-info-row">
                  <span>Vai trò</span>
                  <strong>{roleLabel}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="profile-right">
            <div className="profile-edit-card">
              <div className="profile-card-heading">
                <div>
                  <h2>Chỉnh sửa thông tin</h2>
                  <p>Cập nhật thông tin hiển thị của tài khoản.</p>
                </div>

                <button
                  type="button"
                  className="profile-cancel-top"
                  onClick={() => {
                    setName(fullName);
                    setDob(dateOfBirth);
                    setAvatar(avatarUrl);
                    setAvatarFile(null);
                    setMessage("");
                  }}
                >
                  Hủy thay đổi
                </button>
              </div>

              <div className="profile-form-section">
                <label>Ảnh đại diện</label>

                <div className="profile-upload-area">
                  <div className="profile-upload-preview">
                    {avatar ? (
                      <img src={avatar} alt="Preview" />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="profile-upload-actions">
                    <label className="profile-change-photo">
                      Đổi ảnh
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          handleAvatarChange(e.target.files?.[0] || null)
                        }
                      />
                    </label>

                    <span>
                      JPG, JPEG, PNG hoặc WEBP · tối đa 5MB
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-form-grid">
                <div className="profile-field profile-field-full">
                  <div className="profile-field-label-row">
                    <label>Tên hiển thị</label>
                    <span>{name.length}/50</span>
                  </div>

                  <input
                    value={name}
                    maxLength={50}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên hiển thị"
                  />
                </div>

                <div className="profile-field">
                  <label>Email</label>
                  <input value={email} disabled />
                </div>

                <div className="profile-field">
                  <label>Ngày sinh</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>

              {avatarFile && (
                <div className="profile-selected-file">
                  <div>
                    <strong>{avatarFile.name}</strong>
                    <span>
                      {(avatarFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatar(avatarUrl);
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="profile-note">
                <strong>Lưu ý</strong>
                <span>
                  Thay đổi thông tin sẽ được áp dụng ngay cho tài khoản
                  của bạn.
                </span>
              </div>

              {message && (
                <div className="profile-message">
                  {message}
                </div>
              )}

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="profile-button secondary"
                  onClick={() => {
                    setName(fullName);
                    setDob(dateOfBirth);
                    setAvatar(avatarUrl);
                    setAvatarFile(null);
                    setMessage("");
                  }}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  className="profile-button primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "🔒 Lưu thay đổi"}
                </button>
              </div>
            </div>

            <div className="profile-security-card">
              <div className="profile-security-icon">🔒</div>

              <div className="profile-security-content">
                <h2>Bảo mật tài khoản</h2>
                <p>
                  Bảo vệ tài khoản bằng mật khẩu mạnh và không chia sẻ
                  thông tin đăng nhập với người khác.
                </p>
              </div>

              <div className="profile-security-status">
                <span></span>
                Đang hoạt động
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
