FROM golang:1.25.4-bookworm AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o relay ./main.go

FROM debian:bookworm-slim

WORKDIR /app

COPY --from=builder /app/relay /app/relay

EXPOSE 3334

CMD ["/app/relay"]