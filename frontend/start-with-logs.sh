#!/bin/sh

# Get current PID
PID=$$

# Create log file with PID in the root logs directory
LOG_FILE="/app/logs/frontend_pid${PID}.log"

# Function to log with timestamp
log_with_timestamp() {
    while IFS= read -r line; do
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line" >> "$LOG_FILE"
        echo "$line"  # Also output to stdout for docker logs
    done
}

echo "Starting frontend with PID: $PID"
echo "Logs will be saved to: $LOG_FILE"

# Execute the command and pipe output through log_with_timestamp
exec npm run dev 2>&1 | log_with_timestamp