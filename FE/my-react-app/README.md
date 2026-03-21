# FE (React + Vite) — Base Clean Architecture

## 1) Chạy dự án

```bash
cd FE/my-react-app
npm install
npm run dev
```

Mặc định Vite chạy ở `http://localhost:5173`.

## 2) Cấu hình gọi BE

Tạo file `.env` (hoặc set biến môi trường) với prefix `VITE_`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Xem mẫu: `.env.example`.

## 3) Chuẩn response BE và cách FE parse

BE trả về envelope:

```json
{
	"status": 200,
	"message": "success",
	"data": {}
}
```

FE chỉ lấy `data` để dùng trong UI. Nếu HTTP status không OK thì throw Error với `message`.

HTTP client nằm ở:
- `src/shared/api/httpClient.js`

## 4) Kiến trúc (gợi ý Clean Architecture) trong FE

Mục tiêu: tách phần **app wiring** / **shared** / **features** để dễ mở rộng theo module.

### Thư mục chính

- `src/app/`
	- wiring cấp app (providers, router ở tương lai...)

- `src/shared/`
	- code dùng chung: config env, http client, localStorage...

- `src/features/`
	- mỗi feature là 1 module độc lập (VD: `auth`)

### Auth feature

- API calls: `src/features/auth/api/authApi.js`
- State + actions: `src/features/auth/model/AuthContext.jsx`

Provider đã được gắn ở entrypoint:
- `src/app/providers/AppProviders.jsx`
- `src/main.jsx`

## 5) Dùng Auth trong component

Ví dụ:

```jsx
import { useAuth } from './features/auth/model/AuthContext'

export function Demo() {
	const { user, signIn, signOut } = useAuth()

	return (
		<div>
			<pre>{JSON.stringify(user, null, 2)}</pre>
			<button onClick={() => signIn({ email: 'a@b.com', password: '123456' })}>
				Login
			</button>
			<button onClick={signOut}>Logout</button>
		</div>
	)
}
```

## 6) Lưu token

Token được lưu trong `localStorage` qua:
- `src/shared/storage/token.js`

HTTP client tự động attach header:
- `Authorization: Bearer <token>`
