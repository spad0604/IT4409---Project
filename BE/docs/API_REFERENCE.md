# Tài liệu API -- IT4409 Quản lý Dự án

**Địa chỉ gốc:** `http://localhost:8080/api`
**Xác thực:** JWT Bearer Token (header `Authorization: Bearer <token>`)
**Định dạng phản hồi:** JSON envelope `{ status, message, data }`

---

## Mục lục

- [Xác thực](#1-xac-thuc)
- [Người dùng](#2-nguoi-dung)
- [Dự án](#3-du-an)
- [Thành viên dự án](#4-thanh-vien-du-an)
- [Công việc](#5-cong-viec)
- [Bảng](#6-bang)
- [Cột bảng](#7-cot-bang)
- [Sprint](#8-sprint)
- [Bình luận](#9-binh-luan)
- [Nhãn](#10-nhan)
- [Tệp đính kèm](#11-tep-dinh-kem)
- [Nhật ký hoạt động](#12-nhat-ky-hoat-dong)
- [Tìm kiếm](#13-tim-kiem)
- [WebSocket](#14-websocket)
- [Quy chuẩn chung](#quy-chuan-chung)

---

## Quy chuẩn chung

### Phong bì phản hồi (Response Envelope)

Mọi API đều trả về cùng định dạng:

```json
{
  "status": 200,
  "message": "success",
  "data": { ... }
}
```

### Phản hồi phân trang

```json
{
  "status": 200,
  "message": "success",
  "data": {
    "items": [ ... ],
    "total": 150,
    "page": 0,
    "perPage": 50
  }
}
```

### Phản hồi lỗi

```json
{
  "status": 400,
  "message": "validation error: title is required",
  "data": null
}
```

### Mã lỗi HTTP

| Mã trạng thái | Ý nghĩa |
|----------------|----------|
| `400` | Bad Request -- dữ liệu đầu vào không hợp lệ |
| `401` | Unauthorized -- chưa đăng nhập hoặc token hết hạn |
| `403` | Forbidden -- không có quyền thực hiện |
| `404` | Not Found -- tài nguyên không tồn tại |
| `409` | Conflict -- trùng lặp (email, khóa dự án...) |
| `500` | Internal Server Error -- lỗi máy chủ |

### Tham số phân trang

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `page` | int | `0` | Số trang (bắt đầu từ 0) |
| `per_page` | int | `50` | Số bản ghi trên mỗi trang (tối đa 100) |

### Tham số sắp xếp

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `sort` | string | `created_at` | Trường sắp xếp |
| `order` | string | `desc` | `asc` (tăng dần) hoặc `desc` (giảm dần) |

---

## 1. Xác thực

### POST `/api/auth/register`

Đăng ký tài khoản mới.

**Xác thực:** Không cần

**Thân yêu cầu (Request Body):**
```json
{
  "email": "user@example.com",
  "password": "securePass123",
  "name": "Nguyễn Văn A",
  "username": "nguyenvana"
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|--------|------|----------|-----------|
| `email` | string | có | email hợp lệ, không trùng |
| `password` | string | có | tối thiểu 8 ký tự |
| `name` | string | có | tối thiểu 1 ký tự |
| `username` | string | không | chữ cái, số, gạch dưới; không trùng |

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "registration successful",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "username": "nguyenvana",
    "createdAt": "2026-04-08T10:00:00Z"
  }
}
```

**Lỗi có thể xảy ra:** `400` dữ liệu không hợp lệ, `409` email hoặc username đã tồn tại

---

### POST `/api/auth/login`

Đăng nhập, nhận JWT token.

**Xác thực:** Không cần

**Thân yêu cầu:**
```json
{
  "email": "user@example.com",
  "password": "securePass123"
}
```

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatarUrl": "",
      "createdAt": "2026-04-08T10:00:00Z"
    }
  }
}
```

**Lỗi:** `401` thông tin đăng nhập không đúng

---

### POST `/api/auth/logout`

Đăng xuất (phía client xóa token).

**Xác thực:** Cần đăng nhập

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "logout successful",
  "data": null
}
```

---

### POST `/api/auth/change-password`

Đổi mật khẩu.

**Xác thực:** Cần đăng nhập

**Thân yêu cầu:**
```json
{
  "oldPassword": "matKhauCu123",
  "newPassword": "matKhauMoi456"
}
```

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "password changed",
  "data": null
}
```

**Lỗi:** `400` mật khẩu cũ không đúng, mật khẩu mới quá ngắn

---

### POST `/api/auth/refresh`

Làm mới JWT token. Gửi token hiện tại còn hạn, nhận token mới với thời hạn kéo dài.

**Xác thực:** Cần đăng nhập

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "token refreshed",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Lỗi:** `401` token không hợp lệ hoặc đã hết hạn

---

## 2. Người dùng

### GET `/api/users/me`

Lấy thông tin người dùng hiện tại.

**Xác thực:** Cần đăng nhập

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "username": "nguyenvana",
    "avatarUrl": "https://...",
    "role": "member",
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T10:00:00Z"
  }
}
```

---

### PATCH `/api/users/me`

Cập nhật hồ sơ cá nhân. Chỉ gửi các trường muốn thay đổi.

**Xác thực:** Cần đăng nhập

**Thân yêu cầu (gửi một phần):**
```json
{
  "name": "Nguyễn Văn B",
  "username": "nguyenvanb",
  "avatarUrl": "https://..."
}
```

**Phản hồi 200:** Đối tượng User đã cập nhật

---

### GET `/api/users/{userID}`

Lấy thông tin một người dùng. Email bị ẩn nếu không phải chính mình.

**Xác thực:** Cần đăng nhập

**Phản hồi 200:** Đối tượng User

---

### GET `/api/users?search=keyword`

Tìm kiếm người dùng theo tên hoặc email.

**Xác thực:** Cần đăng nhập

**Tham số truy vấn:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `search` | string | có | Từ khóa tìm kiếm (tối thiểu 2 ký tự) |

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": [
    { "id": "uuid", "name": "...", "email": "...", "username": "...", "avatarUrl": "..." }
  ]
}
```

---

## 3. Dự án

### POST `/api/projects`

Tạo dự án mới. Người tạo tự động trở thành admin.

**Xác thực:** Cần đăng nhập

**Thân yêu cầu:**
```json
{
  "name": "Dự án của tôi",
  "key": "MYPRJ",
  "description": "Mô tả dự án",
  "type": "kanban",
  "icon": ""
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|--------|------|----------|-----------|
| `name` | string | có | 1-100 ký tự |
| `key` | string | có | 2-10 ký tự, chữ in hoa và số, không trùng |
| `description` | string | không | tối đa 2000 ký tự |
| `type` | string | không | `kanban` (mặc định) hoặc `scrum` |
| `icon` | string | không | chuỗi ngắn |

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "project created",
  "data": {
    "id": "uuid",
    "name": "Dự án của tôi",
    "key": "MYPRJ",
    "description": "Mô tả dự án",
    "leadId": "user-uuid",
    "icon": "",
    "type": "kanban",
    "createdBy": "user-uuid",
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T10:00:00Z"
  }
}
```

**Tác dụng phụ (Side effects):**
- Tạo bảng mặc định với 4 cột (To Do, In Progress, In Review, Done)
- Tạo bản ghi project_issue_counters
- Thêm người tạo vào project_members với vai trò admin

**Lỗi:** `409` khóa dự án đã tồn tại

---

### GET `/api/projects`

Liệt kê các dự án mà người dùng hiện tại là thành viên.

**Xác thực:** Cần đăng nhập

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Dự án của tôi",
      "key": "MYPRJ",
      "description": "...",
      "type": "kanban",
      "icon": "",
      "role": "admin",
      "memberCount": 5,
      "issueCount": 42,
      "createdAt": "2026-04-08T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/projects/{projectID}`

Chi tiết dự án.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "Dự án của tôi",
    "key": "MYPRJ",
    "description": "...",
    "leadId": "user-uuid",
    "icon": "",
    "type": "kanban",
    "createdBy": "user-uuid",
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T10:00:00Z"
  }
}
```

---

### PATCH `/api/projects/{projectID}`

Cập nhật dự án.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Thân yêu cầu (gửi một phần):**
```json
{
  "name": "Tên mới",
  "description": "Mô tả cập nhật",
  "leadId": "user-uuid",
  "icon": ""
}
```

**Phản hồi 200:** Đối tượng Project đã cập nhật

---

### DELETE `/api/projects/{projectID}`

Xóa mềm dự án.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Phản hồi 200:** `{ "status": 200, "message": "project deleted", "data": null }`

---

## 4. Thành viên dự án

### GET `/api/projects/{projectID}/members`

Liệt kê thành viên dự án.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": [
    {
      "userId": "uuid",
      "name": "Nguyễn Văn A",
      "email": "user@example.com",
      "username": "nguyenvana",
      "avatarUrl": "...",
      "role": "admin",
      "joinedAt": "2026-04-08T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/projects/{projectID}/members`

Thêm thành viên.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Thân yêu cầu:**
```json
{
  "userId": "uuid",
  "role": "member"
}
```

| Trường | Kiểu | Bắt buộc | Giá trị |
|--------|------|----------|---------|
| `userId` | string | có | UUID của người dùng |
| `role` | string | không | `admin`, `member` (mặc định), `viewer` |

**Phản hồi 200:** Đối tượng thành viên đã tạo

**Lỗi:** `404` người dùng không tồn tại, `409` đã là thành viên

---

### PUT `/api/projects/{projectID}/members/{userID}`

Thay đổi vai trò thành viên.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Thân yêu cầu:**
```json
{
  "role": "admin"
}
```

**Phản hồi 200:** Đối tượng thành viên đã cập nhật

---

### DELETE `/api/projects/{projectID}/members/{userID}`

Xóa thành viên.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Lưu ý:** Không thể xóa chính mình nếu là admin duy nhất.

**Phản hồi 200:** `{ "status": 200, "message": "member removed", "data": null }`

---

## 5. Công việc (Issues)

### POST `/api/projects/{projectID}/issues`

Tạo công việc mới. `issue_number` và `key` được tự động sinh.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Thân yêu cầu:**
```json
{
  "type": "task",
  "title": "Xây dựng trang đăng nhập",
  "description": "Tạo trang đăng nhập với form email/mật khẩu",
  "priority": "high",
  "assigneeId": "user-uuid",
  "parentId": null,
  "sprintId": null,
  "dueDate": "2026-04-15T00:00:00Z",
  "labelIds": ["label-uuid-1", "label-uuid-2"]
}
```

| Trường | Kiểu | Bắt buộc | Giá trị |
|--------|------|----------|---------|
| `type` | string | không | `epic`, `story`, `task` (mặc định), `bug`, `subtask` |
| `title` | string | có | 1-500 ký tự |
| `description` | string | không | hỗ trợ markdown |
| `priority` | string | không | `critical`, `high`, `medium` (mặc định), `low`, `trivial` |
| `assigneeId` | string | không | UUID, phải là thành viên dự án |
| `parentId` | string | không | UUID của công việc cha |
| `sprintId` | string | không | UUID của sprint trong cùng dự án |
| `dueDate` | string | không | Ngày giờ ISO 8601 |
| `labelIds` | string[] | không | Mảng các UUID nhãn |

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "issue created",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "issueNumber": 42,
    "key": "MYPRJ-42",
    "type": "task",
    "status": "todo",
    "priority": "high",
    "title": "Xây dựng trang đăng nhập",
    "description": "Tạo trang đăng nhập với form email/mật khẩu",
    "assignee": {
      "id": "user-uuid",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatarUrl": ""
    },
    "reporter": {
      "id": "creator-uuid",
      "name": "Trần Văn B",
      "username": "tranvanb",
      "avatarUrl": ""
    },
    "parentId": null,
    "sprintId": null,
    "sortOrder": 0,
    "dueDate": "2026-04-15T00:00:00Z",
    "labels": [
      { "id": "label-uuid-1", "name": "frontend", "color": "#6366f1" },
      { "id": "label-uuid-2", "name": "urgent", "color": "#f43f5e" }
    ],
    "commentCount": 0,
    "attachmentCount": 0,
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T10:00:00Z"
  }
}
```

---

### GET `/api/projects/{projectID}/issues`

Liệt kê công việc với bộ lọc, sắp xếp, phân trang.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Tham số truy vấn:**

| Tham số | Kiểu | Mô tả | Ví dụ |
|---------|------|-------|-------|
| `status` | string | Lọc theo trạng thái (phân tách bằng dấu phẩy) | `todo,in_progress` |
| `type` | string | Lọc theo loại | `bug,task` |
| `priority` | string | Lọc theo độ ưu tiên | `high,critical` |
| `assignee` | string | UUID người được giao hoặc `me` | `me` |
| `reporter` | string | UUID người báo cáo hoặc `me` | `uuid` |
| `sprint` | string | UUID sprint hoặc `backlog` | `backlog` |
| `parent` | string | UUID công việc cha | `uuid` |
| `label` | string | UUID nhãn | `uuid` |
| `search` | string | Tìm theo tiêu đề | `login` |
| `page` | int | Số trang | `0` |
| `per_page` | int | Số bản ghi/trang | `50` |
| `sort` | string | Trường sắp xếp | `created_at`, `priority`, `due_date`, `issue_number` |
| `order` | string | Thứ tự sắp xếp | `asc`, `desc` |

**Phản hồi 200:** Phản hồi phân trang với danh sách tóm tắt công việc:

```json
{
  "status": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "key": "MYPRJ-42",
        "type": "task",
        "status": "todo",
        "priority": "high",
        "title": "Xây dựng trang đăng nhập",
        "assignee": { "id": "uuid", "name": "...", "avatarUrl": "" },
        "labels": [ { "id": "uuid", "name": "frontend", "color": "#6366f1" } ],
        "commentCount": 3,
        "dueDate": "2026-04-15T00:00:00Z",
        "createdAt": "2026-04-08T10:00:00Z"
      }
    ],
    "total": 42,
    "page": 0,
    "perPage": 50
  }
}
```

Lưu ý: Danh sách trả về dạng **tóm tắt** (không có description, không có reporter chi tiết). Dùng GET theo key để lấy đầy đủ.

---

### GET `/api/issues/{issueKey}`

Chi tiết đầy đủ công việc theo key (VD: `MYPRJ-42`). Bao gồm nhãn, thông tin người giao/người báo cáo, số lượng bình luận và tệp đính kèm.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+ (dự án được xác định từ key)

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "projectId": "project-uuid",
    "issueNumber": 42,
    "key": "MYPRJ-42",
    "type": "task",
    "status": "in_progress",
    "priority": "high",
    "title": "Xây dựng trang đăng nhập",
    "description": "## Yêu cầu\n\nTạo trang đăng nhập với form email/mật khẩu...",
    "assignee": {
      "id": "user-uuid",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatarUrl": ""
    },
    "reporter": {
      "id": "reporter-uuid",
      "name": "Trần Văn B",
      "username": "tranvanb",
      "avatarUrl": ""
    },
    "parentId": null,
    "parent": null,
    "sprintId": "sprint-uuid",
    "sprint": {
      "id": "sprint-uuid",
      "name": "Sprint 1",
      "status": "active"
    },
    "sortOrder": 1.5,
    "dueDate": "2026-04-15T00:00:00Z",
    "labels": [
      { "id": "label-uuid-1", "name": "frontend", "color": "#6366f1" },
      { "id": "label-uuid-2", "name": "urgent", "color": "#f43f5e" }
    ],
    "commentCount": 5,
    "attachmentCount": 2,
    "subtaskCount": 3,
    "subtaskDoneCount": 1,
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-09T14:30:00Z"
  }
}
```

**Các đối tượng đi kèm:**
- `assignee` -- đối tượng người dùng đầy đủ (id, name, username, avatarUrl) hoặc null
- `reporter` -- đối tượng người dùng đầy đủ
- `sprint` -- tóm tắt (id, name, status) hoặc null
- `parent` -- tóm tắt (id, key, title) hoặc null nếu không có cha
- `labels` -- mảng đối tượng nhãn (id, name, color)
- `commentCount`, `attachmentCount` -- số lượng (kiểu integer)
- `subtaskCount`, `subtaskDoneCount` -- dành cho epic/task có công việc con

---

### PATCH `/api/issues/{issueKey}`

Cập nhật công việc (cập nhật một phần). Chỉ gửi các trường muốn thay đổi.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Thân yêu cầu (gửi một phần):**
```json
{
  "title": "Tiêu đề đã cập nhật",
  "description": "Mô tả mới",
  "priority": "critical",
  "type": "bug",
  "assigneeId": "user-uuid-moi",
  "dueDate": "2026-04-20T00:00:00Z"
}
```

**Tác dụng phụ:** Tạo bản ghi nhật ký hoạt động cho mỗi trường thay đổi.

**Phản hồi 200:** Đối tượng Issue đầy đủ (cùng cấu trúc với GET)

---

### DELETE `/api/issues/{issueKey}`

Xóa mềm công việc.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+ (của mình) / admin (bất kỳ)

**Phản hồi 200:** `{ "status": 200, "message": "issue deleted", "data": null }`

---

### PUT `/api/issues/{issueKey}/status`

Chuyển trạng thái công việc.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Thân yêu cầu:**
```json
{
  "status": "in_progress"
}
```

| Giá trị | Mô tả |
|---------|-------|
| `todo` | Chưa bắt đầu |
| `in_progress` | Đang thực hiện |
| `in_review` | Đang đánh giá |
| `done` | Hoàn thành |
| `cancelled` | Đã hủy |

**Tác dụng phụ:** Nhật ký hoạt động: `status_changed`, giá trị cũ -> giá trị mới

**Phản hồi 200:** Đối tượng Issue đầy đủ

---

### PUT `/api/issues/{issueKey}/assign`

Gán hoặc bỏ gán người dùng cho công việc.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Thân yêu cầu:**
```json
{
  "assigneeId": "user-uuid"
}
```

Gửi `"assigneeId": null` để bỏ gán.

**Tác dụng phụ:** Nhật ký hoạt động: `assigned`, giá trị cũ -> giá trị mới

**Phản hồi 200:** Đối tượng Issue đầy đủ

---

### GET `/api/issues/{issueKey}/subtasks`

Liệt kê công việc con của một công việc.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:** Mảng đối tượng Issue tóm tắt

---

## 6. Bảng (Boards)

### POST `/api/projects/{projectID}/boards`

Tạo bảng hiển thị.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Thân yêu cầu:**
```json
{
  "name": "Bảng phát triển",
  "type": "kanban"
}
```

**Phản hồi 200:** Đối tượng Board

---

### GET `/api/projects/{projectID}/boards`

Liệt kê các bảng của dự án.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": [
    { "id": "uuid", "name": "Bảng phát triển", "type": "kanban", "createdAt": "..." }
  ]
}
```

---

### GET `/api/boards/{boardID}`

Thông tin bảng + danh sách cột. KHÔNG kèm theo công việc.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "projectId": "project-uuid",
    "name": "Bảng phát triển",
    "type": "kanban",
    "columns": [
      { "id": "col-uuid-1", "name": "To Do", "statusMap": "todo", "position": 0, "wipLimit": null },
      { "id": "col-uuid-2", "name": "In Progress", "statusMap": "in_progress", "position": 1, "wipLimit": 5 },
      { "id": "col-uuid-3", "name": "In Review", "statusMap": "in_review", "position": 2, "wipLimit": 3 },
      { "id": "col-uuid-4", "name": "Done", "statusMap": "done", "position": 3, "wipLimit": null }
    ],
    "createdBy": "user-uuid",
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T10:00:00Z"
  }
}
```

