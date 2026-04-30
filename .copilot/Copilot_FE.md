# IT4409 Frontend Context For Copilot

## 1) Frontend Mission In Product

FE đang xây một web kiểu Jira để quản lý flow công việc:

- Đăng nhập và quản lý phiên người dùng
- Điều hướng vào workspace/project
- Hiển thị dashboard tiến độ và hoạt động
- Là nền cho các màn workflow như board, issue list, sprint flow ở các bước mở rộng

## 2) Tech Stack

- React 19
- Vite
- react-router-dom
- i18next + react-i18next
- Fetch wrapper tự xây trong shared/api/httpClient

## 3) Core Folder Responsibilities

- FE/my-react-app/src/main.jsx: bootstrap app + i18n + providers
- FE/my-react-app/src/App.jsx: route setup và route guards
- FE/my-react-app/src/app/providers/AppProviders.jsx: app-level providers
- FE/my-react-app/src/features/auth/api/authApi.js: gọi API auth
- FE/my-react-app/src/features/projects/api/projectApi.js: gọi API project/member
- FE/my-react-app/src/features/boards/api/boardApi.js: gọi API board/columns
- FE/my-react-app/src/features/issues/api/issueApi.js: gọi API issue + status/assign/subtasks
- FE/my-react-app/src/features/comments/api/commentApi.js: gọi API comments
- FE/my-react-app/src/features/labels/api/labelApi.js: gọi API labels + attach/detach
- FE/my-react-app/src/features/users/api/userApi.js: gọi API users/me + search users
- FE/my-react-app/src/features/attachments/api/attachmentApi.js: gọi API attachments (upload multipart + download blob)
- FE/my-react-app/src/features/search/api/searchApi.js: gọi API global search
- FE/my-react-app/src/features/system/api/healthApi.js: gọi API health
- FE/my-react-app/src/features/auth/model/AuthContext.jsx: auth state/actions
- FE/my-react-app/src/features/auth/pages/Login.jsx: login UI
- FE/my-react-app/src/shared/api/httpClient.js: fetch wrapper + error normalization
- FE/my-react-app/src/shared/ws/wsClient.js: connect WebSocket `/api/ws?token=...`
- FE/my-react-app/src/shared/storage/token.js: localStorage token
- FE/my-react-app/src/shared/config/env.js: đọc VITE_API_BASE_URL
- FE/my-react-app/src/shared/i18n: language resources + persistence

## 4) Routing And Guards (Current State)

Routes chính:

- /login: chỉ cho user chưa đăng nhập
- /home: chỉ cho user đã có token
- *: fallback điều hướng theo trạng thái token

Guard behavior:

- Có token: chặn vào /login, điều hướng /home
- Không token: chặn vào /home, điều hướng /login

UI navigation behavior trong /home:

- Top tabs + sidebar links đã có icon system đồng bộ theo react-icons/fi.
- Chọn `Overview` (tab `Dashboard`) => dashboard metrics + recent projects + assigned-to-me.
- Chọn `Board` (tab `Projects`) => Kanban board (load board detail + columns từ BE).
- Chọn tab `Backlog` => danh sách issue (ưu tiên cao lên trước) + dùng chung header search.
- Chọn tab `Team` => members list + invite (search user + add member).
- Các mục sidebar khác vẫn hiển thị placeholder panel (để mở rộng module sau).

## 5) Auth State Data Flow

AuthContext cung cấp:

- token
- user
- signIn
- signUp
- signOut
- serverSignOut
- refreshMe

Luồng signIn:

1. Login form submit
2. AuthContext.signIn gọi authApi.login
3. authApi.login gọi httpClient.post("/api/auth/login")
4. BE trả envelope
5. httpClient return payload.data (nếu envelope) hoặc payload raw (fallback)
6. AuthContext lưu token vào localStorage key it4409_token và set user
7. Navigate sang /home

Luồng signOut:

1. Xóa token trong localStorage
2. Clear auth state
3. Guard tự đẩy về /login

Luồng serverSignOut (UI đang dùng):

1. Gọi BE `POST /api/auth/logout` (best-effort)
2. Dù BE có lỗi vẫn xóa token + clear auth state
3. Guard tự đẩy về /login

Lưu ý hiện tại:

- Đã bỏ mock login `admin/admin`; FE luôn gọi BE thật.

