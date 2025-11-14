# SSH Dashboard

A comprehensive web-based dashboard for system administrators to monitor and manage SSH connections to their devices. Features both a modern frontend dashboard and a robust Node.js backend that analyzes log files from `/var/log/remote/` to discover and monitor devices.

## 🏗️ Architecture

- **Frontend**: Modern HTML5/CSS3/JavaScript dashboard with dark theme
- **Backend**: Node.js/Express.js API server with real-time log analysis
- **Data Source**: Analyzes log files in `/var/log/remote/` directory structure

## Features

### 🖥️ Dashboard Overview
- **Real-time Statistics**: Monitor total devices, active SSH connections, and system alerts
- **Device Status Breakdown**: View online, offline, and warning status devices at a glance
- **System Load Monitoring**: CPU and memory usage visualization
- **Recent Alerts**: Quick access to the latest system notifications

### 🔧 Device Management
- **Add/Remove Devices**: Easy device registration with IP, port, and type configuration
- **Device Types**: Support for servers, routers, switches, firewalls, and workstations
- **Status Monitoring**: Real-time device status tracking (online, offline, warning)
- **Device Search & Filter**: Quick device location with search and status filtering
- **Ping Functionality**: Test device connectivity directly from the dashboard

### 🔗 SSH Connection Monitoring
- **Active Connections View**: Monitor all current SSH sessions
- **Connection Details**: User, IP address, connection time, and session status
- **Session Management**: Terminate individual or all SSH connections
- **Connection History**: Track SSH activity over time

### 📊 System Monitoring
- **Network Traffic Charts**: Visualize network activity (placeholder for chart integration)
- **Connection History**: Historical data on SSH connections
- **Real-time Updates**: Automatic refresh with configurable intervals

### 📝 Logging System
- **Comprehensive Logs**: All system activities with timestamps
- **Log Levels**: Info, Warning, and Error categorization
- **Log Filtering**: Filter by log level for focused monitoring
- **Automatic Cleanup**: Configurable maximum log entries

### ⚙️ Settings & Configuration
- **Auto-refresh Settings**: Configurable refresh intervals (5-300 seconds)
- **Notification Preferences**: Desktop notifications, sound alerts, and email alerts
- **Data Management**: Log retention and cleanup settings
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology Stack

- **Frontend**: HTML5, CSS3 (Custom CSS Variables), Vanilla JavaScript
- **Styling**: Modern dark theme with CSS Grid and Flexbox
- **Icons**: Font Awesome 6.0
- **Storage**: Local Storage for settings persistence
- **Responsive**: Mobile-first responsive design

## 🚀 Quick Start

### Option 1: Frontend Only (Sample Data)
1. Open `index.html` in a web browser
2. The dashboard loads with sample data to demonstrate functionality
3. Toggle "Use Real Backend API" in settings to disable backend integration

### Option 2: Full Stack (Real Backend)
1. **Start the Backend:**
   ```bash
   cd backend
   ./start.sh
   ```
   
2. **Open the Frontend:**
   - Open `index.html` in a web browser
   - The dashboard will automatically connect to the backend at `http://localhost:3001`

3. **Backend Creates Sample Data:**
   - If `/var/log/remote/` doesn't exist, sample log structures are created
   - Real log directories are automatically discovered and monitored

### Option 3: Production Deployment
1. **Backend Setup:**
   ```bash
   cd backend
   npm install
   export LOG_DIR="/var/log/remote"
   export PORT=3001
   npm start
   ```

2. **Frontend Setup:**
   - Serve static files through nginx/apache
   - Update backend URL in dashboard settings

## 📁 File Structure

```
ssh-dashboard/
├── frontend/
│   ├── index.html              # Main HTML structure  
│   ├── styles.css              # Complete CSS styling
│   └── script.js               # Dashboard JavaScript functionality
├── backend/
│   ├── server.js               # Main backend server
│   ├── package.json            # Node.js dependencies
│   ├── start.sh                # Startup script
│   ├── .env.example            # Environment variables template
│   └── README.md               # Backend documentation
└── README.md                   # This file
```

### Expected Log Directory Structure
```
/var/log/remote/
├── web-server-192.168.1.10/
│   ├── auth.log                # SSH authentication logs
│   ├── syslog                  # System logs
│   └── daemon.log              # Daemon logs
├── database-server-192.168.1.15/
│   ├── auth.log
│   └── secure                  # Security logs
├── router-192.168.1.1/
│   └── messages                # Router logs
└── firewall-192.168.1.254/
    ├── auth.log
    └── kern.log                # Kernel logs
```

## 📊 Data Sources

### Real Backend Data
When connected to the backend, the dashboard displays:
- **Discovered Devices**: Automatically found from `/var/log/remote/` folders
- **Real SSH Activity**: Parsed from auth.log files
- **System Events**: Extracted from syslog, secure, messages files  
- **Error Analysis**: Automatic counting of errors, warnings, failed logins
- **Device Status**: Determined by recent log activity

### Sample Data Mode
When backend is unavailable, sample data includes:
- 3 mock devices (servers, router) 
- 1 active SSH connection
- System logs and alerts
- Realistic device metrics

## 🔧 Backend API Integration

