# Kế hoạch Phát triển -- IT4409 Backend Quản lý Dự án

**Ngôn ngữ:** Go 1.21+
**Kiến trúc:** Clean Architecture (Domain -> Repository -> Usecase -> Delivery)
**Cơ sở dữ liệu:** PostgreSQL (Supabase)
**Bộ định tuyến:** go-chi/chi/v5
**Tham khảo:** Focalboard (mẫu thiết kế và quy ước Go)

---

## Mục lục

- [Tổng quan kiến trúc](#tong-quan-kien-truc)
- [Cấu trúc dự án](#cau-truc-du-an)
- [Trách nhiệm các tầng](#trach-nhiem-cac-tang)
- [Quản lý giao dịch](#quan-ly-giao-dich)
- [Thành phần dùng chung](#thanh-phan-dung-chung)
- [Các giai đoạn phát triển](#cac-giai-doan-phat-trien)
- [Quy ước viết code](#quy-uoc-viet-code)
- [Thư viện phụ thuộc](#thu-vien-phu-thuoc)
- [Biến môi trường](#bien-moi-truong)
- [Biên dịch và Chạy](#bien-dich-va-chay)

---

## Tổng quan kiến trúc

```
+-----------------------------------------------------+
|                   Yêu cầu HTTP                       |
+------------------------+----------------------------+
                         |
                         v
+------------------------------------------------------+
|  Tầng Giao tiếp (delivery/http)                     |
|  +---------+  +------------+  +------------------+   |
|  | Router  |->| Middleware  |->|    Handlers      |   |
|  | (chi)   |  | (JWT,CORS) |  | (phân tích,      |   |
|  |         |  |            |  |  phản hồi)       |   |
|  +---------+  +------------+  +--------+---------+   |
+--------------------------------------------+---------+
                                             |
                                             v
+------------------------------------------------------+
|  Tầng Nghiệp vụ (usecase)                           |
|  +---------------------------------------------------+
|  |  Logic nghiệp vụ + Kiểm tra quyền                |
|  |  (xác thực, điều phối, nhật ký hoạt động)         |
|  +------------------------+--------------------------+
+---------------------------+--------------------------+
                            |
                            v
+------------------------------------------------------+
|  Tầng Kho dữ liệu (repository)                      |
|  +--------------+    +----------------------------+  |
|  |  Giao diện   | <->|  Triển khai Postgres       |  |
|  |  (hợp đồng)  |    |  (truy vấn pgx/v5)        |  |
|  +--------------+    +----------------------------+  |
+------------------------------------------------------+
                            |
                            v
+------------------------------------------------------+
|  Hạ tầng (infra)                                     |
|  +----------+  +------------+  +-----------------+   |
|  | Cơ sở    |  | Lưu trữ   |  |   WebSocket     |   |
|  | dữ liệu  |  | tệp       |  |   (gorilla/ws)  |   |
|  | (pgxpool)|  | (local/S3) |  |                 |   |
|  +----------+  +------------+  +-----------------+   |
+------------------------------------------------------+
```

**Luồng dữ liệu:**
```
Yêu cầu -> Router -> Middleware -> Handler -> Usecase -> Repository -> Cơ sở dữ liệu
                                                      -> Lưu trữ tệp -> Ổ đĩa/S3
                                                      -> WebSocket   -> Các client
```

---

## Cấu trúc dự án

```
BE/
+-- cmd/
|   +-- api/
|       +-- main.go                 <- Điểm vào ứng dụng
|
+-- internal/
|   +-- config/
|   |   +-- config.go               <- Tải biến môi trường, struct Config
|   |
|   +-- domain/                     <- TẦNG 1: Thực thể + Lỗi
|   |   +-- user.go
|   |   +-- project.go
|   |   +-- issue.go
|   |   +-- board.go
|   |   +-- sprint.go
|   |   +-- comment.go
|   |   +-- label.go
|   |   +-- attachment.go
|   |   +-- activity.go
|   |   +-- errors.go               <- Các loại lỗi miền
|   |
|   +-- repository/                 <- TẦNG 2: Giao diện
|   |   +-- user_repository.go
|   |   +-- project_repository.go
|   |   +-- issue_repository.go
|   |   +-- board_repository.go
|   |   +-- sprint_repository.go
|   |   +-- comment_repository.go
|   |   +-- label_repository.go
|   |   +-- attachment_repository.go
|   |   +-- activity_repository.go
|   |   +-- tx.go                   <- Giao diện TxManager
|   |   +-- postgres/               <- TẦNG 2: Triển khai Postgres
|   |       +-- tx_manager.go       <- Triển khai TxManager
|   |       +-- user_repo.go
|   |       +-- project_repo.go
|   |       +-- issue_repo.go
|   |       +-- board_repo.go
|   |       +-- sprint_repo.go
|   |       +-- comment_repo.go
|   |       +-- label_repo.go
|   |       +-- attachment_repo.go
|   |       +-- activity_repo.go
|   |
|   +-- usecase/                    <- TẦNG 3: Logic nghiệp vụ
|   |   +-- auth_usecase.go
|   |   +-- user_usecase.go
|   |   +-- project_usecase.go
|   |   +-- issue_usecase.go
|   |   +-- board_usecase.go
|   |   +-- sprint_usecase.go
|   |   +-- comment_usecase.go
|   |   +-- label_usecase.go
|   |   +-- attachment_usecase.go
|   |   +-- activity_usecase.go
|   |   +-- permission.go           <- Bộ kiểm tra quyền dùng chung
|   |
|   +-- delivery/http/              <- TẦNG 4: Vận chuyển HTTP
|   |   +-- handler/
|   |   |   +-- auth_handler.go
|   |   |   +-- user_handler.go
|   |   |   +-- project_handler.go
|   |   |   +-- issue_handler.go
|   |   |   +-- board_handler.go
|   |   |   +-- sprint_handler.go
|   |   |   +-- comment_handler.go
|   |   |   +-- label_handler.go
|   |   |   +-- attachment_handler.go
|   |   |   +-- activity_handler.go
|   |   |   +-- ws_handler.go
|   |   |   +-- response.go         <- Hàm trợ giúp phong bì JSON
|   |   +-- middleware/
|   |   |   +-- jwt.go
|   |   |   +-- cors.go
|   |   +-- router/
|   |       +-- router.go           <- Đăng ký tất cả route
|   |
|   +-- infra/
|   |   +-- db/
|   |   |   +-- postgres.go         <- Thiết lập pgxpool
|   |   +-- filestore/
|   |       +-- filestore.go        <- Giao diện FileStore
|   |       +-- local.go            <- Triển khai hệ thống tệp cục bộ
|   |
|   +-- pkg/
|       +-- jwtutil/
|       |   +-- jwt.go              <- Ký/phân tích JWT
|       +-- password/
|       |   +-- bcrypt.go           <- Mã hóa/So sánh
|       +-- ws/
|           +-- hub.go              <- Hub WebSocket (kênh, phát sóng)
|           +-- client.go           <- Goroutine cho mỗi kết nối
|
+-- migrations/                     <- Tệp SQL golang-migrate
|   +-- 001_init.up.sql / .down.sql
|   +-- 002_user_extend.up.sql / .down.sql
|   +-- 003_projects.up.sql / .down.sql
|   +-- 004_issues.up.sql / .down.sql
|   +-- 005_boards.up.sql / .down.sql
|   +-- 006_sprints.up.sql / .down.sql
|   +-- 007_comments.up.sql / .down.sql
|   +-- 008_labels.up.sql / .down.sql
|   +-- 009_attachments.up.sql / .down.sql
|   +-- 010_activity_log.up.sql / .down.sql
|
+-- uploads/                        <- Thư mục lưu trữ tệp
+-- docs/                           <- Swagger + tài liệu dự án
|   +-- API_REFERENCE.md
|   +-- DATABASE.md
|   +-- swagger.json
|   +-- swagger.yaml
+-- go.mod
+-- go.sum
+-- .env.example
+-- README.md
```

---

## Trách nhiệm các tầng

### Tầng Miền (Domain) (`internal/domain/`)

- Struct thực thể (Go struct với JSON tag)
- Struct Patch (trường con trỏ cho cập nhật một phần)
- Phương thức xác thực (`IsValid() error`)
- Các loại lỗi miền (`ErrNotFound`, `ErrForbidden`, v.v.)
- KHÔNG ĐƯỢC import bất kỳ package nào bên ngoài domain

```go
// domain/issue.go
type Issue struct {
    ID          string     `json:"id"`
    ProjectID   string     `json:"projectId"`
    Key         string     `json:"key"`
    Type        string     `json:"type"`
    Status      string     `json:"status"`
    Priority    string     `json:"priority"`
    Title       string     `json:"title"`
    Description string     `json:"description"`
    AssigneeID  *string    `json:"assigneeId"`
    ReporterID  string     `json:"reporterId"`
    ParentID    *string    `json:"parentId"`
    SprintID    *string    `json:"sprintId"`
    SortOrder   float64    `json:"sortOrder"`
    DueDate     *time.Time `json:"dueDate"`
    CreatedAt   time.Time  `json:"createdAt"`
    UpdatedAt   time.Time  `json:"updatedAt"`
    DeletedAt   *time.Time `json:"deletedAt,omitempty"`
}

type IssuePatch struct {
    Title       *string    `json:"title"`
    Description *string    `json:"description"`
    Type        *string    `json:"type"`
    Status      *string    `json:"status"`
    Priority    *string    `json:"priority"`
    AssigneeID  *string    `json:"assigneeId"`
    ParentID    *string    `json:"parentId"`
    SprintID    *string    `json:"sprintId"`
    SortOrder   *float64   `json:"sortOrder"`
    DueDate     *time.Time `json:"dueDate"`
}
```

### Tầng Kho dữ liệu (Repository) (`internal/repository/`)

- Định nghĩa giao diện (hợp đồng)
- Giao diện TxManager cho hỗ trợ giao dịch
- Triển khai Postgres (truy vấn SQL qua pgx)
- KHÔNG ĐƯỢC chứa logic nghiệp vụ

```go
// repository/issue_repository.go
type IssueRepository interface {
    Create(ctx context.Context, issue *domain.Issue) (*domain.Issue, error)
    GetByID(ctx context.Context, id string) (*domain.Issue, error)
    GetByKey(ctx context.Context, key string) (*domain.Issue, error)
    List(ctx context.Context, projectID string, filter IssueFilter) ([]*domain.Issue, int64, error)
    Update(ctx context.Context, id string, patch *domain.IssuePatch) (*domain.Issue, error)
    SoftDelete(ctx context.Context, id string) error
    NextIssueNumber(ctx context.Context, projectID string) (int, error)
}

type IssueFilter struct {
    Statuses   []string
    Types      []string
    Priorities []string
    AssigneeID *string
    ReporterID *string
    SprintID   *string
    ParentID   *string
    LabelID    *string
    Search     string
    Page       int
    PerPage    int
    Sort       string
    Order      string
}
```

### Tầng Nghiệp vụ (Usecase) (`internal/usecase/`)

- Logic nghiệp vụ và xác thực dữ liệu
- Kiểm tra quyền (nhúng PermissionChecker)
- Điều phối (gọi nhiều repository trong giao dịch)
- Tạo nhật ký hoạt động
- Phát sóng sự kiện WebSocket
- KHÔNG ĐƯỢC biết về HTTP

```go
// usecase/issue_usecase.go
type IssueUsecase struct {
    issueRepo    repository.IssueRepository
    projectRepo  repository.ProjectRepository
    activityRepo repository.ActivityRepository
    labelRepo    repository.LabelRepository
    txManager    repository.TxManager
    perm         *PermissionChecker
    wsHub        *ws.Hub
}

func (uc *IssueUsecase) CreateIssue(ctx context.Context, userID string, input CreateIssueInput) (*domain.Issue, error) {
    // 1. Kiểm tra quyền (member+)
    if err := uc.perm.Check(ctx, userID, input.ProjectID, "member"); err != nil {
        return nil, err
    }

    // 2. Xác thực đầu vào
    if err := input.Validate(); err != nil {
        return nil, err
    }

    // 3. Dùng TxManager cho thao tác nguyên tử
    var created *domain.Issue
    err := uc.txManager.WithTx(ctx, func(tx pgx.Tx) error {
        // 4. Lấy số thứ tự công việc tiếp theo (UPDATE...RETURNING nguyên tử)
        num, err := uc.issueRepo.NextIssueNumberTx(ctx, tx, input.ProjectID)
        if err != nil {
            return err
        }

        // 5. Tạo key: project.key + "-" + number
        // 6. Chèn công việc trong giao dịch
        // 7. Gắn nhãn trong giao dịch
        // 8. Ghi nhật ký hoạt động: "created"
        return nil
    })
    if err != nil {
        return nil, err
    }

    // 9. Phát sóng sự kiện WS (ngoài giao dịch)
    uc.wsHub.BroadcastToProject(input.ProjectID, ws.Event{...})

    return created, nil
}
```

### Tầng Giao tiếp (Delivery) (`internal/delivery/http/`)

- Bộ xử lý HTTP (phân tích yêu cầu -> gọi usecase -> viết phản hồi)
- Middleware (JWT, CORS)
- Thiết lập router
- Định dạng phong bì phản hồi
- KHÔNG ĐƯỢC chứa logic nghiệp vụ

```go
// handler/issue_handler.go
type IssueHandler struct {
    issueUC *usecase.IssueUsecase
}

func (h *IssueHandler) CreateIssue(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value("userID").(string)
    projectID := chi.URLParam(r, "projectID")

    var input usecase.CreateIssueInput
    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        writeError(w, http.StatusBadRequest, "invalid request body")
        return
    }
    input.ProjectID = projectID

    issue, err := h.issueUC.CreateIssue(r.Context(), userID, input)
    if err != nil {
        writeDomainError(w, err)
        return
    }

    writeJSON(w, http.StatusOK, "issue created", issue)
}
```

---

## Quản lý giao dịch

Giao dịch được quản lý thông qua giao diện `TxManager` định nghĩa ở tầng repository. Điều này giữ cho tầng usecase sạch sẽ -- nó điều phối giao dịch mà không phụ thuộc trực tiếp vào pgx.

### Giao diện

```go
// repository/tx.go
package repository

import (
    "context"
    "github.com/jackc/pgx/v5"
)

// TxManager trừu tượng hóa việc quản lý giao dịch cơ sở dữ liệu.
// Tầng usecase sử dụng giao diện này để thực thi nhiều thao tác repository một cách nguyên tử.
type TxManager interface {
    // WithTx thực thi fn bên trong một giao dịch cơ sở dữ liệu.
    // Nếu fn trả về nil, giao dịch được commit.
    // Nếu fn trả về lỗi, giao dịch được rollback.
    WithTx(ctx context.Context, fn func(tx pgx.Tx) error) error
}
```

### Triển khai

```go
// repository/postgres/tx_manager.go
package postgres

import (
    "context"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

type PgTxManager struct {
    pool *pgxpool.Pool
}

func NewPgTxManager(pool *pgxpool.Pool) *PgTxManager {
    return &PgTxManager{pool: pool}
}

func (m *PgTxManager) WithTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
    tx, err := m.pool.Begin(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback(ctx) // không làm gì nếu đã commit

    if err := fn(tx); err != nil {
        return err
    }

    return tx.Commit(ctx)
}
```

### Cách sử dụng trong Repository

Các repository cần hỗ trợ giao dịch cung cấp cả phương thức thông thường và biến thể `*Tx`:

```go
// repository/issue_repository.go
type IssueRepository interface {
    // Phương thức thông thường (dùng pool trực tiếp)
    Create(ctx context.Context, issue *domain.Issue) (*domain.Issue, error)
    GetByKey(ctx context.Context, key string) (*domain.Issue, error)
    // ...

    // Phương thức nhận biết giao dịch (dùng tx được truyền vào)
    CreateTx(ctx context.Context, tx pgx.Tx, issue *domain.Issue) (*domain.Issue, error)
    NextIssueNumberTx(ctx context.Context, tx pgx.Tx, projectID string) (int, error)
}
```

### Khi nào cần dùng giao dịch

| Thao tác | Cần giao dịch | Lý do |
|----------|---------------|-------|
| Tạo công việc | Có | Nguyên tử: tăng bộ đếm + chèn công việc + gắn nhãn |
| Tạo dự án | Có | Nguyên tử: chèn dự án + chèn bộ đếm + chèn thành viên + tạo bảng mặc định |
| Kết thúc sprint | Có | Nguyên tử: cập nhật trạng thái sprint + di chuyển công việc chưa hoàn thành |
| Xóa công việc có cascade | Không | PostgreSQL CASCADE tự xử lý |
| Cập nhật một trường duy nhất | Không | Câu lệnh UPDATE đơn lẻ đã là nguyên tử |
| Thêm bình luận + nhật ký hoạt động | Có | Cả hai phải thành công hoặc không thành công |

---

## Thành phần dùng chung

### Hàm trợ giúp phản hồi (`handler/response.go`)

```go
func writeJSON(w http.ResponseWriter, status int, message string, data interface{})
func writeError(w http.ResponseWriter, status int, message string)
func writeDomainError(w http.ResponseWriter, err error)  // ánh xạ domain.Err* -> mã HTTP
func writePaginated(w http.ResponseWriter, items interface{}, total int64, page, perPage int)
```

### Bộ kiểm tra quyền (`usecase/permission.go`)

```go
type PermissionChecker struct {
    projectRepo repository.ProjectRepository
}

// Check xác minh người dùng có ít nhất vai trò yêu cầu trong dự án.
// Phân cấp vai trò: admin > member > viewer
func (pc *PermissionChecker) Check(ctx context.Context, userID, projectID, minRole string) error

// IsOwner kiểm tra userID có khớp với chủ sở hữu tài nguyên không.
func (pc *PermissionChecker) IsOwner(userID, ownerID string) bool

// CheckOrOwner thông qua nếu người dùng có vai trò yêu cầu HOẶC là chủ sở hữu tài nguyên.
func (pc *PermissionChecker) CheckOrOwner(ctx context.Context, userID, projectID, minRole, ownerID string) error
```

Triển khai phân cấp vai trò:

```go
func isRoleSufficient(actual, required string) bool {
    hierarchy := map[string]int{"viewer": 1, "member": 2, "admin": 3}
    return hierarchy[actual] >= hierarchy[required]
}
```

### Giao diện lưu trữ tệp (`infra/filestore/filestore.go`)

```go
type FileStore interface {
    Save(ctx context.Context, path string, data io.Reader) (string, error)
    Delete(ctx context.Context, path string) error
    URL(path string) string
}
```

### Hub WebSocket (`pkg/ws/hub.go`)

```go
type Hub struct {
    clients    map[string]map[*Client]bool  // projectID -> tập hợp client
    register   chan *Client
    unregister chan *Client
    broadcast  chan Event
}

type Event struct {
    Type      string      `json:"type"`
    ProjectID string      `json:"projectId"`
    Data      interface{} `json:"data"`
}

func (h *Hub) BroadcastToProject(projectID string, event Event)
```

---

## Các giai đoạn phát triển

### Giai đoạn 1: Xác thực + Người dùng + Hạ tầng (~2 ngày)

**Mục tiêu:** Hoàn thiện xác thực, CRUD người dùng, CORS middleware, hàm trợ giúp phản hồi dùng chung

**Các tệp cần tạo/sửa:**

- [ ] `internal/domain/errors.go` -- mở rộng các loại lỗi (ErrForbidden, ErrConflict, v.v.)
- [ ] `internal/domain/user.go` -- thêm trường (username, avatarUrl, role, updatedAt)
- [ ] `internal/delivery/http/handler/response.go` -- hàm trợ giúp phản hồi dùng chung
- [ ] `internal/delivery/http/middleware/cors.go` -- CORS middleware
- [ ] `internal/usecase/user_usecase.go` -- GetMe, UpdateProfile, SearchUsers
- [ ] `internal/delivery/http/handler/user_handler.go` -- các endpoint người dùng
- [ ] `internal/delivery/http/handler/auth_handler.go` -- thêm logout, đổi mật khẩu, làm mới token
- [ ] `internal/delivery/http/router/router.go` -- mở rộng route
- [ ] `cmd/api/main.go` -- kết nối các phụ thuộc mới
- [ ] `migrations/002_user_extend.up.sql` + `.down.sql`

**Kiểm thử:** Đăng ký -> đăng nhập -> xem hồ sơ -> cập nhật hồ sơ -> đổi mật khẩu -> làm mới token -> đăng xuất

---

### Giai đoạn 2: Dự án + Phân quyền (~3 ngày)

**Mục tiêu:** CRUD dự án, quản lý thành viên, hệ thống phân quyền theo vai trò

**Các tệp cần tạo:**

- [ ] `internal/domain/project.go` -- Project, ProjectMember, ProjectPatch
- [ ] `internal/repository/project_repository.go` -- giao diện
- [ ] `internal/repository/tx.go` -- giao diện TxManager
- [ ] `internal/repository/postgres/project_repo.go` -- triển khai
- [ ] `internal/repository/postgres/tx_manager.go` -- triển khai PgTxManager
- [ ] `internal/usecase/permission.go` -- PermissionChecker
- [ ] `internal/usecase/project_usecase.go` -- CRUD dự án, quản lý thành viên
- [ ] `internal/delivery/http/handler/project_handler.go` -- 9 endpoint
- [ ] `migrations/003_projects.up.sql` + `.down.sql`

**Kiểm thử:** Tạo dự án -> thêm thành viên -> đổi vai trò -> xóa thành viên -> xác minh quyền hạn

---

### Giai đoạn 3: Công việc + Bảng (~4 ngày)

**Mục tiêu:** CRUD đầy đủ cho công việc với bộ lọc, chế độ xem bảng, các cột, kéo thả chuyển trạng thái

**Các tệp cần tạo:**

- [ ] `internal/domain/issue.go` -- Issue, IssuePatch, CreateIssueInput
- [ ] `internal/domain/board.go` -- Board, BoardColumn
- [ ] `internal/repository/issue_repository.go` -- giao diện với biến thể Tx
- [ ] `internal/repository/board_repository.go` -- giao diện
- [ ] `internal/repository/postgres/issue_repo.go` -- truy vấn phức tạp + bộ lọc
- [ ] `internal/repository/postgres/board_repo.go` -- triển khai
- [ ] `internal/usecase/issue_usecase.go` -- CRUD + chuyển trạng thái + gán (dùng TxManager)
- [ ] `internal/usecase/board_usecase.go` -- CRUD bảng + cột + tự tạo mặc định
- [ ] `internal/delivery/http/handler/issue_handler.go` -- 8 endpoint
- [ ] `internal/delivery/http/handler/board_handler.go` -- 10 endpoint
- [ ] `migrations/004_issues.up.sql` + `.down.sql`
- [ ] `migrations/005_boards.up.sql` + `.down.sql`

**Kiểm thử:** Tạo công việc -> liệt kê với bộ lọc -> chuyển trạng thái -> gán người -> xem trên bảng -> kéo giữa các cột

---

### Giai đoạn 4: Bình luận + Nhãn + Tệp đính kèm (~3 ngày)

**Mục tiêu:** Làm phong phú công việc với bình luận, nhãn, và tệp đính kèm

**Các tệp cần tạo:**

- [ ] `internal/domain/comment.go`
- [ ] `internal/domain/label.go`
- [ ] `internal/domain/attachment.go`
- [ ] `internal/repository/comment_repository.go`
- [ ] `internal/repository/label_repository.go`
- [ ] `internal/repository/attachment_repository.go`
- [ ] `internal/repository/postgres/comment_repo.go`
- [ ] `internal/repository/postgres/label_repo.go`
- [ ] `internal/repository/postgres/attachment_repo.go`
- [ ] `internal/usecase/comment_usecase.go`
- [ ] `internal/usecase/label_usecase.go`
- [ ] `internal/usecase/attachment_usecase.go`
- [ ] `internal/delivery/http/handler/comment_handler.go`
- [ ] `internal/delivery/http/handler/label_handler.go`
- [ ] `internal/delivery/http/handler/attachment_handler.go`
- [ ] `internal/infra/filestore/filestore.go` -- giao diện FileStore
- [ ] `internal/infra/filestore/local.go` -- triển khai hệ thống tệp cục bộ
- [ ] `migrations/007_comments.up.sql` + `.down.sql`
- [ ] `migrations/008_labels.up.sql` + `.down.sql`
- [ ] `migrations/009_attachments.up.sql` + `.down.sql`

**Kiểm thử:** Thêm bình luận -> sửa -> xóa | Tạo nhãn -> gắn vào công việc -> gỡ | Tải lên tệp -> tải xuống -> xóa

---

### Giai đoạn 5: Sprint + Nhật ký hoạt động (~2 ngày)

**Mục tiêu:** Lập kế hoạch sprint cho dự án scrum, theo dõi lịch sử thay đổi công việc

**Các tệp cần tạo:**

- [ ] `internal/domain/sprint.go`
- [ ] `internal/domain/activity.go`
- [ ] `internal/repository/sprint_repository.go`
- [ ] `internal/repository/activity_repository.go`
- [ ] `internal/repository/postgres/sprint_repo.go`
- [ ] `internal/repository/postgres/activity_repo.go`
- [ ] `internal/usecase/sprint_usecase.go`
- [ ] `internal/usecase/activity_usecase.go`
- [ ] `internal/delivery/http/handler/sprint_handler.go`
- [ ] `internal/delivery/http/handler/activity_handler.go`
- [ ] `migrations/006_sprints.up.sql` + `.down.sql`
- [ ] `migrations/010_activity_log.up.sql` + `.down.sql`

**Lưu ý:** Dù migration sprint (006) có số nhỏ hơn bình luận (007), sprint được phát triển ở Giai đoạn 5 vì migration phải tồn tại trước khi migration bình luận chạy. Migration luôn được thực thi theo thứ tự (001-010) bất kể giai đoạn phát triển nào tạo ra chúng.

**Kiểm thử:** Tạo sprint -> thêm công việc -> bắt đầu sprint -> kết thúc sprint -> xác minh backlog | Xác minh các bản ghi nhật ký hoạt động tự động tạo khi công việc thay đổi

---

### Giai đoạn 6: Tìm kiếm + WebSocket (~2 ngày)

**Mục tiêu:** Tìm kiếm toàn cục, cập nhật thời gian thực

**Các tệp cần tạo:**

- [ ] `internal/pkg/ws/hub.go` -- Hub kết nối WebSocket
- [ ] `internal/pkg/ws/client.go` -- Goroutine cho mỗi kết nối
- [ ] `internal/delivery/http/handler/ws_handler.go` -- Bộ xử lý nâng cấp WS với xác thực JWT qua tham số truy vấn
- [ ] Thêm logic tìm kiếm vào các usecase hiện có (dự án, công việc)
- [ ] Kết nối hub WS vào các usecase để phát sóng sự kiện

**Kiểm thử:** Kết nối qua wscat -> đăng ký dự án -> tạo công việc ở client khác -> xác minh nhận được sự kiện thời gian thực | Tìm kiếm công việc và dự án theo từ khóa

---

## Quy ước viết code

### Đặt tên

| Đối tượng | Quy ước | Ví dụ |
|-----------|---------|-------|
| Tệp | snake_case | `issue_handler.go` |
| Package | chữ thường, không gạch dưới | `usecase`, `handler` |
| Struct | PascalCase | `IssueUsecase` |
| Interface | PascalCase + hậu tố | `IssueRepository` |
| Phương thức | PascalCase (xuất) | `CreateIssue()` |
| Biến | camelCase | `issueRepo` |
| Hằng số | PascalCase hoặc ALL_CAPS | `StatusTodo`, `MaxFileSize` |
| Trường JSON | camelCase | `projectId`, `createdAt` |
| Cột CSDL | snake_case | `project_id`, `created_at` |
| Đường dẫn URL | kebab-case | `/api/auth/change-password` |

### Xử lý lỗi

```go
// Lỗi miền
var (
    ErrNotFound     = errors.New("not found")
    ErrForbidden    = errors.New("forbidden")
    ErrConflict     = errors.New("conflict")
    ErrBadRequest   = errors.New("bad request")
    ErrUnauthorized = errors.New("unauthorized")
)

// Bọc lỗi với ngữ cảnh
return fmt.Errorf("issue %s: %w", issueKey, domain.ErrNotFound)

// Ánh xạ trong handler
func writeDomainError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, domain.ErrNotFound):
        writeError(w, 404, err.Error())
    case errors.Is(err, domain.ErrForbidden):
        writeError(w, 403, err.Error())
    case errors.Is(err, domain.ErrConflict):
        writeError(w, 409, err.Error())
    case errors.Is(err, domain.ErrBadRequest):
        writeError(w, 400, err.Error())
    case errors.Is(err, domain.ErrUnauthorized):
        writeError(w, 401, err.Error())
    default:
        writeError(w, 500, "internal server error")
    }
}
```

### Tin nhắn Commit

```
<LOẠI>(<phạm vi>): <mô tả>

FEATURE(auth): thêm endpoint đổi mật khẩu
FEATURE(issues): triển khai CRUD công việc với bộ lọc
FIX(board): sửa logic sắp xếp lại cột
REFACTOR(handler): trích xuất hàm trợ giúp phản hồi dùng chung
DOCS(api): cập nhật chú thích swagger
```

---

## Thư viện phụ thuộc

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| `github.com/go-chi/chi/v5` | mới nhất | Bộ định tuyến HTTP |
| `github.com/go-chi/cors` | mới nhất | CORS middleware |
| `github.com/golang-jwt/jwt/v5` | mới nhất | Xác thực JWT |
| `github.com/jackc/pgx/v5` | mới nhất | Driver PostgreSQL |
| `github.com/joho/godotenv` | mới nhất | Tải tệp biến môi trường |
| `github.com/swaggo/swag` | mới nhất | Sinh tài liệu Swagger |
| `github.com/swaggo/http-swagger` | mới nhất | Giao diện Swagger |
| `github.com/gorilla/websocket` | mới nhất | WebSocket |
| `golang.org/x/crypto` | mới nhất | bcrypt |
| `github.com/google/uuid` | mới nhất | Sinh UUID |
| `github.com/golang-migrate/migrate/v4` | mới nhất | Migration CSDL |

---

## Biến môi trường

```env
# Máy chủ
PORT=8080

# Cơ sở dữ liệu (Supabase)
DATABASE_URL=postgres://user:pass@host:5432/postgres

# JWT
JWT_SECRET=khoa-bi-mat-toi-thieu-32-ky-tu
JWT_ISSUER=it4409
JWT_TTL_MINUTES=60

# Lưu trữ tệp
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
```

---

## Biên dịch và Chạy

```bash
# Cài đặt thư viện phụ thuộc
go mod tidy

# Chạy migration
migrate -path ./migrations -database "$DATABASE_URL" up

# Sinh tài liệu swagger
swag init -g cmd/api/main.go -o docs

# Chạy máy chủ phát triển
go run ./cmd/api

# Biên dịch binary cho sản phẩm
go build -o server ./cmd/api
```
