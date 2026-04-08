# Phân công Làm việc -- IT4409 Backend

**Số người:** 2 (Người A, Người B)
**Thời gian dự kiến:** 3 tuần
**Nguyên tắc:** Mỗi người sở hữu toàn bộ file của module mình, không chạm file của người kia.

---

## Tổng quan phân công

| | Người A | Người B |
|---|---------|---------|
| Vai trò | Lõi công việc | Lõi dự án + Hạ tầng |
| Số endpoints | 30 | 31 |
| Số file tạo mới | ~24 | ~26 |
| Số migration | 4 | 6 |

---

## Người A: Lõi công việc

### Modules phụ trách

| Module | Endpoints | Độ phức tạp |
|--------|-----------|-------------|
| Xác thực mở rộng | 5 | Dễ |
| Người dùng | 4 | Dễ |
| Công việc (Issues) | 8 | Khó |
| Bình luận (Comments) | 4 | Dễ |
| Nhật ký hoạt động (Activity Log) | 2 | Dễ |
| Sprint | 7 | Trung bình |
| **Tổng** | **30** | |

### Danh sách file chịu trách nhiệm

**Domain (thực thể):**
- `internal/domain/errors.go` -- mở rộng các loại lỗi
- `internal/domain/user.go` -- mở rộng thêm trường
- `internal/domain/issue.go` -- tạo mới
- `internal/domain/comment.go` -- tạo mới
- `internal/domain/activity.go` -- tạo mới
- `internal/domain/sprint.go` -- tạo mới

**Repository (giao diện):**
- `internal/repository/user_repository.go` -- mở rộng
- `internal/repository/issue_repository.go` -- tạo mới
- `internal/repository/comment_repository.go` -- tạo mới
- `internal/repository/activity_repository.go` -- tạo mới
- `internal/repository/sprint_repository.go` -- tạo mới

**Repository (triển khai Postgres):**
- `internal/repository/postgres/user_repo.go` -- mở rộng
- `internal/repository/postgres/issue_repo.go` -- tạo mới
- `internal/repository/postgres/comment_repo.go` -- tạo mới
- `internal/repository/postgres/activity_repo.go` -- tạo mới
- `internal/repository/postgres/sprint_repo.go` -- tạo mới

**Usecase:**
- `internal/usecase/auth_usecase.go` -- mở rộng
- `internal/usecase/user_usecase.go` -- tạo mới
- `internal/usecase/issue_usecase.go` -- tạo mới
- `internal/usecase/comment_usecase.go` -- tạo mới
- `internal/usecase/activity_usecase.go` -- tạo mới
- `internal/usecase/sprint_usecase.go` -- tạo mới

**Handler:**
- `internal/delivery/http/handler/response.go` -- tạo mới (dùng chung)
- `internal/delivery/http/handler/auth_handler.go` -- mở rộng
- `internal/delivery/http/handler/user_handler.go` -- tạo mới
- `internal/delivery/http/handler/issue_handler.go` -- tạo mới
- `internal/delivery/http/handler/comment_handler.go` -- tạo mới
- `internal/delivery/http/handler/activity_handler.go` -- tạo mới
- `internal/delivery/http/handler/sprint_handler.go` -- tạo mới

**Middleware:**
- `internal/delivery/http/middleware/cors.go` -- tạo mới

**Migration:**
- `migrations/002_user_extend.up.sql` + `.down.sql`
- `migrations/004_issues.up.sql` + `.down.sql`
- `migrations/006_sprints.up.sql` + `.down.sql`
- `migrations/010_activity_log.up.sql` + `.down.sql`

### Endpoints chi tiết

