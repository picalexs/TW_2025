const fs = require('fs').promises;
const path = require('path');
const { sendResponse } = require('../utils/helpers');

// Map of content types
const contentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain'
};

/**
 * Get the content type for a file based on its extension
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Handle static file requests
 */
async function handleStaticRoutes(req, res) {
  if (req.url.startsWith('/api/static/')) {
    try {
      // Extract the path after /api/static/
      const requestPath = req.url.substring('/api/static/'.length);
      
      // Determine the root folder to search in
      const serverRoot = path.join(__dirname, '..');
      const projectRoot = path.join(serverRoot, '..');
      
      // Search paths in priority order
      const searchPaths = [
        // Server-side paths
        path.join(serverRoot, 'assets', requestPath),
        path.join(serverRoot, requestPath),
        
        // Project paths
        path.join(projectRoot, requestPath),
        
        // Absolute paths from database (already adjusted in DTO)
        path.join(projectRoot, 'backend', requestPath),
        
        // Frontend paths as fallback
        path.join(projectRoot, 'frontend', 'assets', requestPath),
        path.join(projectRoot, 'frontend', requestPath)
      ];
      
      // Try each path until we find the file
      let filePath = null;
      for (const tryPath of searchPaths) {
        try {
          await fs.access(tryPath);
          filePath = tryPath;
          break;
        } catch {
          // File not found in this path, try next
          continue;
        }
      }
      
      if (!filePath) {
        console.error(`Static file not found: ${requestPath}`);
        sendResponse(res, 404, { error: 'File not found' });
        return true;
      }
      
      const fileContent = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': getContentType(filePath) });
      res.end(fileContent);
      return true;
    } catch (error) {
      console.error('Error serving static file:', error);
      sendResponse(res, 500, { error: 'Error serving file' });
      return true;
    }
  }
  
  return false;
}

module.exports = handleStaticRoutes;
