package validate

import (
	"net/mail"
	"unicode"

	"github.com/bns/pkg/apperrors"
)

func ValidateCredentials(email, phone, password string) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return apperrors.NewValidationError("invalid email format")
	}
	if len(phone) < 10 {
		return apperrors.NewValidationError("phone number must be at least 10 digits")
	}
	if err := isStrongPassword(password); err != nil {
		return err
	}
	return nil
}

func isStrongPassword(password string) error {
	var (
		hasMinLen = len(password) >= 6
		hasNumber = false
	)
	if len(password) == 0 {
		return apperrors.NewValidationError("password cannot be empty")
	}

	for _, char := range password {
		switch {
		case unicode.IsNumber(char):
			hasNumber = true
		}
	}

	if !hasMinLen {
		return apperrors.NewValidationError("password must be at least 6 characters long")
	}
	if !hasNumber {
		return apperrors.NewValidationError("password must contain at least one number")
	}

	return nil
}