**Xác thực (5 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| A1 | POST | `/api/auth/register` | Đăng ký (đã có, giữ nguyên) |
| A2 | POST | `/api/auth/login` | Đăng nhập (đã có, giữ nguyên) |
| A3 | POST | `/api/auth/logout` | Đăng xuất |
| A4 | POST | `/api/auth/change-password` | Đổi mật khẩu |
| A5 | POST | `/api/auth/refresh` | Làm mới token |

**Người dùng (4 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| A6 | GET | `/api/users/me` | Thông tin cá nhân |
| A7 | PATCH | `/api/users/me` | Cập nhật hồ sơ |
| A8 | GET | `/api/users/{userID}` | Xem người dùng khác |
| A9 | GET | `/api/users?search=keyword` | Tìm kiếm người dùng |

**Công việc (8 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| A10 | POST | `/api/projects/{projectID}/issues` | Tạo công việc |
| A11 | GET | `/api/projects/{projectID}/issues` | Liệt kê (bộ lọc, phân trang) |
| A12 | GET | `/api/issues/{issueKey}` | Chi tiết công việc |
| A13 | PATCH | `/api/issues/{issueKey}` | Cập nhật công việc |
| A14 | DELETE | `/api/issues/{issueKey}` | Xóa mềm |
| A15 | PUT | `/api/issues/{issueKey}/status` | Chuyển trạng thái |
| A16 | PUT | `/api/issues/{issueKey}/assign` | Gán người |
| A17 | GET | `/api/issues/{issueKey}/subtasks` | Liệt kê công việc con |

**Bình luận (4 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| A18 | POST | `/api/issues/{issueKey}/comments` | Thêm bình luận |
| A19 | GET | `/api/issues/{issueKey}/comments` | Liệt kê bình luận |
| A20 | PATCH | `/api/comments/{commentID}` | Sửa bình luận |
| A21 | DELETE | `/api/comments/{commentID}` | Xóa bình luận |

**Nhật ký hoạt động (2 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| A22 | GET | `/api/issues/{issueKey}/activity` | Lịch sử thay đổi công việc |
| A23 | GET | `/api/projects/{projectID}/activity` | Luồng hoạt động dự án |

**Sprint (7 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| A24 | POST | `/api/projects/{projectID}/sprints` | Tạo sprint |
| A25 | GET | `/api/projects/{projectID}/sprints` | Liệt kê sprint |
| A26 | GET | `/api/sprints/{sprintID}` | Chi tiết sprint |
| A27 | PATCH | `/api/sprints/{sprintID}` | Cập nhật sprint |
| A28 | POST | `/api/sprints/{sprintID}/start` | Bắt đầu sprint |
| A29 | POST | `/api/sprints/{sprintID}/complete` | Kết thúc sprint |
| A30 | GET | `/api/projects/{projectID}/backlog` | Backlog |

---

## Người B: Lõi dự án + Hạ tầng

### Modules phụ trách

| Module | Endpoints | Độ phức tạp |
|--------|-----------|-------------|
| Dự án (Projects) | 5 | Trung bình |
| Thành viên dự án | 4 | Dễ |
| Bảng (Boards) | 6 | Trung bình |
| Cột bảng (Columns) | 4 | Dễ |
| Nhãn (Labels) | 6 | Dễ |
| Tệp đính kèm (Attachments) | 4 | Trung bình |
| Tìm kiếm (Search) | 1 | Trung bình |
| WebSocket | 1 | Khó |
| **Tổng** | **31** | |

### Danh sách file chịu trách nhiệm

**Domain (thực thể):**
- `internal/domain/project.go` -- tạo mới (Project, ProjectMember, ProjectPatch)
- `internal/domain/board.go` -- tạo mới (Board, BoardColumn)
- `internal/domain/label.go` -- tạo mới
- `internal/domain/attachment.go` -- tạo mới

**Repository (giao diện):**
- `internal/repository/project_repository.go` -- tạo mới
- `internal/repository/board_repository.go` -- tạo mới
- `internal/repository/label_repository.go` -- tạo mới
- `internal/repository/attachment_repository.go` -- tạo mới
- `internal/repository/tx.go` -- tạo mới (giao diện TxManager)

**Repository (triển khai Postgres):**
- `internal/repository/postgres/project_repo.go` -- tạo mới
- `internal/repository/postgres/board_repo.go` -- tạo mới
- `internal/repository/postgres/label_repo.go` -- tạo mới
- `internal/repository/postgres/attachment_repo.go` -- tạo mới
- `internal/repository/postgres/tx_manager.go` -- tạo mới

**Usecase:**
- `internal/usecase/project_usecase.go` -- tạo mới
- `internal/usecase/board_usecase.go` -- tạo mới
- `internal/usecase/label_usecase.go` -- tạo mới
- `internal/usecase/attachment_usecase.go` -- tạo mới
- `internal/usecase/permission.go` -- tạo mới (dùng chung)

**Handler:**
- `internal/delivery/http/handler/project_handler.go` -- tạo mới
- `internal/delivery/http/handler/board_handler.go` -- tạo mới
- `internal/delivery/http/handler/label_handler.go` -- tạo mới
- `internal/delivery/http/handler/attachment_handler.go` -- tạo mới
- `internal/delivery/http/handler/ws_handler.go` -- tạo mới

**Hạ tầng:**
- `internal/infra/filestore/filestore.go` -- tạo mới (giao diện)
- `internal/infra/filestore/local.go` -- tạo mới (triển khai cục bộ)
- `internal/pkg/ws/hub.go` -- tạo mới
- `internal/pkg/ws/client.go` -- tạo mới

**Migration:**
- `migrations/003_projects.up.sql` + `.down.sql`
- `migrations/005_boards.up.sql` + `.down.sql`
- `migrations/007_comments.up.sql` + `.down.sql`
- `migrations/008_labels.up.sql` + `.down.sql`
- `migrations/009_attachments.up.sql` + `.down.sql`

**Lưu ý:** Migration 007_comments do Người B tạo file SQL, nhưng entity + logic nghiệp vụ bình luận do Người A viết. Người B chỉ tạo cấu trúc bảng SQL.

### Endpoints chi tiết

**Dự án (5 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| B1 | POST | `/api/projects` | Tạo dự án |
| B2 | GET | `/api/projects` | Liệt kê dự án |
| B3 | GET | `/api/projects/{projectID}` | Chi tiết dự án |
| B4 | PATCH | `/api/projects/{projectID}` | Cập nhật dự án |
| B5 | DELETE | `/api/projects/{projectID}` | Xóa mềm dự án |

**Thành viên dự án (4 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| B6 | GET | `/api/projects/{projectID}/members` | Liệt kê thành viên |
| B7 | POST | `/api/projects/{projectID}/members` | Thêm thành viên |
| B8 | PUT | `/api/projects/{projectID}/members/{userID}` | Đổi vai trò |
| B9 | DELETE | `/api/projects/{projectID}/members/{userID}` | Xóa thành viên |

**Bảng (6 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| B10 | POST | `/api/projects/{projectID}/boards` | Tạo bảng |
| B11 | GET | `/api/projects/{projectID}/boards` | Liệt kê bảng |
| B12 | GET | `/api/boards/{boardID}` | Chi tiết bảng + cột |
| B13 | GET | `/api/boards/{boardID}/issues` | Công việc trên bảng |
| B14 | PATCH | `/api/boards/{boardID}` | Cập nhật bảng |
| B15 | DELETE | `/api/boards/{boardID}` | Xóa bảng |

**Cột bảng (4 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| B16 | POST | `/api/boards/{boardID}/columns` | Thêm cột |
| B17 | PATCH | `/api/boards/{boardID}/columns/{columnID}` | Sửa cột |
| B18 | DELETE | `/api/boards/{boardID}/columns/{columnID}` | Xóa cột |
| B19 | PUT | `/api/boards/{boardID}/columns/reorder` | Sắp xếp lại cột |

**Nhãn (6 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| B20 | POST | `/api/projects/{projectID}/labels` | Tạo nhãn |
| B21 | GET | `/api/projects/{projectID}/labels` | Liệt kê nhãn |
| B22 | PATCH | `/api/labels/{labelID}` | Sửa nhãn |
| B23 | DELETE | `/api/labels/{labelID}` | Xóa nhãn |
| B24 | POST | `/api/issues/{issueKey}/labels` | Gắn nhãn vào công việc |
| B25 | DELETE | `/api/issues/{issueKey}/labels/{labelID}` | Gỡ nhãn |

**Tệp đính kèm (4 endpoints):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| B26 | POST | `/api/issues/{issueKey}/attachments` | Tải lên tệp |
| B27 | GET | `/api/issues/{issueKey}/attachments` | Liệt kê tệp |
| B28 | GET | `/api/attachments/{attachmentID}` | Tải xuống tệp |
| B29 | DELETE | `/api/attachments/{attachmentID}` | Xóa tệp |

**Tìm kiếm (1 endpoint):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| B30 | GET | `/api/search` | Tìm kiếm toàn cục |

**WebSocket (1 endpoint):**

| # | Phương thức | Đường dẫn | Mô tả |
|---|-------------|-----------|-------|
| B31 | GET | `/api/ws?token=jwt` | Kết nối thời gian thực |

---

## Lịch trình chi tiết

### Tuần 1: Nền tảng

```
Người A                              Người B
----------------------------------   ----------------------------------
Ngày 1-2: Giai đoạn 1                Ngày 1-3: Giai đoạn 2
  - errors.go (mở rộng)                - domain/project.go
  - domain/user.go (mở rộng)           - repository/project_repository.go
  - handler/response.go                 - repository/tx.go (TxManager)
  - middleware/cors.go                  - postgres/project_repo.go
  - usecase/user_usecase.go             - postgres/tx_manager.go
  - handler/user_handler.go             - usecase/permission.go
  - handler/auth_handler.go (mở rộng)  - usecase/project_usecase.go
  - migration 002                       - handler/project_handler.go
                                        - migration 003

Ngày 3: Kiểm thử riêng              Ngày 3: Kiểm thử riêng
  - Chạy local, test auth + users      - Test tạo project + members
```

**Cuối tuần 1: MERGE LẦN 1**
- Người A tích hợp vào `main.go` và `router.go`
- Chạy migration 001 -> 002 -> 003
- Kiểm thử liên module: đăng ký -> đăng nhập -> tạo dự án -> thêm thành viên

---

### Tuần 2: Module chính

```
Người A                              Người B
----------------------------------   ----------------------------------
Ngày 1-3: Công việc (Issues)         Ngày 1-2: Bảng + Cột
  - domain/issue.go                    - domain/board.go
  - repository/issue_repository.go     - repository/board_repository.go
  - postgres/issue_repo.go             - postgres/board_repo.go
  - usecase/issue_usecase.go           - usecase/board_usecase.go
  - handler/issue_handler.go           - handler/board_handler.go
  - migration 004                      - migration 005

                                     Ngày 3: Nhãn
Ngày 4: Bình luận                      - domain/label.go
  - domain/comment.go                  - repository/label_repository.go
  - usecase/comment_usecase.go         - postgres/label_repo.go
  - handler/comment_handler.go         - usecase/label_usecase.go
  - (migration 007 do Người B tạo)     - handler/label_handler.go
                                        - migration 007, 008
```

**Cuối tuần 2: MERGE LẦN 2**
- Tích hợp vào `main.go` và `router.go`
- Chạy migration 004 -> 005 -> 007 -> 008
- Kiểm thử: tạo công việc -> xem trên bảng -> gắn nhãn -> bình luận

---

### Tuần 3: Hoàn thiện

```
Người A                              Người B
----------------------------------   ----------------------------------
Ngày 1-2: Sprint                     Ngày 1: Tệp đính kèm
  - domain/sprint.go                   - domain/attachment.go
  - usecase/sprint_usecase.go          - infra/filestore/filestore.go
  - handler/sprint_handler.go          - infra/filestore/local.go
  - migration 006                      - usecase/attachment_usecase.go
                                        - handler/attachment_handler.go
Ngày 2: Nhật ký hoạt động              - migration 009
  - domain/activity.go
  - usecase/activity_usecase.go      Ngày 2: WebSocket
  - handler/activity_handler.go        - pkg/ws/hub.go
  - migration 010                      - pkg/ws/client.go
                                        - handler/ws_handler.go
Ngày 3: Kiểm thử tổng thể
                                     Ngày 3: Tìm kiếm + Kiểm thử
                                        - Thêm logic tìm kiếm
```

**Cuối tuần 3: MERGE LẦN 3 (CUỐI CÙNG)**
- Tích hợp toàn bộ vào `main.go` và `router.go`
- Chạy migration 006 -> 009 -> 010
- Kiểm thử toàn bộ luồng

---

## Quy tắc phối hợp

### 1. File chia sẻ

| File | Người quản lý | Quy tắc |
|------|---------------|---------|
| `cmd/api/main.go` | Người A | Người B gửi đoạn code cần thêm khi merge |
| `delivery/http/router/router.go` | Cùng quản lý | Mỗi người viết hàm đăng ký riêng (xem bên dưới) |
| `domain/errors.go` | Người A | Tạo sẵn tất cả lỗi ở tuần 1, sau đó không sửa |
| `handler/response.go` | Người A | Tạo ở tuần 1, sau đó không sửa |

### 2. router.go -- tránh xung đột

Mỗi người viết hàm đăng ký route riêng trong file handler của mình:

```go
// Người A viết trong handler/issue_handler.go:
func (h *IssueHandler) RegisterRoutes(r chi.Router) {
    r.Post("/projects/{projectID}/issues", h.CreateIssue)
    r.Get("/projects/{projectID}/issues", h.ListIssues)
    // ...
}

// Người B viết trong handler/project_handler.go:
func (h *ProjectHandler) RegisterRoutes(r chi.Router) {
    r.Post("/projects", h.CreateProject)
    r.Get("/projects", h.ListProjects)
    // ...
}
```

Router.go chỉ gọi:
```go
func SetupRoutes(r chi.Router, ...) {
    r.Route("/api", func(r chi.Router) {
        // Người A
        authHandler.RegisterRoutes(r)
        userHandler.RegisterRoutes(r)
        issueHandler.RegisterRoutes(r)
        commentHandler.RegisterRoutes(r)
        sprintHandler.RegisterRoutes(r)
        activityHandler.RegisterRoutes(r)

        // Người B
        projectHandler.RegisterRoutes(r)
        boardHandler.RegisterRoutes(r)
        labelHandler.RegisterRoutes(r)
        attachmentHandler.RegisterRoutes(r)
        wsHandler.RegisterRoutes(r)
    })
}
```

### 3. main.go -- quy trình merge

Khi merge, Người A tổng hợp và thêm tất cả dependency wiring:

```go
// Tuần 1 merge -- Người A thêm code của Người B:
projectRepo := postgres.NewProjectRepo(pool)
txManager := postgres.NewPgTxManager(pool)
permChecker := usecase.NewPermissionChecker(projectRepo)
projectUC := usecase.NewProjectUsecase(projectRepo, txManager, permChecker)
projectHandler := handler.NewProjectHandler(projectUC)
```

### 4. Migration -- phân chia cố định

| Số | Tệp | Người tạo |
|----|------|-----------|
| 001 | `001_init` | Đã có |
| 002 | `002_user_extend` | Người A |
| 003 | `003_projects` | Người B |
| 004 | `004_issues` | Người A |
| 005 | `005_boards` | Người B |
| 006 | `006_sprints` | Người A |
| 007 | `007_comments` | Người B (tạo SQL) |
| 008 | `008_labels` | Người B |
| 009 | `009_attachments` | Người B |
| 010 | `010_activity_log` | Người A |

### 5. Nhánh Git

```
main
  |-- feature/auth-users          (Người A, tuần 1)
  |-- feature/projects            (Người B, tuần 1)
  |     merge vào main cuối tuần 1
  |
  |-- feature/issues              (Người A, tuần 2)
  |-- feature/boards-labels       (Người B, tuần 2)
  |     merge vào main cuối tuần 2
  |
  |-- feature/sprint-activity     (Người A, tuần 3)
  |-- feature/attachments-ws      (Người B, tuần 3)
        merge vào main cuối tuần 3
```

### 6. Giao tiếp bắt buộc

| Thời điểm | Nội dung trao đổi |
|------------|-------------------|
| Trước tuần 1 | Thống nhất errors.go, response.go, cấu trúc interface |
| Cuối tuần 1 | Merge lần 1, test liên module |
| Giữa tuần 2 | Người A xong Issues -> báo Người B để test B13 (công việc trên bảng) |
| Cuối tuần 2 | Merge lần 2, test liên module |
| Cuối tuần 3 | Merge cuối cùng, test toàn bộ luồng |

---

## Phụ thuộc giữa hai người

```
Người B phụ thuộc Người A:
  - Boards (B13) cần Issues tồn tại để hiển thị công việc trên bảng
  - Labels (B24, B25) cần Issues tồn tại để gắn/gỡ nhãn
  - Attachments (B26-B29) cần Issues tồn tại để đính kèm tệp
  - WebSocket cần các usecase để phát sóng sự kiện
  => Giải quyết: Người B tạo giao diện trước, triển khai sau khi merge tuần 2

Người A phụ thuộc Người B:
  - Issues (A10) cần Projects tồn tại để tạo công việc trong dự án
  - Issues (A10) cần permission.go để kiểm tra quyền
  - Issues (A10) cần TxManager cho giao dịch nguyên tử
  => Giải quyết: Người B tạo trước permission.go + tx.go ở tuần 1
```

---

## Danh sách kiểm thử mỗi lần merge

### Merge lần 1 (cuối tuần 1)

- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập nhận token
- [ ] Xem hồ sơ cá nhân
- [ ] Cập nhật hồ sơ
- [ ] Đổi mật khẩu
- [ ] Làm mới token
- [ ] Tìm kiếm người dùng
- [ ] Tạo dự án mới (kiểm tra tự tạo bảng mặc định)
- [ ] Liệt kê dự án
- [ ] Thêm thành viên vào dự án
- [ ] Đổi vai trò thành viên
- [ ] Xóa thành viên
- [ ] Kiểm tra phân quyền: viewer không thể sửa dự án

### Merge lần 2 (cuối tuần 2)

- [ ] Tạo công việc trong dự án
- [ ] Kiểm tra key tự động (VD: MYPRJ-1, MYPRJ-2)
- [ ] Liệt kê công việc với bộ lọc (status, type, priority, assignee)
- [ ] Chuyển trạng thái công việc
- [ ] Gán người cho công việc
- [ ] Xem công việc trên bảng
- [ ] Tạo cột mới trên bảng
- [ ] Sắp xếp lại cột
- [ ] Tạo nhãn
- [ ] Gắn nhãn vào công việc
- [ ] Thêm bình luận
- [ ] Sửa/xóa bình luận (kiểm tra chỉ tác giả hoặc admin)

### Merge lần 3 (cuối tuần 3)

- [ ] Tạo sprint
- [ ] Bắt đầu sprint (kiểm tra chỉ 1 active)
- [ ] Gán công việc vào sprint
- [ ] Kết thúc sprint (kiểm tra chuyển công việc về backlog)
- [ ] Xem nhật ký hoạt động sau khi sửa công việc
- [ ] Tải lên tệp đính kèm
- [ ] Tải xuống tệp
- [ ] Kết nối WebSocket
- [ ] Đăng ký theo dõi dự án qua WebSocket
- [ ] Tạo công việc -> xác minh nhận sự kiện thời gian thực
- [ ] Tìm kiếm công việc và dự án
- [ ] Kiểm thử toàn bộ luồng từ đầu đến cuối
