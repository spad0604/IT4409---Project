# Lược đồ Cơ sở dữ liệu -- IT4409 Quản lý Dự án

**Hệ quản trị:** PostgreSQL (Supabase)
**Công cụ migration:** golang-migrate
**Quy ước đặt tên:** snake_case, tên bảng số nhiều

---

## Mục lục

- [Tổng quan](#tong-quan)
- [Sơ đồ quan hệ](#so-do-quan-he)
- [Các bảng](#cac-bang)
  - [users](#1-users)
  - [projects](#2-projects)
  - [project_members](#3-project_members)
  - [project_issue_counters](#4-project_issue_counters)
  - [issues](#5-issues)
  - [boards](#6-boards)
  - [board_columns](#7-board_columns)
  - [sprints](#8-sprints)
  - [comments](#9-comments)
  - [labels](#10-labels)
  - [issue_labels](#11-issue_labels)
  - [attachments](#12-attachments)
  - [activity_log](#13-activity_log)
- [Chỉ mục (Indexes)](#chi-muc)
- [Giá trị Enum và Ràng buộc](#gia-tri-enum-va-rang-buoc)
- [Quy ước Xóa mềm](#quy-uoc-xoa-mem)
- [Danh sách tệp Migration](#danh-sach-tep-migration)

---

## Tổng quan

| # | Bảng | Mô tả | Ước tính số dòng |
|---|------|-------|-------------------|
| 1 | `users` | Người dùng hệ thống | ~100 |
| 2 | `projects` | Dự án/không gian làm việc | ~20 |
| 3 | `project_members` | Thành viên dự án + vai trò | ~200 |
| 4 | `project_issue_counters` | Bộ đếm nguyên tử cho issue_number theo dự án | ~20 |
| 5 | `issues` | Công việc (task, bug, story, epic, subtask) | ~5000 |
| 6 | `boards` | Chế độ xem bảng (kanban/scrum) | ~50 |
| 7 | `board_columns` | Các cột trên bảng | ~200 |
| 8 | `sprints` | Sprint cho dự án scrum | ~100 |
| 9 | `comments` | Bình luận trên công việc | ~10000 |
| 10 | `labels` | Nhãn/thẻ theo dự án | ~100 |
| 11 | `issue_labels` | Quan hệ nhiều-nhiều giữa công việc và nhãn | ~5000 |
| 12 | `attachments` | Tệp đính kèm trên công việc | ~1000 |
| 13 | `activity_log` | Lịch sử thay đổi công việc | ~50000 |

---

## Sơ đồ quan hệ

```mermaid
erDiagram
    users {
        uuid id PK
        text email UK
        text password_hash
        text name
        text username UK
        text avatar_url
        text role
        timestamptz created_at
        timestamptz updated_at
    }

    projects {
        uuid id PK
        text name
        text key UK
        text description
        uuid lead_id FK
        text icon
        text type
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    project_members {
        uuid project_id PK-FK
        uuid user_id PK-FK
        text role
        timestamptz joined_at
    }

    project_issue_counters {
        uuid project_id PK-FK
        integer last_number
    }

    issues {
        uuid id PK
        uuid project_id FK
        integer issue_number
        text key UK
        text type
        text status
        text priority
        text title
        text description
        uuid assignee_id FK
        uuid reporter_id FK
        uuid parent_id FK
        uuid sprint_id FK
        float8 sort_order
        timestamptz due_date
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    boards {
        uuid id PK
        uuid project_id FK
        text name
        text type
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    board_columns {
        uuid id PK
        uuid board_id FK
        text name
        text status_map
        integer position
        integer wip_limit
    }

    sprints {
        uuid id PK
        uuid project_id FK
        text name
        text goal
        text status
        timestamptz start_date
        timestamptz end_date
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    comments {
        uuid id PK
        uuid issue_id FK
        uuid author_id FK
        text content
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    labels {
        uuid id PK
        uuid project_id FK
        text name
        text color
    }

    issue_labels {
        uuid issue_id PK-FK
        uuid label_id PK-FK
    }

    attachments {
        uuid id PK
        uuid issue_id FK
        text filename
        text original_name
        text mime_type
        bigint size_bytes
        uuid uploaded_by FK
        timestamptz created_at
    }

    activity_log {
        uuid id PK
        uuid issue_id FK
        uuid user_id FK
        text action
        text field
        text old_value
        text new_value
        timestamptz created_at
    }

    users ||--o{ project_members : "tham gia"
    projects ||--o{ project_members : "có thành viên"
    projects ||--|{ project_issue_counters : "đếm"
    projects ||--o{ issues : "chứa"
    projects ||--o{ boards : "có bảng"
    projects ||--o{ sprints : "lập kế hoạch"
    projects ||--o{ labels : "định nghĩa"
    users ||--o{ issues : "báo cáo"
    users ||--o{ issues : "được gán"
    issues ||--o{ comments : "có"
    issues ||--o{ attachments : "có"
    issues ||--o{ issue_labels : "được gắn nhãn"
    issues ||--o{ activity_log : "theo dõi"
    issues ||--o| issues : "cha-con"
    sprints ||--o{ issues : "chứa"
    labels ||--o{ issue_labels : "được sử dụng bởi"
    boards ||--o{ board_columns : "có"
```

---

## Các bảng

### 1. users

Người dùng hệ thống.

```sql
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  name          text,
  username      text,
  avatar_url    text not null default '',
  role          text not null default 'member'
                  check (role in ('admin', 'member')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index idx_users_username on public.users(username)
  where username is not null;
```

| Cột | Kiểu | Cho phép NULL | Mặc định | Mô tả |
|-----|------|---------------|----------|-------|
| `id` | uuid | Không | gen_random_uuid() | Khóa chính |
| `email` | text | Không | -- | Email đăng nhập, duy nhất |
| `password_hash` | text | Không | -- | Mã băm bcrypt |
| `name` | text | Có | -- | Tên hiển thị |
| `username` | text | Có | -- | Tên người dùng, duy nhất (tùy chọn) |
| `avatar_url` | text | Không | `''` | Đường dẫn ảnh đại diện |
| `role` | text | Không | `'member'` | Vai trò hệ thống: admin hoặc member |
| `created_at` | timestamptz | Không | now() | Thời điểm tạo |
| `updated_at` | timestamptz | Không | now() | Thời điểm cập nhật |

Lưu ý: `role` ở đây là **vai trò cấp hệ thống**, KHÔNG phải vai trò trong dự án. Admin hệ thống có thể quản lý nền tảng. Vai trò dự án nằm trong `project_members`.

---

### 2. projects

Dự án (không gian làm việc).

```sql
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  key         text not null unique,
  description text not null default '',
  lead_id     uuid references public.users(id),
  icon        text not null default '',
  type        text not null default 'kanban'
                check (type in ('kanban', 'scrum')),
  created_by  uuid not null references public.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
```

| Cột | Kiểu | Cho phép NULL | Mô tả |
|-----|------|---------------|-------|
| `id` | uuid | Không | Khóa chính |
| `name` | text | Không | Tên dự án |
| `key` | text | Không | Khóa ngắn (VD: "PRJ"), dùng làm tiền tố cho key công việc. Duy nhất. |
| `description` | text | Không | Mô tả dự án |
| `lead_id` | uuid | Có | FK -> users. Trưởng dự án |
| `icon` | text | Không | Chuỗi ngắn hoặc rỗng |
| `type` | text | Không | `kanban` hoặc `scrum` |
| `created_by` | uuid | Không | FK -> users. Người tạo |
| `created_at` | timestamptz | Không | Thời điểm tạo |
| `updated_at` | timestamptz | Không | Thời điểm cập nhật |
| `deleted_at` | timestamptz | Có | Thời điểm xóa mềm |

---

### 3. project_members

Thành viên dự án và vai trò.

```sql
create table public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  role        text not null default 'member'
                check (role in ('admin', 'member', 'viewer')),
  joined_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
```

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `project_id` | uuid | FK -> projects. Khóa chính ghép |
| `user_id` | uuid | FK -> users. Khóa chính ghép |
| `role` | text | `admin` / `member` / `viewer` |
| `joined_at` | timestamptz | Thời điểm tham gia |

**Quyền hạn theo vai trò:**

| Quyền | viewer | member | admin |
|-------|--------|--------|-------|
| Xem công việc, bảng, bình luận | có | có | có |
| Tạo/sửa công việc | không | có | có |
| Xóa công việc của mình | không | có | có |
| Xóa bất kỳ công việc nào | không | không | có |
| Tạo/sửa bình luận | không | có | có |
| Xóa bất kỳ bình luận nào | không | không | có |
| Quản lý nhãn | không | tạo/sửa | toàn quyền |
| Quản lý thành viên | không | không | có |
| Sửa/xóa dự án | không | không | có |
| Quản lý bảng/cột | không | không | có |
| Quản lý sprint | không | không | có |

---

### 4. project_issue_counters

Bộ đếm nguyên tử cho issue_number theo dự án. Ngăn chặn tình trạng race condition.

```sql
create table public.project_issue_counters (
  project_id  uuid primary key references public.projects(id) on delete cascade,
  last_number integer not null default 0
);
```

**Cách sử dụng trong Go (bên trong giao dịch):**
```sql
UPDATE project_issue_counters
SET last_number = last_number + 1
WHERE project_id = $1
RETURNING last_number;
```

Mỗi dự án một dòng. Được chèn khi tạo dự án. Cập nhật nguyên tử khi tạo công việc.

---

### 5. issues

Công việc / task / bug / story / epic -- thực thể chính.

```sql
create table public.issues (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  issue_number integer not null,
  key          text not null,
  type         text not null default 'task'
                 check (type in ('epic', 'story', 'task', 'bug', 'subtask')),
  status       text not null default 'todo'
                 check (status in ('todo', 'in_progress', 'in_review', 'done', 'cancelled')),
  priority     text not null default 'medium'
                 check (priority in ('critical', 'high', 'medium', 'low', 'trivial')),
  title        text not null,
  description  text not null default '',
  assignee_id  uuid references public.users(id),
  reporter_id  uuid not null references public.users(id),
  parent_id    uuid references public.issues(id),
  sprint_id    uuid,
  sort_order   double precision not null default 0,
  due_date     timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint uq_issue_project_number unique (project_id, issue_number)
);
```

| Cột | Kiểu | Cho phép NULL | Mô tả |
|-----|------|---------------|-------|
| `id` | uuid | Không | Khóa chính |
| `project_id` | uuid | Không | FK -> projects |
| `issue_number` | integer | Không | Tự tăng theo dự án (1, 2, 3...) |
| `key` | text | Không | `project.key + "-" + issue_number`, VD: "PRJ-42" |
| `type` | text | Không | Loại công việc (xem Enum) |
| `status` | text | Không | Trạng thái quy trình (xem Enum) |
| `priority` | text | Không | Mức độ ưu tiên (xem Enum) |
| `title` | text | Không | Tiêu đề |
| `description` | text | Không | Mô tả chi tiết (hỗ trợ markdown) |
| `assignee_id` | uuid | Có | FK -> users. Người được gán |
| `reporter_id` | uuid | Không | FK -> users. Người tạo |
| `parent_id` | uuid | Có | FK -> issues. Công việc cha (epic->story, task->subtask) |
| `sprint_id` | uuid | Có | FK -> sprints (thêm ở migration 006). NULL = backlog |
| `sort_order` | float8 | Không | Vị trí sắp xếp trong cột/backlog |
| `due_date` | timestamptz | Có | Hạn chót |
| `created_at` | timestamptz | Không | Thời điểm tạo |
| `updated_at` | timestamptz | Không | Thời điểm cập nhật |
| `deleted_at` | timestamptz | Có | Thời điểm xóa mềm |

**Phân cấp cha-con:**
```
Epic
  -> Story / Task
       -> Subtask
```

**Chiến lược sắp xếp:** Dùng float64 để chèn giữa hai mục:
- Mục A: sort_order = 1.0
- Mục B: sort_order = 2.0
- Chèn giữa: sort_order = 1.5

---

### 6. boards

Chế độ xem bảng = cách hiển thị công việc (Kanban/Scrum).

```sql
create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  type        text not null default 'kanban'
                check (type in ('kanban', 'scrum')),
  created_by  uuid not null references public.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

Mỗi dự án tự động tạo 1 bảng mặc định khi khởi tạo.

---

### 7. board_columns

Các cột trên bảng, ánh xạ tới giá trị trạng thái công việc.

```sql
create table public.board_columns (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  name        text not null,
  status_map  text not null,
  position    integer not null default 0,
  wip_limit   integer
);
```

| Cột | Kiểu | Cho phép NULL | Mô tả |
|-----|------|---------------|-------|
| `id` | uuid | Không | Khóa chính |
| `board_id` | uuid | Không | FK -> boards |
| `name` | text | Không | Tên hiển thị (VD: "To Do", "In Progress") |
| `status_map` | text | Không | Ánh xạ tới giá trị trạng thái (VD: "todo", "in_progress") |
| `position` | integer | Không | Thứ tự hiển thị (0, 1, 2...) |
| `wip_limit` | integer | Có | Giới hạn công việc đang thực hiện. NULL = không giới hạn |

**Các cột mặc định khi tạo dự án:**

| position | name | status_map |
|----------|------|-----------|
| 0 | To Do | `todo` |
| 1 | In Progress | `in_progress` |
| 2 | In Review | `in_review` |
| 3 | Done | `done` |

**Logic:** Kéo công việc từ cột A sang cột B = cập nhật `issues.status` thành `board_columns.status_map` của cột đích.

---

### 8. sprints

Sprint cho các dự án Scrum.

```sql
create table public.sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  goal        text not null default '',
  status      text not null default 'planning'
                check (status in ('planning', 'active', 'completed')),
  start_date  timestamptz,
  end_date    timestamptz,
  created_by  uuid not null references public.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- FK từ issues.sprint_id -> sprints.id
alter table public.issues
  add constraint fk_issues_sprint
  foreign key (sprint_id) references public.sprints(id) on delete set null;
```

**Ràng buộc:** Mỗi dự án chỉ có tối đa 1 sprint ở trạng thái `active` tại bất kỳ thời điểm nào. Được kiểm soát ở tầng ứng dụng.

---

### 9. comments

Bình luận trên công việc.

```sql
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  issue_id   uuid not null references public.issues(id) on delete cascade,
  author_id  uuid not null references public.users(id),
  content    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

---

### 10. labels

Nhãn/thẻ theo dự án.

```sql
create table public.labels (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name       text not null,
  color      text not null default '#6366f1',
  constraint uq_label_name unique (project_id, name)
);
```

**Ràng buộc duy nhất:** Trong cùng một dự án, tên nhãn không được trùng.

**Bảng màu gợi ý:**

| Tên | Mã Hex |
|-----|--------|
| Indigo | `#6366f1` |
| Rose | `#f43f5e` |
| Amber | `#f59e0b` |
| Emerald | `#10b981` |
| Sky | `#0ea5e9` |
| Purple | `#a855f7` |
| Orange | `#f97316` |
| Teal | `#14b8a6` |

---

### 11. issue_labels

Quan hệ nhiều-nhiều: công việc va nhãn.

```sql
create table public.issue_labels (
  issue_id uuid not null references public.issues(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (issue_id, label_id)
);
```

---

### 12. attachments

Tệp đính kèm trên công việc.

```sql
create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  issue_id      uuid not null references public.issues(id) on delete cascade,
  filename      text not null,
  original_name text not null,
  mime_type     text not null default 'application/octet-stream',
  size_bytes    bigint not null default 0,
  uploaded_by   uuid not null references public.users(id),
  created_at    timestamptz not null default now()
);
```

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `filename` | text | Tên tệp lưu trên ổ đĩa (dựa trên UUID, VD: `a1b2c3d4.png`) |
| `original_name` | text | Tên tệp gốc người dùng tải lên (VD: `screenshot.png`) |
| `mime_type` | text | Loại MIME |
| `size_bytes` | bigint | Kích thước tệp (byte) |

---

### 13. activity_log

Lịch sử thay đổi công việc (nhật ký kiểm toán).

```sql
create table public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  issue_id   uuid not null references public.issues(id) on delete cascade,
  user_id    uuid not null references public.users(id),
  action     text not null,
  field      text,
  old_value  text,
  new_value  text,
  created_at timestamptz not null default now()
);
```

| Cột | Kiểu | Cho phép NULL | Mô tả |
|-----|------|---------------|-------|
| `action` | text | Không | `created`, `updated`, `status_changed`, `assigned`, `commented` |
| `field` | text | Có | Trường thay đổi: `status`, `priority`, `assignee`, `title`... |
| `old_value` | text | Có | Giá trị cũ (chuỗi hóa) |
| `new_value` | text | Có | Giá trị mới |

**Ví dụ các bản ghi:**

| action | field | old_value | new_value |
|--------|-------|-----------|-----------|
| `created` | NULL | NULL | NULL |
| `status_changed` | `status` | `todo` | `in_progress` |
| `assigned` | `assignee` | NULL | `Nguyễn Văn A` |
| `updated` | `priority` | `medium` | `critical` |
| `updated` | `title` | `Tiêu đề cũ` | `Tiêu đề mới` |
| `commented` | NULL | NULL | `Nội dung bình luận xem trước...` |

---

## Chỉ mục

```sql
-- users
create unique index idx_users_username on public.users(username) where username is not null;

-- projects
create index idx_projects_key on public.projects(key);

-- project_members
create index idx_project_members_user on public.project_members(user_id);

-- issues (chỉ mục bộ phận loại trừ các dòng đã xóa)
create index idx_issues_project on public.issues(project_id) where deleted_at is null;
create index idx_issues_assignee on public.issues(assignee_id);
create index idx_issues_parent on public.issues(parent_id);
create index idx_issues_status on public.issues(status);
create index idx_issues_key on public.issues(key);
create index idx_issues_sprint on public.issues(sprint_id);

-- boards
create index idx_boards_project on public.boards(project_id);

-- board_columns
create index idx_board_columns_board on public.board_columns(board_id);

-- sprints
create index idx_sprints_project on public.sprints(project_id);
create index idx_sprints_status on public.sprints(status);

-- comments
create index idx_comments_issue on public.comments(issue_id);

-- labels
create index idx_labels_project on public.labels(project_id);

-- attachments
create index idx_attachments_issue on public.attachments(issue_id);

-- activity_log
create index idx_activity_issue on public.activity_log(issue_id);
create index idx_activity_created on public.activity_log(created_at);
```

---

## Giá trị Enum và Ràng buộc

### Loại công việc (Issue Types)

| Giá trị | Mô tả |
|---------|-------|
| `epic` | Nhóm lớn các story/task |
| `story` | Câu chuyện người dùng (User story) |
| `task` | Công việc thông thường |
| `bug` | Lỗi/khiếm khuyết |
| `subtask` | Công việc con (con của task/story) |

### Trạng thái công việc (Quy trình làm việc)

```
todo -> in_progress -> in_review -> done
                                     |
                                 cancelled
```

| Giá trị | Mô tả | Cột bảng mặc định |
|---------|-------|-------------------|
| `todo` | Chưa bắt đầu | To Do |
| `in_progress` | Đang thực hiện | In Progress |
| `in_review` | Đang đánh giá/kiểm thử | In Review |
| `done` | Hoàn thành | Done |
| `cancelled` | Đã hủy | (ẩn) |

### Mức độ ưu tiên (Priorities)

| Giá trị | Mô tả |
|---------|-------|
| `critical` | Cực kỳ nghiêm trọng |
| `high` | Quan trọng |
| `medium` | Bình thường |
| `low` | Ít quan trọng |
| `trivial` | Không quan trọng |

### Loại dự án

| Giá trị | Mô tả |
|---------|-------|
| `kanban` | Dựa trên bảng, không có sprint |
| `scrum` | Dựa trên sprint, có backlog |

### Trạng thái Sprint

| Giá trị | Mô tả |
|---------|-------|
| `planning` | Đang lên kế hoạch |
| `active` | Đang chạy (tối đa 1 mỗi dự án) |
| `completed` | Đã kết thúc |

### Vai trò thành viên dự án

| Giá trị | Mô tả |
|---------|-------|
| `admin` | Toàn quyền |
| `member` | CRUD công việc/bình luận |
| `viewer` | Chỉ xem |

---

## Quy ước Xóa mềm

Các bảng hỗ trợ xóa mềm: `projects`, `issues`, `comments`

**Quy ước:**
- `deleted_at IS NULL` -> bản ghi đang hoạt động
- `deleted_at IS NOT NULL` -> bản ghi đã xóa
- Mọi truy vấn mặc định đều thêm `WHERE deleted_at IS NULL`
- Khôi phục: `UPDATE ... SET deleted_at = NULL`
- Xóa vĩnh viễn: không triển khai (bảo toàn dữ liệu)

**Quy tắc cascade:**
- Xóa dự án -> công việc, bảng, sprint, nhãn cascade (xóa cứng vì dự án dùng xóa mềm)
- Xóa công việc -> bình luận, tệp đính kèm, nhật ký hoạt động, nhãn gắn cascade
- Xóa bảng -> các cột cascade
- Xóa sprint -> issues.sprint_id SET NULL

---

## Danh sách tệp Migration

Migration dùng định dạng golang-migrate (cặp `.up.sql` / `.down.sql`). Phải thực thi theo thứ tự.

| # | Tệp | Các bảng | Phụ thuộc |
|---|------|----------|-----------|
| 001 | `001_init` | `users` | không có |
| 002 | `002_user_extend` | thay đổi `users` | 001 |
| 003 | `003_projects` | `projects`, `project_members`, `project_issue_counters` | 001 |
| 004 | `004_issues` | `issues` | 003 (sprint_id chưa có FK) |
| 005 | `005_boards` | `boards`, `board_columns` | 003 |
| 006 | `006_sprints` | `sprints`, thay đổi `issues` thêm FK sprint | 003, 004 |
| 007 | `007_comments` | `comments` | 004 |
| 008 | `008_labels` | `labels`, `issue_labels` | 003, 004 |
| 009 | `009_attachments` | `attachments` | 004 |
| 010 | `010_activity_log` | `activity_log` | 004 |
