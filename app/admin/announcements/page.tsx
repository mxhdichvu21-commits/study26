"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";

type Announcement = {
  id: string;
  title: string;
  description: string;
  type: "info" | "important" | "warning";
  is_active: boolean;
  image_url: string | null;
  created_at: string;
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] =
    useState<Announcement["type"]>("info");

  const [endsAt, setEndsAt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/announcements",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể tải thông báo."
        );
      }

      setItems(
        Array.isArray(data.announcements)
          ? data.announcements
          : []
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải thông báo."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleImage(
    file: File | null
  ) {
    if (!file) {
      setImage(null);
      setPreview(null);
      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      setMessage(
        "Chỉ nhận JPG, JPEG, PNG hoặc WEBP."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Ảnh tối đa 5MB.");
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function createAnnouncement(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !title.trim() ||
      !description.trim()
    ) {
      setMessage(
        "Hãy nhập đầy đủ tiêu đề và nội dung."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const formData = new FormData();

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "description",
        description.trim()
      );

      formData.append(
        "type",
        type
      );

      if (endsAt) {
        formData.append(
          "endsAt",
          new Date(endsAt).toISOString()
        );
      }

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      const response = await fetch(
        "/api/admin/announcements",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể tạo thông báo."
        );
      }

      setTitle("");
      setDescription("");
      setType("info");
      setEndsAt("");
      setImage(null);
      setPreview(null);

      setMessage(
        "Đã tạo thông báo toàn hệ thống."
      );

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tạo thông báo."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-bold text-[#6941c6] hover:underline"
        >
          ← Quay lại Dashboard
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[420px_1fr]">

          <section className="rounded-2xl border border-[#ececf3] bg-white p-6 shadow-sm">

            <div className="mb-5">
              <div className="text-[10px] font-extrabold tracking-[0.14em] text-[#98a0b3]">
                ADMIN
              </div>

              <h1 className="mt-1 text-2xl font-extrabold text-[#1f2937]">
                Thông báo toàn hệ thống
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Gửi thông báo đến toàn bộ người dùng Study26.
              </p>
            </div>

            <form
              onSubmit={createAnnouncement}
              className="space-y-4"
            >

              <div>
                <label className="mb-2 block text-xs font-bold">
                  Tiêu đề
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Nhập tiêu đề..."
                  maxLength={160}
                  className="h-11 w-full rounded-xl border border-[#e5e7f0] px-3 text-sm outline-none focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold">
                  Nội dung
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  rows={6}
                  maxLength={4000}
                  placeholder="Nhập nội dung thông báo..."
                  className="w-full resize-none rounded-xl border border-[#e5e7f0] p-3 text-sm outline-none focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* =============================
                  THÊM ẢNH THÔNG BÁO
                 ============================= */}
              <div>
                <label className="mb-2 block text-xs font-bold">
                  Ảnh thông báo
                </label>

                <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ddd6fe] bg-[#faf9ff] p-4 text-center transition hover:bg-[#f6f5ff]">

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) =>
                      handleImage(
                        e.target.files?.[0] ?? null
                      )
                    }
                  />

                  {preview ? (
                    <img
                      src={preview}
                      alt="Ảnh xem trước"
                      className="max-h-48 max-w-full rounded-xl object-contain"
                    />
                  ) : (
                    <>
                      <div className="text-sm font-extrabold text-[#6941c6]">
                        + Thêm ảnh
                      </div>

                      <div className="mt-1 text-xs text-[#98a0b3]">
                        JPG, PNG, WEBP · tối đa 5MB
                      </div>
                    </>
                  )}
                </label>

                {image && (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="truncate text-xs font-semibold text-slate-700">
                      {image.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setPreview(null);
                      }}
                      className="ml-3 shrink-0 text-xs font-bold text-red-500"
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold">
                  Loại thông báo
                </label>

                <select
                  value={type}
                  onChange={(e) =>
                    setType(
                      e.target.value as Announcement["type"]
                    )
                  }
                  className="h-11 w-full rounded-xl border border-[#e5e7f0] px-3 text-sm outline-none focus:border-[#7C3AED]"
                >
                  <option value="info">
                    Thông tin
                  </option>

                  <option value="important">
                    Quan trọng
                  </option>

                  <option value="warning">
                    Cảnh báo
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold">
                  Hết hạn
                </label>

                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) =>
                    setEndsAt(e.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-[#e5e7f0] px-3 text-sm outline-none focus:border-[#7C3AED]"
                />
              </div>

              {message && (
                <div className="rounded-xl bg-purple-50 px-3 py-3 text-sm font-medium text-[#6941c6]">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="h-11 w-full rounded-xl bg-[#6941c6] text-sm font-bold text-white hover:bg-[#5b21b6] disabled:opacity-60"
              >
                {saving
                  ? "Đang tạo..."
                  : "Tạo thông báo toàn hệ thống"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#ececf3] bg-white p-6 shadow-sm">

            <div className="mb-5">
              <h2 className="text-xl font-extrabold text-[#1f2937]">
                Thông báo đã tạo
              </h2>

              <p className="mt-1 text-sm text-[#98a0b3]">
                Người dùng sẽ nhìn thấy các thông báo đang hoạt động.
              </p>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-[#98a0b3]">
                Đang tải...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#dfe3ea] bg-[#fafafa] p-10 text-center text-sm text-[#98a0b3]">
                Chưa có thông báo.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-[#ececf3]"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="max-h-72 w-full object-cover"
                      />
                    )}

                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-bold text-purple-700">
                          {item.type === "important"
                            ? "Quan trọng"
                            : item.type === "warning"
                              ? "Cảnh báo"
                              : "Thông tin"}
                        </span>

                        <span
                          className={
                            item.is_active
                              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"
                              : "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500"
                          }
                        >
                          {item.is_active
                            ? "Đang hiển thị"
                            : "Đang tắt"}
                        </span>
                      </div>

                      <h3 className="mt-3 font-extrabold text-[#1f2937]">
                        {item.title}
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#667085]">
                        {item.description}
                      </p>

                      <div className="mt-3 text-xs text-[#98a0b3]">
                        {new Date(
                          item.created_at
                        ).toLocaleString("vi-VN")}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const response =
                                await fetch(
                                  `/api/admin/announcements/${item.id}`,
                                  {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type":
                                        "application/json",
                                    },
                                    body: JSON.stringify({
                                      isActive:
                                        !item.is_active,
                                    }),
                                  }
                                );

                              const data =
                                await response.json();

                              if (!response.ok) {
                                throw new Error(
                                  data?.error ||
                                    "Không thể cập nhật thông báo."
                                );
                              }

                              await load();
                            } catch (error) {
                              setMessage(
                                error instanceof Error
                                  ? error.message
                                  : "Không thể cập nhật thông báo."
                              );
                            }
                          }}
                          className="rounded-xl border border-[#e5e7f0] bg-white px-4 py-2 text-xs font-bold text-[#667085] transition hover:bg-slate-50"
                        >
                          {item.is_active
                            ? "Tắt thông báo"
                            : "Bật thông báo"}
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed =
                              window.confirm(
                                `Bạn có chắc muốn xóa thông báo "${item.title}"?`
                              );

                            if (!confirmed) {
                              return;
                            }

                            try {
                              const response =
                                await fetch(
                                  `/api/admin/announcements/${item.id}`,
                                  {
                                    method: "DELETE",
                                  }
                                );

                              const data =
                                await response.json();

                              if (!response.ok) {
                                throw new Error(
                                  data?.error ||
                                    "Không thể xóa thông báo."
                                );
                              }

                              setMessage(
                                "Đã xóa thông báo."
                              );

                              await load();
                            } catch (error) {
                              setMessage(
                                error instanceof Error
                                  ? error.message
                                  : "Không thể xóa thông báo."
                              );
                            }
                          }}
                          className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                        >
                          Xóa thông báo
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}
