const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const winston = require('winston');
const chokidar = require('chokidar');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'ssh-dashboard-backend' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration
const config = {
    logDir: process.env.LOG_DIR || '/var/log/remote',
    maxLogLines: parseInt(process.env.MAX_LOG_LINES) || 1000,
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL) || 30000,
    supportedLogFiles: ['auth.log', 'syslog', 'secure', 'messages', 'daemon.log', 'kern.log']
};

// In-memory storage for device data
let deviceCache = new Map();
let logCache = new Map();
let connectionCache = new Map();

// Device scanner class
class DeviceScanner {
    constructor(logDirectory) {
        this.logDirectory = logDirectory;
        this.watcher = null;
        this.isScanning = false;
    }

    async scanDevices() {
        this.isScanning = true;
        console.log(`[SCAN DEBUG] Starting device scan in directory: ${this.logDirectory}`);
        logger.info('Starting device scan...');
        
        try {
            // Check if log directory exists
            console.log(`[SCAN DEBUG] Checking if log directory exists: ${this.logDirectory}`);
            if (!await fs.pathExists(this.logDirectory)) {
                console.log(`[SCAN DEBUG] Log directory does not exist, creating sample structure`);
                logger.warn(`Log directory ${this.logDirectory} does not exist. Creating sample structure...`);
                await this.createSampleLogStructure();
            }

            const devices = new Map();
            console.log(`[SCAN DEBUG] Reading directory contents...`);
            const folders = await fs.readdir(this.logDirectory);
            console.log(`[SCAN DEBUG] Found ${folders.length} items in log directory:`, folders);

            for (const folder of folders) {
                console.log(`[SCAN DEBUG] Processing folder: ${folder}`);
                const devicePath = path.join(this.logDirectory, folder);
                console.log(`[SCAN DEBUG] Full path: ${devicePath}`);
                
                const stat = await fs.stat(devicePath);
                console.log(`[SCAN DEBUG] ${folder} is ${stat.isDirectory() ? 'directory' : 'file'}`);

                if (stat.isDirectory()) {
                    console.log(`[SCAN DEBUG] Analyzing device in directory: ${folder}`);
                    const device = await this.analyzeDevice(folder, devicePath);
                    if (device) {
                        console.log(`[SCAN DEBUG] Successfully analyzed device: ${device.id} with ${device.logFiles.length} log files`);
                        devices.set(device.id, device);
                    } else {
                        console.log(`[SCAN DEBUG] Failed to analyze device: ${folder}`);
                    }
                }
            }

            deviceCache = devices;
            logger.info(`Scanned ${devices.size} devices`);
            return Array.from(devices.values());

        } catch (error) {
            logger.error('Error scanning devices:', error);
            throw error;
        } finally {
            this.isScanning = false;
        }
    }

    async analyzeDevice(folderName, devicePath) {
        try {
            const device = {
                id: folderName,
                name: this.formatDeviceName(folderName),
                ip: this.extractIPFromName(folderName),
                status: 'unknown',
                lastSeen: null,
                logFiles: [],
                stats: {
                    totalLogs: 0,
                    errorCount: 0,
                    warningCount: 0,
                    sshConnections: 0,
                    failedLogins: 0
                },
                activeSessions: []
            };

            // Get log files in device directory
            const files = await fs.readdir(devicePath);
            for (const file of files) {
                const filePath = path.join(devicePath, file);
                const stat = await fs.stat(filePath);

                if (stat.isFile() && this.isLogFile(file)) {
                    device.logFiles.push({
                        name: file,
                        path: filePath,
                        size: stat.size,
                        modified: stat.mtime
                    });

                    // Update last seen based on file modification time
                    if (!device.lastSeen || stat.mtime > device.lastSeen) {
                        device.lastSeen = stat.mtime;
                    }
                }
            }

            // Determine device status based on log activity
            device.status = this.determineDeviceStatus(device);

            // Analyze logs for statistics
            await this.analyzeDeviceLogs(device);

            return device;

        } catch (error) {
            logger.error(`Error analyzing device ${folderName}:`, error);
            return null;
        }
    }

