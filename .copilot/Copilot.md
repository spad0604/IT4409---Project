# IT4409 Copilot Context (Index)

## Product Context

Đây là dự án web quản lý công việc theo phong cách Jira:

- Quản lý project/workspace
- Quản lý luồng công việc (workflow flow) theo issue/task
- Quản lý member và phân quyền theo vai trò
- Theo dõi tiến độ, trạng thái và hoạt động của team

## Monorepo Structure

- BE: Go backend theo hướng Clean Architecture
- FE: React app (Vite) theo hướng app/shared/features

## Context Files

- Backend context chi tiết: .copilot/Copilot_BE.md
- Frontend context chi tiết: .copilot/Copilot_FE.md

## Quick Notes

- FE hiện đang tích hợp auth flow với route guard /login và /home.
- BE runtime chính hiện đang wiring auth APIs; project module đã có code nhưng chưa mount route ở entrypoint API.
- FE parse response theo envelope payload.data từ BE.
