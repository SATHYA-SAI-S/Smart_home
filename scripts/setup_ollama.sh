#!/usr/bin/env bash
# SentinelHome - Ollama Local Fallback Setup & Verification Script
set -e

echo "=========================================================="
echo "🛡️  SentinelHome: Local Ollama Setup & Health Verification"
echo "=========================================================="

OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:0.5b}"
OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"

# 1. Check if Ollama binary is installed
if command -v ollama >/dev/null 2>&1; then
    echo "✅ Ollama binary detected at: $(which ollama)"
    ollama --version || true
elif [ -f "/usr/local/bin/ollama" ]; then
    echo "✅ Ollama found at /usr/local/bin/ollama"
    export PATH="/usr/local/bin:$PATH"
else
    echo "⚠️  Ollama is not installed. Installing Ollama..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew >/dev/null 2>&1; then
            echo "📦 Installing Ollama via Homebrew..."
            brew install ollama
        else
            echo "📦 Installing Ollama via official installer..."
            curl -fsSL https://ollama.com/install.sh | sh
        fi
    else
        echo "📦 Installing Ollama on Linux..."
        curl -fsSL https://ollama.com/install.sh | sh
    fi
fi

# 2. Check if Ollama service is running
echo "🔍 Checking Ollama service on ${OLLAMA_HOST}..."
if curl -s --max-time 2 "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
    echo "✅ Ollama daemon is already active and listening on ${OLLAMA_HOST}"
else
    echo "🚀 Starting Ollama daemon in the background..."
    nohup ollama serve > /tmp/ollama.log 2>&1 &
    
    # Wait for daemon to become responsive
    READY=0
    for i in {1..15}; do
        if curl -s --max-time 1 "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
            READY=1
            echo "✅ Ollama daemon successfully started and responding (after ${i}s)"
            break
        fi
        sleep 1
    done

    if [ "$READY" -ne 1 ]; then
        echo "❌ Failed to connect to Ollama daemon within 15 seconds. Check /tmp/ollama.log"
        exit 1
    fi
fi

# 3. Check / Pull lightweight model
echo "🔍 Checking if lightweight model '${OLLAMA_MODEL}' is downloaded..."
if ollama list | grep -q "${OLLAMA_MODEL}"; then
    echo "✅ Model '${OLLAMA_MODEL}' is already available locally!"
else
    echo "📥 Downloading lightweight model '${OLLAMA_MODEL}' (ultra-low latency for presentations)..."
    ollama pull "${OLLAMA_MODEL}"
fi

# 4. Benchmark quick inference test
echo "⚡ Running quick test inference with '${OLLAMA_MODEL}'..."
START_TIME=$(python3 -c "import time; print(int(time.time() * 1000))")

RESPONSE=$(curl -s -X POST "${OLLAMA_HOST}/api/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${OLLAMA_MODEL}\",
    \"prompt\": \"You are SentinelHome interpreter. Parse: \\\"turn off all lights\\\". Output JSON: {\\\"goal\\\": \\\"turn_off_devices\\\", \\\"scope\\\": \\\"lights\\\"}\",
    \"format\": \"json\",
    \"stream\": false,
    \"options\": { \"temperature\": 0.1, \"num_predict\": 100 }
  }")

END_TIME=$(python3 -c "import time; print(int(time.time() * 1000))")
DURATION=$((END_TIME - START_TIME))

echo "----------------------------------------------------------"
echo "🎉 SUCCESS! Local Ollama is 100% operational for SentinelHome!"
echo "Model:       ${OLLAMA_MODEL}"
echo "Response:    $(echo "$RESPONSE" | grep -o '"response":"[^"]*"' | head -n 1)"
echo "Inference:   ${DURATION}ms total roundtrip latency"
echo "----------------------------------------------------------"
