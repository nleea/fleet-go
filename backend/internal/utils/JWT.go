package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

type JWTHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

type JWTPayload struct {
	Sub   uint      `json:"sub"`
	Role  string    `json:"role"`
	Email string    `json:"email"`
	Exp   int64     `json:"exp"`
	Iat   time.Time `json:"iat"`
}

func SignJWT(secret []byte, payload JWTPayload) (string, error) {
	header := JWTHeader{Alg: "HS256", Typ: "JWT"}

	hJSON, _ := json.Marshal(header)
	pJSON, _ := json.Marshal(payload)

	hEnc := base64.RawURLEncoding.EncodeToString(hJSON)
	pEnc := base64.RawURLEncoding.EncodeToString(pJSON)
	unsigned := fmt.Sprintf("%s.%s", hEnc, pEnc)

	h := hmac.New(sha256.New, secret)
	h.Write([]byte(unsigned))
	sig := h.Sum(nil)

	sEnc := base64.RawURLEncoding.EncodeToString(sig)
	return fmt.Sprintf("%s.%s", unsigned, sEnc), nil
}

func VerifyJWT(token string, secret []byte) (*JWTPayload, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("token inválido")
	}

	unsigned := fmt.Sprintf("%s.%s", parts[0], parts[1])
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, errors.New("firma inválida")
	}

	h := hmac.New(sha256.New, secret)
	h.Write([]byte(unsigned))
	expected := h.Sum(nil)

	if !hmac.Equal(sig, expected) {
		return nil, errors.New("firma incorrecta")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, errors.New("payload inválido")
	}

	var payload JWTPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, errors.New("no se pudo parsear payload")
	}

	if time.Now().Unix() > payload.Exp {
		return nil, errors.New("token expirado")
	}

	return &payload, nil
}