### Automatic Device Discovery
The backend automatically:
1. Scans `/var/log/remote/` directory
2. Treats each subfolder as a device
3. Extracts device info from folder names (IP addresses, types)
4. Analyzes log files for SSH activity and system events
5. Watches for real-time log file changes

### Device Type Detection
Device types are automatically determined from folder names:
- **server**: Contains "server", "srv"
- **router**: Contains "router", "rt"  
- **switch**: Contains "switch", "sw"
- **firewall**: Contains "firewall", "fw"
- **workstation**: Contains "workstation", "ws"

### Log File Support
- `auth.log` - SSH authentication events
- `syslog` - General system events
- `secure` - Security-related events  
- `messages` - System messages
- `daemon.log` - Daemon activity
- `kern.log` - Kernel events
- Any `.log` or `.txt` files

## Customization

### Adding Real Device Integration

To integrate with real devices, modify the `SSHDashboard` class in `script.js`:

1. **Replace mock data** with actual device API calls
2. **Implement real SSH connection monitoring** using backend services
3. **Connect to actual system metrics** (CPU, memory, network)
4. **Add authentication** for secure access

### Styling Customization

The CSS uses CSS custom properties (variables) for easy theming:

```css
:root {
    --primary-color: #00d4aa;    /* Change primary color */
    --bg-primary: #0f172a;       /* Change background */
    --text-primary: #f1f5f9;     /* Change text color */
    /* ... more variables */
}
```

### Adding Chart Libraries

For production use, integrate charting libraries like:
- Chart.js for interactive charts
- D3.js for custom visualizations
- ApexCharts for modern chart components

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design included

## Security Considerations

This is a frontend-only demo. For production use:

1. **Implement backend API** for device management
2. **Add authentication & authorization**
3. **Use HTTPS** for secure communication
4. **Validate all inputs** on server-side
5. **Implement proper session management**

## Future Enhancements

- Real-time WebSocket connections for live updates
- Advanced charting and analytics
- User management and role-based access
- Integration with popular monitoring tools
- Mobile app version
- Export functionality for reports
- Advanced alerting rules and notifications

## License

This project is open source and available under the MIT License.

## Demo Features

The current implementation includes:
- ✅ Responsive dashboard layout
- ✅ Device management (CRUD operations)
- ✅ SSH connection simulation
- ✅ Real-time UI updates
- ✅ Settings persistence
- ✅ Search and filtering
- ✅ Notification system
- ✅ Logging system
- ✅ Modern dark theme UI

## 🔍 Backend API Endpoints

- `GET /api/devices` - List all discovered devices with statistics
- `GET /api/devices/:id` - Get specific device details  
- `GET /api/devices/:id/logs?lines=100&file=auth.log` - Get device log entries
- `POST /api/devices/refresh` - Trigger manual device scan
- `GET /api/status` - Backend system status and metrics
- `GET /api/health` - Health check endpoint

## 🛠️ Configuration

### Environment Variables (Backend)
```bash
LOG_DIR=/var/log/remote          # Directory to monitor
PORT=3001                        # Backend server port  
MAX_LOG_LINES=1000              # Max log lines per file to process
REFRESH_INTERVAL=30000          # Auto-refresh interval (ms)
NODE_ENV=development            # Environment mode
```

### Dashboard Settings (Frontend)
- **Auto Refresh**: Configurable 5-300 second intervals
- **Backend API Toggle**: Switch between real API and sample data
- **Backend URL**: Configurable API endpoint
- **Notifications**: Desktop alerts, sound alerts, email alerts
- **Log Management**: Maximum log entries, log level filtering

## 🔒 Security Features

### Backend Security
- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- CORS configuration
- Input validation and sanitization
- Comprehensive error handling
- Winston logging for audit trails

### Production Considerations
- Use HTTPS in production
- Implement authentication/authorization
- Set up proper log rotation
- Configure firewall rules
- Use reverse proxy (nginx/apache)
- Set appropriate file permissions for log directories

## 🚀 Production Deployment

### Backend Deployment
```bash
# Using PM2 process manager
npm install -g pm2
cd backend
pm2 start server.js --name ssh-dashboard-backend

# Using systemd
sudo cp ssh-dashboard-backend.service /etc/systemd/system/
sudo systemctl enable ssh-dashboard-backend
sudo systemctl start ssh-dashboard-backend
```

### Frontend Deployment
```nginx
# Nginx configuration
server {
    listen 80;
    server_name dashboard.example.com;
    root /path/to/ssh-dashboard;
    index index.html;
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔧 Troubleshooting

### Common Issues
1. **"Backend not available"**: Check if backend is running on port 3001
2. **Permission denied**: Ensure read access to `/var/log/remote/`
3. **No devices found**: Check log directory structure and file permissions
4. **High memory usage**: Reduce `MAX_LOG_LINES` environment variable

### Debug Mode
```bash
export NODE_ENV=development
export LOG_LEVEL=debug
npm start
```

## 🔮 Future Enhancements

- Real-time WebSocket updates
- Advanced log parsing with regex patterns
- Integration with monitoring tools (Nagios, Zabbix)
- User authentication and role-based access
- Advanced alerting rules and thresholds
- Export functionality (CSV, PDF reports)
- Mobile-responsive improvements
- Database storage for historical data

Perfect for system administrators who need to monitor SSH activity across multiple devices through centralized log analysis!