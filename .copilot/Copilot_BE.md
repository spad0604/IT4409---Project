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
- BE/internal/delivery/http/handler/response.go: shared response helpers dùng chung
- BE/internal/delivery/http/middleware: JWT middleware + CORS middleware
- BE/internal/delivery/http/router: register routes
- BE/internal/infra/db: tạo pgx pool
- BE/internal/pkg/jwtutil: sign/parse JWT
- BE/internal/pkg/password: hash/compare mật khẩu

## 4) Runtime Wiring (Current State)

API server đang wiring auth + user + project modules:

1. config.Load
2. db.NewPostgres
3. postgres.NewUserRepo + postgres.NewProjectRepo + postgres.NewPgTxManager
4. usecase.NewAuthUsecase + usecase.NewUserUsecase
5. usecase.NewPermissionChecker + usecase.NewProjectUsecase
6. handler.NewAuthHandler + handler.NewUserHandler + handler.NewProjectHandler
7. router.New với tất cả handlers + JWT + CORS middleware

Routes active:

- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout (protected)
- POST /api/auth/change-password (protected)
- POST /api/auth/refresh (protected)
- GET /api/me (protected, backward compat cho FE cũ)
- GET /api/users/me (protected)
- PATCH /api/users/me (protected)
- GET /api/users/{userID} (protected)
- GET /api/users?search=keyword (protected)
- POST /api/projects (protected, Người B)
- GET /api/projects (protected, Người B)
- GET /api/projects/{id} (protected, Người B)
- PATCH /api/projects/{id} (protected, Người B)
- DELETE /api/projects/{id} (protected, Người B)
- GET /api/projects/{id}/members (protected, Người B)
- POST /api/projects/{id}/members (protected, Người B)
- PUT /api/projects/{id}/members/{userID} (protected, Người B)
- DELETE /api/projects/{id}/members/{userID} (protected, Người B)
- GET /swagger/*

## 5) Response Contract

BE dùng envelope JSON:

{
  "status": number,
  "message": string,
  "data": any
}

FE đang phụ thuộc vào việc lấy payload.data ở nhánh success.

Shared helpers trong handler/response.go:

- writeJSON(w, status, body): encode JSON
- writeSuccess(w, status, data): envelope success
- writeError(w, status, message): envelope error
- writeDomainError(w, err): map domain error → HTTP status
- parseBody(r, dst): decode JSON body
- parseUUID(w, raw): validate UUID format
- parsePagination(r): extract page/per_page → limit/offset
- requireUserID(w, r): extract userID from JWT context

Lưu ý: Project handler (Người B) hiện chưa dùng shared helpers này, vẫn dùng http.Error() và json trực tiếp.

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
4. Gắn user id vào request context (struct key ctxKeyUserID{})
5. Handler gọi usecase.Me
6. Repo.GetByID và trả envelope 200

### Change Password (Protected)

1. POST /api/auth/change-password
2. requireUserID lấy userID từ context
3. Usecase verify old password bằng bcrypt
4. Validate new password >= 6 chars
5. Hash new password và update DB
6. Trả envelope 200

### Refresh Token (Protected)

1. POST /api/auth/refresh
2. requireUserID lấy userID từ context
3. Usecase verify user exists
4. Ký JWT mới
5. Trả envelope 200 (token)

## 7) User Profile Flow

### Get Profile

1. GET /api/users/me
2. requireUserID lấy userID
3. UserUsecase.GetProfile → UserRepo.GetByID
4. Clear PasswordHash
5. Trả envelope 200 với avatar_url, updated_at

### Update Profile

1. PATCH /api/users/me với body { name, avatar_url }
2. UserUsecase.UpdateProfile → merge fields → UserRepo.Update
3. Trả envelope 200

### Search Users

1. GET /api/users?search=keyword&page=1&per_page=20
2. UserUsecase.SearchUsers → UserRepo.Search (ILIKE trên name và email)
3. Trả envelope 200

## 8) Project/Permission Flow (Usecase Level)

CreateProject dùng transaction gộp:

1. Create project row
2. Init issue counter
3. Add creator làm admin member
4. Commit nếu thành công toàn bộ, rollback nếu lỗi bất kỳ bước nào

Permission model:

- Hierarchy: admin > member > viewer
- PermissionChecker xác minh role trước khi update/delete/manage members

## 9) Handler Route Registration Pattern

Mỗi handler tự đăng ký routes qua method RegisterRoutes:

```
AuthHandler.RegisterRoutes(r)           // public: /auth/register, /auth/login
AuthHandler.RegisterProtectedRoutes(r)  // protected: /auth/logout, /auth/change-password, /auth/refresh
UserHandler.RegisterRoutes(r)           // protected: /users/me, /users/{userID}, /users?search=
ProjectHandler.RegisterRoutes(r)        // protected: /projects/...
```

router.go chỉ gọi các method này, không khai báo route trực tiếp.

## 10) Environment Contract (BE)

- PORT
- DATABASE_URL
- JWT_SECRET
- JWT_ISSUER
- JWT_TTL_MINUTES

## 11) Domain Errors

Defined trong domain/errors.go:

- ErrNotFound → 404
- ErrConflict → 409
- ErrUnauthorized → 401
- ErrForbidden → 403
- ErrInvalidInput → 400
- ErrInternal → 500
- ErrSprintActive (cho sprint module sau)
- ErrSprintNotActive (cho sprint module sau)
- ErrInvalidStatus (cho issue status transition sau)

## 12) Coding Notes For Copilot (BE)

- Khi sửa auth, giữ response envelope tương thích FE parser.
- Khi thêm handler mới, dùng RegisterRoutes pattern và shared helpers từ response.go.
- Dùng requireUserID(w, r) thay vì tự đọc context — đảm bảo dùng đúng struct key.
- Không đưa logic nghiệp vụ vào repository layer; giữ usecase là nơi điều phối transaction và permission.
- GET /api/me giữ backward compat cho FE cũ. Sau khi FE chuyển sang /api/users/me thì xóa.
- Migration 002_user_extend tạo hàm update_updated_at() dùng chung — các migration sau chỉ cần CREATE TRIGGER, không cần tạo lại function.