Lưu ý: FE cần gọi riêng `GET /api/boards/{boardID}/issues` để tải công việc.

---

### GET `/api/boards/{boardID}/issues`

Công việc trên bảng, có phân trang. FE nhóm theo trạng thái phía client dựa vào `statusMap` của cột.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Tham số truy vấn:** Giống bộ lọc công việc của dự án + `page`, `per_page`

**Phản hồi 200:** Danh sách tóm tắt Issue có phân trang

---

### PATCH `/api/boards/{boardID}`

Cập nhật tên/loại bảng.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Phản hồi 200:** Đối tượng Board đã cập nhật

---

### DELETE `/api/boards/{boardID}`

Xóa bảng. Không thể xóa bảng mặc định của dự án.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Phản hồi 200:** `{ "status": 200, "message": "board deleted", "data": null }`

---

## 7. Cột bảng

### POST `/api/boards/{boardID}/columns`

Thêm cột.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Thân yêu cầu:**
```json
{
  "name": "Kiểm thử",
  "statusMap": "in_review",
  "position": 2,
  "wipLimit": 3
}
```

**Phản hồi 200:** Đối tượng cột đã tạo

---

### PATCH `/api/boards/{boardID}/columns/{columnID}`

Sửa cột.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Phản hồi 200:** Đối tượng cột đã cập nhật

