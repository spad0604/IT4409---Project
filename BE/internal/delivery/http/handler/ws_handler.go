package handler

import (
	"log"
	"net/http"

	"it4409/internal/pkg/jwtutil"
	"it4409/internal/pkg/ws"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true }, // Dev mode
}

type WSHandler struct {
	hub *ws.Hub
	jwt jwtutil.Service
}

func NewWSHandler(hub *ws.Hub, jwt jwtutil.Service) *WSHandler {
	return &WSHandler{hub: hub, jwt: jwt}
}

func (h *WSHandler) RegisterRoutes(r chi.Router) {
	r.Get("/ws", h.HandleWS)
}

// HandleWS upgrade HTTP → WebSocket, xác thực qua query param token.
func (h *WSHandler) HandleWS(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}

	claims, err := h.jwt.Parse(token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] upgrade error: %v", err)
		return
	}

	client := &ws.Client{
		Hub:    h.hub,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		UserID: claims.Subject,
	}

	h.hub.Register(client)

	go client.WritePump()
	go client.ReadPump()
}
