# TW_2025 Web Project

A Node.js web application with automated build system for CSS/JS minification and development workflow.

## Quick Start

### Development
```bash
# Start development server with live file watching
npm run dev
```

### Production
```bash
# Build for production (minify all files)
npm run build:production

# Start production server
npm start
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server + file watcher |
| `npm run dev:server` | Development server only |
| `npm start` | Production server |
| `npm run build` | Build all CSS/JS files |
| `npm run build:css` | Build CSS files only |
| `npm run build:js` | Build JS files only |
| `npm run build:production` | Full production build with reporting |
| `npm run clean` | Clean all minified files |

## How It Works

- **Development**: Serves original files, auto-minifies on save
- **Production**: Serves minified files with compression
- **File Watching**: Automatically minifies CSS/JS when files change
- **Parallel Processing**: Uses worker threads for fast builds

## Project Structure

```
frontend/           # Frontend files
├── *.css          # Original stylesheets
├── *.min.css      # Minified stylesheets (auto-generated)
├── *.js           # Original scripts
└── *.min.js       # Minified scripts (auto-generated)

backend/           # Backend server
scripts/           # Build scripts
├── build.js       # Universal build script
└── dev.js         # Development environment
```

## Dependencies

- **Production**: bcrypt, compression, dotenv, jsonwebtoken, nodemailer, oracledb
- **Development**: chokidar, clean-css-cli, terser
