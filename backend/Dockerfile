FROM denoland/deno:1.40.0

WORKDIR /app

# Copy the source code
COPY . .

# Cache dependencies
RUN deno cache src/main.ts

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["deno", "run", "--allow-all", "src/main.ts"]
