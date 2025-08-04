# Scripts

This directory contains TypeScript scripts for managing the YNAB Investments Sync development environment.

## Available Scripts

### Setup Script

**`pnpm setup`** - Sets up the development environment for the first time

This script will:

1. Install all dependencies with `pnpm install`
2. Create a `.env` file from `.env.example` (if it doesn't exist)
3. Start the PostgreSQL database using Docker Compose
4. Run database migrations

### Database Management Scripts

All database scripts can be run with `pnpm db <command>` or `pnpm db:<command>`:

- **`pnpm db create`** - Create and start the database container
- **`pnpm db start`** - Start the database container
- **`pnpm db stop`** - Stop the database container
- **`pnpm db restart`** - Restart the database container
- **`pnpm db status`** - Show database container status
- **`pnpm db logs`** - Show database container logs (follow mode)
- **`pnpm db shell`** - Open interactive database shell (psql)
- **`pnpm db migrate`** - Run database migrations
- **`pnpm db reset`** - Reset database (⚠️ **destructive** - removes all data)

## Examples

```bash
# First time setup
pnpm setup

# Start database
pnpm db:start

# Check if database is running
pnpm db:status

# View database logs
pnpm db:logs

# Open database shell
pnpm db:shell

# Run migrations after schema changes
pnpm db:migrate

# Reset database (removes all data!)
pnpm db:reset
```

## Requirements

- Docker and Docker Compose must be installed and running
- Node.js and pnpm
- The `tsx` package (included in devDependencies)

## Database Connection

The scripts use the following default database configuration (can be overridden via environment variables):

- **Host**: localhost
- **Port**: 5432
- **Database**: ynab_investments
- **Username**: postgres
- **Password**: password
- **Container**: ynab-investments-db

## Notes

- The setup script will automatically wait for the database to be ready before running migrations
- The database scripts check if Docker is running before executing
- The shell command opens an interactive PostgreSQL shell inside the container
- All scripts provide informative output with emojis for better visibility
