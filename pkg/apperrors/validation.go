package apperrors

import "fmt"

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func NewValidationError(message string, args ...interface{}) error {
	return &ValidationError{
		Message: fmt.Sprintf(message, args...),
	}
}
