# SSH Dashboard Backend

A robust Node.js backend service that monitors system devices by analyzing log files in `/var/log/remote/`. Each folder in this directory is treated as a separate device, and the backend extracts valuable information from their log files.

## Features

### 🔍 **Device Discovery**
- Automatically scans `/var/log/remote/` directory
- Treats each subfolder as a separate device
- Extracts device information from folder names (IP addresses, types)
- Real-time monitoring with file watchers

### 📊 **Log Analysis**
- Parses multiple log file types (auth.log, syslog, secure, etc.)
- Extracts SSH connection attempts and successes
- Counts errors, warnings, and failed login attempts
- Determines device status based on log activity

### 🚀 **REST API Endpoints**
- `GET /api/devices` - List all discovered devices
- `GET /api/devices/:id` - Get specific device details
- `GET /api/devices/:id/logs` - Get device log entries
- `POST /api/devices/refresh` - Trigger manual device scan
- `GET /api/status` - System status and metrics
- `GET /api/health` - Health check endpoint

### 🛡️ **Security & Performance**
- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- CORS configuration
- Winston logging
- Error handling and validation
- Memory-efficient log caching

## Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set environment variables (optional):**
   ```bash
   export LOG_DIR="/var/log/remote"
   export PORT=3001
   export NODE_ENV="development"
   ```

4. **Start the server:**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Documentation

### Get All Devices
```http
GET /api/devices
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "web-server-192.168.1.10",
      "name": "Web Server 192.168.1.10",
      "ip": "192.168.1.10",
      "type": "server",
      "status": "online",
      "lastSeen": "2025-11-13T10:30:00.000Z",
      "logFiles": [
        {
          "name": "auth.log",
          "path": "/var/log/remote/web-server-192.168.1.10/auth.log",
          "size": 15420,
          "modified": "2025-11-13T10:30:00.000Z"
        }
      ],
      "stats": {
        "totalLogs": 1250,
        "errorCount": 15,
        "warningCount": 8,
        "sshConnections": 45,
        "failedLogins": 3
      },
      "uptime": "Unknown"
    }
  ],
  "count": 1,
  "timestamp": "2025-11-13T10:30:00.000Z"
}
```

### Get Device Logs
```http
GET /api/devices/:deviceId/logs?lines=100&file=auth.log
```

**Parameters:**
- `lines` (optional): Number of log lines to return (default: 100)
- `file` (optional): Specific log file to read

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-11-13T10:25:00.000Z",
      "level": "info",
      "message": "Nov 13 10:25:00 web-server sshd[1234]: Accepted publickey for admin from 192.168.1.100",
      "file": "auth.log",
      "device": "web-server-192.168.1.10"
    }
  ],
  "count": 1,
  "device": "web-server-192.168.1.10",
  "timestamp": "2025-11-13T10:30:00.000Z"
}
```

### Refresh Devices
```http
POST /api/devices/refresh
```

Triggers a manual scan of the log directory to discover new devices or update existing ones.

### System Status
```http
GET /api/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "online",
    "uptime": 3600,
    "memoryUsage": {
      "rss": 52428800,
      "heapTotal": 29360128,
      "heapUsed": 20971520
    },
    "deviceCount": 4,
    "logDirectory": "/var/log/remote",
    "isScanning": false,
    "version": "1.0.0"
  },
  "timestamp": "2025-11-13T10:30:00.000Z"
}
```

## Configuration

### Environment Variables
- `LOG_DIR`: Directory to monitor (default: `/var/log/remote`)
- `PORT`: Server port (default: `3001`)
- `MAX_LOG_LINES`: Maximum log lines to process per file (default: `1000`)
- `REFRESH_INTERVAL`: Auto-refresh interval in ms (default: `30000`)
- `FRONTEND_URL`: Frontend URL for CORS (default: `*`)
- `NODE_ENV`: Environment mode (`development` or `production`)

### Log Directory Structure
The backend expects the following structure:
```
/var/log/remote/
├── web-server-192.168.1.10/
│   ├── auth.log
│   ├── syslog
│   └── daemon.log
├── database-server-192.168.1.15/
│   ├── auth.log
│   └── secure
└── router-192.168.1.1/
    ├── syslog
    └── messages
```

### Supported Log Files
- `auth.log` - Authentication logs
- `syslog` - System logs  
- `secure` - Security logs
- `messages` - General system messages
- `daemon.log` - Daemon logs
- `kern.log` - Kernel logs
- Any file with `.log` or `.txt` extension

## Device Type Detection

The backend automatically determines device types based on folder names:
- **server**: Contains "server" or "srv"
- **router**: Contains "router" or "rt" 
- **switch**: Contains "switch" or "sw"
- **firewall**: Contains "firewall" or "fw"
- **workstation**: Contains "workstation" or "ws"
- **server**: Default fallback

## Device Status Logic

Device status is determined by log file activity:
- **online**: Last log entry within 1 hour
- **warning**: Last log entry within 24 hours
- **offline**: No activity for 24+ hours or no logs found

## Log Analysis Features

The backend analyzes log content for:
- SSH connection attempts (successful and failed)
- Authentication failures
- Error messages and warnings
- System events and daemon activities
- Security-related events

## Sample Data Generation

If `/var/log/remote` doesn't exist, the backend automatically creates sample log structures with realistic data for demonstration purposes.

## Logging

The backend uses Winston for comprehensive logging:
- `logs/error.log` - Error messages only
- `logs/combined.log` - All log levels
- Console output for development

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet.js**: Security headers and protection
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Parameter sanitization
- **Error Handling**: Comprehensive error responses

## Development

### File Watching
The backend uses Chokidar to watch for file system changes:
- Automatically detects new log files
- Updates device statistics when logs change
- Handles file deletions gracefully

### Memory Management
- Efficient caching with Map objects
- Configurable log line limits
- Automatic cleanup of old data

## Integration with Frontend

The backend is designed to work seamlessly with the SSH Dashboard frontend. Update the frontend's `script.js` to use real API endpoints instead of mock data.

## Production Deployment

1. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name ssh-dashboard-backend
   ```

2. **Set up reverse proxy (Nginx example):**
   ```nginx
   location /api/ {
       proxy_pass http://localhost:3001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

3. **Configure log rotation:**
   ```bash
   # Add to logrotate configuration
   /var/log/ssh-dashboard-backend/*.log {
       daily
       missingok
       rotate 52
       compress
       delaycompress
       notifempty
   }
   ```

## Troubleshooting

### Common Issues
1. **Permission denied for `/var/log/remote`**: Ensure the Node.js process has read permissions
2. **High memory usage**: Reduce `MAX_LOG_LINES` environment variable
3. **Slow response times**: Check if log directory contains very large files

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and debug logging.

This backend provides a robust foundation for monitoring SSH devices through log file analysis while maintaining security and performance best practices.