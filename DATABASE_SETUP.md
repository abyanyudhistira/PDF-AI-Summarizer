# PostgreSQL Database Setup

## Prerequisites
- Docker Desktop installed and running
- Docker Compose installed

## Setup Instructions

### 1. Start PostgreSQL Container
```bash
docker-compose up -d
```

### 2. Check if PostgreSQL is running
```bash
docker ps
```
You should see `pdf-summarizer-db` container running.

### 3. Check PostgreSQL logs (optional)
```bash
docker logs pdf-summarizer-db
```

### 4. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 5. Test database connection
```bash
docker exec -it pdf-summarizer-db psql -U pdf_user -d pdf_summarizer
```

Inside PostgreSQL shell, you can run:
```sql
\l              -- List all databases
\dt             -- List all tables (after migration)
\q              -- Quit
```

## Database Credentials

- **Host:** localhost
- **Port:** 5432
- **Database:** pdf_summarizer
- **Username:** pdf_user
- **Password:** pdf_password_123
- **Connection URL:** `postgresql://pdf_user:pdf_password_123@localhost:5432/pdf_summarizer`

## Useful Commands

### Stop PostgreSQL
```bash
docker-compose down
```

### Stop and remove data (CAUTION: This will delete all data!)
```bash
docker-compose down -v
```

### Restart PostgreSQL
```bash
docker-compose restart
```

### View PostgreSQL logs
```bash
docker-compose logs -f postgres
```

## Next Steps

After database is running:
1. Create database models (SQLAlchemy)
2. Run migrations (Alembic)
3. Test CRUD operations

## Troubleshooting

### Port 5432 already in use
If you have PostgreSQL installed locally, stop it first:
```bash
# Windows
net stop postgresql-x64-15

# Or change the port in docker-compose.yml:
ports:
  - "5433:5432"  # Use port 5433 instead
```

### Connection refused
Make sure Docker is running and container is healthy:
```bash
docker-compose ps
```
