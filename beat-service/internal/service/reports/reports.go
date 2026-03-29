package reports

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// ReportType defines the type of report
type ReportType string

const (
	ReportTypePlagiarism    ReportType = "plagiarism"
	ReportTypeOffensive     ReportType = "offensive"
	ReportTypeSpam          ReportType = "spam"
	ReportTypeInappropriate ReportType = "inappropriate"
	ReportTypeOther         ReportType = "other"
)

// ReportStatus defines the status of a report
type ReportStatus string

const (
	ReportStatusPending   ReportStatus = "pending"
	ReportStatusReviewed  ReportStatus = "reviewed"
	ReportStatusResolved  ReportStatus = "resolved"
	ReportStatusRejected  ReportStatus = "rejected"
)

// ContentType defines what type of content is being reported
type ContentType string

const (
	ContentTypeBeat       ContentType = "beat"
	ContentTypeComment    ContentType = "comment"
	ContentTypeUser       ContentType = "user"
)

// Report represents a user report
type Report struct {
	ID              string      `json:"id" bson:"_id"`
	ReporterID      string      `json:"reporter_id" bson:"reporter_id"`
	ContentType     ContentType `json:"content_type" bson:"content_type"`
	ContentID       string      `json:"content_id" bson:"content_id"`
	ReportType      ReportType  `json:"report_type" bson:"report_type"`
	Reason          string      `json:"reason" bson:"reason"`
	Description     string      `json:"description" bson:"description"`
	Status          ReportStatus `json:"status" bson:"status"`
	Priority        int         `json:"priority" bson:"priority"` // 1-5, 5 is highest
	AssignedTo      string      `json:"assigned_to" bson:"assigned_to"` // Manager ID
	CreatedAt       time.Time   `json:"created_at" bson:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at" bson:"updated_at"`
	ResolvedAt      *time.Time  `json:"resolved_at" bson:"resolved_at"`
	ResolutionNote  string      `json:"resolution_note" bson:"resolution_note"`
}

// ReportRepository defines the interface for report storage
type ReportRepository interface {
	Create(ctx context.Context, report *Report) error
	FindByID(ctx context.Context, id string) (*Report, error)
	FindByStatus(ctx context.Context, status ReportStatus, page, limit int64) ([]*Report, int64, error)
	FindByReporterID(ctx context.Context, reporterID string, page, limit int64) ([]*Report, int64, error)
	UpdateStatus(ctx context.Context, id string, status ReportStatus, note string) error
	AssignToManager(ctx context.Context, id string, managerID string) error
	GetStats(ctx context.Context) (*ReportStats, error)
}

// ReportStats contains report statistics
type ReportStats struct {
	Total       int64 `json:"total"`
	Pending     int64 `json:"pending"`
	Reviewed    int64 `json:"reviewed"`
	Resolved    int64 `json:"resolved"`
	Rejected    int64 `json:"rejected"`
	ThisWeek    int64 `json:"this_week"`
	ThisMonth   int64 `json:"this_month"`
}

// ReportService handles report business logic
type ReportService struct {
	repo ReportRepository
}

// NewReportService creates a new report service
func NewReportService(repo ReportRepository) *ReportService {
	return &ReportService{repo: repo}
}

// CreateReportInput contains input for creating a report
type CreateReportInput struct {
	ReporterID  string      `json:"reporter_id" binding:"required"`
	ContentType ContentType `json:"content_type" binding:"required"`
	ContentID   string      `json:"content_id" binding:"required"`
	ReportType  ReportType  `json:"report_type" binding:"required"`
	Reason      string      `json:"reason" binding:"required"`
	Description string      `json:"description"`
}

// CreateReport creates a new report
func (s *ReportService) CreateReport(ctx context.Context, input CreateReportInput) (*Report, error) {
	// Validate report type
	validTypes := map[ReportType]bool{
		ReportTypePlagiarism:    true,
		ReportTypeOffensive:     true,
		ReportTypeSpam:          true,
		ReportTypeInappropriate: true,
		ReportTypeOther:         true,
	}
	if !validTypes[input.ReportType] {
		return nil, errors.New("invalid report type")
	}

	// Validate content type
	validContentTypes := map[ContentType]bool{
		ContentTypeBeat:    true,
		ContentTypeComment: true,
		ContentTypeUser:    true,
	}
	if !validContentTypes[input.ContentType] {
		return nil, errors.New("invalid content type")
	}

	// Check for duplicate reports (same user reporting same content)
	// This should be implemented in the repository layer

	now := time.Now()
	report := &Report{
		ID:          uuid.New().String(),
		ReporterID:  input.ReporterID,
		ContentType: input.ContentType,
		ContentID:   input.ContentID,
		ReportType:  input.ReportType,
		Reason:      input.Reason,
		Description: input.Description,
		Status:      ReportStatusPending,
		Priority:    s.calculatePriority(input),
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Auto-assign priority based on report type
	if input.ReportType == ReportTypePlagiarism {
		report.Priority = 4 // High priority for plagiarism
	}

	if err := s.repo.Create(ctx, report); err != nil {
		return nil, err
	}

	return report, nil
}

// calculatePriority calculates report priority based on type and content
func (s *ReportService) calculatePriority(input CreateReportInput) int {
	// Base priority
	priority := 2

	// Increase priority for certain types
	switch input.ReportType {
	case ReportTypePlagiarism:
		priority = 4
	case ReportTypeOffensive:
		priority = 3
	case ReportTypeSpam:
		priority = 2
	}

	return priority
}

// GetReportsByStatus gets reports by status with pagination
func (s *ReportService) GetReportsByStatus(ctx context.Context, status ReportStatus, page, limit int64) ([]*Report, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return s.repo.FindByStatus(ctx, status, page, limit)
}

// ReviewReport allows a manager to review a report
type ReviewReportInput struct {
	ManagerID      string `json:"manager_id" binding:"required"`
	Status         ReportStatus `json:"status" binding:"required"`
	ResolutionNote string `json:"resolution_note"`
	Action         string `json:"action"` // "none", "delete_content", "ban_user", "warn_user"
}

// ReviewReport processes a report review
func (s *ReportService) ReviewReport(ctx context.Context, reportID string, input ReviewReportInput) error {
	validStatuses := map[ReportStatus]bool{
		ReportStatusReviewed: true,
		ReportStatusResolved: true,
		ReportStatusRejected: true,
	}
	if !validStatuses[input.Status] {
		return errors.New("invalid status")
	}

	now := time.Now()
	
	// Update report status
	if err := s.repo.UpdateStatus(ctx, reportID, input.Status, input.ResolutionNote); err != nil {
		return err
	}

	// Execute action if needed
	if input.Action != "" {
		// This would trigger actions like:
		// - Delete beat/comment
		// - Ban/warn user
		// - Send notifications
		// These should be implemented as callbacks or events
	}

	return nil
}

// GetStats returns report statistics
func (s *ReportService) GetStats(ctx context.Context) (*ReportStats, error) {
	return s.repo.GetStats(ctx)
}

// AssignReport assigns a report to a manager
func (s *ReportService) AssignReport(ctx context.Context, reportID, managerID string) error {
	return s.repo.AssignToManager(ctx, reportID, managerID)
}

// Auto-assign reports to managers (round-robin or based on workload)
func (s *ReportService) AutoAssignReports(ctx context.Context, managerIDs []string) error {
	// Get pending reports without assignment
	// Assign to managers based on workload
	// This is a background job that should run periodically
	return nil
}
