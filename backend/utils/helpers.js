const zlib = require('zlib');
const busboy = require('busboy');

function compressResponse(data, acceptEncoding) {
  if (!acceptEncoding) {
    return { data, encoding: null };
  }

  const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
  
  if (bufferData.length < 512) {
    return { data: bufferData, encoding: null };
  }

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

async function collectRequestData(req, options = {}) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'];
    
    if (contentType && contentType.includes('multipart/form-data')) {
      try {
        const bb = busboy({ headers: req.headers });
        const fields = {};
        const files = {};
        
        bb.on('field', (name, val) => {
          fields[name] = val;
        });
        
        bb.on('file', (name, file, info) => {
          const { filename, encoding, mimeType } = info;
          const chunks = [];
          
          file.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          file.on('end', () => {
            files[name] = {
              data: Buffer.concat(chunks),
              filename,
              encoding,
              mimeType
            };
          });
        });
        
        bb.on('finish', () => {
          resolve({ ...fields, files });
        });
        
        bb.on('error', (err) => {
          reject(err);
        });
        
        req.pipe(bb);
      } catch (error) {
        reject(error);
      }
      return;
    }
    
    const body = [];
    req.on("data", (chunk) => {
      body.push(chunk);
    });
    req.on("end", () => {
      try {
        const buffer = Buffer.concat(body);
        
        if (options.raw) {
          resolve(buffer);
          return;
        }
        
        const parsedBody = buffer.toString();
        
        if (!parsedBody.trim()) {
          resolve({});
          return;
        }
        
        resolve(JSON.parse(parsedBody));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", (error) => {
      reject(error);
    });
  });
}

function sendResponse(res, statusCode, data) {
  if (res.headersSent) {
    console.warn("Headers already sent, cannot send response");
    return;
  }

  const acceptEncoding = res.req ? res.req.headers['accept-encoding'] : '';

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  let responseBody;
  try {
    const safeStringify = (obj) => {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (key === 'conn' || key === 'pool' || key === 'desc' || key === 'cOpts') {
          return '[Circular]';
        }
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });
    };
    responseBody = safeStringify(data);
  } catch (error) {
    console.error("Failed to stringify response data:", error);
    const safeError = {
      error: "Internal server error",
      message: "Failed to serialize response data"
    };
    responseBody = JSON.stringify(safeError);
  }

  const { data: compressedData, encoding } = compressResponse(responseBody, acceptEncoding);
  
  if (encoding) {
    headers['Content-Encoding'] = encoding;
    console.log(`API Response compressed with ${encoding} (${Buffer.byteLength(responseBody)} -> ${compressedData.length} bytes)`);
  }
  
  headers['Content-Length'] = Buffer.byteLength(compressedData);
  
  res.writeHead(statusCode, headers);
  res.end(compressedData);
}

module.exports = {
  collectRequestData,
  sendResponse,
  compressResponse
};
