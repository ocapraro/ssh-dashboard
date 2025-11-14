// SSH Dashboard JavaScript
class SSHDashboard {
    constructor() {
        this.devices = [];
        this.connections = [];
        this.logs = [];
        this.alerts = [];
        this.settings = {
            autoRefresh: true,
            refreshInterval: 30,
            maxLogs: 1000,
            desktopNotifications: true,
            soundAlerts: true,
            emailAlerts: false
        };
        
        this.init();
        this.loadSampleData();
        this.startAutoRefresh();
    }

    init() {
        this.bindEvents();
        this.initializeCharts();
        this.loadSettings();
        this.requestNotificationPermission();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Header actions
        document.getElementById('refresh-btn').addEventListener('click', () => this.refreshData());
        document.getElementById('add-device-btn').addEventListener('click', () => this.showAddDeviceModal());

        // Modal actions
        document.getElementById('add-device-form').addEventListener('submit', (e) => this.handleAddDevice(e));
        document.getElementById('cancel-add-device').addEventListener('click', () => this.hideAddDeviceModal());
        document.querySelector('.modal-close').addEventListener('click', () => this.hideAddDeviceModal());

        // Search and filter
        document.getElementById('device-search').addEventListener('input', (e) => this.filterDevices(e.target.value));
        document.getElementById('device-filter').addEventListener('change', (e) => this.filterDevicesByStatus(e.target.value));

        // Settings
        document.getElementById('auto-refresh').addEventListener('change', (e) => {
            this.settings.autoRefresh = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('refresh-interval').addEventListener('change', (e) => {
            this.settings.refreshInterval = parseInt(e.target.value);
            this.saveSettings();
            this.startAutoRefresh();
        });

        // Log controls
        document.getElementById('log-level').addEventListener('change', (e) => this.filterLogs(e.target.value));
        document.getElementById('clear-logs-btn').addEventListener('click', () => this.clearLogs());

        // Close modal when clicking outside
        document.getElementById('add-device-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAddDeviceModal();
            }
        });
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionName).classList.add('active');

