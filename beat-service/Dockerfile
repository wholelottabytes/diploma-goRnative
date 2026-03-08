FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy monorepo configuration
COPY go.work go.work.sum ./

# Copy all go.mod and go.sum files to satisfy go.work
COPY analytics-service/go.mod analytics-service/go.sum ./analytics-service/
COPY auth-service/go.mod auth-service/go.sum ./auth-service/
COPY beat-service/go.mod beat-service/go.sum ./beat-service/
COPY interaction-service/go.mod interaction-service/go.sum ./interaction-service/
COPY order-service/go.mod order-service/go.sum ./order-service/
COPY user-service/go.mod user-service/go.sum ./user-service/
COPY wallet-service/go.mod wallet-service/go.sum ./wallet-service/
COPY pkg/go.mod pkg/go.sum ./pkg/
COPY api/go.mod api/go.sum ./api/

RUN go work sync

# Copy the entire source code
COPY . .

# Build the beat service
WORKDIR /app/beat-service
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/app/main.go

# Final stage
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/beat-service/main .

EXPOSE 8080
EXPOSE 9090

CMD ["./main"]
