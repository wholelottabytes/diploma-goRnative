package minio

import (
	"context"
	"io"
	"log/slog"
	"net/url"
	"strings"
	"time"

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
	reqParams := make(url.Values)
	presignedURL, err := r.client.PresignedGetObject(ctx, bucketName, objectName, time.Hour*24, reqParams)
	if err != nil {
		return "", err
	}
	
    slog.Info("Generated presigned URL", "url", presignedURL.String())

	internalEndpoint := "http://" + r.cfg.MinIO.Endpoint
    if r.cfg.MinIO.PublicEndpoint != "" {
        finalUrl := strings.Replace(presignedURL.String(), internalEndpoint, r.cfg.MinIO.PublicEndpoint, 1)
        slog.Info("Replaced URL", "url", finalUrl)
        return finalUrl, nil
    }

	return presignedURL.String(), nil
}
