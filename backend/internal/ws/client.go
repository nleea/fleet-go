package ws

import (
	"encoding/json"

	"github.com/gorilla/websocket"
)

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	role string
}

func NewClient(conn *websocket.Conn, hub *Hub, role string) *Client {
	return &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
		role: role,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	for {
		if _, _, err := c.conn.NextReader(); err != nil {
			break
		}
	}
}

func (c *Client) WritePump() {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}
}

func (h *Hub) Broadcast(channel string, data, meta map[string]any, roles ...string) {
	message := map[string]any{
		"channel": channel,
		"data":    data,
		"meta":    meta,
	}
	jsonMsg, _ := json.Marshal(message)

	for c := range h.clients {
		if len(roles) == 0 || contains(roles, c.role) {
			select {
			case c.send <- jsonMsg:
			default:
				close(c.send)
				delete(h.clients, c)
			}
		}
	}
}

func contains(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}