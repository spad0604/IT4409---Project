package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
	maxMsgSize = 4096
)

// Client đại diện cho 1 kết nối WebSocket.
type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID string

	watchMu       sync.RWMutex
	watchedIssues map[string]struct{}
}

func (c *Client) WatchIssue(issueID string) {
	if issueID == "" {
		return
	}
	c.watchMu.Lock()
	if c.watchedIssues == nil {
		c.watchedIssues = make(map[string]struct{})
	}
	c.watchedIssues[issueID] = struct{}{}
	c.watchMu.Unlock()
}

func (c *Client) UnwatchIssue(issueID string) {
	c.watchMu.Lock()
	delete(c.watchedIssues, issueID)
	c.watchMu.Unlock()
}

func (c *Client) IsWatchingIssue(issueID string) bool {
	c.watchMu.RLock()
	_, ok := c.watchedIssues[issueID]
	c.watchMu.RUnlock()
	return ok
}

type clientMessage struct {
	Type string `json:"type"`
	Data struct {
		IssueID string `json:"issueId"`
	} `json:"data"`
}

// ReadPump đọc message từ client (chủ yếu xử lý ping/pong).
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister(c)
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMsgSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[WS] read error: %v", err)
			}
			break
		}
		var payload clientMessage
		if err := json.Unmarshal(message, &payload); err != nil {
			continue
		}
		switch payload.Type {
		case "watch_issue":
			c.WatchIssue(payload.Data.IssueID)
		case "unwatch_issue":
			c.UnwatchIssue(payload.Data.IssueID)
		}
	}
}

// WritePump gửi message từ Hub tới client qua WebSocket.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
