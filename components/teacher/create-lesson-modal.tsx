"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  classId: string;
};

export default function CreateLessonModal({
  classId,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setTitle("");
    setDescription("");
    setError("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Vui lòng nhập tên bài học.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/teacher/lessons/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            title,
            description,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể tạo bài học."
        );
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Không thể tạo bài học."
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
        + Tạo bài học
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
                  LESSON
                </span>
                <h3>Tạo bài học</h3>
                <p>
                  Thêm một nội dung mới cho lớp học.
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
                <label>Tên bài học *</label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Ví dụ: Hàm số bậc hai"
                  autoFocus
                />
              </div>

              <div className="room-form-field">
                <label>Mô tả</label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Mô tả ngắn về bài học..."
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
                  {loading ? "Đang tạo..." : "Tạo bài học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
