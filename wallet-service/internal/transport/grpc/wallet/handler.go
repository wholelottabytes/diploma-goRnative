package wallet

import (
	"context"

	walletv1 "github.com/bns/api/proto/wallet/v1"
	walletservice "github.com/bns/wallet-service/internal/service/wallet"
	"google.golang.org/grpc"
)

type Handler struct {
	walletv1.UnimplementedWalletServiceServer
	walletService *walletservice.WalletService
}

func NewHandler(walletService *walletservice.WalletService) *Handler {
	return &Handler{
		walletService: walletService,
	}
}

func (h *Handler) Register(server *grpc.Server) {
	walletv1.RegisterWalletServiceServer(server, h)
}

func (h *Handler) CreateWallet(ctx context.Context, req *walletv1.CreateWalletRequest) (*walletv1.CreateWalletResponse, error) {
	// Balance call auto-creates wallet if not exists
	balance, err := h.walletService.GetBalance(ctx, req.UserId)
	if err != nil {
		return nil, err
	}
	return &walletv1.CreateWalletResponse{
		Wallet: &walletv1.Wallet{
			UserId:  req.UserId,
			Balance: balance,
		},
	}, nil
}

func (h *Handler) GetWallet(ctx context.Context, req *walletv1.GetWalletRequest) (*walletv1.GetWalletResponse, error) {
	// Assuming GetWalletRequest 'id' is user_id for this simplified implementation
	balance, err := h.walletService.GetBalance(ctx, req.Id)
	if err != nil {
		return nil, err
	}
	return &walletv1.GetWalletResponse{
		Wallet: &walletv1.Wallet{
			UserId:  req.Id,
			Balance: balance,
		},
	}, nil
}

func (h *Handler) ProcessPayment(ctx context.Context, req *walletv1.ProcessPaymentRequest) (*walletv1.ProcessPaymentResponse, error) {
	success, err := h.walletService.ProcessPayment(ctx, req.FromWalletId, req.ToWalletId, req.Amount)
	if err != nil {
		return &walletv1.ProcessPaymentResponse{Success: false}, err
	}
	return &walletv1.ProcessPaymentResponse{Success: success}, nil
}
