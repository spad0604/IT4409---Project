# IT4409 Backend Context For Copilot

## 1) Backend Mission In Product

BE phục vụ cho một web app kiểu Jira để quản lý flow công việc:

- Xác thực người dùng và phiên đăng nhập
- Quản lý project và thành viên dự án
- Kiểm soát quyền theo vai trò (admin/member/viewer)
- Làm nền tảng cho issue/workflow flow trong các bước tiếp theo

## 2) Tech Stack

- Go 1.24
- Router: go-chi/chi v5
- Database: PostgreSQL (Supabase) qua pgx/v5
- Auth: JWT HS256
- Password hashing: bcrypt
- API docs: swaggo/swagger

## 3) Core Folder Responsibilities

- BE/cmd/api/main.go: app entrypoint và dependency wiring
- BE/internal/config: load env + validate config
- BE/internal/domain: entity và domain errors
- BE/internal/repository: repository contracts
- BE/internal/repository/postgres: triển khai SQL thực tế
- BE/internal/usecase: business logic và permission checks
- BE/internal/delivery/http/handler: parse request, call usecase, trả response
- BE/internal/delivery/http/middleware: JWT middleware
- BE/internal/delivery/http/router: register routes
- BE/internal/infra/db: tạo pgx pool
- BE/internal/pkg/jwtutil: sign/parse JWT
- BE/internal/pkg/password: hash/compare mật khẩu

## 4) Runtime Wiring (Current State)

API server chính đang wiring auth module:

1. config.Load
2. db.NewPostgres
3. postgres.NewUserRepo
4. usecase.NewAuthUsecase
5. handler.NewAuthHandler
6. router.New với AuthHandler và JWT middleware

Routes active trong entrypoint chính:

- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/me
- GET /swagger/*

Lưu ý:

- Project module (handler/usecase/repo) đã có code.
- Chưa được mount vào router của API entrypoint hiện tại.
- Luồng project đang được exercise trong BE/cmd/tester/main.go.

## 5) Response Contract

BE dùng envelope JSON:

{
  "status": number,
  "message": string,
  "data": any
}

FE đang phụ thuộc vào việc lấy payload.data ở nhánh success.

## 6) Auth Data Flow (HTTP -> DB)

### Register

1. POST /api/auth/register vào AuthHandler.Register
2. Handler decode request body
3. Usecase normalize email + validate input
4. Usecase hash password bằng bcrypt
5. UserRepo insert user vào public.users
6. Usecase ký JWT
7. Handler trả envelope 201 (token + user)

### Login

1. POST /api/auth/login vào AuthHandler.Login
2. Usecase normalize email
3. UserRepo.GetByEmail
4. Compare password hash
5. Ký JWT
6. Trả envelope 200 (token + user)

### Me (Protected)

1. JWT middleware đọc Authorization
2. Hỗ trợ cả "Bearer <token>" và "<token>"
3. Parse token và lấy subject làm user id
4. Gắn user id vào request context
5. Handler gọi usecase.Me
6. Repo.GetByID và trả envelope 200

## 7) Project/Permission Flow (Usecase Level)

CreateProject dùng transaction gộp:

1. Create project row
2. Init issue counter
3. Add creator làm admin member
4. Commit nếu thành công toàn bộ, rollback nếu lỗi bất kỳ bước nào

Permission model:

- Hierarchy: admin > member > viewer
- PermissionChecker xác minh role trước khi update/delete/manage members

## 8) Environment Contract (BE)

- PORT
- DATABASE_URL
- JWT_SECRET
- JWT_ISSUER
- JWT_TTL_MINUTES

## 9) Coding Notes For Copilot (BE)

- Khi sửa auth, giữ response envelope tương thích FE parser.
- Khi mount project APIs vào runtime chính, cần wiring repo/usecase/handler trong main.go và register route trong router.
- Không đưa logic nghiệp vụ vào repository layer; giữ usecase là nơi điều phối transaction và permission.