## 6) HTTP Contract With Backend

httpClient behavior:

1. URL = VITE_API_BASE_URL + path
2. Headers mặc định: Accept + Content-Type JSON
3. Nếu có token thì attach Authorization: Bearer <token>
4. Parse JSON response (nếu có)
5. Nếu status=204 hoặc không có body: return null
6. Nếu !ok: throw Error với message normalize từ payload.message/payload.error
7. Nếu ok:
	- Envelope `{status,message,data}` => return `data`
	- Non-envelope JSON => return nguyên payload (fallback tương thích endpoint cũ)

Implication:

- FE ưu tiên backend envelope chuẩn, nhưng vẫn tương thích các endpoint BE chưa trả envelope.

## 7) API Coverage In FE

Nguồn đối chiếu: `BE/docs/swagger.yaml`.

Ghi chú trạng thái:

- ✅ Wired UI: đang được gọi ở runtime (chủ yếu trong `FE/my-react-app/src/App.jsx`).
- 🧩 Wrapper-only: đã có FE API module nhưng UI chưa dùng.
- ❌ Missing: swagger có nhưng FE chưa có wrapper (hoặc cần nâng cấp httpClient).

### Auth (`src/features/auth/api/authApi.js`)

- ✅ `POST /api/auth/register`
- ✅ `POST /api/auth/login`
- ✅ `POST /api/auth/logout`
- 🧩 `POST /api/auth/change-password`
- 🧩 `POST /api/auth/refresh`
- ✅ `GET /api/me` (router BE giữ để tương thích ngược; swagger chuẩn là `/api/users/me`).

### Users (`src/features/users/api/userApi.js`)

- 🧩 `GET /api/users/me`
- 🧩 `PATCH /api/users/me`
- ✅ `GET /api/users/{userID}` (load profile/email để show assignee/members)
- ✅ `GET /api/users?search=...` (invite/search)

### Projects/Members (`src/features/projects/api/projectApi.js`)

- ✅ `POST /api/projects`
- ✅ `GET /api/projects`
- 🧩 `GET /api/projects/{projectID}`
- 🧩 `PATCH /api/projects/{projectID}`
- 🧩 `DELETE /api/projects/{projectID}`
- ✅ `GET /api/projects/{projectID}/members`
- ✅ `POST /api/projects/{projectID}/members`
- ✅ `DELETE /api/projects/{projectID}/members/{userID}`
- 🧩 `PUT /api/projects/{projectID}/members/{userID}` (đổi role)

### Boards/Columns (`src/features/boards/api/boardApi.js`)

- ✅ `POST /api/projects/{projectID}/boards`
- ✅ `GET /api/projects/{projectID}/boards`
- ✅ `GET /api/boards/{boardID}`
- 🧩 `PATCH /api/boards/{boardID}`
- 🧩 `DELETE /api/boards/{boardID}`
- 🧩 `POST /api/boards/{boardID}/columns`
- 🧩 `PATCH /api/boards/{boardID}/columns/{columnID}`
- 🧩 `DELETE /api/boards/{boardID}/columns/{columnID}`
- 🧩 `PUT /api/boards/{boardID}/columns/reorder`

### Issues (`src/features/issues/api/issueApi.js`)

- ✅ `POST /api/projects/{projectID}/issues`
- ✅ `GET /api/projects/{projectID}/issues` (supports `search`, `page`, `per_page`, `assignee=me`...)
- 🧩 `GET /api/issues/{issueKey}`
- 🧩 `PATCH /api/issues/{issueKey}`
- 🧩 `DELETE /api/issues/{issueKey}`
- ✅ `PUT /api/issues/{issueKey}/status` (drag-drop status change; optimistic update + rollback)
- 🧩 `PUT /api/issues/{issueKey}/assign`
- 🧩 `GET /api/issues/{issueKey}/subtasks`

### Comments (`src/features/comments/api/commentApi.js`)

- 🧩 `POST /api/issues/{issueKey}/comments`
- 🧩 `GET /api/issues/{issueKey}/comments`
- 🧩 `PATCH /api/comments/{commentID}`
- 🧩 `DELETE /api/comments/{commentID}`

### Labels (`src/features/labels/api/labelApi.js`)

