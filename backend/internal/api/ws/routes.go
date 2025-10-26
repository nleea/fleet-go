package ws

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/nleea/fleet-monitoring/backend/internal/appcore"
	"github.com/nleea/fleet-monitoring/backend/internal/middleware"
	appws "github.com/nleea/fleet-monitoring/backend/internal/ws"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func RegisterRoutes(rg *gin.RouterGroup, app *appcore.App, hub *appws.Hub) {
	group := rg.Group("/ws")
	group.Use(middleware.JWTAuth([]byte(app.Config.JWTSecret)))

	group.GET("", func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		role := c.GetString("role")
		client := appws.NewClient(conn, hub, role)
		hub.Register(client)

		go client.WritePump()
		go client.ReadPump()
	})
}
