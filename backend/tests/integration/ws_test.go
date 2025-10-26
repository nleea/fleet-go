package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
)

func TestWebSocketConnection_ValidToken(t *testing.T) {
	token := extractTokenFromLogin(t)

	s := httptest.NewServer(testRouter)
	defer s.Close()

	u := url.URL{Scheme: "ws", Host: s.Listener.Addr().String(), Path: "/api/v1/ws"}
	header := http.Header{}
	header.Add("Authorization", "Bearer "+token)
	ws, resp, err := websocket.DefaultDialer.Dial(u.String(), header)
	if resp != nil {
		defer resp.Body.Close()
	}
	assert.NoError(t, err)
	assert.Equal(t, http.StatusSwitchingProtocols, resp.StatusCode)

	defer ws.Close()
}

// Sin token
func TestWebSocketConnection_NoToken(t *testing.T) {
	s := httptest.NewServer(testRouter)
	defer s.Close()
	u := url.URL{Scheme: "ws", Host: s.Listener.Addr().String(), Path: "/api/v1/ws"}
	_, resp, err := websocket.DefaultDialer.Dial(u.String(), nil)
	assert.Error(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

// Broadcast: conecta WS, manda lectura, y recibe evento
func TestWebSocket_BroadcastOnSensorData(t *testing.T) {
	token := extractTokenFromLogin(t)
	s := httptest.NewServer(testRouter)
	defer s.Close()

	u := url.URL{Scheme: "ws", Host: s.Listener.Addr().String(), Path: "/api/v1/ws"}
	header := http.Header{}
	header.Add("Authorization", "Bearer "+token)
	ws, _, err := websocket.DefaultDialer.Dial(u.String(), header)
	assert.NoError(t, err)
	defer ws.Close()

	// Lectura vía API
	payload := map[string]interface{}{
		"device_id":   1,
		"lat":         10.2,
		"lng":         -70.3,
		"speed":       45,
		"fuel_level":  60,
		"temperature": 30,
		"ts":          time.Now().Format(time.RFC3339),
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/api/v1/protected/sensors/data", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)
	assert.Equal(t, http.StatusAccepted, w.Code)

	// Mensaje WS
	ws.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := ws.ReadMessage()
	assert.NoError(t, err)
	assert.Contains(t, string(msg), "telemetry")
}
