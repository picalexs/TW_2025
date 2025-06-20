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
  const dataSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
  
  if (!acceptEncoding || dataSize < 512) {
    return { data, encoding: null };
  }

  const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (acceptEncoding.includes('br')) {
    return { 
      data: zlib.brotliCompressSync(bufferData), 
      encoding: 'br' 
    };
  } else if (acceptEncoding.includes('gzip')) {
    return { 
      data: zlib.gzipSync(bufferData), 
      encoding: 'gzip' 
    };
  } else if (acceptEncoding.includes('deflate')) {
    return { 
      data: zlib.deflateSync(bufferData), 
      encoding: 'deflate' 
    };
  }

  return { data: bufferData, encoding: null };
}

async function handleStaticRoutes(req, res) {
  if (req.url.startsWith('/api/static/')) {
    try {
      const requestPath = req.url.substring('/api/static/'.length);
      
      const serverRoot = path.join(__dirname, '..');
      const projectRoot = path.join(serverRoot, '..');
      
      const searchPaths = [];
      
      if (requestPath.startsWith('server/')) {
        searchPaths.push(path.join(projectRoot, requestPath));
      } else {
        searchPaths.push(
          path.join(projectRoot, 'server', requestPath),
          path.join(projectRoot, 'frontend', 'assets', requestPath),
          path.join(serverRoot, requestPath)
        );
      }
      
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
          console.log(`Static file compressed with ${encoding} (${fileContent.length} -> ${compressedData.length} bytes): ${path.basename(filePath)}`);
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
