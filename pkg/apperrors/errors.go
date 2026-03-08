package apperrors

import "errors"

var (
	ErrUserExists       = errors.New("user already exists")
	ErrUserNotFound     = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidRole      = errors.New("invalid role")
	ErrWalletCreation   = errors.New("failed to create wallet")
	ErrInvalidID        = errors.New("invalid id")
	ErrDataConversion   = errors.New("failed to convert data")
	ErrRoleCannotBeAssigned = errors.New("role can not be assigned")
	ErrUnauthorized     = errors.New("unauthorized")
)
