package usecase

type EventPublisher interface {
	Publish(eventType string, data any)
}
