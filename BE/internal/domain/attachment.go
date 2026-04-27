package domain

import "time"

type Attachment struct {
	ID          string    `json:"id"`
	IssueID     string    `json:"issueId"`
	UploadedBy  string    `json:"uploadedBy"`
	Filename    string    `json:"filename"`
	FileSize    int64     `json:"fileSize"`
	MimeType    string    `json:"mimeType"`
	StoragePath string    `json:"storagePath"`
	CreatedAt   time.Time `json:"createdAt"`
}
