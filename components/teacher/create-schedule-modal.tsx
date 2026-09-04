"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Room = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type Props = {
  classId: string;
  rooms: Room[];
};

export default function CreateScheduleModal({
  classId,
  rooms,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setStartsAt("");
    setEndsAt("");
    setRoomId("");
    setError("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!startsAt || !endsAt) {
      setError("Vui lòng chọn thời gian bắt đầu và kết thúc.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/teacher/schedules/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            startsAt,
            endsAt,
            roomId: roomId || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể tạo lịch học."
        );
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Không thể tạo lịch học."
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
        + Thêm lịch
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
                  SCHEDULE
                </span>
                <h3>Thêm lịch học</h3>
                <p>
                  Lên lịch cho một buổi học của lớp.
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
              <div className="room-form-grid">
                <div className="room-form-field">
                  <label>Bắt đầu *</label>

                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) =>
                      setStartsAt(e.target.value)
                    }
                  />
                </div>

                <div className="room-form-field">
                  <label>Kết thúc *</label>

                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) =>
                      setEndsAt(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="room-form-field">
                <label>Phòng học</label>

                <select
                  value={roomId}
                  onChange={(e) =>
                    setRoomId(e.target.value)
                  }
                  className="study26-select"
                >
                  <option value="">
                    Không gắn phòng
                  </option>

                  {rooms.map((room) => (
                    <option
                      value={room.id}
                      key={room.id}
                    >
                      {room.name} • {room.code}
                    </option>
                  ))}
                </select>
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
                  {loading ? "Đang lưu..." : "Lưu lịch học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
