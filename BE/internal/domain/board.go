package domain

import "time"

// Board đại diện cho một bảng Kanban trong dự án.
// Mỗi dự án có thể có nhiều bảng, nhưng luôn có 1 bảng mặc định (is_default = true).
type Board struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"projectId"`
	Name      string    `json:"name"`
	IsDefault bool      `json:"isDefault"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// BoardPatch dùng cho việc cập nhật một phần thông tin bảng.
type BoardPatch struct {
	Name *string `json:"name"`
}

// BoardColumn đại diện cho một cột trên bảng (VD: To Do, In Progress, Done).
// Trường status_map liên kết cột này với trạng thái của Issue.
type BoardColumn struct {
	ID        string    `json:"id"`
	BoardID   string    `json:"boardId"`
	Name      string    `json:"name"`
	Position  int       `json:"position"`
	StatusMap string    `json:"statusMap"` // Liên kết với trạng thái issue: "todo", "in_progress", "in_review", "done"
	CreatedAt time.Time `json:"createdAt"`
}

// BoardColumnPatch dùng cho việc cập nhật một phần thông tin cột.
type BoardColumnPatch struct {
	Name      *string `json:"name"`
	StatusMap *string `json:"statusMap"`
}
