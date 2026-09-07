"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  classId: string;
};

export default function CreateAssignmentModal({
  classId,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("10");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setTitle("");
    setDescription("");
    setPoints("10");
    setDueAt("");
    setError("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Vui lòng nhập tên bài tập.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/teacher/assignments/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            title,
            description,
            points: Number(points) || 0,
            dueAt,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể tạo bài tập."
        );
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Không thể tạo bài tập."
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
        onClick={openModal}
      >
        + Tạo bài tập
      </button>

      {open && (
        <div
          className="room-modal-overlay"
          onMouseDown={() => {
            if (!loading) setOpen(false);
          }}
        >
          <div
            className="room-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="room-modal-header">
              <div>
                <span className="section-kicker">
                  ASSIGNMENT
                </span>
                <h3>Tạo bài tập</h3>
                <p>
                  Giao bài tập cho học sinh trong lớp.
                </p>
              </div>

              <button
                type="button"
                className="room-modal-close"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                ×
              </button>
            </div>

            <form onSubmit={submit}>
              <div className="room-form-field">
                <label>Tên bài tập *</label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Ví dụ: Bài tập chương 1"
                  autoFocus
                />
              </div>

              <div className="room-form-grid">
                <div className="room-form-field">
                  <label>Số điểm</label>

                  <input
                    type="number"
                    min="0"
                    value={points}
                    onChange={(e) =>
                      setPoints(e.target.value)
                    }
                  />
                </div>

                <div className="room-form-field">
                  <label>Hạn nộp</label>

                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) =>
                      setDueAt(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="room-form-field">
                <label>Mô tả</label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Yêu cầu, hướng dẫn..."
                  className="study26-textarea"
                />
              </div>

              {error && (
                <div className="room-form-error">
                  {error}
                </div>
              )}

              <div className="room-modal-footer">
                <button
                  type="button"
                  className="room-cancel-button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="room-create-button"
                  disabled={loading}
                >
                  {loading ? "Đang tạo..." : "Tạo bài tập"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
