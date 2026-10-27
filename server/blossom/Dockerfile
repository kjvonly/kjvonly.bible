FROM golang:1.25.4-bookworm AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/blossom ./blossom

FROM debian:bookworm-slim

WORKDIR /app

COPY --from=builder /out/blossom /app/blossom

EXPOSE 3335

CMD ["/app/blossom"]
