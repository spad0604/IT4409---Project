# IT4409 Project (FE + BE)

## 1) Tổng quan

Repo gồm 2 phần:

- `BE/`: Go backend theo Clean Architecture + Supabase Postgres + JWT + Swagger
- `FE/FE/my-react-app/`: React (Vite) theo base architecture `app/shared/features`

## 2) Chạy BE

### 2.1 Cấu hình

Trong `BE/.env`:

- `DATABASE_URL`: Supabase Postgres connection string
- `JWT_SECRET`: secret ký JWT
- `PORT`: port (mặc định `8080`)

### 2.2 Migrate DB

Vào Supabase Dashboard → SQL Editor → chạy:

- `BE/migrations/001_init.sql`

### 2.3 Run

```bash
cd BE

go run ./cmd/api
```

Swagger:
- `http://localhost:8080/swagger/index.html`

## 3) Chạy FE

### 3.1 Cấu hình

Trong `FE/my-react-app/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 3.2 Run

```bash
cd FE/my-react-app

npm install
npm run dev
```

## 4) Chuẩn response BE

BE trả response theo envelope:

```json
{
  "status": 200,
  "message": "success",
  "data": {}
}
```

FE parse `data` và xử lý lỗi dựa trên HTTP status + `message`.

## 5) Tài liệu chi tiết

- BE: `BE/README.md`
- FE: `FE/my-react-app/README.md`

## 6) Quy chuẩn commit message

### Format

```
<TYPE>(<scope>): <mô tả ngắn>
```

- `TYPE`: bắt buộc, dùng 1 trong các loại bên dưới
- `scope`: khuyến nghị (vd: `BE`, `FE`, `auth`, `swagger`, `db`), viết thường, không dấu
- Mô tả: ngắn gọn, tiếng Việt hoặc tiếng Anh đều được, không viết hoa toàn bộ

### TYPE

- `FEATURE`: thêm chức năng mới / thay đổi hành vi có ý nghĩa với người dùng
- `FIX`: sửa bug / lỗi logic / lỗi runtime
- `REFACTOR`: chỉ refactor (không đổi hành vi), dọn code, tách file, đổi tên, tối ưu cấu trúc

### Ví dụ

```
FEATURE(auth): add register/login endpoints
FEATURE(fe-auth): add auth provider and token storage

FIX(be): handle missing Bearer prefix in Authorization
FIX(db): create users table migration

REFACTOR(be): split auth usecase and repository layers
REFACTOR(fe): reorganize shared api client
```

### Quy tắc nhỏ

- 1 commit = 1 mục đích rõ ràng (tránh gom quá nhiều thứ)
- Không commit file `.env` (đã ignore)
- Nếu thay đổi lớn, ưu tiên chia nhỏ commit theo từng phần (API, migration, FE wiring...)
