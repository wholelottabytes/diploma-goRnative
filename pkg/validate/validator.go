package validate

import (
	"fmt"
	"net/mail"
	"unicode"
)

func ValidateCredentials(email, phone, password string) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("invalid email: %w", err)
	}
	if len(phone) < 10 {
		return fmt.Errorf("invalid phone number")
	}
	if !isStrongPassword(password) {
		return fmt.Errorf("password is not strong enough")
	}
	return nil
}

func isStrongPassword(password string) bool {
	var (
		hasMinLen  = len(password) >= 8
		hasUpper   = false
		hasLower   = false
		hasNumber  = false
		hasSpecial = false
	)
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}
	return hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial
}
