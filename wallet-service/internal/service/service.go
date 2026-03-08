package service

import (
	"github.com/bns/wallet-service/configs"
	walletservice "github.com/bns/wallet-service/internal/service/wallet"
)

type Services struct {
	Wallet *walletservice.WalletService
	Config *configs.Config
}

func New(walletService *walletservice.WalletService, cfg *configs.Config) *Services {
	return &Services{
		Wallet: walletService,
		Config: cfg,
	}
}
