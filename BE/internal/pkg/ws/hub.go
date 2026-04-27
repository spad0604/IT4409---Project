package ws

import (
	"log"
	"sync"
)

// Hub quản lý tất cả các WebSocket client đang kết nối.
type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]bool
}

func NewHub() *Hub {
	return &Hub{clients: make(map[*Client]bool)}
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	h.clients[c] = true
	h.mu.Unlock()
	log.Printf("[WS] client connected: %s", c.UserID)
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
	log.Printf("[WS] client disconnected: %s", c.UserID)
}

// Broadcast gửi message tới tất cả client đang kết nối.
func (h *Hub) Broadcast(msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		select {
		case c.Send <- msg:
		default:
			// Client quá tải, bỏ qua
		}
	}
}

// BroadcastToUser gửi message tới 1 user cụ thể.
func (h *Hub) BroadcastToUser(userID string, msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c.UserID == userID {
			select {
			case c.Send <- msg:
			default:
			}
		}
	}
}
