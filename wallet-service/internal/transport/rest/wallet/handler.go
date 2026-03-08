package wallet

import (
	"net/http"

	walletservice "github.com/bns/wallet-service/internal/service/wallet"
	"github.com/bns/pkg/middleware"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	walletService *walletservice.WalletService
	jwtSecret     string
}

func NewHandler(walletService *walletservice.WalletService, jwtSecret string) *Handler {
	return &Handler{
		walletService: walletService,
		jwtSecret:     jwtSecret,
	}
}

func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	wallets := router.Group("/wallets")
	wallets.Use(middleware.Auth(h.jwtSecret))
	{
		wallets.GET("/balance", h.getBalance)
		wallets.POST("/topup", h.topUp)
		wallets.GET("/transactions", h.getTransactions)
	}
}

func (h *Handler) getBalance(c *gin.Context) {
	userID := middleware.GetUserID(c)
	balance, err := h.walletService.GetBalance(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"balance": balance})
}

type topUpRequest struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
}

func (h *Handler) topUp(c *gin.Context) {
	var req topUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	err := h.walletService.TopUp(c.Request.Context(), userID, req.Amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) getTransactions(c *gin.Context) {
	userID := middleware.GetUserID(c)
	txs, err := h.walletService.GetTransactions(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, txs)
}
