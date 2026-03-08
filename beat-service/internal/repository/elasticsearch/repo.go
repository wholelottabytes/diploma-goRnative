package elasticsearch

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	"github.com/bns/beat-service/internal/models"
	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
)

const beatsIndex = "beats"

type BeatRepository struct {
	client *elasticsearch.Client
}

func New(client *elasticsearch.Client) *BeatRepository {
	return &BeatRepository{
		client: client,
	}
}

func (r *BeatRepository) Create(ctx context.Context, beat *models.Beat) (string, error) {
	data, err := json.Marshal(beat)
	if err != nil {
		return "", err
	}

	req := esapi.IndexRequest{
		Index:      beatsIndex,
		DocumentID: beat.ID,
		Body:       bytes.NewReader(data),
		Refresh:    "true",
	}

	res, err := req.Do(ctx, r.client)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.IsError() {
		return "", fmt.Errorf("error indexing document: %s", res.Status())
	}

	return beat.ID, nil
}

func (r *BeatRepository) FindByID(ctx context.Context, id string) (*models.Beat, error) {
	req := esapi.GetRequest{
		Index:      beatsIndex,
		DocumentID: id,
	}

	res, err := req.Do(ctx, r.client)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode == 404 {
		return nil, nil // or apperrors.ErrNotFound
	}
	if res.IsError() {
		return nil, fmt.Errorf("error getting document: %s", res.Status())
	}

	var d struct {
		Source models.Beat `json:"_source"`
	}
	if err := json.NewDecoder(res.Body).Decode(&d); err != nil {
		return nil, err
	}

	return &d.Source, nil
}

func (r *BeatRepository) Search(ctx context.Context, query string) ([]*models.Beat, error) {
	var body bytes.Buffer
	var q map[string]interface{}
	if query == "" {
		q = map[string]interface{}{
			"query": map[string]interface{}{
				"match_all": map[string]interface{}{},
			},
		}
	} else {
		q = map[string]interface{}{
			"query": map[string]interface{}{
				"multi_match": map[string]interface{}{
					"query":  query,
					"fields": []string{"title", "description", "tags", "genre"},
				},
			},
		}
	}
	if err := json.NewEncoder(&body).Encode(q); err != nil {
		return nil, err
	}

	res, err := r.client.Search(
		r.client.Search.WithContext(ctx),
		r.client.Search.WithIndex(beatsIndex),
		r.client.Search.WithBody(&body),
		r.client.Search.WithTrackTotalHits(true),
	)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("error searching documents: %s", res.Status())
	}

	var r_es struct {
		Hits struct {
			Hits []struct {
				Source models.Beat `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(res.Body).Decode(&r_es); err != nil {
		return nil, err
	}

	beats := make([]*models.Beat, 0, len(r_es.Hits.Hits))
	for _, hit := range r_es.Hits.Hits {
		beat := hit.Source
		beats = append(beats, &beat)
	}

	return beats, nil
}

func (r *BeatRepository) Update(ctx context.Context, id string, beat *models.Beat) error {
	data, err := json.Marshal(map[string]interface{}{"doc": beat})
	if err != nil {
		return err
	}

	req := esapi.UpdateRequest{
		Index:      beatsIndex,
		DocumentID: id,
		Body:       bytes.NewReader(data),
		Refresh:    "true",
	}

	res, err := req.Do(ctx, r.client)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("error updating document: %s", res.Status())
	}

	return nil
}

func (r *BeatRepository) Delete(ctx context.Context, id string) error {
	req := esapi.DeleteRequest{
		Index:      beatsIndex,
		DocumentID: id,
		Refresh:    "true",
	}

	res, err := req.Do(ctx, r.client)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("error deleting document: %s", res.Status())
	}

	return nil
}

func (r *BeatRepository) FindByIDs(ctx context.Context, ids []string) ([]*models.Beat, error) {
	if len(ids) == 0 {
		return []*models.Beat{}, nil
	}

	var body bytes.Buffer
	q := map[string]interface{}{
		"query": map[string]interface{}{
			"ids": map[string]interface{}{
				"values": ids,
			},
		},
	}
	if err := json.NewEncoder(&body).Encode(q); err != nil {
		return nil, err
	}

	res, err := r.client.Search(
		r.client.Search.WithContext(ctx),
		r.client.Search.WithIndex(beatsIndex),
		r.client.Search.WithBody(&body),
	)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("error searching documents by IDs: %s", res.Status())
	}

	var r_es struct {
		Hits struct {
			Hits []struct {
				Source models.Beat `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(res.Body).Decode(&r_es); err != nil {
		return nil, err
	}

	beats := make([]*models.Beat, 0, len(r_es.Hits.Hits))
	for _, hit := range r_es.Hits.Hits {
		beat := hit.Source
		beats = append(beats, &beat)
	}

	return beats, nil
}

