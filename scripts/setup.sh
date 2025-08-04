#!/bin/bash

# YNAB Investments Sync - Development Setup Script

echo "🚀 Setting up YNAB Investments Sync development environment..."

# Check if Docker is installed
if ! command -v docker &>/dev/null; then
  echo "❌ Docker is not installed. Please install Docker Desktop first."
  exit 1
fi

# Check if Docker is running
if ! docker info &>/dev/null; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create environment file if it doesn't exist
if [ ! -f "apps/api/.env" ]; then
  echo "📝 Creating environment file..."
  cp apps/api/.env.example apps/api/.env
  echo "✅ Created .env file. Please update it with your configuration."
fi

# Start database
echo "🗄️ Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Build the API
echo "🔨 Building API..."
pnpm nx build api

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update apps/api/.env with your configuration"
echo "2. Start the API: pnpm nx serve api"
echo "3. Start the web app: pnpm nx serve web"
echo ""
echo "📚 Useful commands:"
echo "• Database admin: http://localhost:8080 (when docker-compose is running)"
echo "• API docs: http://localhost:3000/api"
echo "• Run tests: pnpm nx test api"
