"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Kind =
  | "lesson"
  | "assignment"
  | "schedule";

type Props = {
  kind: Kind;
  id: string;
  classId: string;

  title?: string;
  description?: string | null;

  points?: number;
  dueAt?: string | null;

  startsAt?: string;
  endsAt?: string;

  roomId?: string | null;
};

type Room = {
  id: string;
  name: string;
  code: string;
  status: string;
};

function toLocalInput(
  value?: string | null
) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value: number) =>
    String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

export default function ContentActions(
  props: Props
) {
  const router = useRouter();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [title, setTitle] =
    useState(props.title || "");

  const [description, setDescription] =
    useState(props.description || "");

  const [points, setPoints] =
    useState(
      String(props.points ?? 10)
    );

  const [dueAt, setDueAt] =
    useState(
      toLocalInput(props.dueAt)
    );

  const [startsAt, setStartsAt] =
    useState(
      toLocalInput(props.startsAt)
    );

  const [endsAt, setEndsAt] =
    useState(
      toLocalInput(props.endsAt)
    );

  const [roomId, setRoomId] =
    useState(props.roomId || "");

  const [rooms, setRooms] =
    useState<Room[]>([]);

  useEffect(() => {
    function closeMenu(
      event: MouseEvent
    ) {
      const target =
        event.target as HTMLElement;

      if (
        !target.closest(
          "[data-content-actions]"
        )
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      closeMenu
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeMenu
      );
    };
  }, []);

  async function openEdit() {
    setMenuOpen(false);
    setError("");

    setTitle(props.title || "");
    setDescription(
      props.description || ""
    );

    setPoints(
      String(props.points ?? 10)
    );

    setDueAt(
      toLocalInput(props.dueAt)
    );

    setStartsAt(
      toLocalInput(props.startsAt)
    );

    setEndsAt(
      toLocalInput(props.endsAt)
    );

    setRoomId(props.roomId || "");

    if (props.kind === "schedule") {
      try {
        const response = await fetch(
          `/api/teacher/schedules/rooms?classId=${encodeURIComponent(
            props.classId
          )}`
        );

        const data =
          await response.json();

        if (response.ok) {
          setRooms(data.rooms || []);
        }
      } catch {
        setRooms([]);
      }
    }

    setOpen(true);
  }

  async function removeItem() {
    setMenuOpen(false);

    const label =
      props.kind === "lesson"
        ? "bài học"
        : props.kind === "assignment"
        ? "bài tập"
        : "lịch học";

    if (
      !window.confirm(
        `Bạn có chắc muốn xóa ${label} này không?`
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    const endpoint =
      `/api/teacher/` +
      (
        props.kind === "lesson"
          ? "lessons"
          : props.kind === "assignment"
          ? "assignments"
          : "schedules"
      ) +
      "/delete";

    try {
      const response = await fetch(
        endpoint,
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: props.id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Không thể xóa ${label}.`
        );
      }

      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể xóa nội dung.";

      setError(message);
      window.alert(message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      let endpoint = "";
      let body: Record<
        string,
        unknown
      >;

      if (props.kind === "lesson") {
        if (!title.trim()) {
          throw new Error(
            "Vui lòng nhập tên bài học."
          );
        }

        endpoint =
          "/api/teacher/lessons/update";

        body = {
          id: props.id,
          title,
          description,
        };
      } else if (
        props.kind === "assignment"
      ) {
        if (!title.trim()) {
          throw new Error(
            "Vui lòng nhập tên bài tập."
          );
        }

        endpoint =
          "/api/teacher/assignments/update";

        body = {
          id: props.id,
          title,
          description,
          points:
            Number(points) || 0,
          dueAt,
        };
      } else {
        if (!startsAt || !endsAt) {
          throw new Error(
            "Vui lòng chọn thời gian bắt đầu và kết thúc."
          );
        }

        endpoint =
          "/api/teacher/schedules/update";

        body = {
          id: props.id,
          startsAt,
          endsAt,
          roomId:
            roomId || null,
        };
      }

      const response = await fetch(
        endpoint,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Không thể lưu thay đổi."
        );
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu thay đổi."
      );
    } finally {
      setLoading(false);
    }
  }

  const heading =
    props.kind === "lesson"
      ? "Sửa bài học"
      : props.kind === "assignment"
      ? "Sửa bài tập"
      : "Sửa lịch học";

  return (
    <div
      data-content-actions
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <button
        type="button"
        className="table-action"
        aria-label="Tùy chọn"
        aria-expanded={menuOpen}
        onClick={() =>
          setMenuOpen(
            (value) => !value
          )
        }
      >
        •••
      </button>

      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 30,
            minWidth: 140,
            padding: 6,
            borderRadius: 12,
            background: "#fff",
            border:
              "1px solid rgba(15,23,42,.1)",
            boxShadow:
              "0 12px 30px rgba(15,23,42,.14)",
          }}
        >
          <button
            type="button"
            onClick={openEdit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "9px 10px",
              border: 0,
              borderRadius: 8,
              background: "transparent",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            Sửa
          </button>

          <button
            type="button"
            onClick={removeItem}
            disabled={loading}
            style={{
              width: "100%",
              padding: "9px 10px",
              border: 0,
              borderRadius: 8,
              background: "transparent",
              color: "#dc2626",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            Xóa
          </button>
        </div>
      )}

      {open && (
        <div
          className="room-modal-overlay"
          onMouseDown={() => {
            if (!loading) {
              setOpen(false);
            }
          }}
        >
          <div
            className="room-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="room-modal-header">
              <div>
                <span className="section-kicker">
                  {props.kind.toUpperCase()}
                </span>

                <h3>{heading}</h3>

                <p>
                  Cập nhật thông tin và lưu thay đổi.
                </p>
              </div>

              <button
                type="button"
                className="room-modal-close"
                onClick={() =>
                  setOpen(false)
                }
                disabled={loading}
              >
                ×
              </button>
            </div>

            <form onSubmit={submit}>
              {props.kind !==
                "schedule" && (
                <>
                  <div className="room-form-field">
                    <label>
                      {props.kind ===
                      "lesson"
                        ? "Tên bài học *"
                        : "Tên bài tập *"}
                    </label>

                    <input
                      value={title}
                      onChange={(event) =>
                        setTitle(
                          event.target.value
                        )
                      }
                      autoFocus
                    />
                  </div>

                  {props.kind ===
                    "assignment" && (
                    <div className="room-form-grid">
                      <div className="room-form-field">
                        <label>
                          Số điểm
                        </label>

                        <input
                          type="number"
                          min="0"
                          value={points}
                          onChange={(event) =>
                            setPoints(
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="room-form-field">
                        <label>
                          Hạn nộp
                        </label>

                        <input
                          type="datetime-local"
                          value={dueAt}
                          onChange={(event) =>
                            setDueAt(
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="room-form-field">
                    <label>
                      Mô tả
                    </label>

                    <textarea
                      value={description}
                      onChange={(event) =>
                        setDescription(
                          event.target.value
                        )
                      }
                      className="study26-textarea"
                    />
                  </div>
                </>
              )}

              {props.kind ===
                "schedule" && (
                <>
                  <div className="room-form-grid">
                    <div className="room-form-field">
                      <label>
                        Bắt đầu *
                      </label>

                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(event) =>
                          setStartsAt(
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div className="room-form-field">
                      <label>
                        Kết thúc *
                      </label>

                      <input
                        type="datetime-local"
                        value={endsAt}
                        onChange={(event) =>
                          setEndsAt(
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="room-form-field">
                    <label>
                      Phòng học
                    </label>

                    <select
                      value={roomId}
                      onChange={(event) =>
                        setRoomId(
                          event.target.value
                        )
                      }
                      className="study26-select"
                    >
                      <option value="">
                        Không gắn phòng
                      </option>

                      {rooms.map(
                        (room) => (
                          <option
                            value={room.id}
                            key={room.id}
                          >
                            {room.name} •{" "}
                            {room.code}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </>
              )}

              {error && (
                <div className="room-form-error">
                  {error}
                </div>
              )}

              <div className="room-modal-footer">
                <button
                  type="button"
                  className="room-cancel-button"
                  onClick={() =>
                    setOpen(false)
                  }
                  disabled={loading}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="room-create-button"
                  disabled={loading}
                >
                  {loading
                    ? "Đang lưu..."
                    : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