---

### DELETE `/api/boards/{boardID}/columns/{columnID}`

Xóa cột.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Phản hồi 200:** `{ "status": 200, "message": "column deleted", "data": null }`

---

### PUT `/api/boards/{boardID}/columns/reorder`

Sắp xếp lại thứ tự các cột.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Thân yêu cầu:**
```json
{
  "columnIds": ["uuid-1", "uuid-3", "uuid-2", "uuid-4"]
}
```

**Phản hồi 200:** Mảng các cột đã cập nhật

---

## 8. Sprint

Chỉ khả dụng cho dự án có `type = "scrum"`.

### POST `/api/projects/{projectID}/sprints`

Tạo sprint.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Thân yêu cầu:**
```json
{
  "name": "Sprint 1",
  "goal": "Hoàn thành module xác thực",
  "startDate": "2026-04-08T00:00:00Z",
  "endDate": "2026-04-22T00:00:00Z"
}
```

**Phản hồi 200:** Đối tượng Sprint

---

### GET `/api/projects/{projectID}/sprints`

Liệt kê sprint (sắp xếp theo ngày tạo giảm dần).

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:** Mảng đối tượng Sprint

---

### GET `/api/sprints/{sprintID}`

Chi tiết sprint kèm thống kê.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "name": "Sprint 1",
    "goal": "Hoàn thành module xác thực",
    "status": "active",
    "startDate": "2026-04-08T00:00:00Z",
    "endDate": "2026-04-22T00:00:00Z",
    "stats": {
      "totalIssues": 15,
      "todoCount": 3,
      "inProgressCount": 5,
      "doneCount": 7
    },
    "createdBy": "user-uuid",
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T10:00:00Z"
  }
}
```

---

### PATCH `/api/sprints/{sprintID}`

Cập nhật tên/mục tiêu/ngày của sprint.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Phản hồi 200:** Đối tượng Sprint đã cập nhật

---

### POST `/api/sprints/{sprintID}/start`

Bắt đầu sprint (trạng thái -> active).

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Ràng buộc:** Không có sprint khác đang ở trạng thái active trong dự án.

**Phản hồi 200:** Đối tượng Sprint đã cập nhật

---

### POST `/api/sprints/{sprintID}/complete`

Kết thúc sprint (trạng thái -> completed).

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Thân yêu cầu:**
```json
{
  "moveUnfinishedTo": "backlog"
}
```

| Giá trị | Mô tả |
|---------|-------|
| `backlog` | Chuyển các công việc chưa hoàn thành về backlog (sprint_id = null) |
| `sprint-uuid` | Chuyển sang sprint khác |

**Phản hồi 200:** Đối tượng Sprint đã cập nhật

---

### GET `/api/projects/{projectID}/backlog`

Các công việc chưa thuộc sprint nào.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:** Danh sách tóm tắt Issue có phân trang

---

## 9. Bình luận

### POST `/api/issues/{issueKey}/comments`

Thêm bình luận.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Thân yêu cầu:**
```json
{
  "content": "Nhìn ổn rồi, sẵn sàng merge."
}
```

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "comment created",
  "data": {
    "id": "uuid",
    "issueId": "uuid",
    "author": {
      "id": "uuid",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "avatarUrl": ""
    },
    "content": "Nhìn ổn rồi, sẵn sàng merge.",
    "createdAt": "2026-04-08T10:30:00Z",
    "updatedAt": "2026-04-08T10:30:00Z"
  }
}
```

