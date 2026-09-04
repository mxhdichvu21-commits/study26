"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Subject = {
  id: string;
  name: string;
  code: string;
};

export default function NewClassPage() {
  const router = useRouter();
  const supabase = createClient();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSubjects() {
      const { data } = await supabase
        .from("subjects")
        .select("id, name, code")
        .order("name");

      setSubjects(data ?? []);
    }

    loadSubjects();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!name.trim()) {
      setError("Vui lòng nhập tên lớp.");
      setLoading(false);
      return;
    }

    if (!code.trim()) {
      setError("Vui lòng nhập mã lớp.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("classes")
      .insert({
        teacher_id: user.id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description:
          description.trim() || null,
        subject_id: subjectId || null,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/teacher/classes");
    router.refresh();
  }

  return (
    <div className="shell">
      <main
        className="main"
        style={{ marginLeft: 0 }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
          }}
        >
          <Link
            href="/teacher/classes"
            className="link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={16} />
            Quay lại lớp học
          </Link>

          <section className="card">
            <h1
              style={{
                marginTop: 0,
                fontSize: 30,
              }}
            >
              Tạo lớp học mới
            </h1>

            <p
              style={{
                color: "#7c8799",
                marginBottom: 30,
              }}
            >
              Tạo lớp để bắt đầu thêm học sinh,
              bài học và lịch dạy.
            </p>

            <form
              className="form"
              onSubmit={handleSubmit}
            >
              <div className="field">
                <label>Tên lớp</label>
                <input
                  required
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Ví dụ: Toán 9 - Hình học"
                />
              </div>

              <div className="field">
                <label>Mã lớp</label>
                <input
                  required
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value)
                  }
                  placeholder="Ví dụ: TOAN9A1"
                />
              </div>

              <div className="field">
                <label>Môn học</label>
                <select
                  value={subjectId}
                  onChange={(e) =>
                    setSubjectId(e.target.value)
                  }
                >
                  <option value="">
                    Chọn môn học
                  </option>

                  {subjects.map((subject) => (
                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Mô tả ngắn về lớp học..."
                  rows={5}
                  style={{
                    border: "1px solid #dce3ef",
                    borderRadius: 13,
                    padding: 15,
                    resize: "vertical",
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#fff1f2",
                    color: "#be123c",
                    fontSize: 14,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                className="btn primary"
                type="submit"
                disabled={loading}
                style={{
                  height: 52,
                }}
              >
                {loading
                  ? "Đang tạo lớp..."
                  : "Tạo lớp học"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
