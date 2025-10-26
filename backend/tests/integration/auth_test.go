package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/nleea/fleet-monitoring/backend/internal/utils"
)

func extractTokenFromLogin(t *testing.T) string {
	body := []byte(`{"email":"admin@example.com","password":"admin123"}`)
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)
	var resp struct{ Token string `json:"token"` }
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NotEmpty(t, resp.Token)
	return resp.Token
}

// Login exitoso: debe devolver 200 y un token
func TestAuthLogin_Success(t *testing.T) {
	body := []byte(`{"email":"admin@example.com","password":"admin123"}`)

	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "token")

	var resp map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NotEmpty(t, resp["token"])
}

// Login fallido: contraseña incorrecta
func TestAuthLogin_InvalidCredentials(t *testing.T) {
	body := []byte(`{"email":"admin@example.com","password":"wrongpass"}`)
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "credenciales inválidas")
}

// Token válido accediendo a /protected/me
func TestProtectedRoute_ValidToken(t *testing.T) {
	token := extractTokenFromLogin(t)
	req, _ := http.NewRequest("GET", "/api/v1/protected/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"role"`)
}

// Token expirado
func TestProtectedRoute_ExpiredToken(t *testing.T) {

	payload := utils.JWTPayload{
		Sub:   1,
		Role:  string("admin"),
		Email: "admin@example.com",
		Iat:   time.Now(),
		Exp:   time.Now().Add(-time.Minute).Unix(),
	}

	token, _ := utils.SignJWT([]byte("super-secret"), payload)
	

	req, _ := http.NewRequest("GET", "/api/v1/protected/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
