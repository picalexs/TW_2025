# TW_2025 Web Project

A modern web application with optimized build pipeline and performance optimizations.

## Quick Start

### Development
```bash
npm run dev
```
- Starts development server on http://localhost:8080
- Watches for file changes and auto-minifies CSS/JS
- Auto-bundles critical JavaScript files
- Serves original files for easier debugging

### Production
```bash
npm start
```
- Builds and minifies all CSS/JS files
- Creates optimized JavaScript bundles
- Starts production server with minified assets
- Optimized for performance and caching

## How It Works

- **Development**: Serves original files, auto-minifies on save, creates bundles
- **Production**: Builds everything, then serves minified files with compression
- **File Watching**: Automatically minifies CSS/JS and updates bundles when files change
- **Parallel Processing**: Uses worker threads for fast builds
- **Smart Bundling**: Critical JavaScript files are bundled for performance

## Project Structure

```
├── backend/           # Server-side code
├── frontend/          # Client-side code
│   ├── bundles/       # Generated JS bundles (auto-created)
│   ├── *.css          # Original stylesheets
│   ├── *.min.css      # Minified stylesheets (auto-generated)
│   ├── *.js           # Original scripts
│   └── *.min.js       # Minified scripts (auto-generated)
└── scripts/           # Build scripts
```

## Technologies

- **Backend**: Node.js, Oracle Database
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Build Tools**: Terser, CleanCSS, Chokidar
- **Optimization**: Brotli/Gzip compression, JavaScript bundling

---

## Dependencies

- **Production**: bcrypt, compression, dotenv, jsonwebtoken, nodemailer, oracledb
- **Development**: chokidar, clean-css-cli, terser
