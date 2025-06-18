const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');

const contentTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain'
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return contentTypes[ext] || 'application/octet-stream';
}

// Check if file type should be compressed
function shouldCompress(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const compressibleTypes = ['.html', '.css', '.js', '.json', '.txt', '.svg'];
  return compressibleTypes.includes(ext);
}

// Compress frontend file content
function compressFrontendFile(data, acceptEncoding) {
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

async function getMinifiedPath(filePath) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const dirName = path.dirname(filePath);

  if (ext === '.css' || ext === '.js') {
    if (isDevelopment) {
      return filePath;
    }
    
    const minifiedPath = path.join(dirName, `${baseName}.min${ext}`);
    try {
      await fs.access(minifiedPath);
      return minifiedPath;
    } catch {
      return filePath;
    }
  }
  
  return filePath;
}

async function handleFrontendRoutes(req, res) {
  if (req.url === '/') {
    req.url = '/index.html';
  }
  
  if (req.url.startsWith('/api/')) {
    return false;
  }
  
  try {
    let requestPath = req.url;
    
    const queryIndex = requestPath.indexOf('?');
    if (queryIndex !== -1) {
      requestPath = requestPath.substring(0, queryIndex);
    }
    
    if (requestPath.startsWith('/')) {
      requestPath = requestPath.substring(1);
    }
    
    const serverRoot = path.join(__dirname, '..');
    const projectRoot = path.join(serverRoot, '..');
    const frontendRoot = path.join(projectRoot, 'frontend');
    
    let filePath = path.join(frontendRoot, requestPath);
    
    try {
      await fs.access(filePath);
    } catch {
      if (!path.extname(requestPath)) {
        filePath = path.join(frontendRoot, 'index.html');
        try {
          await fs.access(filePath);
        } catch {
          console.error(`Frontend file not found: ${requestPath}`);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 - File not found');
          return true;
        }
      } else {
        console.error(`Frontend file not found: ${requestPath}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - File not found');
        return true;
      }
    }
    
    if (shouldCompress(filePath)) {
      const minifiedPath = await getMinifiedPath(filePath);
      filePath = minifiedPath;
    }
    
    const fileContent = await fs.readFile(filePath);
    const contentType = getContentType(filePath);
    if (shouldCompress(filePath)) {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      const { data: compressedData, encoding } = compressFrontendFile(fileContent, acceptEncoding);
      
      const isMinified = path.basename(filePath).includes('.min.');
      const cacheMaxAge = isMinified ? 31536000 : 3600; // 1 year for minified, 1 hour for regular
      
      const headers = { 
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${cacheMaxAge}`,
        'ETag': `"${Date.now()}"`
      };
      
      if (encoding) {
        headers['Content-Encoding'] = encoding;
      }
      
      headers['Content-Length'] = Buffer.byteLength(compressedData);
      
      res.writeHead(200, headers);
      res.end(compressedData);
    } else {
      const isAsset = /\.(jpg|jpeg|png|gif|svg|ico)$/i.test(filePath);
      const cacheMaxAge = isAsset ? 86400 : 3600;
      
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Content-Length': fileContent.length,
        'Cache-Control': `public, max-age=${cacheMaxAge}`,
        'ETag': `"${Date.now()}"`
      });
      res.end(fileContent);
    }
    
    return true;
  } catch (error) {
    console.error('Error serving frontend file:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 - Internal server error');
    return true;
  }
}

module.exports = handleFrontendRoutes;
