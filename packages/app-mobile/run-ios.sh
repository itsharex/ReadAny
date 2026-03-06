#!/bin/bash

cd "$(dirname "$0")"

get_local_ip() {
    local ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    echo "$ip"
}

IP=$(get_local_ip)
echo "📱 Detected local IP: $IP"

export TAURI_DEV_HOST="$IP"
export PATH="$HOME/.cargo/bin:$PATH"

echo " Building and deploying to iPhone..."
pnpm tauri ios dev "📱" --host "$IP"
