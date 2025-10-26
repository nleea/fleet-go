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

		// 1️⃣ Intentar leer desde header Authorization
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// 2️⃣ Si no hay header, intentar leer desde query param (?token=...)
		if tokenStr == "" {
			tokenStr = c.Query("token")
		}

		// 3️⃣ Si sigue vacío, rechazar
		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token faltante"})
			return
		}

		// 4️⃣ Validar el token con tu función utilitaria
		payload, err := utils.VerifyJWT(tokenStr, secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		// 5️⃣ Guardar datos útiles en el contexto
		c.Set("userID", payload.Sub)
		c.Set("role", payload.Role)

		c.Next()
	}
}

