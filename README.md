# CHost - Local Domain System Architecture

## 1. Package Overview

**Package Name**: `chost`  
**Purpose**: Local development domain management system  
**Installation**: `npm install -g chost` (global) or `npm install --save-dev chost` (local)

## 2. Core Components

### 2.1 CLI Interface
```
chost init          # Initialize .chost config in current directory
chost add <domain>  # Add new domain mapping
chost remove <domain> # Remove domain mapping
chost list          # List all active domains
chost start         # Start the proxy server
chost stop          # Stop the proxy server
chost status        # Show server status and active domains
```

### 2.2 Configuration System
**File**: `.chost` (JSON format)
```json
{
  "domains": {
    "app.local": {
      "port": 3000,
      "ssl": false,
      "proxy": true
    },
    "api.local": {
      "port": 3001,
      "ssl": false,
      "proxy": true
    }
  },
  "settings": {
    "proxyPort": 80,
    "sslPort": 443,
    "autoStart": false,
    "hostsFileManagement": true
  }
}
```

### 2.3 Core Modules

#### Domain Manager (`src/domain-manager.js`)
- Read/write .chost config
- Validate domain names and ports
- Handle domain CRUD operations
- Config file watching for hot-reload

#### Proxy Server (`src/proxy-server.js`)
- HTTP/HTTPS proxy using Node.js http-proxy
- Route requests based on Host header
- Handle SSL termination (self-signed certs)
- Error handling and fallbacks

#### Hosts File Manager (`src/hosts-manager.js`)
- Read/write system hosts file
- Backup and restore functionality
- Cross-platform support (Windows/macOS/Linux)
- Permission handling

#### Process Manager (`src/process-manager.js`)
- Start/stop proxy server as daemon
- PID file management
- Process monitoring and auto-restart
- Graceful shutdown handling

## 3. Architecture Flow

### 3.1 Initialization Flow
```
User runs: chost init
├── Check if .chost already exists
├── Create default .chost config
├── Prompt for initial domain setup (optional)
├── Add domains to hosts file
└── Display next steps
```

### 3.2 Domain Addition Flow
```
User runs: chost add myapp.local
├── Validate domain format
├── Check port availability
├── Update .chost config
├── Add entry to hosts file (127.0.0.1 myapp.local)
├── Restart proxy server if running
└── Confirm success
```

### 3.3 Request Routing Flow
```
Browser requests: http://myapp.local
├── DNS resolves to 127.0.0.1 (via hosts file)
├── Request hits proxy server on port 80
├── Proxy reads Host header (myapp.local)
├── Lookup port mapping in config (port 3000)
├── Forward request to localhost:3000
└── Return response to browser
```

## 4. Technical Implementation

### 4.1 Dependencies
```json
{
  "http-proxy": "^1.18.1",          // Proxy server
  "commander": "^9.4.1",            // CLI interface
  "inquirer": "^9.1.4",             // Interactive prompts
  "chalk": "^5.2.0",                // Colored output
  "node-forge": "^1.3.1",           // SSL certificate generation
  "ps-tree": "^1.2.0",              // Process management
  "chokidar": "^3.5.3"              // File watching
}
```

### 4.2 Directory Structure
```
chost/
├── bin/
│   └── chost.js                   # CLI entry point
├── src/
│   ├── cli/
│   │   ├── init.js                # Init command
│   │   ├── add.js                 # Add domain command
│   │   ├── remove.js              # Remove domain command
│   │   ├── list.js                # List domains command
│   │   └── server.js              # Start/stop/status commands
│   ├── core/
│   │   ├── domain-manager.js      # Config management
│   │   ├── proxy-server.js        # HTTP proxy
│   │   ├── hosts-manager.js       # Hosts file operations
│   │   ├── ssl-manager.js         # SSL certificate handling
│   │   └── process-manager.js     # Daemon management
│   └── utils/
│       ├── logger.js              # Logging utilities
│       ├── validator.js           # Input validation
│       └── platform.js            # OS-specific operations
├── templates/
│   └── default-config.json        # Default .chost template
└── package.json
```

### 4.3 Cross-Platform Considerations

#### Windows
- Hosts file: `C:\Windows\System32\drivers\etc\hosts`
- Requires administrator privileges
- Use `runas` for elevation

#### macOS/Linux
- Hosts file: `/etc/hosts`
- Requires sudo privileges
- Use `sudo` for elevation

## 5. Security & Permissions

### 5.1 Permission Handling
- Detect if running with sufficient privileges
- Prompt for elevation when needed
- Graceful fallback if permissions denied
- Option to disable hosts file management

### 5.2 SSL Certificate Management
- Generate self-signed certificates per domain
- Store certificates in user config directory
- Automatic certificate trust prompts
- Certificate rotation and renewal

## 6. Error Handling & Edge Cases

### 6.1 Port Conflicts
- Check if target ports are available
- Handle port already in use scenarios
- Automatic port discovery as fallback

### 6.2 Domain Conflicts
- Validate domain doesn't conflict with real domains
- Check for existing hosts file entries
- Backup and restore hosts file on errors

### 6.3 Process Management
- Handle proxy server crashes
- Cleanup on unexpected shutdown
- Prevent multiple proxy instances

## 7. Advanced Features (Future)

### 7.1 Integration with Dev Servers
- Auto-detect common dev servers (Vite, webpack, etc.)
- Automatic domain registration on server start
- Hot reload integration

### 7.2 Team Collaboration
- Share .chost configs via git
- Environment-specific configurations
- Docker integration

### 7.3 GUI Interface
- Web-based management interface
- System tray application
- Visual domain management

## 8. Installation & Distribution

### 8.1 NPM Package
- Global installation for CLI access
- Local installation for project-specific usage
- Post-install scripts for initial setup

### 8.2 Binary Distribution
- Standalone executables for non-Node environments
- Package for major package managers (brew, chocolatey)

## 9. Testing Strategy

### 9.1 Unit Tests
- Configuration management
- Domain validation
- Proxy routing logic

### 9.2 Integration Tests
- End-to-end domain creation
- Proxy server functionality
- Hosts file management

### 9.3 Platform Testing
- Cross-platform compatibility
- Permission handling
- File system operations