---

### GET `/api/issues/{issueKey}/comments`

Liệt kê bình luận (sắp xếp theo ngày tạo tăng dần).

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:** Mảng đối tượng bình luận (cùng cấu trúc ở trên)

---

### PATCH `/api/comments/{commentID}`

Sửa bình luận (chỉ tác giả hoặc admin).

**Xác thực:** Cần đăng nhập | **Vai trò:** tác giả / admin

**Thân yêu cầu:**
```json
{
  "content": "Nội dung bình luận đã cập nhật"
}
```

**Phản hồi 200:** Đối tượng bình luận đã cập nhật

---

### DELETE `/api/comments/{commentID}`

Xóa bình luận (chỉ tác giả hoặc admin).

**Xác thực:** Cần đăng nhập | **Vai trò:** tác giả / admin

**Phản hồi 200:** `{ "status": 200, "message": "comment deleted", "data": null }`

---

## 10. Nhãn (Labels)

### POST `/api/projects/{projectID}/labels`

Tạo nhãn cho dự án.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Thân yêu cầu:**
```json
{
  "name": "frontend",
  "color": "#6366f1"
}
```

**Phản hồi 200:** Đối tượng Label

**Lỗi:** `409` tên nhãn đã tồn tại trong dự án

---

### GET `/api/projects/{projectID}/labels`

