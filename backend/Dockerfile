# --- Etapa 1: build ---
FROM golang:1.23 AS builder

WORKDIR /app
COPY . .

# Compilar binario del servidor
RUN go build -o fleet-backend ./cmd/api/main.go

# Compilar binario del seed
RUN go build -o seed ./scripts/seed.go

# Compilar entrypoint que orquesta todo
RUN go build -o run ./run.go

# --- Etapa 2: runtime (distroless) ---
FROM gcr.io/distroless/base-debian12

WORKDIR /app
COPY --from=builder /app/fleet-backend .
COPY --from=builder /app/seed .
COPY --from=builder /app/run .

EXPOSE 8080

CMD ["./run"]
