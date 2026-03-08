package clickhouse

import (
	"context"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type AnalyticsRepository struct {
	conn clickhouse.Conn
}

func New(conn clickhouse.Conn) *AnalyticsRepository {
	return &AnalyticsRepository{
		conn: conn,
	}
}

func (r *AnalyticsRepository) Init(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS beat_events (
			timestamp DateTime,
			event_type String,
			beat_id String,
			user_id String,
			value Float64
		) ENGINE = MergeTree()
		ORDER BY (event_type, timestamp)
	`
	return r.conn.Exec(ctx, query)
}

func (r *AnalyticsRepository) Save(ctx context.Context, eventType string, beatID, userID string, value float64) error {
	query := `INSERT INTO beat_events (timestamp, event_type, beat_id, user_id, value) VALUES (?, ?, ?, ?, ?)`
	err := r.conn.Exec(ctx, query,
		time.Now(),
		eventType,
		beatID,
		userID,
		value,
	)
	return err
}

func (r *AnalyticsRepository) GetBeatStats(ctx context.Context, beatID string) (views int64, sales int64, avgRating float64, err error) {
	query := `SELECT 
				countIf(event_type = 'beat.viewed') as views,
				countIf(event_type = 'order.created') as sales,
				avgIf(value, event_type = 'beat.rated') as avg_rating
			  FROM beat_events 
			  WHERE beat_id = ?`
	err = r.conn.QueryRow(ctx, query, beatID).Scan(&views, &sales, &avgRating)
	return
}

