# Docker Deployment

## Quick start with Docker Compose

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop the application
docker-compose down
```

The app will be available at `http://localhost:3000`.

## Build and run with Docker only

```bash
# Build the image
docker build -t regiobus .

# Run with SQLite (volume for persistent data)
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e DATABASE_URL=file:/app/data/prod.db \
  --name regiobus-app \
  regiobus

# Run migrations and seed
docker exec regiobus-app npx prisma migrate deploy
docker exec regiobus-app npx prisma db seed
```

## Production deployment with Postgres

1. Update `docker-compose.yml`: uncomment the `db` service and volumes section.

2. Update the app service environment:
   ```yaml
   environment:
     - DATABASE_URL=postgresql://regiobus:changeme@db:5432/regiobus
   ```

3. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

4. Start services:
   ```bash
   docker-compose up -d
   ```

## Environment variables

- `DATABASE_URL` — database connection string (SQLite: `file:./data.db`, Postgres: `postgresql://user:pass@host:5432/db`)
- `NODE_ENV` — set to `production` for production builds
- `PORT` — server port (default 3000)

## Notes

- The Dockerfile uses Next.js standalone output mode for optimized production builds.
- Database migrations run automatically on container startup via `docker-compose.yml`.
- For production, use a real Postgres database instead of SQLite (see instructions above).
- Swap the mock payment provider in `lib/payment.ts` before production use.
