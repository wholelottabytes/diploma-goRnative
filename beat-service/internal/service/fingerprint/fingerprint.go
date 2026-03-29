package fingerprint

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// FingerprintService generates and compares audio fingerprints
type FingerprintService struct {
	tempDir string
}

// FingerprintResult contains the audio fingerprint data
type FingerprintResult struct {
	BeatID     string `json:"beat_id"`
	Fingerprint string `json:"fingerprint"`
	Duration   float64 `json:"duration"`
}

// NewFingerprintService creates a new fingerprint service
func NewFingerprintService(tempDir string) *FingerprintService {
	if tempDir == "" {
		tempDir = "/tmp/beat-fingerprints"
	}
	// Create temp directory if it doesn't exist
	os.MkdirAll(tempDir, 0755)
	return &FingerprintService{
		tempDir: tempDir,
	}
}

// GenerateFingerprint generates a fingerprint for an audio file
func (s *FingerprintService) GenerateFingerprint(ctx context.Context, audioData io.Reader, beatID string) (*FingerprintResult, error) {
	// Save audio to temp file
	tempFile := filepath.Join(s.tempDir, fmt.Sprintf("%s.mp3", beatID))
	f, err := os.Create(tempFile)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile) // Clean up
	defer f.Close()

	// Copy audio data to temp file
	_, err = io.Copy(f, audioData)
	if err != nil {
		return nil, fmt.Errorf("failed to save audio: %w", err)
	}
	f.Close()

	// Run fpcalc to generate fingerprint
	return s.runFpcalc(ctx, tempFile, beatID)
}

// GenerateFingerprintFromFile generates a fingerprint from an existing file
func (s *FingerprintService) GenerateFingerprintFromFile(ctx context.Context, audioPath string, beatID string) (*FingerprintResult, error) {
	return s.runFpcalc(ctx, audioPath, beatID)
}

// runFpcalc executes the fpcalc command and parses the output
func (s *FingerprintService) runFpcalc(ctx context.Context, audioPath, beatID string) (*FingerprintResult, error) {
	// Check if fpcalc is available
	cmd := exec.CommandContext(ctx, "fpcalc", "-length", "120", audioPath)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		slog.Warn("fpcalc failed, using fallback fingerprint", 
			slog.String("beat_id", beatID),
			slog.String("error", err.Error()),
			slog.String("stderr", stderr.String()))
		// Fallback: generate simple hash-based fingerprint
		return s.generateFallbackFingerprint(ctx, audioPath, beatID)
	}

	// Parse fpcalc output
	// Output format:
	// DURATION=180.5
	// FINGERPRINT=AQADtN...
	lines := strings.Split(stdout.String(), "\n")
	var duration float64
	var fingerprint string

	for _, line := range lines {
		if strings.HasPrefix(line, "DURATION=") {
			fmt.Sscanf(strings.TrimPrefix(line, "DURATION="), "%f", &duration)
		} else if strings.HasPrefix(line, "FINGERPRINT=") {
			fingerprint = strings.TrimPrefix(line, "FINGERPRINT=")
		}
	}

	if fingerprint == "" {
		return s.generateFallbackFingerprint(ctx, audioPath, beatID)
	}

	slog.Info("fingerprint generated successfully",
		slog.String("beat_id", beatID),
		slog.Float64("duration", duration),
		slog.Int("fingerprint_length", len(fingerprint)))

	return &FingerprintResult{
		BeatID:      beatID,
		Fingerprint: fingerprint,
		Duration:    duration,
	}, nil
}

// generateFallbackFingerprint creates a simple hash-based fingerprint if fpcalc fails
func (s *FingerprintService) generateFallbackFingerprint(ctx context.Context, audioPath, beatID string) (*FingerprintResult, error) {
	// Read first 1MB of file for hashing
	f, err := os.Open(audioPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	buf := make([]byte, 1024*1024) // 1MB
	n, err := f.Read(buf)
	if err != nil && err != io.EOF {
		return nil, err
	}

	// Simple hash-based fingerprint (not as good as Chromaprint but works)
	fingerprint := fmt.Sprintf("fallback_%x", hashBytes(buf[:n]))

	return &FingerprintResult{
		BeatID:      beatID,
		Fingerprint: fingerprint,
		Duration:    0,
	}, nil
}

// Simple hash function for fallback
func hashBytes(data []byte) string {
	var hash uint64
	for _, b := range data {
		hash = hash*31 + uint64(b)
	}
	return fmt.Sprintf("%016x", hash)
}

// CompareFingerprints compares two fingerprints and returns similarity score (0-1)
func (s *FingerprintService) CompareFingerprints(fp1, fp2 string) float64 {
	// If fingerprints are identical
	if fp1 == fp2 {
		return 1.0
	}

	// For Chromaprint fingerprints, compare prefix similarity
	// Real implementation would use proper audio fingerprint comparison
	minLen := len(fp1)
	if len(fp2) < minLen {
		minLen = len(fp2)
	}

	if minLen == 0 {
		return 0.0
	}

	matches := 0
	for i := 0; i < minLen; i++ {
		if fp1[i] == fp2[i] {
			matches++
		}
	}

	return float64(matches) / float64(minLen)
}

// FindSimilarBeats finds beats with similar fingerprints
func (s *FingerprintService) FindSimilarBeats(ctx context.Context, fingerprint string, allFingerprints []FingerprintResult, threshold float64) []FingerprintResult {
	var similar []FingerprintResult

	for _, fp := range allFingerprints {
		score := s.CompareFingerprints(fingerprint, fp.Fingerprint)
		if score >= threshold {
			similar = append(similar, fp)
		}
	}

	return similar
}

// InstallFpcalc installs fpcalc if not present (for documentation)
func InstallFpcalc() error {
	// On Ubuntu/Debian: sudo apt-get install libchromaprint-tools
	// On macOS: brew install chromaprint
	// On Windows: Download from https://acoustid.org/chromaprint
	return fmt.Errorf("please install fpcalc manually:\n" +
		"  Ubuntu/Debian: sudo apt-get install libchromaprint-tools\n" +
		"  macOS: brew install chromaprint\n" +
		"  Windows: Download from https://acoustid.org/chromaprint")
}
