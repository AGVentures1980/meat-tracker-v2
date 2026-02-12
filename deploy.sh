# Brasa Meat Intelligence - Deployment Suite
echo "🚀 Starting Brasa Meat Intelligence Deployment Suite..."

# Function to check for docker compose command
get_docker_command() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif docker-compose version >/dev/null 2>&1; then
        echo "docker-compose"
    else
        echo ""
    fi
}

DOCKER_CMD=$(get_docker_command)

if [ -z "$DOCKER_CMD" ]; then
    echo "⚠️ NOTE: Neither 'docker compose' nor 'docker-compose' found. Proceeding with Node.js fallback."
else
    echo "✅ Using command: $DOCKER_CMD"
fi

# 1. Clean previous containers (if docker exists)
if [ ! -z "$DOCKER_CMD" ]; then
    echo "🧹 Cleaning environment..."
    $DOCKER_CMD down
fi

# 2. Build and Start containers
if [ ! -z "$DOCKER_CMD" ]; then
    echo "🏗️ Building and launching system via DOCKER..."
    $DOCKER_CMD up --build -d
    echo "✅ System initialized!"
    echo "📍 Access Port: http://localhost:3000"
    echo "📊 Monitoring logs: $DOCKER_CMD logs -f"
else
    echo "⚠️ WARNING: Docker not found. Falling back to NODE.JS mode..."
    echo "🏗️ Cleaning previous builds..."
    rm -rf client/dist server/dist
    echo "🏗️ Building project..."
    cd server && npx prisma generate && cd ..
    npm run build
    
    echo "🚀 Starting server..."
    # Start in background with PORT 3000 and pipe to log
    PORT=3000 npm start > production.log 2>&1 &
    
    echo "✅ System initialized in NODE mode!"
    echo "📍 Access Port: http://localhost:3000"
    echo "📝 Logs saved to: production.log"
fi
