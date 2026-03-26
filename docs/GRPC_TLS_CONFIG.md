# gRPC TLS Configuration Guide

## Development (Current - Insecure)
For local development, gRPC uses insecure connections:
```go
grpc.WithTransportCredentials(insecure.NewCredentials())
```

This is **acceptable for development** where all services run in the same Docker network.

## Production Setup

### 1. Generate Self-Signed Certificates (for testing)
```bash
mkdir -p certs/grpc
cd certs/grpc

# Generate CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out ca.crt -subj "/CN=BeatMarket CA"

# Generate server certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=order-service"
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt

# Verify
openssl verify -CAfile ca.crt server.crt
```

### 2. Update order-service to use TLS

**File**: `order-service/cmd/app/main.go`

```go
// For production with TLS
creds, err := credentials.NewClientTLSFromFile("certs/grpc/ca.crt", "")
if err != nil {
    slog.Error("failed to load TLS credentials", slog.String("error", err.Error()))
    os.Exit(1)
}
beatConn, err := grpc.Dial(cfg.Services.BeatServiceAddr, grpc.WithTransportCredentials(creds))
```

### 3. Add TLS config to configs

**File**: `order-service/configs/config.go`

```go
type GRPCConfig struct {
    Port            string
    TLSEnabled      bool
    TLSCertFile     string
    TLSKeyFile      string
    TLSCAFile       string
}
```

### 4. Update docker-compose.yml for production

```yaml
order-service:
  environment:
    - GRPC_TLS_ENABLED=true
    - GRPC_TLS_CERT_FILE=/certs/server.crt
    - GRPC_TLS_KEY_FILE=/certs/server.key
    - GRPC_TLS_CA_FILE=/certs/ca.crt
  volumes:
    - ./certs/grpc:/certs:ro
```

## Current Status
- ✅ Development: Insecure gRPC (OK for local)
- ⏳ Production: TLS ready (needs certificate deployment)

## Recommendation
For production deployment:
1. Use Let's Encrypt or your cloud provider's certificate manager
2. Store certificates in Kubernetes Secrets or Docker secrets
3. Enable mTLS for service-to-service authentication
4. Consider using service mesh (Istio, Linkerd) for automatic mTLS
