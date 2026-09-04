"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Student = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  alreadyJoined: boolean;
};

type Member = {
  user_id: string;
  joined_at: string | null;
  profiles:
    | {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      }
    | {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

type Props = {
  classId: string;
  members: Member[];
};

export default function ManageClassStudents({
  classId,
  members,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/teacher/classes/students/search?classId=${classId}&q=${encodeURIComponent(q)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Không thể tải học sinh."
          );
        }

        setStudents(data.students ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải học sinh."
        );
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [open, q, classId]);

  async function addStudent(studentId: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/teacher/classes/students/add",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            studentId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể thêm học sinh."
        );
      }

      router.refresh();
      setQ("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể thêm học sinh."
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeStudent(studentId: string) {
    const confirmed = window.confirm(
      "Xóa học sinh này khỏi lớp?"
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/teacher/classes/students/remove",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            studentId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể xóa học sinh."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể xóa học sinh."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="class-primary-button"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        + Thêm học sinh
      </button>

      <div className="class-manage-students-list">
        {members.map((member) => {
          const profile = Array.isArray(member.profiles)
            ? member.profiles[0]
            : member.profiles;

          return (
            <div
              className="class-content-row"
              key={member.user_id}
            >
              <div className="class-avatar small">
                {profile?.full_name
                  ?.charAt(0)
                  ?.toUpperCase() || "?"}
              </div>

              <div className="content-row-main">
                <strong>
                  {profile?.full_name || "Học sinh"}
                </strong>

                <span>
                  Tham gia{" "}
                  {member.joined_at
                    ? new Date(
                        member.joined_at
                      ).toLocaleDateString("vi-VN")
                    : "—"}
                </span>
              </div>

              <button
                type="button"
                className="table-action"
                onClick={() =>
                  removeStudent(member.user_id)
                }
                disabled={loading}
              >
                🗑
              </button>
            </div>
          );
        })}
      </div>

      {open && (
        <div
          className="room-modal-overlay"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="room-modal student-picker-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            <div className="room-modal-header">
              <div>
                <span className="section-kicker">
                  STUDENTS
                </span>

                <h3>Thêm học sinh</h3>

                <p>
                  Tìm tài khoản học sinh và thêm vào lớp.
                </p>
              </div>

              <button
                type="button"
                className="room-modal-close"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="student-picker-body">
              <input
                value={q}
                onChange={(e) =>
                  setQ(e.target.value)
                }
                placeholder="Tìm theo họ và tên..."
                autoFocus
              />

              {error && (
                <div className="room-form-error">
                  {error}
                </div>
              )}

              <div className="student-picker-list">
                {students.length === 0 ? (
                  <div className="class-empty">
                    Không tìm thấy học sinh.
                  </div>
                ) : (
                  students.map((student) => (
                    <div
                      className="student-picker-row"
                      key={student.id}
                    >
                      <div className="class-avatar">
                        {student.full_name
                          ?.charAt(0)
                          ?.toUpperCase() || "?"}
                      </div>

                      <div className="content-row-main">
                        <strong>
                          {student.full_name ||
                            "Học sinh"}
                        </strong>

                        <span>
                          {student.alreadyJoined
                            ? "Đã ở trong lớp"
                            : "Chưa tham gia"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="class-primary-button"
                        disabled={
                          student.alreadyJoined ||
                          loading
                        }
                        onClick={() =>
                          addStudent(student.id)
                        }
                      >
                        {student.alreadyJoined
                          ? "Đã thêm"
                          : "Thêm"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
