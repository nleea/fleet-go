package user

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nleea/fleet-monitoring/backend/internal/appcore"
	"github.com/nleea/fleet-monitoring/backend/internal/domain"

	"github.com/nleea/fleet-monitoring/backend/internal/repository"
	"github.com/nleea/fleet-monitoring/backend/internal/utils"

	"github.com/nleea/fleet-monitoring/backend/internal/service"
)

type UserInput struct {
	Email        string `json:"email"`
	PasswordHash string `json:"password"`
}

func RegisterRoutes(rg *gin.RouterGroup, app *appcore.App) {
	group := rg.Group("/")

	userRepository := repository.NewUserRepository(app.DB)
	userService := service.NewUserService(userRepository)

	group.POST("/data", func(c *gin.Context) {
		var userinput UserInput
		if err := c.ShouldBindJSON(&userinput); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
			return
		}

		hashPass, errpass := utils.HashPassword(userinput.PasswordHash)

		if errpass != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errpass.Error()})
			return
		}

		err:= userService.Create(&domain.User{
			Email:        userinput.Email,
			PasswordHash: hashPass,
		})
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{"status": "data received"})

	})

}
