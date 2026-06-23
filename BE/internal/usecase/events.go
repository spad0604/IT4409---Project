package usecase

type EventPublisher interface {
	Publish(eventType string, data any)
}

// IssueEventPublisher is optional so non-WebSocket publishers used by tests
// can keep the simple EventPublisher contract. Implementations can deliver an
// issue event only to assignees and clients currently watching that issue.
type IssueEventPublisher interface {
	PublishIssue(eventType string, data any, issueID string, recipientUserIDs []string)
}
