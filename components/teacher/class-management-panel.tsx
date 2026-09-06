"use client";

type Props = {
  classId: string;
};

const items = [
  {
    href: "#hoc-sinh",
    icon: "♙",
    title: "Học sinh",
    desc: "Quản lý danh sách học sinh trong lớp",
  },
  {
    href: "#bai-hoc",
    icon: "▤",
    title: "Bài học",
    desc: "Tạo và quản lý nội dung bài học",
  },
  {
    href: "#bai-tap",
    icon: "▧",
    title: "Bài tập",
    desc: "Giao bài và theo dõi bài nộp",
  },
  {
    href: "#lich-hoc",
    icon: "▦",
    title: "Lịch học",
    desc: "Theo dõi các buổi học đã lên lịch",
  },
  {
    href: "#phong-hoc",
    icon: "▣",
    title: "Phòng học",
    desc: "Quản lý phòng học trực tuyến",
  },
  {
    href: "attendance",
    icon: "✓",
    title: "Điểm danh",
    desc: "Xem và xuất dữ liệu điểm danh",
  },
];

export default function ClassManagementPanel({
  classId,
}: Props) {
  return (
    <section
      id="quan-ly-lop"
      className="mx-auto mb-8 max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-5">
        <div className="text-xs font-bold uppercase tracking-wider text-violet-600">
          CLASS MANAGEMENT
        </div>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Quản lý lớp
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Truy cập nhanh các khu vực quản lý của lớp học này.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const href =
            item.href === "attendance"
              ? `/teacher/classes/${classId}/attendance`
              : item.href;

          return (
            <a
              key={item.title}
              href={href}
              className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm ring-1 ring-slate-200">
                  {item.icon}
                </div>

                <div className="min-w-0">
                  <div className="font-bold text-slate-900 group-hover:text-violet-700">
                    {item.title}
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {item.desc}
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
