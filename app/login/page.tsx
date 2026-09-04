import Link from "next/link";
import { BookOpen, ShieldCheck, Users } from "lucide-react";
import LoginForm from "@/components/auth/login-form";

export default function Login() {
  return (
    <main className="auth-page">
      <section className="auth-left auth-left-clean">
        <div>
          <Link className="logo" href="/" aria-label="Study26">
            <img
              src="/images/study26-logo.png"
              alt="Study26"
            />
          </Link>

          <div style={{ marginTop: 90 }}>
            <h1>
              Chào mừng bạn{" "}
              <span style={{ color: "var(--blue)" }}>
                quay trở lại!
              </span>
            </h1>

            <p>
              Đăng nhập để tiếp tục hành trình học tập
              cùng hàng ngàn học viên trên Study26.
            </p>

            <div className="auth-points">
              <div className="point">
                <div className="point-icon">
                  <BookOpen />
                </div>
                <div>
                  <b>Học tập linh hoạt</b>
                  <div style={{ color: "#66738e", marginTop: 5 }}>
                    Học mọi lúc, mọi nơi với các khóa học
                    chất lượng cao.
                  </div>
                </div>
              </div>

              <div className="point">
                <div className="point-icon">
                  <Users />
                </div>
                <div>
                  <b>Giảng viên tận tâm</b>
                  <div style={{ color: "#66738e", marginTop: 5 }}>
                    Đội ngũ giảng viên giàu kinh nghiệm,
                    hỗ trợ trong quá trình học.
                  </div>
                </div>
              </div>

              <div className="point">
                <div className="point-icon">
                  <ShieldCheck />
                </div>
                <div>
                  <b>Bảo mật tài khoản</b>
                  <div style={{ color: "#66738e", marginTop: 5 }}>
                    Thông tin tài khoản được bảo vệ an toàn.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-left-footer">
          © 2026 Study26 • Nền tảng dạy học trực tuyến
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-box">
          <div
            style={{
              textAlign: "right",
              marginBottom: 70,
              color: "#7b879b",
            }}
          >
            Chưa có tài khoản?{" "}
            <Link className="link" href="/register">
              Đăng ký miễn phí
            </Link>
          </div>

          <h2>Đăng nhập</h2>

          <p>
            Nhập thông tin tài khoản để đăng nhập vào Study26
          </p>

          <LoginForm />

          <div className="divider">
            hoặc đăng nhập với
          </div>

          <div className="socials">
            <button
              className="social"
              type="button"
            >
              Google
            </button>

            <button
              className="social"
              type="button"
            >
              Facebook
            </button>
          </div>

          <p
            style={{
              fontSize: 13,
              marginTop: 35,
            }}
          >
            🔒 Thông tin của bạn được bảo mật và chỉ sử
            dụng cho mục đích cung cấp dịch vụ học tập.
          </p>
        </div>
      </section>
    </main>
  );
}