- 🧩 `POST /api/projects/{projectID}/labels`
- 🧩 `GET /api/projects/{projectID}/labels`
- 🧩 `PATCH /api/labels/{labelID}`
- 🧩 `DELETE /api/labels/{labelID}`
- 🧩 `POST /api/issues/{issueKey}/labels`
- 🧩 `DELETE /api/issues/{issueKey}/labels/{labelID}`

### Chưa cover theo swagger

- 🧩 Attachments: `/api/issues/{issueKey}/attachments`, `/api/attachments/{attachmentID}`
	- FE wrapper: `FE/my-react-app/src/features/attachments/api/attachmentApi.js` (upload dùng `FormData`, download trả về Blob).
- 🧩 Search: `GET /api/search`
	- FE wrapper: `FE/my-react-app/src/features/search/api/searchApi.js`.
- 🧩 WebSocket: `/api/ws`
	- FE wrapper: `FE/my-react-app/src/shared/ws/wsClient.js` (kết nối tối giản theo swagger: query `token`).
- 🧩 Health: `/api/health`
	- FE wrapper: `FE/my-react-app/src/features/system/api/healthApi.js`.

## 8) i18n Flow

- Ngôn ngữ lưu trong localStorage key it4409_lang
- Initial language: vi (nếu không có saved language)
- Fallback language: en
- Khi đổi ngôn ngữ sẽ tự persist vào localStorage

## 9) Create Issue Modal Workflow (Enhanced)

**Location**: `FE/my-react-app/src/App.jsx` (modal component + state management)

**Modal State Variables**:
- `showCreateIssue`: boolean toggle
- `createIssueLoading`: fetch loading state
- `createIssueError`: error message display
- `newIssueProjectId`: selected project (maps to active project)
- `newIssueType`: 'task' | 'bug' | 'story' | 'epic' | 'subtask' (default 'task')
- `newIssuePriority`: 'high' | 'medium' | 'low' (default 'medium')
- `newIssueTitle`: string (required)
- `newIssueDescription`: string (optional)
- `newIssueAssigneeId`: string (optional, selected member ID from `members[]`)
- `newIssueSprintId`: string (optional, selected sprint/column ID from `boardColumnsMeta[]`)
- `newIssueLabels`: array (optional, label IDs - future enhancement)
- `createIssueCreateAnother`: boolean (if true, keep modal open after create for quick multi-issue flow)

**Form Layout** (3-column grid in modal):
```
[Project dropdown] [Type dropdown] [Priority pills (H/M/L)]
[Assignee select] [Sprint select]
[Title full-width]
[Description textarea full-width]
[Create another checkbox]
[Cancel btn] [Create Issue btn]
```

**Validation**:
- Project selection: required, error = `t('issues.create.validationProject')`
- Title: required, error = `t('issues.create.validationTitle')`
- Assignee/Sprint/Labels: optional

**API Payload** (to `POST /api/projects/{id}/issues`):
```javascript
{
  title: string,
  type: string,
  priority: string,
  description: string,
  assignee_id?: string (if selected),
  sprint_id?: string (if selected),
  label_ids?: array (if any selected),
}
```

**Post-Create Behavior**:
- If `createIssueCreateAnother` **unchecked** (default):
  - Close modal
  - Reset all form fields (via `resetCreateIssueForm()`)
  - Refetch issues + assigned issues from BE
- If `createIssueCreateAnother` **checked**:
  - Keep modal open
  - Clear only content fields (title, description, assignee, sprint, labels)
  - Keep project, type, priority for next issue (UX optimization)
  - Refetch issues in background
  - Allow rapid creation of multiple related issues

**i18n Keys Added**:
- `issues.create.assignee` / `assigneePlaceholder`
- `issues.create.sprint` / `sprintPlaceholder`
- `issues.create.labels` / `labelsPlaceholder`
- `issues.create.createAnother`

**CSS Classes**:
- `.modal-grid`: 3-column layout (Project, Type, Priority in row 1; Assignee, Sprint in row 2)
- `.modal-span`: full-width fields (Title, Description)
- `.modal-textarea`: rich description input
- `.priority-pill`: visual button for High/Medium/Low selection
- `.inline-checkbox`: custom checkbox styling for "Create another"

**UI Button Location**:
- Topbar: "New project" button (FiPlus icon, calls `handleOpenCreateProject`)
- Topbar or Board header: "Create issue" button (calls `handleOpenCreateIssue`)

