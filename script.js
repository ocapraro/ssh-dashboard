// SSH Dashboard JavaScript
class SSHDashboard {
    constructor() {
        this.devices = [];
        this.connections = [];
        this.logs = [];
        this.systemLogs = [];
        this.alerts = [];
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.currentDeviceForLogs = null;
        this.currentDeviceLogs = [];
        this.settings = {
            autoRefresh: true,
            refreshInterval: 30,
            maxLogs: 1000,
            useRealAPI: true // Toggle between real API and mock data
        };
        
        this.init();
        this.loadData();
        this.startAutoRefresh();
    }

    init() {
        this.bindEvents();
        this.initializeCharts();
        this.loadSettings();
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

        // Logs modal actions
        const logsModalClose = document.getElementById('logs-modal-close');
        const closeLogsModalBtn = document.getElementById('close-logs-modal-btn');
        const refreshLogsBtn = document.getElementById('refresh-logs-btn');
        const logsModalFilter = document.getElementById('logs-modal-filter');
        
        if (logsModalClose) {
            logsModalClose.addEventListener('click', () => this.hideLogsModal());
        }
        if (closeLogsModalBtn) {
            closeLogsModalBtn.addEventListener('click', () => this.hideLogsModal());
        }
        if (refreshLogsBtn) {
            refreshLogsBtn.addEventListener('click', () => this.refreshCurrentDeviceLogs());
        }
        if (logsModalFilter) {
            logsModalFilter.addEventListener('change', (e) => this.filterLogsModal(e.target.value));
        }

        // Search and filter
        document.getElementById('device-search').addEventListener('input', (e) => this.filterDevices(e.target.value));
        document.getElementById('device-filter').addEventListener('change', (e) => this.filterDevicesByStatus(e.target.value));

        // Device action buttons (using event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.device-logs-btn')) {
                const deviceId = e.target.closest('.device-logs-btn').getAttribute('data-device-id');
                console.log('Logs button clicked for device:', deviceId);
                this.viewDeviceLogs(deviceId);
            } else if (e.target.closest('.device-connect-btn')) {
                const deviceId = e.target.closest('.device-connect-btn').getAttribute('data-device-id');
                console.log('Connect button clicked for device:', deviceId);
                this.connectToDevice(deviceId);
            } else if (e.target.closest('.device-ping-btn')) {
                const deviceId = e.target.closest('.device-ping-btn').getAttribute('data-device-id');
                console.log('Ping button clicked for device:', deviceId);
                this.pingDevice(deviceId);
            }
        });

        // Settings (simplified)
        // Auto-refresh and API settings are now hardcoded for simplicity

        // Log controls
        document.getElementById('log-level').addEventListener('change', (e) => this.filterLogs(e.target.value));
        document.getElementById('clear-logs-btn').addEventListener('click', () => this.clearLogs());

        // Close modal when clicking outside
        document.getElementById('add-device-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAddDeviceModal();
            }
        });

        const deviceLogsModal = document.getElementById('device-logs-modal');
        if (deviceLogsModal) {
            deviceLogsModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.hideLogsModal();
                }
            });
        }
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

    async loadData() {
        if (this.settings.useRealAPI) {
            await this.loadRealData();
        } else {
            this.loadSampleData();
        }
    }

    async loadRealData() {
        try {
            // Load devices from backend
            const response = await fetch(`${this.apiBaseUrl}/devices`);
            if (response.ok) {
                const result = await response.json();
                this.devices = result.data.map(device => ({
                    ...device,
                    // Add default values for properties expected by frontend
                    port: device.port || 22,
                    cpu: Math.floor(Math.random() * 50) + 10, // Mock CPU data
                    memory: Math.floor(Math.random() * 60) + 20 // Mock memory data
                }));
                
                this.addLog('info', `Loaded ${this.devices.length} devices from backend`);
            } else {
                throw new Error(`Backend not available (${response.status})`);
            }
        } catch (error) {
            this.addLog('error', `Failed to connect to backend: ${error.message}`);
            this.showNotification('Backend Error', 'Using mock data - backend not available', 'warning');
            this.loadSampleData();
            return;
        }

        // Generate mock connections based on real devices
        this.generateMockConnections();

        // Initialize alerts
        this.alerts = [];
        this.generateAlertsFromDevices();

        this.updateOverview();
        this.renderDevices();
        this.renderConnections();
        this.renderLogs();
    }

    generateMockConnections() {
        this.connections = [];
        const onlineDevices = this.devices.filter(d => d.status === 'online');
        
        // Create mock SSH connections for online devices
        onlineDevices.slice(0, 3).forEach((device, index) => {
            this.connections.push({
                id: index + 1,
                deviceId: device.id,
                deviceName: device.name,
                user: ['admin', 'root', 'developer'][index] || 'admin',
                ip: `192.168.1.${100 + index}`,
                connectedSince: new Date(Date.now() - (Math.random() * 7200000)),
                status: Math.random() > 0.3 ? 'active' : 'idle',
                sessionId: `ssh-${Date.now()}-${index}`
            });
        });
    }

    generateAlertsFromDevices() {
        this.devices.forEach(device => {
            if (device.status === 'offline') {
                this.alerts.push({
                    id: Date.now() + Math.random(),
                    type: 'error',
                    message: `Device ${device.name} is offline`,
                    time: new Date(Date.now() - Math.random() * 3600000),
                    device: device.name
                });
            } else if (device.status === 'warning') {
                this.alerts.push({
                    id: Date.now() + Math.random(),
                    type: 'warning',
                    message: `Device ${device.name} showing warnings`,
                    time: new Date(Date.now() - Math.random() * 1800000),
                    device: device.name
                });
            }
        });

        // Add some general alerts
        if (this.devices.some(d => d.stats && d.stats.failedLogins > 0)) {
            this.alerts.push({
                id: Date.now() + Math.random(),
                type: 'warning',
                message: 'Multiple failed login attempts detected',
                time: new Date(Date.now() - Math.random() * 900000),
                device: 'System'
            });
        }
    }

    loadSampleData() {
        // Sample devices (fallback when backend is not available)
        this.devices = [
            {
                id: 'web-server-sample',
                name: 'Web Server 01 (Sample)',
                ip: '192.168.1.10',
                port: 22,
                type: 'server',
                status: 'online',
                lastSeen: new Date(),
                cpu: 45,
                memory: 78,
                uptime: '15d 8h 32m',
                stats: { errorCount: 5, warningCount: 2, sshConnections: 25, failedLogins: 1 }
            },
            {
                id: 'database-server-sample',
                name: 'Database Server (Sample)',
                ip: '192.168.1.15',
                port: 22,
                type: 'server',
                status: 'online',
                lastSeen: new Date(Date.now() - 300000),
                cpu: 23,
                memory: 65,
                uptime: '32d 12h 15m',
                stats: { errorCount: 2, warningCount: 1, sshConnections: 15, failedLogins: 0 }
            },
            {
                id: 'main-router-sample',
                name: 'Main Router (Sample)',
                ip: '192.168.1.1',
                port: 22,
                type: 'router',
                status: 'warning',
                lastSeen: new Date(Date.now() - 900000),
                cpu: 12,
                memory: 34,
                uptime: '45d 3h 22m',
                stats: { errorCount: 8, warningCount: 5, sshConnections: 8, failedLogins: 2 }
            }
        ];

        // Sample connections
        this.connections = [
            {
                id: 1,
                deviceId: 'web-server-sample',
                deviceName: 'Web Server 01 (Sample)',
                user: 'admin',
                ip: '192.168.1.100',
                connectedSince: new Date(Date.now() - 7200000),
                status: 'active',
                sessionId: 'ssh-001-sample'
            }
        ];

        // Sample logs
        this.addLog('info', 'SSH Dashboard started successfully');
        this.addLog('warning', 'Backend not available - using sample data');
        this.addLog('info', 'Loaded 3 sample devices');

        // Sample alerts
        this.alerts = [
            {
                id: 1,
                type: 'warning',
                message: 'Backend API not available - using sample data',
                time: new Date(),
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
        
        container.innerHTML = this.devices.map(device => {
            const deviceId = JSON.stringify(device.id); // Safely stringify for onclick
            const stats = device.stats || {};
            
            return `
                <div class="device-card" data-device-id="${device.id}">
                    <div class="device-header">
                        <div class="device-info">
                            <div class="device-name">${device.name}</div>
                            <div class="device-ip">${device.ip}:${device.port || 22}</div>
                        </div>
                        <div class="device-status ${device.status}">${device.status}</div>
                    </div>
                    <div class="device-details">
                        <div>Type: ${device.type}</div>
                        <div>Last Seen: ${device.lastSeen ? this.formatTime(new Date(device.lastSeen)) : 'Never'}</div>
                    </div>
                    ${device.cpu !== undefined ? `
                    <div class="device-details">
                        <div>CPU: ${device.cpu}%</div>
                        <div>Memory: ${device.memory}%</div>
                    </div>
                    ` : ''}
                    ${Object.keys(stats).length > 0 ? `
                    <div class="device-details">
                        <div>SSH: ${stats.sshConnections || 0}</div>
                        <div>Errors: ${stats.errorCount || 0}</div>
                    </div>
                    <div class="device-details">
                        <div>Warnings: ${stats.warningCount || 0}</div>
                        <div>Failed Logins: ${stats.failedLogins || 0}</div>
                    </div>
                    ` : ''}
                    <div class="device-actions">
                        <button class="btn btn-sm btn-primary device-connect-btn" data-device-id="${device.id}">
                            <i class="fas fa-terminal"></i> Connect
                        </button>
                        <button class="btn btn-sm btn-secondary device-logs-btn" data-device-id="${device.id}">
                            <i class="fas fa-file-alt"></i> Logs
                        </button>
                        <button class="btn btn-sm btn-secondary device-ping-btn" data-device-id="${device.id}">
                            <i class="fas fa-heartbeat"></i> Ping
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async viewDeviceLogs(deviceId) {
        console.log('viewDeviceLogs called with deviceId:', deviceId);
        console.log('Available devices:', this.devices.map(d => ({ id: d.id, name: d.name })));
        
        const device = this.devices.find(d => d.id == deviceId || d.id === deviceId);
        if (!device) {
            console.error('Device not found:', deviceId);
            this.addLog('error', `Device not found: ${deviceId}`);
            return;
        }

        console.log('Found device:', device.name);
        this.addLog('info', `Loading logs for device: ${device.name}`);

        if (!this.settings.useRealAPI) {
            this.generateSampleDeviceLogs(device);
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/devices/${encodeURIComponent(deviceId)}/logs?lines=50`);
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data) {
                    this.displayDeviceLogs(device, result.data);
                } else {
                    throw new Error('No log data received from API');
                }
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {
            this.addLog('error', `Failed to load logs for device ${device.name}: ${error.message}`);
            
            // Fallback to sample logs
            this.generateSampleDeviceLogs(device);
        }
    }

    generateSampleDeviceLogs(device) {
        const now = Date.now();
        const deviceHost = device.name.toLowerCase().replace(/\s+/g, '-');
        
        const sampleLogs = [
            {
                level: 'info',
                message: `Nov 13 ${this.formatLogTime(now - 180000)} ${deviceHost} sshd[1234]: Accepted publickey for admin from 192.168.1.100 port 52345 ssh2`,
                timestamp: new Date(now - 180000)
            },
            {
                level: 'info',
                message: `Nov 13 ${this.formatLogTime(now - 240000)} ${deviceHost} sshd[1234]: pam_unix(sshd:session): session opened for user admin`,
                timestamp: new Date(now - 240000)
            },
            {
                level: 'warning',
                message: `Nov 13 ${this.formatLogTime(now - 300000)} ${deviceHost} sshd[1235]: Failed password for invalid user test from 203.0.113.42 port 45123 ssh2`,
                timestamp: new Date(now - 300000)
            },
            {
                level: 'info',
                message: `Nov 13 ${this.formatLogTime(now - 420000)} ${deviceHost} systemd[1]: Started Session c1 of user admin.`,
                timestamp: new Date(now - 420000)
            },
            {
                level: 'info',
                message: `Nov 13 ${this.formatLogTime(now - 600000)} ${deviceHost} cron[5678]: (root) CMD (/usr/bin/backup-script.sh)`,
                timestamp: new Date(now - 600000)
            },
            {
                level: 'error',
                message: `Nov 13 ${this.formatLogTime(now - 780000)} ${deviceHost} kernel[0]: Out of memory: Kill process 9876 (chrome) score 123`,
                timestamp: new Date(now - 780000)
            },
            {
                level: 'warning',
                message: `Nov 13 ${this.formatLogTime(now - 900000)} ${deviceHost} sshd[1240]: Authentication failure for user root from 10.0.0.1`,
                timestamp: new Date(now - 900000)
            },
            {
                level: 'info',
                message: `Nov 13 ${this.formatLogTime(now - 1080000)} ${deviceHost} systemd[1]: Started Update UTMP about System Runlevel Changes.`,
                timestamp: new Date(now - 1080000)
            }
        ];

        this.displayDeviceLogs(device, sampleLogs);
    }

    formatLogTime(timestamp) {
        const date = new Date(timestamp);
        return date.toTimeString().slice(0, 8); // HH:MM:SS format
    }

    displayDeviceLogs(device, logs) {
        // Store the current device and logs for refresh functionality
        this.currentDeviceForLogs = device;
        this.currentDeviceLogs = logs;

        // Update modal title
        const modalTitle = document.getElementById('logs-modal-title');
        if (modalTitle) {
            modalTitle.textContent = `${device.name} - Logs (${logs.length} entries)`;
        }

        // Render logs in modal
        this.renderLogsInModal(logs);

        // Show the modal
        this.showLogsModal();
    }

    renderLogsInModal(logs) {
        const container = document.getElementById('logs-modal-container');
        
        if (!logs || logs.length === 0) {
            container.innerHTML = '<div class="log-entry"><span class="text-muted">No logs available</span></div>';
            return;
        }

        container.innerHTML = logs.map(log => `
            <div class="log-entry" data-level="${log.level || 'info'}">
                <span class="log-time">${this.formatTime(new Date(log.timestamp || log.time))}</span>
                <span class="log-level ${log.level || 'info'}">${(log.level || 'info').toUpperCase()}</span>
                <span class="log-message">${log.message || 'No message'}</span>
            </div>
        `).join('');

        // Scroll to top
        container.scrollTop = 0;
    }

    filterLogsModal(level) {
        const logEntries = document.querySelectorAll('#logs-modal-container .log-entry');
        
        logEntries.forEach(entry => {
            const entryLevel = entry.getAttribute('data-level');
            if (level === 'all' || entryLevel === level) {
                entry.style.display = 'flex';
            } else {
                entry.style.display = 'none';
            }
        });
    }

    refreshCurrentDeviceLogs() {
        if (this.currentDeviceForLogs) {
            this.viewDeviceLogs(this.currentDeviceForLogs.id);
        }
    }

    showAllLogs() {
        // This function is no longer needed since we're using modals
        // But keeping it for compatibility
        const logsTitle = document.getElementById('logs-title');
        const showAllBtn = document.getElementById('show-all-logs-btn');
        
        if (logsTitle) {
            logsTitle.textContent = 'System Logs';
        }
        
        if (showAllBtn) {
            showAllBtn.style.display = 'none';
        }
        
        this.renderLogs();
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

    showLogsModal() {
        const modal = document.getElementById('device-logs-modal');
        console.log('showLogsModal called, modal element:', modal);
        if (modal) {
            modal.classList.add('show');
            console.log('Modal should now be visible');
        } else {
            console.error('Modal element not found!');
        }
    }

    hideLogsModal() {
        document.getElementById('device-logs-modal').classList.remove('show');
        this.currentDeviceForLogs = null;
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

    async refreshData() {
        this.addLog('info', 'Manual refresh triggered');
        
        if (this.settings.useRealAPI) {
            try {
                // Trigger backend refresh
                const response = await fetch(`${this.apiBaseUrl}/devices/refresh`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    await this.loadRealData();
                    this.showNotification('Data Refreshed', 'Dashboard data updated from backend');
                } else {
                    throw new Error('Backend refresh failed');
                }
            } catch (error) {
                this.addLog('error', `Refresh failed: ${error.message}`);
                this.showNotification('Refresh Failed', 'Could not refresh from backend', 'error');
            }
        } else {
            // Simulate data refresh for sample data
            this.devices.forEach(device => {
                if (device.status === 'online') {
                    device.cpu = Math.max(0, Math.min(100, device.cpu + (Math.random() - 0.5) * 10));
                    device.memory = Math.max(0, Math.min(100, device.memory + (Math.random() - 0.5) * 5));
                    device.lastSeen = new Date();
                }
            });
            
            this.showNotification('Data Refreshed', 'Sample data has been updated');
        }
        
        // Update current view
        const activeSection = document.querySelector('.content-section.active').id;
        this.showSection(activeSection);
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
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (error) {
                console.log('Could not load saved settings, using defaults');
            }
        }
    }

    saveSettings() {
        localStorage.setItem('sshDashboardSettings', JSON.stringify(this.settings));
        this.addLog('info', 'Settings updated');
    }



    showNotification(title, message, type = 'info') {
        // Console log for debugging
        console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        
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
    // Expose dashboard globally for onclick handlers
    window.dashboard = dashboard;
});