Liệt kê nhãn của dự án.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": [
    { "id": "uuid", "name": "frontend", "color": "#6366f1" },
    { "id": "uuid", "name": "bug-fix", "color": "#f43f5e" }
  ]
}
```

---

### PATCH `/api/labels/{labelID}`

Sửa nhãn.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Phản hồi 200:** Đối tượng Label đã cập nhật

---

### DELETE `/api/labels/{labelID}`

Xóa nhãn.

**Xác thực:** Cần đăng nhập | **Vai trò:** admin

**Phản hồi 200:** `{ "status": 200, "message": "label deleted", "data": null }`

---

### POST `/api/issues/{issueKey}/labels`

Gắn nhãn vào công việc.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Thân yêu cầu:**
```json
{
  "labelIds": ["uuid-1", "uuid-2"]
}
```

**Phản hồi 200:** Mảng nhãn đã cập nhật của công việc

---

### DELETE `/api/issues/{issueKey}/labels/{labelID}`

Gỡ nhãn khỏi công việc.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Phản hồi 200:** Mảng nhãn đã cập nhật của công việc

---

## 11. Tệp đính kèm

### POST `/api/issues/{issueKey}/attachments`

Tải lên tệp đính kèm.

**Xác thực:** Cần đăng nhập | **Vai trò:** member+

**Content-Type:** `multipart/form-data`

**Trường form:** `file` (nhị phân)

**Kích thước tối đa:** 10MB (cấu hình qua biến môi trường `MAX_FILE_SIZE_MB`)

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "file uploaded",
  "data": {
    "id": "uuid",
    "issueId": "uuid",
    "filename": "a1b2c3d4.png",
    "originalName": "screenshot.png",
    "mimeType": "image/png",
    "sizeBytes": 245760,
    "uploadedBy": "user-uuid",
    "createdAt": "2026-04-08T10:00:00Z"
  }
}
```