    async analyzeDeviceLogs(device) {
        try {
            let totalLines = 0;
            let errorCount = 0;
            let warningCount = 0;
            let sshConnections = 0;
            let failedLogins = 0;
            
            // Track SSH sessions
            const sessions = new Map(); // sessionId -> session info
            const activeSessions = [];

            for (const logFile of device.logFiles) {
                try {
                    const content = await fs.readFile(logFile.path, 'utf8');
                    const lines = content.split('\n');
                    totalLines += lines.length;

                    // Analyze each line for sessions and stats
                    for (const line of lines.slice(-config.maxLogLines)) {
                        const lowerLine = line.toLowerCase();
                        
                        // Count errors and warnings
                        if (lowerLine.includes('error') || lowerLine.includes('failed') || lowerLine.includes('denied')) {
                            errorCount++;
                        }
                        if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
                            warningCount++;
                        }
                        
                        // Track SSH sessions
                        if (lowerLine.includes('sshd')) {
                            // Extract PID for session tracking
                            const pidMatch = line.match(/sshd\[(\d+)\]/);
                            const sessionId = pidMatch ? pidMatch[1] : null;
                            
                            if (sessionId) {
                                // Session opened
                                if (lowerLine.includes('accepted publickey') || lowerLine.includes('accepted password')) {
                                    const userMatch = line.match(/for (\w+) from ([\d.]+)/);
                                    if (userMatch) {
                                        const [, username, sourceIP] = userMatch;
                                        sessions.set(sessionId, {
                                            id: sessionId,
                                            username,
                                            sourceIP,
                                            startTime: this.extractTimestamp(line),
                                            status: 'active',
                                            device: device.id
                                        });
                                        sshConnections++;
                                    }
                                }
                                
                                // Session closed
                                if (lowerLine.includes('session closed') || lowerLine.includes('connection closed')) {
                                    if (sessions.has(sessionId)) {
                                        const session = sessions.get(sessionId);
                                        session.endTime = this.extractTimestamp(line);
                                        session.status = 'closed';
                                    }
                                }
                                
                                // Failed login attempts
                                if (lowerLine.includes('failed') || lowerLine.includes('invalid') || 
                                    lowerLine.includes('authentication failure')) {
                                    failedLogins++;
                                }
                            }
                        }
                    }
                } catch (fileError) {
                    logger.warn(`Could not read log file ${logFile.path}:`, fileError.message);
                }
            }

            // Filter for currently active sessions (no end time and recent start)
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            for (const session of sessions.values()) {
                if (session.status === 'active' && session.startTime > oneHourAgo) {
                    activeSessions.push(session);
                }
            }

            device.stats = {
                totalLogs: totalLines,
                errorCount,
                warningCount,
                sshConnections,
                failedLogins
            };
            
            device.activeSessions = activeSessions;

        } catch (error) {
            logger.error(`Error analyzing logs for device ${device.id}:`, error);
        }
    }

    formatDeviceName(folderName) {
        // Convert folder names to readable device names
        return folderName
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    extractIPFromName(folderName) {
        // Try to extract IP address from folder name
        const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
        const match = folderName.match(ipRegex);
        return match ? match[1] : `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    }

    extractTimestamp(logLine) {
        // Try to extract timestamp from common log formats
        const patterns = [
            /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/,  // MMM DD HH:mm:ss
            /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/  // YYYY-MM-DD HH:mm:ss
        ];
        
        for (const pattern of patterns) {
            const match = logLine.match(pattern);
            if (match) {
                return moment(match[1], ['MMM DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss']).toDate();
            }
        }
        
        return new Date(); // Fallback to current time
    }



    isLogFile(filename) {
        const ext = path.extname(filename).toLowerCase();
        return ext === '.log' || 
               config.supportedLogFiles.some(logType => filename.includes(logType)) ||
               filename.match(/\.(log|txt)$/i);
    }

    determineDeviceStatus(device) {
        if (!device.lastSeen) return 'offline';
        
        const timeDiff = Date.now() - device.lastSeen.getTime();
        const hoursAgo = timeDiff / (1000 * 60 * 60);
        
        if (hoursAgo < 1) return 'online';
        if (hoursAgo < 24) return 'warning';
        return 'offline';
    }

    async createSampleLogStructure() {
        logger.info('Creating sample log structure for demonstration...');
        
        const sampleDevices = [
            'web-server-192.168.1.10',
            'database-server-192.168.1.15',
            'router-192.168.1.1',
            'firewall-192.168.1.254'
        ];

        for (const deviceName of sampleDevices) {
            const devicePath = path.join(this.logDirectory, deviceName);
            await fs.ensureDir(devicePath);
            
            // Create sample log files
            const sampleLog = this.generateSampleLogContent(deviceName);
            await fs.writeFile(path.join(devicePath, 'auth.log'), sampleLog);
            await fs.writeFile(path.join(devicePath, 'syslog'), this.generateSyslogContent());
        }
    }

    generateSampleLogContent(deviceName) {
        const now = new Date();
        const logs = [];
        
        for (let i = 0; i < 50; i++) {
            const timestamp = new Date(now.getTime() - (i * 60000)); // Go back 1 minute per log
            const formattedTime = moment(timestamp).format('MMM DD HH:mm:ss');
            
            const logTypes = [
                `${formattedTime} ${deviceName} sshd[1234]: Accepted publickey for admin from 192.168.1.100 port 52345 ssh2`,
                `${formattedTime} ${deviceName} sshd[1235]: pam_unix(sshd:session): session opened for user admin`,
                `${formattedTime} ${deviceName} sshd[1236]: Failed password for invalid user test from 203.0.113.42 port 45123 ssh2`,
                `${formattedTime} ${deviceName} kernel: [12345.678] Out of memory: Kill process 9876 (chrome) score 123 or sacrifice child`,
                `${formattedTime} ${deviceName} systemd[1]: Started Session c1 of user admin.`,
                `${formattedTime} ${deviceName} cron[5678]: (root) CMD (/usr/bin/backup-script.sh)`
            ];
            
            logs.push(logTypes[Math.floor(Math.random() * logTypes.length)]);
        }
        
        return logs.join('\n');
    }

    generateSyslogContent() {
        const now = new Date();
        const logs = [];
        
        for (let i = 0; i < 30; i++) {
            const timestamp = new Date(now.getTime() - (i * 120000)); // Go back 2 minutes per log
            const formattedTime = moment(timestamp).format('MMM DD HH:mm:ss');
            
            logs.push(`${formattedTime} localhost systemd[1]: Started Update UTMP about System Runlevel Changes.`);
        }
        
        return logs.join('\n');
    }

    startWatching() {
        if (this.watcher) {
            this.watcher.close();
        }

        this.watcher = chokidar.watch(this.logDirectory, {
            ignored: /[\/\\]\./,
            persistent: true,
            ignoreInitial: true
        });

        this.watcher
            .on('add', (filePath) => {
                logger.info(`Log file added: ${filePath}`);
                this.handleFileChange(filePath);
            })
            .on('change', (filePath) => {
                logger.debug(`Log file changed: ${filePath}`);
                this.handleFileChange(filePath);
            })
            .on('unlink', (filePath) => {
                logger.info(`Log file removed: ${filePath}`);
            });
    }

    async handleFileChange(filePath) {
        try {
            const relativePath = path.relative(this.logDirectory, filePath);
            const deviceId = relativePath.split(path.sep)[0];
            
            if (deviceCache.has(deviceId)) {
                const device = deviceCache.get(deviceId);
                await this.analyzeDeviceLogs(device);
                deviceCache.set(deviceId, device);
            }
        } catch (error) {
            logger.error('Error handling file change:', error);
        }
    }

    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}

// Initialize scanner
const scanner = new DeviceScanner(config.logDir);

// API Routes

// Get all devices
app.get('/api/devices', async (req, res) => {
    try {
        const devices = Array.from(deviceCache.values());
        res.json({
            success: true,
            data: devices,
            count: devices.length,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Error fetching devices:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch devices',
            message: error.message
        });
    }
});

// Get specific device
app.get('/api/devices/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const device = deviceCache.get(deviceId);
        
        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        res.json({
            success: true,
            data: device,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Error fetching device:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch device',
            message: error.message
        });
    }
});

// Get device logs
app.get('/api/devices/:deviceId/logs', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { lines = 100, file } = req.query;
        
        console.log(`[API DEBUG] Getting logs for device: ${deviceId}, lines: ${lines}, file: ${file}`);
        
        const device = deviceCache.get(deviceId);
        if (!device) {
            console.log(`[API ERROR] Device not found: ${deviceId}`);
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        console.log(`[API DEBUG] Device found: ${device.name}, has ${device.logFiles.length} log files`);
        let logs = [];
        const logFiles = file ? device.logFiles.filter(f => f.name === file) : device.logFiles;
        console.log(`[API DEBUG] Processing ${logFiles.length} log files`);

        for (const logFile of logFiles) {
            console.log(`[API DEBUG] Processing log file: ${logFile.name} at ${logFile.path}`);
            try {
                console.log(`[API DEBUG] Attempting to read file...`);
                const content = await fs.readFile(logFile.path, 'utf8');
                console.log(`[API DEBUG] Successfully read ${content.length} characters`);
                
                const allLines = content.split('\n').filter(line => line.trim());
                console.log(`[API DEBUG] Found ${allLines.length} non-empty lines`);
                
                const fileLines = allLines
                    .slice(-lines)
                    .map(line => ({
                        timestamp: extractTimestamp(line),
                        level: extractLogLevel(line),
                        message: line,
                        file: logFile.name,
                        device: deviceId
                    }));
                
                console.log(`[API DEBUG] Processed ${fileLines.length} log entries`);
                logs.push(...fileLines);
            } catch (fileError) {
                console.log(`[API ERROR] Failed to read log file ${logFile.path}:`, fileError);
                console.log(`[API ERROR] Error details:`, {
                    code: fileError.code,
                    errno: fileError.errno,
                    path: fileError.path,
                    syscall: fileError.syscall
                });
                logger.warn(`Could not read log file ${logFile.path}:`, fileError.message);
            }
        }

        // Sort logs by timestamp (newest first)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            data: logs.slice(0, lines),
            count: logs.length,
            device: deviceId,
            timestamp: new Date()
        });

    } catch (error) {
        logger.error('Error fetching device logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch device logs',
            message: error.message
        });
    }
});

// Get active sessions across all devices or for a specific device
app.get('/api/sessions', async (req, res) => {
    try {
        const { deviceId } = req.query;
        let allSessions = [];

        for (const device of deviceCache.values()) {
            if (!deviceId || device.id === deviceId) {
                allSessions.push(...device.activeSessions);
            }
        }

        res.json({
            success: true,
            data: allSessions,
            count: allSessions.length,
            timestamp: new Date()
        });

    } catch (error) {
        logger.error('Error fetching active sessions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch active sessions',
            message: error.message
        });
    }
});

// Refresh devices (manual scan)
app.post('/api/devices/refresh', async (req, res) => {
    try {
        if (scanner.isScanning) {
            return res.status(409).json({
                success: false,
                error: 'Scan already in progress'
            });
        }

        const devices = await scanner.scanDevices();
        
        res.json({
            success: true,
            message: 'Devices refreshed successfully',
            data: devices,
            count: devices.length,
            timestamp: new Date()
        });

    } catch (error) {
        logger.error('Error refreshing devices:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh devices',
            message: error.message
        });
    }
});

// Get system status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'online',
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            deviceCount: deviceCache.size,
            logDirectory: config.logDir,
            isScanning: scanner.isScanning,
            version: '1.0.0'
        },
        timestamp: new Date()
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Helper functions
function extractTimestamp(logLine) {
    // Try to extract timestamp from common log formats
    const patterns = [
        /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/,  // MMM DD HH:mm:ss
        /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/  // YYYY-MM-DD HH:mm:ss
    ];
    
    for (const pattern of patterns) {
        const match = logLine.match(pattern);
        if (match) {
            return moment(match[1], ['MMM DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss']).toDate();
        }
    }
    
    return new Date(); // Fallback to current time
}

function extractLogLevel(logLine) {
    const line = logLine.toLowerCase();
    if (line.includes('error') || line.includes('err') || line.includes('failed') || line.includes('denied')) {
        return 'error';
    }
    if (line.includes('warning') || line.includes('warn')) {
        return 'warning';
    }
    if (line.includes('info') || line.includes('notice')) {
        return 'info';
    }
    return 'info'; // Default
}

// Server startup
async function startServer() {
    try {
        // Ensure log directory exists
        await fs.ensureDir('logs');
        
        // Initial device scan
        logger.info('Starting initial device scan...');
        await scanner.scanDevices();
        
        // Start file watching
        scanner.startWatching();
        
        // Start periodic refresh
        setInterval(async () => {
            if (!scanner.isScanning) {
                try {
                    await scanner.scanDevices();
                } catch (error) {
                    logger.error('Error during periodic scan:', error);
                }
            }
        }, config.refreshInterval);

        // Start server
        app.listen(PORT, () => {
            logger.info(`SSH Dashboard Backend running on port ${PORT}`);
            logger.info(`Monitoring log directory: ${config.logDir}`);
            logger.info(`API endpoints available at http://localhost:${PORT}/api/`);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Graceful shutdown...');
    scanner.stopWatching();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Graceful shutdown...');
    scanner.stopWatching();
    process.exit(0);
});

// Start the server
startServer();