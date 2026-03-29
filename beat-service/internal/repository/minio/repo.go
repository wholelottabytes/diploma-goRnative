package minio

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"strings"

	"github.com/bns/beat-service/configs"
	"github.com/minio/minio-go/v7"
)

type FileRepository struct {
	client *minio.Client
	cfg    *configs.Config
}

func New(client *minio.Client, cfg *configs.Config) *FileRepository {
	return &FileRepository{
		client: client,
		cfg:    cfg,
	}
}

func (r *FileRepository) Upload(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64) (string, error) {
	// Ensure bucket exists
	exists, err := r.client.BucketExists(ctx, bucketName)
	if err != nil {
		return "", err
	}
	if !exists {
		err = r.client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			return "", err
		}
		
		// Set bucket policy to public read
		policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, bucketName)
		err = r.client.SetBucketPolicy(ctx, bucketName, policy)
		if err != nil {
			slog.Warn("failed to set bucket policy", "bucket", bucketName, "error", err)
		} else {
			slog.Info("bucket policy set to public", "bucket", bucketName)
		}
	}

	_, err = r.client.PutObject(ctx, bucketName, objectName, reader, objectSize, minio.PutObjectOptions{})
	if err != nil {
		return "", err
	}
	return objectName, nil
}

func (r *FileRepository) Delete(ctx context.Context, bucketName, objectName string) error {
	return r.client.RemoveObject(ctx, bucketName, objectName, minio.RemoveObjectOptions{})
}

func (r *FileRepository) GetURL(ctx context.Context, bucketName, objectName string) (string, error) {
	// For public buckets, return direct URL without presigned parameters
	// This URL never expires and can be accessed by anyone
	publicEndpoint := strings.TrimSuffix(r.cfg.MinIO.PublicEndpoint, "/")
	if publicEndpoint == "" {
		publicEndpoint = "http://" + strings.TrimSuffix(r.cfg.MinIO.Endpoint, "/")
	}
	
	// Construct direct URL to object
	directURL := fmt.Sprintf("%s/%s/%s", publicEndpoint, bucketName, objectName)
	return directURL, nil
}