---

### GET `/api/issues/{issueKey}/attachments`

Liệt kê tệp đính kèm.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:** Mảng đối tượng attachment

---

### GET `/api/attachments/{attachmentID}`

Tải xuống tệp.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi:** Nội dung tệp nhị phân với header Content-Type phù hợp

---

### DELETE `/api/attachments/{attachmentID}`

Xóa tệp đính kèm (chỉ người tải lên hoặc admin).

**Xác thực:** Cần đăng nhập | **Vai trò:** người tải lên / admin

**Phản hồi 200:** `{ "status": 200, "message": "attachment deleted", "data": null }`

---

## 12. Nhật ký hoạt động

### GET `/api/issues/{issueKey}/activity`

Lịch sử thay đổi của công việc.

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": [
    {
      "id": "uuid",
      "issueId": "uuid",
      "user": { "id": "uuid", "name": "Nguyễn Văn A", "avatarUrl": "" },
      "action": "status_changed",
      "field": "status",
      "oldValue": "todo",
      "newValue": "in_progress",
      "createdAt": "2026-04-08T11:00:00Z"
    },
    {
      "id": "uuid",
      "issueId": "uuid",
      "user": { "id": "uuid", "name": "Nguyễn Văn A", "avatarUrl": "" },
      "action": "assigned",
      "field": "assignee",
      "oldValue": null,
      "newValue": "Trần Văn B",
      "createdAt": "2026-04-08T10:30:00Z"
    }
  ]
}
```

**Các loại hành động:**
- `created` -- công việc vừa được tạo
- `updated` -- một trường đã thay đổi
- `status_changed` -- chuyển trạng thái
- `assigned` -- gán/bỏ gán người dùng
- `commented` -- có bình luận mới

---

### GET `/api/projects/{projectID}/activity`

Luồng hoạt động toàn dự án (có phân trang).

**Xác thực:** Cần đăng nhập | **Vai trò:** viewer+

**Phản hồi 200:** Mảng đối tượng hoạt động có phân trang (cùng cấu trúc), kèm theo key công việc

---

## 13. Tìm kiếm

### GET `/api/search`

Tìm kiếm toàn hệ thống.

**Xác thực:** Cần đăng nhập

**Tham số truy vấn:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `q` | string | có | Từ khóa (tối thiểu 2 ký tự) |
| `type` | string | không | `issue`, `project`, `all` (mặc định) |
| `project` | string | không | Lọc theo UUID dự án |

**Phản hồi 200:**
```json
{
  "status": 200,
  "message": "success",
  "data": {
    "issues": [
      { "key": "PRJ-42", "title": "...", "status": "todo", "projectKey": "PRJ" }
    ],
    "projects": [
      { "id": "uuid", "name": "...", "key": "PRJ" }
    ]
  }
}
```

---

## 14. WebSocket

### GET `/api/ws?token=<jwt>`

Kết nối WebSocket cho cập nhật thời gian thực.

**Xác thực:** JWT qua tham số truy vấn `token`. Được xác thực trong quá trình nâng cấp HTTP trước khi chấp nhận kết nối.

**Luồng kết nối:**
1. Client: `new WebSocket("ws://localhost:8080/api/ws?token=eyJhb...")`
2. Server xác thực JWT trong quá trình nâng cấp
3. Nếu không hợp lệ -> từ chối với HTTP 401, đóng kết nối
4. Nếu hợp lệ -> chấp nhận, đăng ký client với userID

**Tin nhắn Client -> Server:**
```json
{"action": "subscribe", "projectId": "uuid"}
```
```json
{"action": "unsubscribe", "projectId": "uuid"}
```

**Sự kiện Server -> Client:**
```json
{"type": "issue_created",   "projectId": "uuid", "data": { "issue": {...} }}
{"type": "issue_updated",   "projectId": "uuid", "data": { "issue": {...} }}
{"type": "issue_deleted",   "projectId": "uuid", "data": { "issueKey": "PRJ-42" }}
{"type": "status_changed",  "projectId": "uuid", "data": { "issueKey": "PRJ-42", "oldStatus": "todo", "newStatus": "in_progress" }}
{"type": "comment_created", "projectId": "uuid", "data": { "issueKey": "PRJ-42", "comment": {...} }}
{"type": "member_added",    "projectId": "uuid", "data": { "member": {...} }}
{"type": "sprint_started",  "projectId": "uuid", "data": { "sprint": {...} }}
```

Người dùng chỉ nhận sự kiện từ các dự án đã đăng ký theo dõi VÀ là thành viên.
