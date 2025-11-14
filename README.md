# SSH Dashboard

A comprehensive web-based dashboard for system administrators to monitor and manage SSH connections to their devices.

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

## Quick Start

1. Clone or download the project files
2. Open `index.html` in a web browser
3. The dashboard loads with sample data to demonstrate functionality

## File Structure

```
ssh-dashboard/
├── index.html          # Main HTML structure
├── styles.css          # Complete CSS styling
├── script.js           # Dashboard JavaScript functionality
└── README.md           # This file
```

## Sample Data

The dashboard comes pre-loaded with sample data including:
- 6 mock devices (servers, router, firewall, switch)
- 3 active SSH connections
- System logs and alerts
- Realistic device metrics (CPU, memory, uptime)

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

Perfect for demonstrating SSH dashboard concepts or as a starting point for a production system!