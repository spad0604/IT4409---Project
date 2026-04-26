package domain

import "time"

// Comment đại diện cho bình luận trên một công việc (issue).
// Cột DB: user_id (theo migration 007_comments thực tế).
type Comment struct {
	ID        string    `json:"id"`
	IssueID   string    `json:"issueId"`
	UserID    string    `json:"userId"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
