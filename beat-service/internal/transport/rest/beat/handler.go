package beat

import (
	"log/slog"
	"net/http"
	"path/filepath"

	"github.com/bns/beat-service/internal/models"
	beatservice "github.com/bns/beat-service/internal/service/beat"
	"github.com/bns/pkg/middleware"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	beatService *beatservice.BeatService
	jwtSecret   string
}

func NewHandler(beatService *beatservice.BeatService, jwtSecret string) *Handler {
	return &Handler{
		beatService: beatService,
		jwtSecret:   jwtSecret,
	}
}

func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	beats := router.Group("/beats")
	{
		beats.GET("", h.listBeats)
		beats.GET("/recent", h.getRecentBeats)
		beats.GET("/popular", h.getPopularBeats)
		beats.POST("/batch", h.getByIDs)
		beats.GET("/:id", h.getBeat)

		// Auth required
		authGroup := beats.Group("")
		authGroup.Use(middleware.Auth(h.jwtSecret)) 

		authGroup.POST("", h.createBeat)
		authGroup.PUT("/:id", h.updateBeat)
		authGroup.DELETE("/:id", h.deleteBeat)
		authGroup.GET("/my", h.getMyBeats)

		upload := authGroup.Group("/upload")
		{
			upload.POST("/image", h.uploadImage)
			upload.POST("/audio", h.uploadAudio)
		}
	}
}

func (h *Handler) listBeats(c *gin.Context) {
	q := c.Query("q")
	var beats []*models.Beat
	var err error
	if q != "" {
		beats, err = h.beatService.SearchBeats(c.Request.Context(), q)
	} else {
		beats, err = h.beatService.ListBeats(c.Request.Context())
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, beats)
}

func (h *Handler) getBeat(c *gin.Context) {
	id := c.Param("id")
	beat, err := h.beatService.GetBeat(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if beat == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "beat not found"})
		return
	}
	c.JSON(http.StatusOK, beat)
}

func (h *Handler) createBeat(c *gin.Context) {
	var beat models.Beat
	if err := c.ShouldBindJSON(&beat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	beat.AuthorID = userID

	created, err := h.beatService.CreateBeat(c.Request.Context(), &beat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *Handler) updateBeat(c *gin.Context) {
	id := c.Param("id")
	var beat models.Beat
	if err := c.ShouldBindJSON(&beat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	updated, err := h.beatService.UpdateBeat(c.Request.Context(), id, userID, &beat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if updated == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden or not found"})
		return
	}
	c.JSON(http.StatusOK, updated)
}

func (h *Handler) deleteBeat(c *gin.Context) {
	id := c.Param("id")
	userID := middleware.GetUserID(c)

	err := h.beatService.DeleteBeat(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) getMyBeats(c *gin.Context) {
	userID := middleware.GetUserID(c)
	beats, err := h.beatService.GetMyBeats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, beats)
}

func (h *Handler) getRecentBeats(c *gin.Context) {
	beats, err := h.beatService.GetRecentBeats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, beats)
}

func (h *Handler) getPopularBeats(c *gin.Context) {
	beats, err := h.beatService.GetPopularBeats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, beats)
}

func (h *Handler) uploadImage(c *gin.Context) {
	h.handleFileUpload(c, beatservice.ImagesBucket)
}

func (h *Handler) uploadAudio(c *gin.Context) {
	h.handleFileUpload(c, beatservice.AudioBucket)
}

func (h *Handler) handleFileUpload(c *gin.Context, bucket string) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer f.Close()

	ext := filepath.Ext(file.Filename)
	objectName, err := h.beatService.UploadFile(c.Request.Context(), bucket, f, file.Size, ext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload file"})
		slog.Error("upload error", slog.String("error", err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": objectName})
}

type batchRequest struct {
	IDs []string `json:"ids" binding:"required"`
}

func (h *Handler) getByIDs(c *gin.Context) {
	var req batchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	beats, err := h.beatService.GetByIDs(c.Request.Context(), req.IDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, beats)
}
