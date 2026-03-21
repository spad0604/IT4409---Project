# IT4409 BE (Go) — Clean Architecture + JWT + Supabase

## 1) Chạy dự án

```bash
cd BE
go run ./cmd/api
```

Dự án tự load `.env` khi chạy (qua `godotenv`).

## 2) Cấu hình môi trường

Các biến môi trường chính:

- `PORT`: cổng chạy API (mặc định `8080`)
- `DATABASE_URL`: connection string Postgres (Supabase)
- `JWT_SECRET`: secret ký JWT (bắt buộc)
- `JWT_ISSUER`, `JWT_TTL_MINUTES`: cấu hình token

Xem mẫu: `.env.example`.

## 2.1) Chuẩn response của BE

Tất cả API trả về dạng envelope:

```json
{
  "status": 200,
  "message": "success",
  "data": {}
}
```

- `status`: HTTP status code
- `message`: thông báo ("success" hoặc nội dung lỗi)
- `data`: dữ liệu (khi lỗi sẽ là `null`)

## 2.2) Database (Supabase)

Backend dùng Postgres trực tiếp qua `DATABASE_URL`.

## 3) Swagger

- Swagger UI: `http://localhost:8080/swagger/index.html`
- Spec JSON: `http://localhost:8080/swagger/doc.json`

Backend chấp nhận cả 2 dạng:

- `Authorization: Bearer <token>`
- `Authorization: <token>`

## 4) Kiến trúc (Clean Architecture) trong BE

Mục tiêu: tách lớp rõ ràng, dễ test, dễ thay DB/transport.

### Cấu trúc thư mục

- `cmd/api`: entrypoint chạy server
- `internal/config`: load config từ env
- `internal/domain`: entity + domain errors (không phụ thuộc framework)
- `internal/repository`: interface repository (contract)
- `internal/repository/postgres`: implement repository bằng Postgres (pgx)
- `internal/usecase`: nghiệp vụ (register/login/me)
- `internal/delivery/http`:
  - `router`: khai báo routes
  - `handler`: HTTP handler (parse JSON, trả JSON)
  - `middleware`: JWT auth middleware
- `internal/infra/db`: khởi tạo pool kết nối DB
- `internal/pkg`: thư viện nhỏ dùng chung (bcrypt/jwt)
- `migrations`: SQL migrations
- `docs`: swagger docs generate bởi `swag`

### Luồng xử lý request

1. Router nhận request và điều hướng route
2. Handler parse body/headers, gọi Usecase
3. Usecase xử lý nghiệp vụ, gọi Repository interface
4. Postgres repo chạy SQL, trả kết quả về Usecase
5. Handler trả JSON response

## 5) API

### Register

`POST /api/auth/register`

Body:
```json
{
  "email": "a@b.com",
  "password": "123456",
  "name": "Alice"
}
```

### Login

`POST /api/auth/login`

Body:
```json
{
  "email": "a@b.com",
  "password": "123456"
}
```

### Me (JWT)

`GET /api/me`

Header:

- `Authorization: Bearer <token>` (khuyến nghị)
- hoặc `Authorization: <token>`

## 7) Quick curl

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"123456","name":"Alice"}'

curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"123456"}'

# Me: dùng 1 trong 2 kiểu Authorization
curl -X GET http://localhost:8080/api/me \
  -H "Authorization: Bearer <token>"

curl -X GET http://localhost:8080/api/me \
  -H "Authorization: <token>"
```
