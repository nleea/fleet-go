package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSensorIngest_Valid(t *testing.T) {
	token := extractTokenFromLogin(t)
	payload := map[string]interface{}{
		"device_id":   1,
		"lat":         11.24,
		"lng":         -74.12,
		"speed":       42.5,
		"fuel_level":  70.0,
		"temperature": 25.0,
		"ts":          "2025-10-26T15:00:00Z",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/api/v1/protected/sensors/data", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)
	assert.Equal(t, http.StatusAccepted, w.Code)
	assert.Contains(t, w.Body.String(), "data received")
}

// Campos faltantes
func TestSensorIngest_MissingField(t *testing.T) {
	token := extractTokenFromLogin(t)
	payload := map[string]interface{}{"lat": 11.24}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/api/v1/protected/sensors/data", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "JSON inválido")
}

// Sin token
func TestSensorIngest_NoToken(t *testing.T) {
	req, _ := http.NewRequest("POST", "/api/v1/protected/sensors/data", bytes.NewBufferString("{}"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// Token inválido
func TestSensorIngest_InvalidToken(t *testing.T) {
	req, _ := http.NewRequest("POST", "/api/v1/protected/sensors/data", bytes.NewBufferString("{}"))
	req.Header.Set("Authorization", "Bearer INVALIDTOKEN")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