        // Refresh section-specific data
        switch(sectionName) {
            case 'devices':
                this.renderDevices();
                break;
            case 'connections':
                this.renderConnections();
                break;
            case 'monitoring':
                this.updateCharts();
                break;
            case 'logs':
                this.renderLogs();
                break;
            case 'overview':
            default:
                this.updateOverview();
                break;
        }
    }

    loadSampleData() {
        // Sample devices
        this.devices = [
            {
                id: 1,
                name: 'Web Server 01',
                ip: '192.168.1.10',
                port: 22,
                type: 'server',
                status: 'online',
                lastSeen: new Date(),
                cpu: 45,
                memory: 78,
                uptime: '15d 8h 32m'
            },
            {
                id: 2,
                name: 'Database Server',
                ip: '192.168.1.15',
                port: 22,
                type: 'server',
                status: 'online',
                lastSeen: new Date(Date.now() - 300000),
                cpu: 23,
                memory: 65,
                uptime: '32d 12h 15m'
            },
            {
                id: 3,
                name: 'Main Router',
                ip: '192.168.1.1',
                port: 22,
                type: 'router',
                status: 'warning',
                lastSeen: new Date(Date.now() - 900000),
                cpu: 12,
                memory: 34,
                uptime: '45d 3h 22m'
            },
            {
                id: 4,
                name: 'Backup Server',
                ip: '192.168.1.20',
                port: 22,
                type: 'server',
                status: 'offline',
                lastSeen: new Date(Date.now() - 3600000),
                cpu: 0,
                memory: 0,
                uptime: 'Offline'
            },
            {
                id: 5,
                name: 'Firewall',
                ip: '192.168.1.254',
                port: 22,
                type: 'firewall',
                status: 'online',
                lastSeen: new Date(),
                cpu: 8,
                memory: 25,
                uptime: '89d 15h 45m'
            },
            {
                id: 6,
                name: 'Switch 01',
                ip: '192.168.1.2',
                port: 22,
                type: 'switch',
                status: 'online',
                lastSeen: new Date(Date.now() - 120000),
                cpu: 15,
                memory: 42,
                uptime: '12d 6h 18m'
            }
        ];

        // Sample connections
        this.connections = [
            {
                id: 1,
                deviceId: 1,
                deviceName: 'Web Server 01',
                user: 'admin',
                ip: '192.168.1.100',
                connectedSince: new Date(Date.now() - 7200000),
                status: 'active',
                sessionId: 'ssh-001'
            },
            {
                id: 2,
                deviceId: 2,
                deviceName: 'Database Server',
                user: 'dbadmin',
                ip: '192.168.1.101',
                connectedSince: new Date(Date.now() - 3600000),
                status: 'active',
                sessionId: 'ssh-002'
            },
            {
                id: 3,
                deviceId: 1,
                deviceName: 'Web Server 01',
                user: 'developer',
                ip: '192.168.1.102',
                connectedSince: new Date(Date.now() - 1800000),
                status: 'idle',
                sessionId: 'ssh-003'
            }
        ];

        // Sample logs
        this.addLog('info', 'SSH Dashboard started successfully');
        this.addLog('info', 'Loaded 6 devices from configuration');
        this.addLog('warning', 'Device Main Router (192.168.1.1) showing high response time');
        this.addLog('info', 'New SSH connection established: admin@192.168.1.100 -> Web Server 01');
        this.addLog('error', 'Failed SSH attempt from 203.0.113.42');
        this.addLog('info', 'Database backup completed successfully');

        // Sample alerts
        this.alerts = [
            {
                id: 1,
                type: 'warning',
                message: 'High CPU usage on Web Server 01',
                time: new Date(Date.now() - 600000),
                device: 'Web Server 01'
            },
            {
                id: 2,
                type: 'error',
                message: 'Backup Server is offline',
                time: new Date(Date.now() - 3600000),
                device: 'Backup Server'
            },
            {
                id: 3,
                type: 'info',
                message: 'System maintenance scheduled for tonight',
                time: new Date(Date.now() - 7200000),
                device: 'System'
            }
        ];

        this.updateOverview();
        this.renderDevices();
        this.renderConnections();
        this.renderLogs();
    }

    updateOverview() {
        // Update stats
        const onlineDevices = this.devices.filter(d => d.status === 'online').length;
        const offlineDevices = this.devices.filter(d => d.status === 'offline').length;
        const warningDevices = this.devices.filter(d => d.status === 'warning').length;
        const activeConnections = this.connections.filter(c => c.status === 'active').length;

        document.getElementById('total-devices').textContent = this.devices.length;
        document.getElementById('active-connections').textContent = activeConnections;
        document.getElementById('alerts-count').textContent = this.alerts.length;

        document.getElementById('online-devices').textContent = onlineDevices;
        document.getElementById('offline-devices').textContent = offlineDevices;
        document.getElementById('warning-devices').textContent = warningDevices;

        // Calculate today's connections (mock data)
        document.getElementById('connections-today').textContent = Math.floor(Math.random() * 50) + 20;
        document.getElementById('failed-attempts').textContent = Math.floor(Math.random() * 10) + 2;

        // Update system load (mock data)
        const cpuUsage = Math.floor(Math.random() * 40) + 20;
        const memoryUsage = Math.floor(Math.random() * 50) + 30;

        document.getElementById('cpu-usage').style.width = `${cpuUsage}%`;
        document.getElementById('cpu-percentage').textContent = `${cpuUsage}%`;
        document.getElementById('memory-usage').style.width = `${memoryUsage}%`;
        document.getElementById('memory-percentage').textContent = `${memoryUsage}%`;

        // Update recent alerts
        this.renderRecentAlerts();
    }

    renderRecentAlerts() {
        const container = document.getElementById('recent-alerts');
        const recentAlerts = this.alerts.slice(0, 3);

        if (recentAlerts.length === 0) {
            container.innerHTML = '<div class="text-muted">No recent alerts</div>';
            return;
        }

        container.innerHTML = recentAlerts.map(alert => `
            <div class="alert-item">
                <i class="fas fa-exclamation-triangle alert-icon"></i>
                <div class="alert-content">
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${this.formatTime(alert.time)}</div>
                </div>
            </div>
        `).join('');
    }

    renderDevices() {
        const container = document.getElementById('devices-grid');
        
        container.innerHTML = this.devices.map(device => `
            <div class="device-card" data-device-id="${device.id}">
                <div class="device-header">
                    <div class="device-info">
                        <div class="device-name">${device.name}</div>
                        <div class="device-ip">${device.ip}:${device.port}</div>
                    </div>
                    <div class="device-status ${device.status}">${device.status}</div>
                </div>
                <div class="device-details">
                    <div>Type: ${device.type}</div>
                    <div>Uptime: ${device.uptime}</div>
                </div>
                <div class="device-details">
                    <div>CPU: ${device.cpu}%</div>
                    <div>Memory: ${device.memory}%</div>
                </div>
                <div class="device-actions">
                    <button class="btn btn-sm btn-primary" onclick="dashboard.connectToDevice(${device.id})">
                        <i class="fas fa-terminal"></i> Connect
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="dashboard.pingDevice(${device.id})">
                        <i class="fas fa-heartbeat"></i> Ping
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="dashboard.removeDevice(${device.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderConnections() {
        const tbody = document.querySelector('#connections-table tbody');
        
        tbody.innerHTML = this.connections.map(conn => `
            <tr>
                <td>${conn.deviceName}</td>
                <td>${conn.user}</td>
                <td>${conn.ip}</td>
                <td>${this.formatTime(conn.connectedSince)}</td>
                <td><span class="connection-status ${conn.status}">${conn.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="dashboard.killConnection(${conn.id})">
                        <i class="fas fa-times"></i> Kill
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderLogs() {
        const container = document.getElementById('logs-container');
        
        if (this.logs.length === 0) {
            container.innerHTML = '<div class="log-entry"><span class="text-muted">No logs available</span></div>';
            return;
        }

        container.innerHTML = this.logs.map(log => `
            <div class="log-entry">
                <span class="log-time">${this.formatDateTime(log.time)}</span>
                <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    showAddDeviceModal() {
        document.getElementById('add-device-modal').classList.add('show');
    }

    hideAddDeviceModal() {
        document.getElementById('add-device-modal').classList.remove('show');
        document.getElementById('add-device-form').reset();
    }

    handleAddDevice(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const device = {
            id: this.devices.length + 1,
            name: document.getElementById('device-name').value,
            ip: document.getElementById('device-ip').value,
            port: parseInt(document.getElementById('device-port').value),
            type: document.getElementById('device-type').value,
            status: 'offline', // New devices start as offline
            lastSeen: new Date(),
            cpu: 0,
            memory: 0,
            uptime: 'Never connected'
        };

        this.devices.push(device);
        this.addLog('info', `Added new device: ${device.name} (${device.ip})`);
        this.hideAddDeviceModal();
        this.renderDevices();
        this.updateOverview();
        
        this.showNotification('Device Added', `${device.name} has been added to the dashboard`);
    }

    connectToDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;

        this.addLog('info', `Attempting SSH connection to ${device.name} (${device.ip})`);
        
        // Simulate connection attempt
        setTimeout(() => {
            if (device.status === 'online') {
                this.addLog('info', `SSH connection established to ${device.name}`);
                this.showNotification('SSH Connected', `Connected to ${device.name}`);
                
                // Add mock connection
                const newConnection = {
                    id: this.connections.length + 1,
                    deviceId: device.id,
                    deviceName: device.name,
                    user: 'admin',
                    ip: '192.168.1.' + (100 + Math.floor(Math.random() * 50)),
                    connectedSince: new Date(),
                    status: 'active',
                    sessionId: `ssh-${Date.now()}`
                };
                
                this.connections.push(newConnection);
                this.renderConnections();
                this.updateOverview();
            } else {
                this.addLog('error', `Failed to connect to ${device.name} - device is ${device.status}`);
                this.showNotification('Connection Failed', `Cannot connect to ${device.name}`, 'error');
            }
        }, 1000);
    }

    pingDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;

        this.addLog('info', `Pinging ${device.name} (${device.ip})`);
        
        // Simulate ping
        setTimeout(() => {
            const pingTime = Math.floor(Math.random() * 100) + 10;
            this.addLog('info', `Ping to ${device.name}: ${pingTime}ms`);
            
            // Update device last seen
            device.lastSeen = new Date();
            if (device.status === 'offline') {
                device.status = 'online';
                this.renderDevices();
                this.updateOverview();
            }
        }, 500);
    }

    removeDevice(deviceId) {
        if (!confirm('Are you sure you want to remove this device?')) return;
        
        const deviceIndex = this.devices.findIndex(d => d.id === deviceId);
        if (deviceIndex === -1) return;
        
        const device = this.devices[deviceIndex];
        this.devices.splice(deviceIndex, 1);
        
        // Remove associated connections
        this.connections = this.connections.filter(c => c.deviceId !== deviceId);
        
        this.addLog('warning', `Removed device: ${device.name} (${device.ip})`);
        this.renderDevices();
        this.renderConnections();
        this.updateOverview();
        
        this.showNotification('Device Removed', `${device.name} has been removed from the dashboard`);
    }

    killConnection(connectionId) {
        const connectionIndex = this.connections.findIndex(c => c.id === connectionId);
        if (connectionIndex === -1) return;
        
        const connection = this.connections[connectionIndex];
        this.connections.splice(connectionIndex, 1);
        
        this.addLog('warning', `Terminated SSH connection: ${connection.user}@${connection.ip} -> ${connection.deviceName}`);
        this.renderConnections();
        this.updateOverview();
        
        this.showNotification('Connection Terminated', `SSH session ${connection.sessionId} has been terminated`);
    }

    filterDevices(searchTerm) {
        const deviceCards = document.querySelectorAll('.device-card');
        
        deviceCards.forEach(card => {
            const deviceName = card.querySelector('.device-name').textContent.toLowerCase();
            const deviceIp = card.querySelector('.device-ip').textContent.toLowerCase();
            
            if (deviceName.includes(searchTerm.toLowerCase()) || deviceIp.includes(searchTerm.toLowerCase())) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    filterDevicesByStatus(status) {
        const deviceCards = document.querySelectorAll('.device-card');
        
        deviceCards.forEach(card => {
            if (status === 'all') {
                card.style.display = 'block';
            } else {
                const deviceStatus = card.querySelector('.device-status').textContent;
                card.style.display = deviceStatus === status ? 'block' : 'none';
            }
        });
    }

    filterLogs(level) {
        const logEntries = document.querySelectorAll('.log-entry');
        
        logEntries.forEach(entry => {
            const logLevel = entry.querySelector('.log-level');
            if (!logLevel) return;
            
            if (level === 'all') {
                entry.style.display = 'flex';
            } else {
                entry.style.display = logLevel.textContent.toLowerCase() === level ? 'flex' : 'none';
            }
        });
    }

    clearLogs() {
        if (!confirm('Are you sure you want to clear all logs?')) return;
        
        this.logs = [];
        this.renderLogs();
        this.addLog('info', 'Log history cleared');
    }

    addLog(level, message) {
        const log = {
            id: this.logs.length + 1,
            level,
            message,
            time: new Date()
        };
        
        this.logs.unshift(log);
        
        // Keep only max logs
        if (this.logs.length > this.settings.maxLogs) {
            this.logs = this.logs.slice(0, this.settings.maxLogs);
        }
        
        // If logs section is active, re-render
        if (document.getElementById('logs').classList.contains('active')) {
            this.renderLogs();
        }
    }

    refreshData() {
        this.addLog('info', 'Manual refresh triggered');
        
        // Simulate data refresh
        this.devices.forEach(device => {
            if (device.status === 'online') {
                device.cpu = Math.max(0, Math.min(100, device.cpu + (Math.random() - 0.5) * 10));
                device.memory = Math.max(0, Math.min(100, device.memory + (Math.random() - 0.5) * 5));
                device.lastSeen = new Date();
            }
        });
        
        // Update current view
        const activeSection = document.querySelector('.content-section.active').id;
        this.showSection(activeSection);
        
        this.showNotification('Data Refreshed', 'Dashboard data has been updated');
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        if (this.settings.autoRefresh) {
            this.refreshTimer = setInterval(() => {
                this.refreshData();
            }, this.settings.refreshInterval * 1000);
        }
    }

    initializeCharts() {
        // Placeholder for chart initialization
        // In a real implementation, you would use a charting library like Chart.js
        const networkChart = document.getElementById('network-chart');
        const connectionChart = document.getElementById('connection-chart');
        
        if (networkChart && connectionChart) {
            // Mock chart data display
            networkChart.getContext('2d').fillText('Network Traffic Chart', 50, 100);
            connectionChart.getContext('2d').fillText('Connection History Chart', 50, 100);
        }
    }

    updateCharts() {
        // Placeholder for chart updates
        this.addLog('info', 'Charts updated');
    }

    loadSettings() {
        const saved = localStorage.getItem('sshDashboardSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Apply settings to UI
        document.getElementById('auto-refresh').checked = this.settings.autoRefresh;
        document.getElementById('refresh-interval').value = this.settings.refreshInterval;
        document.getElementById('max-logs').value = this.settings.maxLogs;
        document.getElementById('desktop-notifications').checked = this.settings.desktopNotifications;
        document.getElementById('sound-alerts').checked = this.settings.soundAlerts;
        document.getElementById('email-alerts').checked = this.settings.emailAlerts;
    }

    saveSettings() {
        localStorage.setItem('sshDashboardSettings', JSON.stringify(this.settings));
        this.addLog('info', 'Settings saved');
    }

    requestNotificationPermission() {
        if ('Notification' in window && this.settings.desktopNotifications) {
            Notification.requestPermission();
        }
    }

    showNotification(title, message, type = 'info') {
        // Desktop notification
        if ('Notification' in window && Notification.permission === 'granted' && this.settings.desktopNotifications) {
            new Notification(title, {
                body: message,
                icon: '/favicon.ico'
            });
        }
        
        // Sound alert
        if (this.settings.soundAlerts && type === 'error') {
            // In a real implementation, you would play an audio file
            console.log('🔊 Alert sound would play here');
        }
        
        // Add to alerts if it's a warning or error
        if (type === 'warning' || type === 'error') {
            this.alerts.unshift({
                id: Date.now(),
                type,
                message: `${title}: ${message}`,
                time: new Date(),
                device: 'System'
            });
            
            // Keep only recent alerts
            this.alerts = this.alerts.slice(0, 10);
            this.updateOverview();
        }
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)} minutes ago`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)} hours ago`;
        } else {
            return `${Math.floor(diff / 86400000)} days ago`;
        }
    }

    formatDateTime(date) {
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new SSHDashboard();
});

// Expose dashboard globally for onclick handlers
window.dashboard = dashboard;