---

## 10) Board Drag-Drop Flow (UI)

Kanban board state nằm trong `FE/my-react-app/src/App.jsx` (UI-level state):

1. Project list load từ `GET /api/projects`, active project persist ở localStorage (`it4409_active_project_id`).
2. Boards list theo project: `GET /api/projects/{id}/boards`, chọn default/first board.
3. Board detail load: `GET /api/boards/{boardID}` => nhận `columns[]` có `statusMap` (`todo|in_progress|in_review|done`).
4. Issues list load: `GET /api/projects/{id}/issues?search=...` và được group theo `status` để render lên từng cột.
5. Drag-drop dùng HTML Drag & Drop; khi drop sẽ optimistic update issue status trong state.
6. Sau drop gọi `PUT /api/issues/{issueKey}/status` để lưu BE; nếu lỗi sẽ rollback status.
7. Progress tổng = (#issue status=done) / tổng issue; progress theo stage dùng map `todo=25, in_progress=55, in_review=80, done=100` (fallback 25 nếu statusMap lạ).

**Visual Feedback During Drag-Drop**:
- `.board-column.is-drop-target`: blue border + shadow when dragging over column
- `.board-card.is-dragging`: opacity 0.35 + scale 0.97 when card being dragged (ghost effect)
- `.board-card:hover`: translateY(-1px) + enhanced shadow on hover (grab cursor)
- Card cursor: `grab` on hover, `grabbing` while dragging

Kết quả:

- Có thể kéo card giữa các cột để mô phỏng flow sprint như Figma board.
- Completion % trên board cập nhật theo trạng thái card sau khi thả.

## 11) Sprint Management (NEW)

**Location**: `FE/my-react-app/src/App.jsx` + `features/sprints/api/sprintApi.js`

**Sprint States**:
- `sprints`: danh sách sprint của dự án
- `activeSprint`: sprint hiện tại đang chạy
- `showCreateSprint`: toggle modal tạo sprint
- `newSprintName`, `newSprintDescription`: form inputs
- `backlogIssues`: danh sách issue chưa gán sprint (GET /api/projects/{id}/backlog)

**Sprint Handlers**:
- `refetchSprints(projectId)` - GET /api/projects/{id}/sprints
- `refetchBacklog(projectId)` - GET /api/projects/{id}/backlog
- `handleOpenCreateSprint()` - show modal
- `handleCancelCreateSprint()` - close modal
- `handleSubmitCreateSprint()` - POST /api/projects/{id}/sprints + refetch
- `handleStartSprint(sprintId)` - POST /api/sprints/{id}/start + set activeSprint
- `handleCompleteSprint(sprintId)` - POST /api/sprints/{id}/complete + refetch backlog

**API Endpoints** (features/sprints/api/sprintApi.js):
- `createSprint(projectId, { name, description, startDate, endDate })`
- `listSprints(projectId, { page, perPage })`
- `getSprint(sprintId)`
- `updateSprint(sprintId, patch)`
- `startSprint(sprintId)`
- `completeSprint(sprintId)`
- `getBacklog(projectId, { page, perPage, search })`

**Sprint Modal UI**:
- Header: "Create Sprint" + "Plan and organize your work"
- Form: Name (required, full-width) + Description (textarea, optional)
- Actions: Cancel + Create Sprint buttons
- Styling: same `.modal`, `.modal-grid`, `.modal-body` as issue modal

**Sprint useEffect**:
- Auto-refetch sprints + backlog when activeProjectId changes

## 12) Activity Log (NEW)

**Location**: `FE/my-react-app/src/App.jsx` + `features/activity/api/activityApi.js`

**Activity States**:
- `activityLog`: danh sách hoạt động dự án
- `activityLoading`: fetch loading state
- `activityError`: error message

**Activity Handlers**:
- `refetchProjectActivity(projectId)` - GET /api/projects/{id}/activity + set activityLog

**API Endpoints** (features/activity/api/activityApi.js):
- `getIssueActivity(issueKey, { page, perPage })` - GET /api/issues/{key}/activity
- `getProjectActivity(projectId, { page, perPage })` - GET /api/projects/{id}/activity

**Activity useEffect**:
- Auto-refetch activity log when activeProjectId changes

**Activity Display**:
- Activity timeline component (future implementation)
- Show: who did what (created/updated/commented) when

**Note**: Activity log được tự động ghi trên BE khi issue thay đổi (best-effort, không fail operation).

## 13) WebSocket Real-time Integration (NEW)

**Location**: `FE/my-react-app/src/shared/ws/wsClient.js` + `App.jsx` useEffect

**WsClient Class** (Enhanced):
- `.connect(token?)` - connect to `/api/ws?token=...`
- `.disconnect()` - close connection + stop auto-reconnect
- `.on(event, callback)` - register event listener
- `.off(event, callback)` - unregister listener
- `.emit(event, data)` - internal method to trigger listeners
- `.send(type, data)` - send JSON message to server
- `.isConnected()` - check if WS is open

**Auto-reconnection**:
- Exponential backoff: starts at 1s, caps at 30s
- Auto-reconnect on disconnect (unless manually closed)
- Reset delay on successful connection

**Events**:
- `connected` - emitted when WS connection opens
- `disconnected` - emitted when WS connection closes
- `error` - emitted on WS error
- `issue_updated` - when issue changes (triggers refetchIssues)
- `comment_added` - when comment posted (triggers refetchProjectActivity)
- `sprint_started` - when sprint starts (triggers refetchSprints)
- `sprint_completed` - when sprint completes (triggers refetchSprints + refetchBacklog)

**WebSocket useEffect** (in App.jsx):
- Create WsClient instance on mount
- Register event listeners for issue/sprint/comment updates
- Call connect() to establish connection
- Auto-reconnect on disconnect + refetch affected data
- Cleanup: call disconnect() on unmount

**Usage in App.jsx**:
```javascript
wsClientRef.current = new WsClient()
wsClientRef.current.on('issue_updated', (data) => {
  refetchIssues(activeProjectId, { search: headerSearch })
})
wsClientRef.current.connect()
// ... later on unmount:
wsClientRef.current.disconnect()
```

**JSON Message Format** (BE -> FE):
```json
{
  "type": "issue_updated",
  "data": { "issueKey": "PROJ-1", "status": "done", ... }
}
```

## 14) i18n Keys Added (Sprint + Activity + WebSocket)

**Sprint Keys**:
- `sprints.create.title` - "Create Sprint" / "Tạo Sprint mới"
- `sprints.create.subtitle` - "Plan and organize your work" / "Lên kế hoạch và tổ chức công việc"
- `sprints.create.name` - "Sprint name" / "Tên sprint"
- `sprints.create.namePlaceholder` - e.g. "Sprint 1 - Q2 Planning"
- `sprints.create.description` - "Description" / "Mô tả"
- `sprints.create.descriptionPlaceholder` - Optional details
- `sprints.create.submit` - "Create Sprint" / "Tạo Sprint"
- `sprints.create.creating` - "Creating…" / "Đang tạo..."
- `sprints.create.validationName` - "Please enter a sprint name."
- `sprints.status.planning`, `.active`, `.completed`

**Activity Keys**:
- `activity.title` - "Activity" / "Hoạt động"
- `activity.empty` - "No activity yet" / "Chưa có hoạt động nào"
- `activity.updated`, `.created`, `.changed`, `.assigned`, `.commented`

## 15) Environment Contract (FE)

- VITE_API_BASE_URL

## 16) Coding Notes For Copilot (FE)

- Khi sửa auth UI, kiểm tra đồng bộ Login, AuthContext, authApi, httpClient và guard trong App.
- Khi BE đổi contract auth/response, cập nhật parser ở shared/api/httpClient trước để tránh vỡ toàn bộ feature.
- Với định hướng Jira-like workflow, nên giữ cấu trúc mở rộng theo feature module (issues, boards, sprints, members).
- Với board kéo-thả hiện tại, nếu ghép BE thật thì map thao tác drop sang API đổi trạng thái issue và có optimistic update + rollback khi lỗi.
- Các endpoint BE có thể trả envelope hoặc raw JSON (projects/boards/labels có thể raw); `httpClient` đã hỗ trợ cả 2.
- WebSocket connection auto-reconnects; nếu cần manual reconnect hãy gọi `wsClientRef.current.connect()`.
- Sprint modal UI tuân theo pattern như Issue modal (createPortal, modal-overlay, modal-body, etc.).
- Activity log fetches automatically; future implementation có thể thêm timeline visualization component.