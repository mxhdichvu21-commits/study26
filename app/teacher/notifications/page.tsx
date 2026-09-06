import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherNotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    profile.role !== "teacher" ||
    !profile.is_active
  ) {
    redirect("/");
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(
      "id, title, description, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f8fc",
        padding: "32px",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div>
            <Link
              href="/teacher"
              style={{
                color: "#6941c6",
                textDecoration: "none",
                fontSize: "13px",
              }}
            >
              ← Quay lại dashboard
            </Link>

            <h1
              style={{
                margin: "10px 0 0",
                fontSize: "28px",
                color: "#1f2937",
              }}
            >
              Thông báo
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#98a0b3",
                fontSize: "14px",
              }}
            >
              Các thông báo dành cho tài khoản giáo viên.
            </p>
          </div>

          <Link
            href="/teacher"
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              background: "#6941c6",
              color: "#fff",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Dashboard
          </Link>
        </div>

        <section
          style={{
            background: "#fff",
            border: "1px solid #ececf3",
            borderRadius: "18px",
            overflow: "hidden",
          }}
        >
          {!notifications ||
          notifications.length === 0 ? (
            <div
              style={{
                padding: "60px 24px",
                textAlign: "center",
                color: "#98a0b3",
              }}
            >
              Chưa có thông báo mới.
            </div>
          ) : (
            notifications.map((item) => (
              <article
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "auto minmax(0,1fr) auto",
                  gap: "14px",
                  alignItems: "start",
                  padding: "20px",
                  borderBottom:
                    "1px solid #f0f1f5",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    display: "grid",
                    placeItems: "center",
                    background: "#ede9fe",
                    color: "#6941c6",
                    fontWeight: 700,
                  }}
                >
                  ♧
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      color: "#1f2937",
                    }}
                  >
                    {item.title}
                  </h2>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#667085",
                      lineHeight: 1.6,
                      fontSize: "13px",
                    }}
                  >
                    {item.description ||
                      "Không có nội dung."}
                  </p>
                </div>

                <time
                  dateTime={item.created_at}
                  style={{
                    color: "#98a0b3",
                    fontSize: "11px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {new Intl.DateTimeFormat(
                    "vi-VN",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone:
                        "Asia/Ho_Chi_Minh",
                    }
                  ).format(
                    new Date(item.created_at)
                  )}
                </time>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
