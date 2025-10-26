package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/nleea/fleet-monitoring/backend/internal/utils"
)


func JWTAuth(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenStr string

		// Intentar leer desde header Authorization
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// Si no hay header, intentar leer desde query param (?token=...)
		if tokenStr == "" {
			tokenStr = c.Query("token")
		}

		// Si sigue vacío, rechazar
		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token faltante"})
			return
		}

		// Validar el token con tu función utilitaria
		payload, err := utils.VerifyJWT(tokenStr, secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		// Guardar datos útiles en el contexto
		c.Set("userID", payload.Sub)
		c.Set("role", payload.Role)

		c.Next()
	}
}

