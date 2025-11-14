#!/bin/bash

# SSH Dashboard Backend Startup Script

echo "🚀 Starting SSH Dashboard Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if log directory exists, create sample structure if needed
LOG_DIR="${LOG_DIR:-/var/log/remote}"
if [ ! -d "$LOG_DIR" ] && [ "$LOG_DIR" != "/var/log/remote" ]; then
    echo "📁 Creating log directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"
fi

# Set environment variables if not set
export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-3001}"
export LOG_DIR="${LOG_DIR:-/var/log/remote}"

echo "🔧 Configuration:"
echo "   • Port: $PORT"
echo "   • Log Directory: $LOG_DIR"
echo "   • Environment: $NODE_ENV"
echo ""

# Check if development dependencies are needed
if [ "$NODE_ENV" = "development" ] && ! command -v nodemon &> /dev/null; then
    echo "🔄 Installing nodemon for development..."
    npm install -g nodemon
fi

# Start the server
echo "🎯 Starting server on port $PORT..."
echo "   • API will be available at: http://localhost:$PORT/api/"
echo "   • Health check: http://localhost:$PORT/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

if [ "$NODE_ENV" = "development" ] && command -v nodemon &> /dev/null; then
    nodemon server.js
else
    node server.js
fi