# Kế hoạch chi tiết — Người A (Hoàng Hiếu)

> **Vai trò:** Lõi công việc (Auth mở rộng, Users, Issues, Comments, Sprints, Activity Log)
> **Tổng endpoints:** 30 | **Tổng file tạo mới/sửa:** ~24 | **Migrations:** 4

---

## Mục lục

- [Tuần 1 — Nền tảng](#tuần-1--nền-tảng)
- [Tuần 2 — Module chính](#tuần-2--module-chính)
- [Tuần 3 — Hoàn thiện](#tuần-3--hoàn-thiện)
- [Phụ lục A — Chi tiết từng file](#phụ-lục-a--chi-tiết-từng-file)
- [Phụ lục B — Bảng endpoint đầy đủ](#phụ-lục-b--bảng-endpoint-đầy-đủ)

---

## Tuần 1 — Nền tảng

**Mục tiêu:** Mở rộng Auth & User hiện có + thiết lập hạ tầng dùng chung (response helper, CORS, domain errors).

### Ngày 1–2

#### 1.1 Dựng hạ tầng dùng chung

- [ ] **`internal/delivery/http/handler/response.go`** — [TẠO MỚI]
  - Tách `writeJSON`, `writeError`, `writeDomainError`, `toUserDTO` ra khỏi `auth_handler.go` vào file riêng.
  - Thêm hàm `writeSuccess(w, status, data)` trả envelope chuẩn.
  - Thêm hàm `parseBody(r, dst)` decode JSON + validate cơ bản.
  - Thêm helper `parseUUID(w, raw)` → trả UUID hoặc ghi 400 rồi return false.
  - Thêm helper `parsePagination(r) (limit, offset int)` cho các API list.

- [ ] **`internal/delivery/http/middleware/cors.go`** — [TẠO MỚI]
  - CORS middleware cho phép FE (`localhost:5173`) gọi API.
  - Headers: `Authorization`, `Content-Type`.
  - Methods: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`.
  - Gắn vào `router.go` ở global middleware.

- [ ] **`internal/domain/errors.go`** — [MỞ RỘNG]
  - Thêm các lỗi dùng chung cho toàn bộ project (tạo 1 lần, sau không sửa):
    ```go
    ErrForbidden      = errors.New("forbidden")
    ErrInternal        = errors.New("internal error")
    ErrSprintActive    = errors.New("another sprint is active")
    ErrSprintNotActive = errors.New("sprint is not active")
    ErrInvalidStatus   = errors.New("invalid status transition")
    ```
  - Cập nhật `writeDomainError` trong `response.go` handle thêm `ErrForbidden → 403`.

#### 1.2 Mở rộng User domain & Migration

- [ ] **`internal/domain/user.go`** — [MỞ RỘNG]
  - Thêm các trường mới:
    ```go
    type User struct {
        ID           string
        Email        string
        PasswordHash string
        Name         string
        AvatarURL    string     // mới
        UpdatedAt    time.Time  // mới
        CreatedAt    time.Time
    }
    ```

- [ ] **`migrations/002_user_extend.up.sql`** — [TẠO MỚI]
  ```sql
  ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS avatar_url text,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

  -- trigger tự cập nhật updated_at
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  ```

- [ ] **`migrations/002_user_extend.down.sql`** — [TẠO MỚI]
  ```sql
  DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
  DROP FUNCTION IF EXISTS update_updated_at;
  ALTER TABLE public.users
    DROP COLUMN IF EXISTS avatar_url,
    DROP COLUMN IF EXISTS updated_at;
  ```

#### 1.3 Mở rộng User Repository

- [ ] **`internal/repository/user_repository.go`** — [MỞ RỘNG]
  - Thêm methods:
    ```go
    Update(ctx, user domain.User) (domain.User, error)
    Search(ctx, keyword string, limit, offset int) ([]domain.User, error)
    ```

- [ ] **`internal/repository/postgres/user_repo.go`** — [MỞ RỘNG]
  - Implement `Update` — SQL `UPDATE ... SET name=$1, avatar_url=$2 WHERE id=$3 RETURNING ...`
  - Implement `Search` — SQL `SELECT ... WHERE name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%' LIMIT $2 OFFSET $3`
  - Cập nhật các câu `SELECT` hiện tại để lấy thêm `avatar_url`, `updated_at`.

#### 1.4 User Usecase & Handler

- [ ] **`internal/usecase/user_usecase.go`** — [TẠO MỚI]
  ```
  UserUsecase struct { users UserRepository }
  - GetProfile(ctx, userID) → User
  - UpdateProfile(ctx, userID, UpdateProfileInput{Name, AvatarURL}) → User
  - GetUser(ctx, targetUserID) → User
  - SearchUsers(ctx, keyword, limit, offset) → []User
  ```

- [ ] **`internal/delivery/http/handler/user_handler.go`** — [TẠO MỚI]
  - `GET  /api/users/me`         → GetProfile
  - `PATCH /api/users/me`        → UpdateProfile
  - `GET  /api/users/{userID}`   → GetUser
  - `GET  /api/users?search=`    → SearchUsers
  - Mỗi handler có Swagger annotation đầy đủ.
  - Implement `RegisterRoutes(r chi.Router)` để tránh conflict với Người B.

#### 1.5 Mở rộng Auth

- [ ] **`internal/usecase/auth_usecase.go`** — [MỞ RỘNG]
  - Thêm methods:
    ```go
    ChangePassword(ctx, userID, oldPwd, newPwd) error
    RefreshToken(ctx, userID) (token string, err error)
    ```

- [ ] **`internal/delivery/http/handler/auth_handler.go`** — [MỞ RỘNG]
  - Cleanup: chuyển `writeJSON`, `writeError`, `writeDomainError` sang `response.go`.
  - Thêm handlers:
    - `POST /api/auth/logout`          → Xóa token phía client (trả 200 thành công)
    - `POST /api/auth/change-password` → ChangePassword
    - `POST /api/auth/refresh`         → RefreshToken
  - `GET /api/me` → dời sang `user_handler.go` (thành `GET /api/users/me`).
  - Implement `RegisterRoutes(r chi.Router)`.

#### 1.6 Cập nhật Router & main.go

- [ ] **`internal/delivery/http/router/router.go`** — [CẬP NHẬT]
  - Thêm CORS middleware vào global middleware.
  - Thêm `UserHandler` vào `Deps`.
  - Sử dụng pattern `RegisterRoutes` cho từng handler.

- [ ] **`cmd/api/main.go`** — [CẬP NHẬT]
  - Wiring: `userUC → userHandler`.
  - Truyền `userHandler` vào `router.Deps`.

### Ngày 3 — Kiểm thử tuần 1

- [ ] Chạy migration 001 → 002 trên Supabase.
- [ ] `go build ./...` — đảm bảo compile thành công.
- [ ] Test thủ công qua curl/Swagger:
  - [ ] Đăng ký → Đăng nhập → Nhận token.
  - [ ] `GET /api/users/me` trả `avatar_url`, `updated_at`.
  - [ ] `PATCH /api/users/me` cập nhật name + avatar.
  - [ ] `POST /api/auth/change-password` thành công.
  - [ ] `POST /api/auth/refresh` trả token mới.
  - [ ] `GET /api/users?search=ali` tìm đúng user.
  - [ ] CORS: FE ở `localhost:5173` gọi API không bị chặn.
- [ ] Tái tạo Swagger: `swag init -g cmd/api/main.go -o docs`.
- [ ] Commit & push nhánh `feature/auth-users`.

### Cuối tuần 1 — MERGE LẦN 1

- [ ] Phối hợp Người B merge `feature/projects` vào `main`.
- [ ] Chạy migration 001 → 002 → 003 tuần tự.
- [ ] Test liên module: đăng ký → đăng nhập → tạo dự án → thêm thành viên.

---

## Tuần 2 — Module chính

**Mục tiêu:** Issues (CRUD + Kanban status) & Comments.

### Ngày 1–3: Issues

#### 2.1 Issue Domain

- [ ] **`internal/domain/issue.go`** — [TẠO MỚI]
  ```go
  // Enum types
  type IssueType   string  // Epic, Story, Task, Bug
  type IssueStatus string  // todo, in_progress, in_review, done
  type Priority    string  // highest, high, medium, low, lowest

  type Issue struct {
      ID          string
      ProjectID   string
      IssueKey    string       // VD: "MYPRJ-42"
      Title       string
      Description string
      Type        IssueType
      Status      IssueStatus
      Priority    Priority
      ReporterID  string
      AssigneeID  *string      // nullable
      ParentID    *string      // nullable — công việc cha (subtask)
      SprintID    *string      // nullable
      CreatedAt   time.Time
      UpdatedAt   time.Time
  }

  type IssueFilter struct {
      Status     *IssueStatus
      Type       *IssueType
      Priority   *Priority
      AssigneeID *string
      SprintID   *string
      Search     *string      // ILIKE trên title
      Limit      int
      Offset     int
  }
  ```

#### 2.2 Issue Migration

- [ ] **`migrations/004_issues.up.sql`** — [TẠO MỚI]
  ```sql
  -- Sequence riêng cho mỗi project (dùng hàm tạo issue_key)
  CREATE TABLE IF NOT EXISTS public.issue_sequences (
      project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
      last_number INT NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS public.issues (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      issue_key    TEXT NOT NULL UNIQUE,
      title        TEXT NOT NULL,
      description  TEXT,
      type         TEXT NOT NULL DEFAULT 'task'
                     CHECK (type IN ('epic','story','task','bug')),
      status       TEXT NOT NULL DEFAULT 'todo'
                     CHECK (status IN ('todo','in_progress','in_review','done')),
      priority     TEXT NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('highest','high','medium','low','lowest')),
      reporter_id  UUID NOT NULL REFERENCES public.users(id),
      assignee_id  UUID REFERENCES public.users(id),
      parent_id    UUID REFERENCES public.issues(id) ON DELETE SET NULL,
      sprint_id    UUID,  -- FK sẽ thêm ở migration 006
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_issues_project ON public.issues(project_id);
  CREATE INDEX idx_issues_assignee ON public.issues(assignee_id);
  CREATE INDEX idx_issues_status ON public.issues(status);
  CREATE INDEX idx_issues_sprint ON public.issues(sprint_id);

  CREATE TRIGGER trg_issues_updated_at
    BEFORE UPDATE ON public.issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  ```

- [ ] **`migrations/004_issues.down.sql`** — [TẠO MỚI]
  ```sql
  DROP TABLE IF EXISTS public.issues;
  DROP TABLE IF EXISTS public.issue_sequences;
  ```

#### 2.3 Issue Repository

- [ ] **`internal/repository/issue_repository.go`** — [TẠO MỚI]
  ```go
  type IssueRepository interface {
      Create(ctx, issue Issue) (Issue, error)
      GetByKey(ctx, issueKey string) (Issue, error)
      List(ctx, projectID string, filter IssueFilter) ([]Issue, error)
      Update(ctx, issue Issue) (Issue, error)
      SoftDelete(ctx, issueKey string) error
      UpdateStatus(ctx, issueKey string, status IssueStatus) (Issue, error)
      UpdateAssignee(ctx, issueKey string, assigneeID *string) (Issue, error)
      ListSubtasks(ctx, parentKey string) ([]Issue, error)
      NextIssueNumber(ctx, projectID string) (int, error)  // atomic increment
  }
  ```

- [ ] **`internal/repository/postgres/issue_repo.go`** — [TẠO MỚI]
  - Implement tất cả methods trên.
  - `NextIssueNumber`: dùng `INSERT ... ON CONFLICT DO UPDATE SET last_number = last_number + 1 RETURNING last_number` trên bảng `issue_sequences`.
  - `Create`: gọi `NextIssueNumber` → ghép `project.key + "-" + number` → insert.
  - `List`: build query động dựa trên `IssueFilter`, hỗ trợ `LIMIT/OFFSET`.

#### 2.4 Issue Usecase

- [ ] **`internal/usecase/issue_usecase.go`** — [TẠO MỚI]
  ```
  IssueUsecase struct {
      issues   IssueRepository
      projects ProjectRepository  // từ Người B, dùng để lấy project.Key
      perm     PermissionChecker   // từ Người B
  }

  - CreateIssue(ctx, userID, projectID, input) → Issue
      + Kiểm tra quyền: user phải là thành viên project.
      + Tự tạo issue_key từ project.key + sequence.
  - GetIssue(ctx, userID, issueKey) → Issue
  - ListIssues(ctx, userID, projectID, filter) → []Issue
  - UpdateIssue(ctx, userID, issueKey, patch) → Issue
      + Chỉ reporter hoặc assignee hoặc project-admin mới được sửa.
  - DeleteIssue(ctx, userID, issueKey) error
  - ChangeStatus(ctx, userID, issueKey, newStatus) → Issue
      + Validate transition hợp lệ (tuỳ chọn, hoặc cho phép tự do).
  - AssignIssue(ctx, userID, issueKey, assigneeID) → Issue
  - ListSubtasks(ctx, userID, parentKey) → []Issue
  ```

#### 2.5 Issue Handler

- [ ] **`internal/delivery/http/handler/issue_handler.go`** — [TẠO MỚI]
  - 8 endpoints (A10–A17):
    | Phương thức | Đường dẫn | Handler |
    |---|---|---|
    | POST | `/api/projects/{projectID}/issues` | CreateIssue |
    | GET | `/api/projects/{projectID}/issues` | ListIssues |
    | GET | `/api/issues/{issueKey}` | GetIssue |
    | PATCH | `/api/issues/{issueKey}` | UpdateIssue |
    | DELETE | `/api/issues/{issueKey}` | DeleteIssue |
    | PUT | `/api/issues/{issueKey}/status` | ChangeStatus |
    | PUT | `/api/issues/{issueKey}/assign` | AssignIssue |
    | GET | `/api/issues/{issueKey}/subtasks` | ListSubtasks |
  - Swagger annotation đầy đủ cho từng handler.
  - `RegisterRoutes(r chi.Router)`.

### Ngày 4: Comments

#### 2.6 Comment Domain

- [ ] **`internal/domain/comment.go`** — [TẠO MỚI]
  ```go
  type Comment struct {
      ID        string
      IssueID   string
      UserID    string
      Content   string
      CreatedAt time.Time
      UpdatedAt time.Time
  }
  ```

#### 2.7 Comment Repository

- [ ] **`internal/repository/comment_repository.go`** — [TẠO MỚI]
  ```go
  type CommentRepository interface {
      Create(ctx, comment Comment) (Comment, error)
      List(ctx, issueID string, limit, offset int) ([]Comment, error)
      GetByID(ctx, commentID string) (Comment, error)
      Update(ctx, commentID string, content string) (Comment, error)
      Delete(ctx, commentID string) error
  }
  ```

- [ ] **`internal/repository/postgres/comment_repo.go`** — [TẠO MỚI]
  - Implement tất cả methods.
  - `List`: JOIN `users` để trả kèm `user.name`, `user.avatar_url` nếu cần (hoặc trả user_id để FE resolve).

#### 2.8 Comment Usecase & Handler

- [ ] **`internal/usecase/comment_usecase.go`** — [TẠO MỚI]
  ```
  - AddComment(ctx, userID, issueKey, content) → Comment
  - ListComments(ctx, issueKey, limit, offset) → []Comment
  - EditComment(ctx, userID, commentID, content) → Comment
      + Chỉ tác giả bình luận mới được sửa.
  - DeleteComment(ctx, userID, commentID) error
      + Tác giả hoặc project-admin mới được xóa.
  ```

- [ ] **`internal/delivery/http/handler/comment_handler.go`** — [TẠO MỚI]
  - 4 endpoints (A18–A21):
    | Phương thức | Đường dẫn | Handler |
    |---|---|---|
    | POST | `/api/issues/{issueKey}/comments` | AddComment |
    | GET | `/api/issues/{issueKey}/comments` | ListComments |
    | PATCH | `/api/comments/{commentID}` | EditComment |
    | DELETE | `/api/comments/{commentID}` | DeleteComment |
  - `RegisterRoutes(r chi.Router)`.

### Ngày 4 (cuối ngày) — Cập nhật wiring

- [ ] Cập nhật `router.go` — thêm `IssueHandler`, `CommentHandler` vào `Deps`.
- [ ] Cập nhật `main.go` — wiring `issueRepo → issueUC → issueHandler`, tương tự comment.

### Cuối tuần 2 — MERGE LẦN 2

- [ ] Chạy migration 004 (issues).
  > Migration 007 (comments table) do Người B tạo SQL.
- [ ] Test liên module:
  - [ ] Tạo issue trong project → kiểm tra issue_key tự động (VD: `MYPRJ-1`).
  - [ ] Liệt kê issues với bộ lọc (status, type, priority, assignee).
  - [ ] Chuyển trạng thái issue (todo → in_progress → done).
  - [ ] Gán/bỏ gán người cho issue.
  - [ ] Tạo subtask (issue có parent_id).
  - [ ] Thêm bình luận → liệt kê bình luận.
  - [ ] Sửa bình luận (chỉ tác giả) → Xóa bình luận (tác giả hoặc admin).
  - [ ] Xem issue trên Board (test cùng Người B — endpoint B13).
- [ ] Tái tạo Swagger.
- [ ] Commit & push nhánh `feature/issues`.

---

## Tuần 3 — Hoàn thiện

**Mục tiêu:** Sprint management & Activity Log.

### Ngày 1–2: Sprint

#### 3.1 Sprint Domain

- [ ] **`internal/domain/sprint.go`** — [TẠO MỚI]
  ```go
  type SprintStatus string  // planning, active, completed

  type Sprint struct {
      ID          string
      ProjectID   string
      Name        string
      Goal        string
      Status      SprintStatus
      StartDate   *time.Time
      EndDate     *time.Time
      CreatedAt   time.Time
      UpdatedAt   time.Time
  }
  ```

#### 3.2 Sprint Migration

- [ ] **`migrations/006_sprints.up.sql`** — [TẠO MỚI]
  ```sql
  CREATE TABLE IF NOT EXISTS public.sprints (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      goal        TEXT,
      status      TEXT NOT NULL DEFAULT 'planning'
                    CHECK (status IN ('planning','active','completed')),
      start_date  TIMESTAMPTZ,
      end_date    TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_sprints_project ON public.sprints(project_id);

  -- Thêm FK sprint_id vào issues (đã tạo cột ở migration 004)
  ALTER TABLE public.issues
    ADD CONSTRAINT fk_issues_sprint
    FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;

  CREATE TRIGGER trg_sprints_updated_at
    BEFORE UPDATE ON public.sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  ```

- [ ] **`migrations/006_sprints.down.sql`** — [TẠO MỚI]
  ```sql
  ALTER TABLE public.issues DROP CONSTRAINT IF EXISTS fk_issues_sprint;
  DROP TABLE IF EXISTS public.sprints;
  ```

#### 3.3 Sprint Repository

- [ ] **`internal/repository/sprint_repository.go`** — [TẠO MỚI]
  ```go
  type SprintRepository interface {
      Create(ctx, sprint Sprint) (Sprint, error)
      GetByID(ctx, sprintID string) (Sprint, error)
      List(ctx, projectID string) ([]Sprint, error)
      Update(ctx, sprint Sprint) (Sprint, error)
      HasActiveSprint(ctx, projectID string) (bool, error)
      Start(ctx, sprintID string) (Sprint, error)
      Complete(ctx, sprintID string) (Sprint, error)
  }
  ```

- [ ] **`internal/repository/postgres/sprint_repo.go`** — [TẠO MỚI]

#### 3.4 Sprint Usecase & Handler

- [ ] **`internal/usecase/sprint_usecase.go`** — [TẠO MỚI]
  ```
  - CreateSprint(ctx, userID, projectID, input) → Sprint
  - GetSprint(ctx, userID, sprintID) → Sprint
  - ListSprints(ctx, userID, projectID) → []Sprint
  - UpdateSprint(ctx, userID, sprintID, patch) → Sprint
  - StartSprint(ctx, userID, sprintID) → Sprint
      + Kiểm tra: project chưa có sprint active khác.
  - CompleteSprint(ctx, userID, sprintID) → Sprint
      + Chuyển issues chưa done về backlog (sprint_id = NULL).
  - GetBacklog(ctx, userID, projectID) → []Issue
      + Lấy issues có sprint_id IS NULL.
  ```

- [ ] **`internal/delivery/http/handler/sprint_handler.go`** — [TẠO MỚI]
  - 7 endpoints (A24–A30):
    | Phương thức | Đường dẫn | Handler |
    |---|---|---|
    | POST | `/api/projects/{projectID}/sprints` | CreateSprint |
    | GET | `/api/projects/{projectID}/sprints` | ListSprints |
    | GET | `/api/sprints/{sprintID}` | GetSprint |
    | PATCH | `/api/sprints/{sprintID}` | UpdateSprint |
    | POST | `/api/sprints/{sprintID}/start` | StartSprint |
    | POST | `/api/sprints/{sprintID}/complete` | CompleteSprint |
    | GET | `/api/projects/{projectID}/backlog` | GetBacklog |
  - `RegisterRoutes(r chi.Router)`.

### Ngày 2 (chiều): Activity Log

#### 3.5 Activity Domain

- [ ] **`internal/domain/activity.go`** — [TẠO MỚI]
  ```go
  type Activity struct {
      ID        string
      ProjectID string
      IssueID   *string     // nullable (hoạt động cấp project)
      UserID    string
      Action    string      // "created", "updated_status", "assigned", "commented", ...
      OldValue  string      // giá trị cũ (VD: "todo")
      NewValue  string      // giá trị mới (VD: "in_progress")
      CreatedAt time.Time
  }
  ```

#### 3.6 Activity Migration

- [ ] **`migrations/010_activity_log.up.sql`** — [TẠO MỚI]
  ```sql
  CREATE TABLE IF NOT EXISTS public.activities (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      issue_id    UUID REFERENCES public.issues(id) ON DELETE CASCADE,
      user_id     UUID NOT NULL REFERENCES public.users(id),
      action      TEXT NOT NULL,
      old_value   TEXT,
      new_value   TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_activities_project ON public.activities(project_id);
  CREATE INDEX idx_activities_issue ON public.activities(issue_id);
  CREATE INDEX idx_activities_created ON public.activities(created_at DESC);
  ```

- [ ] **`migrations/010_activity_log.down.sql`** — [TẠO MỚI]
  ```sql
  DROP TABLE IF EXISTS public.activities;
  ```

#### 3.7 Activity Repository & Usecase & Handler

- [ ] **`internal/repository/activity_repository.go`** — [TẠO MỚI]
  ```go
  type ActivityRepository interface {
      Create(ctx, activity Activity) error
      ListByIssue(ctx, issueID string, limit, offset int) ([]Activity, error)
      ListByProject(ctx, projectID string, limit, offset int) ([]Activity, error)
  }
  ```

- [ ] **`internal/repository/postgres/activity_repo.go`** — [TẠO MỚI]

- [ ] **`internal/usecase/activity_usecase.go`** — [TẠO MỚI]
  ```
  - LogActivity(ctx, activity) error              // gọi nội bộ từ issue/sprint usecase
  - GetIssueActivity(ctx, userID, issueKey, limit, offset) → []Activity
  - GetProjectActivity(ctx, userID, projectID, limit, offset) → []Activity
  ```

- [ ] **`internal/delivery/http/handler/activity_handler.go`** — [TẠO MỚI]
  - 2 endpoints (A22–A23):
    | Phương thức | Đường dẫn | Handler |
    |---|---|---|
    | GET | `/api/issues/{issueKey}/activity` | GetIssueActivity |
    | GET | `/api/projects/{projectID}/activity` | GetProjectActivity |
  - `RegisterRoutes(r chi.Router)`.

#### 3.8 Tích hợp Activity vào Issue Usecase

- [ ] Cập nhật `issue_usecase.go`:
  - Inject `ActivityRepository`.
  - Sau mỗi hành động (tạo, đổi status, assign, xóa) → gọi `activityRepo.Create(...)`.
- [ ] Cập nhật `sprint_usecase.go`:
  - Sau StartSprint, CompleteSprint → ghi activity.

### Ngày 3 — Kiểm thử & hoàn thiện

- [ ] Cập nhật `router.go` — thêm `SprintHandler`, `ActivityHandler` vào Deps.
- [ ] Cập nhật `main.go` — wiring đầy đủ Sprint + Activity.
- [ ] Tái tạo Swagger: `swag init -g cmd/api/main.go -o docs`.
- [ ] Test toàn bộ:
  - [ ] Tạo sprint → cập nhật sprint → bắt đầu sprint.
  - [ ] Kiểm tra chỉ 1 sprint active tại 1 thời điểm.
  - [ ] Gán issue vào sprint → liệt kê issues theo sprint.
  - [ ] Kết thúc sprint → issues chưa done chuyển về backlog.
  - [ ] `GET /api/projects/{id}/backlog` hiển thị đúng.
  - [ ] Thay đổi status issue → `GET /api/issues/{key}/activity` có log.
  - [ ] `GET /api/projects/{id}/activity` hiển thị luồng hoạt động.
- [ ] Commit & push nhánh `feature/sprint-activity`.

### Cuối tuần 3 — MERGE LẦN 3 (CUỐI CÙNG)

- [ ] Merge tất cả nhánh vào `main`.
- [ ] Chạy migration 006 → 010.
- [ ] Kiểm thử toàn bộ luồng end-to-end:
  - [ ] Đăng ký → Đăng nhập → Tạo project → Thêm members.
  - [ ] Tạo Board → Tạo Issue → Kéo thả status.
  - [ ] Tạo Sprint → Gán issues → Start → Complete.
  - [ ] Xem Activity Log toàn project.
  - [ ] Gắn nhãn, bình luận, đính kèm file (phối hợp Người B).
  - [ ] Search toàn cục.
  - [ ] WebSocket nhận event thời gian thực.

---

## Phụ lục A — Chi tiết từng file

### Tổng hợp file tạo mới

| # | Đường dẫn | Tuần |
|---|-----------|------|
| 1 | `internal/delivery/http/handler/response.go` | 1 |
| 2 | `internal/delivery/http/middleware/cors.go` | 1 |
| 3 | `internal/usecase/user_usecase.go` | 1 |
| 4 | `internal/delivery/http/handler/user_handler.go` | 1 |
| 5 | `internal/domain/issue.go` | 2 |
| 6 | `internal/repository/issue_repository.go` | 2 |
| 7 | `internal/repository/postgres/issue_repo.go` | 2 |
| 8 | `internal/usecase/issue_usecase.go` | 2 |
| 9 | `internal/delivery/http/handler/issue_handler.go` | 2 |
| 10 | `internal/domain/comment.go` | 2 |
| 11 | `internal/repository/comment_repository.go` | 2 |
| 12 | `internal/repository/postgres/comment_repo.go` | 2 |
| 13 | `internal/usecase/comment_usecase.go` | 2 |
| 14 | `internal/delivery/http/handler/comment_handler.go` | 2 |
| 15 | `internal/domain/sprint.go` | 3 |
| 16 | `internal/repository/sprint_repository.go` | 3 |
| 17 | `internal/repository/postgres/sprint_repo.go` | 3 |
| 18 | `internal/usecase/sprint_usecase.go` | 3 |
| 19 | `internal/delivery/http/handler/sprint_handler.go` | 3 |
| 20 | `internal/domain/activity.go` | 3 |
| 21 | `internal/repository/activity_repository.go` | 3 |
| 22 | `internal/repository/postgres/activity_repo.go` | 3 |
| 23 | `internal/usecase/activity_usecase.go` | 3 |
| 24 | `internal/delivery/http/handler/activity_handler.go` | 3 |

### Tổng hợp file mở rộng (sửa file có sẵn)

| # | Đường dẫn | Tuần |
|---|-----------|------|
| 1 | `internal/domain/errors.go` | 1 |
| 2 | `internal/domain/user.go` | 1 |
| 3 | `internal/repository/user_repository.go` | 1 |
| 4 | `internal/repository/postgres/user_repo.go` | 1 |
| 5 | `internal/usecase/auth_usecase.go` | 1 |
| 6 | `internal/delivery/http/handler/auth_handler.go` | 1 |
| 7 | `internal/delivery/http/router/router.go` | 1, 2, 3 |
| 8 | `cmd/api/main.go` | 1, 2, 3 |

### Tổng hợp migration

| # | File | Tuần |
|---|------|------|
| 1 | `migrations/002_user_extend.up.sql` + `.down.sql` | 1 |
| 2 | `migrations/004_issues.up.sql` + `.down.sql` | 2 |
| 3 | `migrations/006_sprints.up.sql` + `.down.sql` | 3 |
| 4 | `migrations/010_activity_log.up.sql` + `.down.sql` | 3 |

---

## Phụ lục B — Bảng endpoint đầy đủ

| # | Phương thức | Đường dẫn | Mô tả | Tuần |
|---|-------------|-----------|-------|------|
| A1 | POST | `/api/auth/register` | Đăng ký (đã có) | — |
| A2 | POST | `/api/auth/login` | Đăng nhập (đã có) | — |
| A3 | POST | `/api/auth/logout` | Đăng xuất | 1 |
| A4 | POST | `/api/auth/change-password` | Đổi mật khẩu | 1 |
| A5 | POST | `/api/auth/refresh` | Làm mới token | 1 |
| A6 | GET | `/api/users/me` | Thông tin cá nhân | 1 |
| A7 | PATCH | `/api/users/me` | Cập nhật hồ sơ | 1 |
| A8 | GET | `/api/users/{userID}` | Xem người dùng khác | 1 |
| A9 | GET | `/api/users?search=keyword` | Tìm kiếm người dùng | 1 |
| A10 | POST | `/api/projects/{projectID}/issues` | Tạo công việc | 2 |
| A11 | GET | `/api/projects/{projectID}/issues` | Liệt kê (lọc + phân trang) | 2 |
| A12 | GET | `/api/issues/{issueKey}` | Chi tiết công việc | 2 |
| A13 | PATCH | `/api/issues/{issueKey}` | Cập nhật công việc | 2 |
| A14 | DELETE | `/api/issues/{issueKey}` | Xóa mềm | 2 |
| A15 | PUT | `/api/issues/{issueKey}/status` | Chuyển trạng thái | 2 |
| A16 | PUT | `/api/issues/{issueKey}/assign` | Gán người | 2 |
| A17 | GET | `/api/issues/{issueKey}/subtasks` | Liệt kê subtask | 2 |
| A18 | POST | `/api/issues/{issueKey}/comments` | Thêm bình luận | 2 |
| A19 | GET | `/api/issues/{issueKey}/comments` | Liệt kê bình luận | 2 |
| A20 | PATCH | `/api/comments/{commentID}` | Sửa bình luận | 2 |
| A21 | DELETE | `/api/comments/{commentID}` | Xóa bình luận | 2 |
| A22 | GET | `/api/issues/{issueKey}/activity` | Lịch sử công việc | 3 |
| A23 | GET | `/api/projects/{projectID}/activity` | Luồng hoạt động dự án | 3 |
| A24 | POST | `/api/projects/{projectID}/sprints` | Tạo sprint | 3 |
| A25 | GET | `/api/projects/{projectID}/sprints` | Liệt kê sprint | 3 |
| A26 | GET | `/api/sprints/{sprintID}` | Chi tiết sprint | 3 |
| A27 | PATCH | `/api/sprints/{sprintID}` | Cập nhật sprint | 3 |
| A28 | POST | `/api/sprints/{sprintID}/start` | Bắt đầu sprint | 3 |
| A29 | POST | `/api/sprints/{sprintID}/complete` | Kết thúc sprint | 3 |
| A30 | GET | `/api/projects/{projectID}/backlog` | Backlog | 3 |

---

## Ghi chú phối hợp với Người B

| Điểm phối hợp | Chi tiết |
|----------------|----------|
| **Tuần 1** | Người B cung cấp `permission.go` + `tx.go` + `ProjectRepository` interface trước khi merge. |
| **Tuần 2** | Người B tạo SQL file `007_comments.up.sql` (cấu trúc bảng comments). Người A chỉ viết entity + logic. |
| **Tuần 2** | Sau khi Người A xong Issues → báo Người B test endpoint B13 (issues trên board). |
| **Tuần 3** | Tích hợp Activity vào WebSocket events (nếu Người B xong ws_handler). |
| **main.go** | Người A quản lý file này. Khi merge, Người B gửi đoạn wiring cần thêm. |
| **router.go** | Mỗi người viết `RegisterRoutes` trong handler của mình → router chỉ gọi. |

---

## Hướng dẫn test local bằng Docker PostgreSQL

Khi không có quyền truy cập Supabase, có thể test backend local bằng Docker PostgreSQL.

### 1. Khởi tạo PostgreSQL container

```bash
docker run -d --name pg-test -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=it4409_test -p 5433:5432 postgres:16-alpine
```

### 2. Chờ DB sẵn sàng

```bash
docker exec pg-test pg_isready -U postgres
```

### 3. Chạy tất cả migrations (theo thứ tự)

```powershell
Get-Content BE/migrations/001_init.up.sql, BE/migrations/002_user_extend.up.sql, BE/migrations/003_projects.up.sql, BE/migrations/004_issues.up.sql, BE/migrations/005_boards.up.sql, BE/migrations/007_comments.up.sql, BE/migrations/008_labels.up.sql | docker exec -i pg-test psql -U postgres -d it4409_test
```

### 4. Tạo file `BE/.env` (đã có trong .gitignore, không bị commit)

```
PORT=8080
DATABASE_URL=postgresql://postgres:123456@localhost:5433/it4409_test
JWT_SECRET=test-secret-key-for-local
JWT_ISSUER=it4409
JWT_TTL_MINUTES=10080
```

### 5. Chạy server

```bash
cd BE
go run ./cmd/api
```

Server sẽ lắng nghe tại `http://localhost:8080`. Swagger UI tại `/swagger/index.html`.

### 6. Test nhanh

```powershell
# Register
$r = Invoke-RestMethod -Uri http://localhost:8080/api/auth/register -Method POST -Body '{"email":"test@test.com","password":"123456","name":"Tester"}' -ContentType "application/json"
$token = $r.data.token

# Create project
$h = @{Authorization = "Bearer $token"}
$p = Invoke-RestMethod -Uri http://localhost:8080/api/projects -Method POST -Body '{"name":"Test","key":"TST","type":"kanban"}' -ContentType "application/json" -Headers $h
$projId = $p.id

# Create issue → key sẽ là TST-1
Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projId/issues" -Method POST -Body '{"title":"Test issue","type":"task"}' -ContentType "application/json" -Headers $h
```

### 7. Dọn dẹp sau khi test xong

```bash
docker rm -f pg-test
del BE\.env
```

