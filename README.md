# Study26

Bản code mới hoàn toàn, xây từ đầu theo bộ giao diện demo.

## Chạy trên Mac

```bash
npm install
npm run dev
```

Sau đó mở:
http://localhost:3000

### Route
- `/` Trang chủ
- `/login` Đăng nhập
- `/register` Đăng ký
- `/teacher` Dashboard giáo viên
- `/student` Dashboard học sinh
- `/admin` Dashboard admin

Đây là Phase 1: giao diện và cấu trúc route. Dữ liệu đang là mock để kiểm tra UI.

Phase tiếp theo sẽ thay mock bằng:
- PostgreSQL
- Prisma
- Authentication thật
- RBAC
- CRUD
- Phòng học trực tuyến
- Bài tập, điểm, tiến độ
- Thông báo và nhật ký hoạt động
