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
- FE/my-react-app/src/features/auth/model/AuthContext.jsx: auth state/actions
- FE/my-react-app/src/features/auth/pages/Login.jsx: login UI
- FE/my-react-app/src/shared/api/httpClient.js: fetch wrapper + error normalization
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

- Top tabs + sidebar links đã có icon system đồng bộ theo react-icons/fi (không còn placeholder icon).
- Chọn `Overview` => dashboard metrics/recent projects.
- Chọn `Board` (hoặc tab `Projects`) => mở Kanban board có kéo-thả.
- Các mục sidebar còn lại hiển thị placeholder panel (để mở rộng module sau).

## 5) Auth State Data Flow

AuthContext cung cấp:

- token
- user
- signIn
- signUp
- signOut
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

Auth APIs (đang dùng runtime chính):

- POST /api/auth/register
- POST /api/auth/login
- GET /api/me

Project APIs (đã ghép ở FE API layer, chờ BE mount vào cmd/api router):

- POST /api/projects
- GET /api/projects
- GET /api/projects/{id}
- PATCH /api/projects/{id}
- DELETE /api/projects/{id}
- GET /api/projects/{id}/members
- POST /api/projects/{id}/members
- DELETE /api/projects/{id}/members/{userID}
- PUT /api/projects/{id}/members/{userID}

## 8) i18n Flow

- Ngôn ngữ lưu trong localStorage key it4409_lang
- Initial language: vi (nếu không có saved language)
- Fallback language: en
- Khi đổi ngôn ngữ sẽ tự persist vào localStorage

## 9) Board Drag-Drop Flow (UI)

Kanban board state nằm trong `src/App.jsx` (UI-level state):

1. State `boardColumns` chứa lanes: `todo -> progress -> review -> done`.
2. Card được kéo bằng HTML Drag & Drop (`draggable`, `onDragStart`, `onDragEnd`).
3. Lane nhận thả qua `onDragOver` + `onDrop`.
4. Khi drop, card bị remove khỏi lane cũ và prepend vào lane mới.
5. Progress tổng được tính từ số card ở lane `done` / tổng card.
6. Mỗi card cũng có progress bar theo stage (`todo=25`, `progress=55`, `review=80`, `done=100`).

Kết quả:

- Có thể kéo card giữa các cột để mô phỏng flow sprint như Figma board.
- Completion % trên board cập nhật theo trạng thái card sau khi thả.

## 10) Environment Contract (FE)

- VITE_API_BASE_URL

## 11) Coding Notes For Copilot (FE)

- Khi sửa auth UI, kiểm tra đồng bộ Login, AuthContext, authApi, httpClient và guard trong App.
- Khi BE đổi contract auth/response, cập nhật parser ở shared/api/httpClient trước để tránh vỡ toàn bộ feature.
- Với định hướng Jira-like workflow, nên giữ cấu trúc mở rộng theo feature module (issues, boards, sprints, members).
- Với board kéo-thả hiện tại, nếu ghép BE thật thì map thao tác drop sang API đổi trạng thái issue và có optimistic update + rollback khi lỗi.