package minio

import (
	"context"
	"io"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
)

type FileRepository struct {
	client *minio.Client
}

func New(client *minio.Client) *FileRepository {
	return &FileRepository{
		client: client,
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
	return presignedURL.String(), nil
}

