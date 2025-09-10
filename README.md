# CHost - Your Local Domain Manager

CHost is a powerful command-line tool that simplifies local web development by allowing you to use custom, easy-to-remember domain names (like `myproject.local`) for your `localhost` projects instead of dealing with ports. It automatically manages a proxy server to route these domains to the correct local ports.

## Features

-   **Custom Local Domains**: Run your projects on memorable domains like `app.local` instead of `localhost:3000`.
-   **Automatic Proxying**: A built-in proxy server that listens on standard ports (80 for HTTP, 443 for HTTPS) and forwards requests to your development servers.
-   **Automatic SSL**: Automatically generates self-signed SSL certificates for your local domains, enabling you to test over HTTPS.
-   **Hosts File Management**: Automatically adds and removes entries from your system's hosts file (with your permission).
-   **Simple CLI**: An easy-to-use command-line interface for managing your domains.
-   **Cross-Platform**: Works on macOS, Linux, and Windows.

## Installation

You can install CHost globally using npm:

```bash
npm install -g chost
```

**Note**: Since CHost needs to modify the hosts file and listen on protected ports, you will likely need to run its commands with `sudo` on macOS/Linux or as an Administrator on Windows.

## Quick Start

1.  **Initialize CHost**:
    Navigate to your project's directory and run:
    ```bash
    sudo chost init
    ```
    This will create a `.chost` configuration file and might ask you to set up your first domain.

2.  **Add a Domain**:
    To map a domain like `my-app.local` to a project running on port `3000`, run:
    ```bash
    sudo chost add my-app.local --port 3000
    ```

3.  **Start the Server**:
    Start the CHost proxy server:
    ```bash
    sudo chost server start
    ```
    The server will run in the background.

4.  **Access Your Project**:
    You can now open `http://my-app.local` or `https://my-app.local` in your browser to access your local development server.

## CLI Commands

-   `chost init`: Initialize a new CHost configuration in the current directory.
-   `chost add <domain> [--port <port>]`: Add a new domain and map it to a port.
-   `chost remove <domain>`: Remove a domain and its configuration.
-   `chost list`: List all configured domains.
-   `chost server start`: Start the background proxy server.
-   `chost server stop`: Stop the background proxy server.
-   `chost server status`: Check the status of the proxy server.
-   `chost server logs`: View the server's logs.

## How It Works

CHost combines three main components:

1.  **Configuration File (`.chost`)**: A JSON file in your project directory where your domain-to-port mappings are stored.
2.  **Hosts File**: CHost adds entries to your system's hosts file to make your custom domains point to `127.0.0.1`.
3.  **Proxy Server**: A background server listens on ports 80 and 443. When it receives a request, it looks at the domain name and proxies the request to the correct `localhost` port based on your configuration.

This setup allows you to have multiple projects running on different ports, all accessible through clean, memorable domain names.
