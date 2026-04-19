package domain

import "time"

// Label đại diện cho một nhãn dán dùng để phân loại công việc trong dự án.
// Mỗi dự án có bộ nhãn riêng (VD: "Bug", "Feature", "Urgent").
type Label struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"projectId"`
	Name      string    `json:"name"`
	Color     string    `json:"color"` // Mã màu HEX (VD: "#6366f1")
	CreatedAt time.Time `json:"createdAt"`
}

// LabelPatch dùng cho việc cập nhật một phần thông tin nhãn.
type LabelPatch struct {
	Name  *string `json:"name"`
	Color *string `json:"color"`
}
