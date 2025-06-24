const { spawn } = require('child_process');
const path = require('path');
const chokidar = require('chokidar');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      shell: true,
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: path.join(__dirname, '..'),
      ...options
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    childProcess.on('error', reject);
  });
}

async function initialBuild() {
  log('🔨 Running initial build and bundling...', colors.yellow);
  try {
    await runCommand('node', ['scripts/build.js'], { silent: true });
    await runCommand('node', ['scripts/bundle-critical.js'], { silent: true });
    log('✅ Initial build completed', colors.green);
  } catch (error) {
    log(`⚠️  Initial build failed: ${error.message}`, colors.red);
  }
}

function startServer() {
  log('🚀 Starting development server...', colors.green);
  
  const server = spawn('node', ['backend/server.js'], {
    stdio: 'pipe',
    shell: true,
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  server.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      log(`SERVER: ${message}`, colors.green);
    }
  });
  
  server.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      log(`SERVER ERROR: ${message}`, colors.red);
    }
  });
  
  server.on('close', (code) => {
    if (code !== 0) {
      log(`❌ Server exited with code ${code}`, colors.red);
      process.exit(code);
    }
  });
  
  return server;
}

function startWatcher() {
  log('👀 Starting file watcher...', colors.blue);
  
  const frontendDir = path.join(__dirname, '..', 'frontend');
  const watcher = chokidar.watch([
    `${frontendDir}/**/*.js`,
    `${frontendDir}/**/*.css`
  ], {
    ignored: [
      /\.min\.(js|css)$/,
      /node_modules/,
      /\.git/
    ],
    persistent: true,
    ignoreInitial: true
  });
  
  let minificationQueue = new Set();
  let timeoutId = null;
  
  const processQueue = async () => {
    if (minificationQueue.size === 0) return;
    
    const files = Array.from(minificationQueue);
    minificationQueue.clear();
    
    log(`🔨 Processing ${files.length} changed file(s)...`, colors.yellow);
    
    for (const filePath of files) {
      try {
        const ext = path.extname(filePath);
        const parsedPath = path.parse(filePath);
        const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.min${parsedPath.ext}`);
        
        let command, args;
        if (ext === '.css') {
          command = 'npx';
          args = ['cleancss', '-o', outputPath, filePath];
        } else if (ext === '.js') {
          command = 'npx';
          args = ['terser', filePath, '-o', outputPath, '--compress', '--mangle'];
        }
        
        await new Promise((resolve, reject) => {
          const childProcess = spawn(command, args, {
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.join(__dirname, '..')
          });
          
          childProcess.on('close', (code) => {
            if (code === 0) {
              log(`✅ Updated: ${path.basename(outputPath)}`, colors.cyan);
              resolve();
            } else {
              log(`❌ Failed to minify: ${path.basename(filePath)}`, colors.red);
              reject(new Error(`Process exited with code ${code}`));
            }
          });
          
          childProcess.on('error', reject);
        });
      } catch (error) {
        log(`❌ Error processing ${path.basename(filePath)}: ${error.message}`, colors.red);
      }
    }
    
    try {
      await runCommand('node', ['scripts/bundle-critical.js'], { silent: true });
      log('🎯 Updated critical bundles', colors.cyan);
    } catch (error) {
      log(`⚠️  Bundle update failed: ${error.message}`, colors.red);
    }
  };
  
  watcher.on('change', (filePath) => {
    const relativePath = path.relative(frontendDir, filePath);
    log(`📝 Changed: ${relativePath}`, colors.yellow);
    
    minificationQueue.add(filePath);
    
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(processQueue, 500);
  });
  
  watcher.on('ready', () => {
    log('✅ File watcher ready', colors.blue);
  });
  
  return watcher;
}

function setupGracefulShutdown(server, watcher) {
  const shutdown = (signal) => {
    log(`\n🔄 Received ${signal}, shutting down gracefully...`, colors.yellow);
    
    if (watcher) {
      watcher.close();
    }
    
    if (server) {
      server.kill('SIGTERM');
      setTimeout(() => {
        server.kill('SIGKILL');
      }, 5000);
    }
    
    process.exit(0);
  };
  
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function main() {
  try {
    log('🎯 Starting development environment...', colors.bright);
    
    await initialBuild();
    
    const server = startServer();
    const watcher = startWatcher();
    
    setupGracefulShutdown(server, watcher);
    
    log('🎉 Development environment ready!', colors.green);
    log('   - Server running on http://localhost:8888', colors.green);
    log('   - File watcher active for live minification & bundling', colors.green);
    log('   - Press Ctrl+C to stop', colors.yellow);
    
  } catch (error) {
    log(`💥 Failed to start development environment: ${error.message}`, colors.red);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
