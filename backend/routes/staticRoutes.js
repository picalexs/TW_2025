const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { sendResponse } = require('../utils/helpers');

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

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return contentTypes[ext] || 'application/octet-stream';
}

function shouldCompress(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const compressibleTypes = ['.html', '.css', '.js', '.json', '.txt', '.svg'];
  return compressibleTypes.includes(ext);
}

function compressStaticFile(data, acceptEncoding) {
  if (!acceptEncoding || Buffer.byteLength(data) < 1024) {
    return { data, encoding: null };
  }

  if (acceptEncoding.includes('br')) {
    return { 
      data: zlib.brotliCompressSync(data), 
      encoding: 'br' 
    };
  } else if (acceptEncoding.includes('gzip')) {
    return { 
      data: zlib.gzipSync(data), 
      encoding: 'gzip' 
    };
  } else if (acceptEncoding.includes('deflate')) {
    return { 
      data: zlib.deflateSync(data), 
      encoding: 'deflate' 
    };
  }

  return { data, encoding: null };
}

async function handleStaticRoutes(req, res) {
  if (req.url.startsWith('/api/static/')) {
    try {
      const requestPath = req.url.substring('/api/static/'.length);
      
      const serverRoot = path.join(__dirname, '..');
      const projectRoot = path.join(serverRoot, '..');
      
      const searchPaths = [
        path.join(projectRoot, 'server', requestPath),
        path.join(projectRoot, 'frontend', 'assets', requestPath),
        path.join(serverRoot, requestPath)
      ];
      
      let filePath = null;
      for (const tryPath of searchPaths) {
        try {
          await fs.access(tryPath);
          filePath = tryPath;
          break;
        } catch {
          continue;
        }
      }
      
      if (!filePath) {
        console.error(`Static file not found: ${requestPath}`);
        console.error(`Searched in:`, searchPaths);
        sendResponse(res, 404, { error: 'File not found' });
        return true;
      }
        
      const fileContent = await fs.readFile(filePath);
      const contentType = getContentType(filePath);
      
      if (shouldCompress(filePath)) {
        const acceptEncoding = req.headers['accept-encoding'] || '';
        const { data: compressedData, encoding } = compressStaticFile(fileContent, acceptEncoding);
        
        const headers = { 'Content-Type': contentType };
        if (encoding) {
          headers['Content-Encoding'] = encoding;
        }
        headers['Content-Length'] = Buffer.byteLength(compressedData);
        
        res.writeHead(200, headers);
        res.end(compressedData);
      } else {
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Content-Length': fileContent.length
        });
        res.end(fileContent);
      }
      
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
