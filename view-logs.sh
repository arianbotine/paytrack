#!/bin/bash

# Script to view PayTrack logs

echo "=== PayTrack Logs ==="
echo "Available log files:"
echo ""

echo "Backend logs:"
ls -la logs/backend_pid*.log 2>/dev/null || echo "No backend log files found"

echo ""
echo "Frontend logs:"
ls -la logs/frontend_pid*.log 2>/dev/null || echo "No frontend log files found"

echo ""
echo "Commands:"
echo "  tail -f logs/\$(ls -t logs/backend_pid*.log | head -1)     # Follow latest backend log"
echo "  tail -f logs/\$(ls -t logs/frontend_pid*.log | head -1)   # Follow latest frontend log"
echo "  cat logs/\$(ls -t logs/backend_pid*.log | head -1)        # View latest backend log"
echo "  cat logs/\$(ls -t logs/frontend_pid*.log | head -1)       # View latest frontend log"