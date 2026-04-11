package domain

import (
    "time"
)

type Project struct {
    ID          string     `json:"id"`
    Name        string     `json:"name"`
    Key         string     `json:"key"`
    Description string     `json:"description"`
    LeadID      *string    `json:"leadId"`
    Icon        string     `json:"icon"`
    Type        string     `json:"type"` // "kanban" hoặc "scrum"
    CreatedBy   string     `json:"createdBy"`
    CreatedAt   time.Time  `json:"createdAt"`
    UpdatedAt   time.Time  `json:"updatedAt"`
    DeletedAt   *time.Time `json:"deletedAt,omitempty"`
}

type ProjectPatch struct {
    Name        *string `json:"name"`
    Key         *string `json:"key"`
    Description *string `json:"description"`
    LeadID      *string `json:"leadId"`
    Icon        *string `json:"icon"`
}

type ProjectMember struct {
    ProjectID string    `json:"projectId"`
    UserID    string    `json:"userId"`
    Role      string    `json:"role"` // Các vai trò: "admin", "member", "viewer"
    JoinedAt  time.Time `json:"joinedAt"`
}
