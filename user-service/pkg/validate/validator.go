package validate

import (
	"fmt"
	"regexp"
)

const (
	passwordMinLength = 8
)

var (
	emailRegex = regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$`)
	phoneRegex = regexp.MustCompile(`^\+[1-9]\d{1,14}$`)
)

func ValidateCredentials(email, phone, password string) error {
	if len(password) < passwordMinLength {
		return fmt.Errorf("password must be at least %d characters long", passwordMinLength)
	}
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}
	if !phoneRegex.MatchString(phone) {
		return fmt.Errorf("invalid phone format. must be E.164 format (+xxxxxxxxxxx)")
	}
	return nil
}
