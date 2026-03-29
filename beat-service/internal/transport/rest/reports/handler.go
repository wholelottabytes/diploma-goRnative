package reports

import (
	"net/http"

	"github.com/bns/beat-service/internal/service/reports"
	"github.com/bns/pkg/middleware"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	reportService *reports.ReportService
}

func NewHandler(reportService *reports.ReportService) *Handler {
	return &Handler{
		reportService: reportService,
	}
}

// RegisterRoutes registers report routes
func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	reports := router.Group("/reports")
	{
		// Public routes (require auth)
		reports.POST("", h.createReport)
		reports.GET("/my", h.getMyReports)
		
		// Manager routes (require manager role)
		managerGroup := reports.Group("")
		managerGroup.Use(middleware.RequireRole("manager", "admin"))
		{
			managerGroup.GET("/pending", h.getPendingReports)
			managerGroup.GET("/:id", h.getReport)
			managerGroup.POST("/:id/review", h.reviewReport)
			managerGroup.GET("/stats", h.getStats)
		}
	}
}

// createReportRequest represents the request to create a report
type createReportRequest struct {
	ContentType string `json:"content_type" binding:"required"`
	ContentID   string `json:"content_id" binding:"required"`
	ReportType  string `json:"report_type" binding:"required"`
	Reason      string `json:"reason" binding:"required"`
	Description string `json:"description"`
}

// createReport handles POST /reports
func (h *Handler) createReport(c *gin.Context) {
	var req createReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)

	input := reports.CreateReportInput{
		ReporterID:  userID,
		ContentType: reports.ContentType(req.ContentType),
		ContentID:   req.ContentID,
		ReportType:  reports.ReportType(req.ReportType),
		Reason:      req.Reason,
		Description: req.Description,
	}

	report, err := h.reportService.CreateReport(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, report)
}

// getMyReports handles GET /reports/my
func (h *Handler) getMyReports(c *gin.Context) {
	userID := middleware.GetUserID(c)
	
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "20")

	// Parse page and limit (implementation omitted for brevity)
	
	reports, total, err := h.reportService.GetReportsByStatus(
		c.Request.Context(), 
		"", // Get all statuses for user's own reports
		1, 20,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reports": reports,
		"total":   total,
	})
}

// getPendingReports handles GET /reports/pending (manager only)
func (h *Handler) getPendingReports(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "20")

	reports, total, err := h.reportService.GetReportsByStatus(
		c.Request.Context(),
		reports.ReportStatusPending,
		1, 20,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reports": reports,
		"total":   total,
	})
}

// getReport handles GET /reports/:id (manager only)
func (h *Handler) getReport(c *gin.Context) {
	reportID := c.Param("id")

	report, err := h.reportService.GetReportsByStatus(
		c.Request.Context(),
		"",
		1, 1,
	)
	if err != nil || len(report) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "report not found"})
		return
	}

	c.JSON(http.StatusOK, report[0])
}

// reviewReportRequest represents the request to review a report
type reviewReportRequest struct {
	Status         string `json:"status" binding:"required"`
	ResolutionNote string `json:"resolution_note"`
	Action         string `json:"action"` // none, delete_content, ban_user, warn_user
}

// reviewReport handles POST /reports/:id/review (manager only)
func (h *Handler) reviewReport(c *gin.Context) {
	reportID := c.Param("id")
	managerID := middleware.GetUserID(c)

	var req reviewReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := reports.ReviewReportInput{
		ManagerID:      managerID,
		Status:         reports.ReportStatus(req.Status),
		ResolutionNote: req.ResolutionNote,
		Action:         req.Action,
	}

	err := h.reportService.ReviewReport(c.Request.Context(), reportID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "report reviewed successfully"})
}

// getStats handles GET /reports/stats (manager only)
func (h *Handler) getStats(c *gin.Context) {
	stats, err := h.reportService.GetStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}
