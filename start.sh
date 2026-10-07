#!/data/data/com.termux/files/usr/bin/bash
MODEL="${1:?usage: ./start.sh ~/models/qwen.gguf}"
llama-server -m "$MODEL" --host 127.0.0.1 --port 8080 -c 2048 -t 4 &
LLAMA_PID=$!
trap "kill $LLAMA_PID 2>/dev/null" EXIT
npm run dev
