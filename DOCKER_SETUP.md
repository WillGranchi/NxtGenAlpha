# Docker Setup Guide

This guide will help you install and configure Docker for running the test suite and application locally.

## macOS Installation

### Option 1: Docker Desktop (Recommended)

1. **Download Docker Desktop**
   - Visit: https://www.docker.com/products/docker-desktop
   - Click "Download for Mac"
   - Choose the appropriate version:
     - **Apple Silicon (M1/M2/M3)**: Download "Mac with Apple Silicon"
     - **Intel Mac**: Download "Mac with Intel chip"

2. **Install Docker Desktop**
   - Open the downloaded `.dmg` file
   - Drag Docker.app to your Applications folder
   - Open Docker from Applications

3. **Complete Setup**
   - Docker Desktop will ask for permissions (click "Open")
   - Wait for Docker to start (whale icon in menu bar will stop animating)
   - You may be prompted to accept service agreement

4. **Verify Installation**
   ```bash
   docker --version
   docker compose version
   ```

### Option 2: Using Homebrew

```bash
# Install Docker Desktop via Homebrew
brew install --cask docker

# Start Docker Desktop
open /Applications/Docker.app

# Wait for Docker to start, then verify
docker --version
```

## Post-Installation Setup

### Add Docker to PATH (if needed)

If `docker` command is not found after installation:

1. **For zsh (default on newer macOS):**
   ```bash
   echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

2. **For bash:**
   ```bash
   echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bash_profile
   source ~/.bash_profile
   ```

3. **Restart your terminal**

### Verify Docker is Working

```bash
# Check Docker version
docker --version

# Check Docker Compose
docker compose version

# Test Docker (runs a hello-world container)
docker run hello-world
```

## Troubleshooting

### "Command not found: docker"

**Solution 1: Restart Docker Desktop**
```bash
# Quit Docker Desktop completely
# Then reopen it from Applications
```

**Solution 2: Add to PATH manually**
```bash
# Find Docker installation
ls -la /usr/local/bin/docker
ls -la /Applications/Docker.app/Contents/Resources/bin/docker

# Add to PATH in ~/.zshrc or ~/.bash_profile
export PATH="/usr/local/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
```

**Solution 3: Restart Terminal**
After installing Docker, completely quit and reopen your terminal application.

### Docker Desktop Won't Start

1. **Check System Requirements**
   - macOS 10.15 or newer
   - At least 4GB RAM
   - Virtualization must be enabled in System Settings

2. **Check for Conflicts**
   ```bash
   # Check if another Docker instance is running
   ps aux | grep -i docker
   ```

3. **Reset Docker Desktop**
   - Open Docker Desktop
   - Go to Settings → Troubleshoot
   - Click "Reset to factory defaults" (last resort)

### "Cannot connect to Docker daemon"

This usually means Docker Desktop is not running:

```bash
# Start Docker Desktop
open /Applications/Docker.app

# Wait 10-15 seconds for it to start, then verify
docker ps
```

### Permission Denied Errors

If you get permission errors:

```bash
# Add your user to docker group (usually not needed on macOS)
# On macOS, Docker Desktop handles permissions automatically

# If issues persist, try:
sudo chmod 666 /var/run/docker.sock
```

**Note:** On macOS, you shouldn't need `sudo` for Docker commands once Docker Desktop is running.

## Quick Verification

Run the prerequisite checker:

```bash
./scripts/check_prerequisites.sh
```

This will verify:
- Docker is installed
- Docker Desktop is running (macOS)
- Docker Compose is available
- Everything is properly configured

## After Installation

Once Docker is installed and running:

1. **Verify prerequisites:**
   ```bash
   ./scripts/check_prerequisites.sh
   ```

2. **Start the application:**
   ```bash
   docker compose up -d
   ```

3. **Initialize database:**
   ```bash
   ./scripts/init_db.sh
   ```

4. **Run tests:**
   ```bash
   ./scripts/test_integration.sh
   ```

## Docker Resources

- **Official Docs**: https://docs.docker.com/desktop/install/mac-install/
- **Docker Desktop Settings**: Open Docker Desktop → Settings
- **Troubleshooting**: https://docs.docker.com/desktop/troubleshoot/

## Alternative: Using Docker Without Desktop

If you prefer not to use Docker Desktop, you can use:

- **Colima**: Lightweight Docker runtime for macOS
  ```bash
  brew install colima
  colima start
  ```

- **OrbStack**: Alternative to Docker Desktop
  - Download from: https://orbstack.dev/

However, Docker Desktop is the easiest and most compatible option for this project.

## Need Help?

If you continue to have issues:

1. Check Docker Desktop is running (whale icon in menu bar)
2. Restart Docker Desktop
3. Restart your terminal
4. Run `./scripts/check_prerequisites.sh` for diagnostics
5. Check Docker Desktop logs: Docker Desktop → Troubleshoot → View logs

