#!/bin/bash

echo "🚀 STARTING METRO BUNDLER..."

# Kill any existing Metro processes
echo "📌 Killing old Metro processes..."
pkill -9 -f "metro" 2>/dev/null
pkill -9 -f "react-native" 2>/dev/null
pkill -9 -f "node.*8081" 2>/dev/null
sleep 2

# Check if port 8081 is free
if lsof -i:8081 >/dev/null 2>&1; then
    echo "❌ Port 8081 is busy! Killing..."
    lsof -ti:8081 | xargs kill -9
    sleep 2
fi

# Start Metro
echo "📱 Starting Metro in /home/bns/diploma-goRnative/rnat..."
cd /home/bns/diploma-goRnative/rnat

# Create log file
LOG_FILE="/tmp/metro_$$.log"
echo "📝 Log file: $LOG_FILE"

# Start Metro in background
nohup npm start > $LOG_FILE 2>&1 &
METRO_PID=$!

echo "⏳ Waiting for Metro to start..."
sleep 10

# Check if Metro started
if ps -p $METRO_PID > /dev/null; then
    echo "✅ Metro started (PID: $METRO_PID)"
    tail -5 $LOG_FILE
    
    # Setup ADB reverse
    echo ""
    echo "🔌 Setting up ADB reverse..."
    adb reverse tcp:8081 tcp:8081 2>/dev/null && echo "✅ 8081 (Metro)"
    adb reverse tcp:8000 tcp:8000 2>/dev/null && echo "✅ 8000 (API)"
    adb reverse tcp:9010 tcp:9010 2>/dev/null && echo "✅ 9010 (MinIO)"
    
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  ✅ METRO RUNNING STABLY!                        ║"
    echo "║  PID: $METRO_PID                                  ║"
    echo "║  Log: $LOG_FILE                                   ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""
    echo "💡 To stop: kill $METRO_PID"
    echo "💡 To view logs: tail -f $LOG_FILE"
else
    echo "❌ Metro failed to start!"
    echo "📝 Check logs:"
    tail -20 $LOG_FILE
    exit 1
fi
