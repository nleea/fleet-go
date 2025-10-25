package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/nleea/fleet-monitoring/internal/utils"
)

func JWTAuth(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "header faltante"})
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		payload, err := utils.VerifyJWT(token, secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.Set("userID", payload.Sub)
		c.Set("role", payload.Role)
		c.Next()
	}
}
