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
5. httpClient return payload.data
6. AuthContext lưu token vào localStorage key it4409_token và set user
7. Navigate sang /home

Luồng signOut:

1. Xóa token trong localStorage
2. Clear auth state
3. Guard tự đẩy về /login

Mock login hiện có:

- email=admin, password=admin sẽ bypass API và set mock token/user.

## 6) HTTP Contract With Backend

httpClient behavior:

1. URL = VITE_API_BASE_URL + path
2. Headers mặc định: Accept + Content-Type JSON
3. Nếu có token thì attach Authorization: Bearer <token>
4. Parse JSON response
5. Nếu !ok: throw Error với message
6. Nếu ok: return payload.data

Implication:

- FE API layer phụ thuộc backend envelope có trường data.

## 7) i18n Flow

- Ngôn ngữ lưu trong localStorage key it4409_lang
- Initial language: vi (nếu không có saved language)
- Fallback language: en
- Khi đổi ngôn ngữ sẽ tự persist vào localStorage

## 8) Environment Contract (FE)

- VITE_API_BASE_URL

## 9) Coding Notes For Copilot (FE)

- Khi sửa auth UI, kiểm tra đồng bộ Login, AuthContext, authApi, httpClient và guard trong App.
- Khi BE đổi contract auth/response, cập nhật parser ở shared/api/httpClient trước để tránh vỡ toàn bộ feature.
- Với định hướng Jira-like workflow, nên giữ cấu trúc mở rộng theo feature module (issues, boards, sprints, members).