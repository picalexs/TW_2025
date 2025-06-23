const { collectRequestData } = require('./helpers');

async function parseMultipartData(req) {
  const contentType = req.headers['content-type'];
  
  if (!contentType || !contentType.includes('multipart/form-data')) {
    throw new Error('Content-Type must be multipart/form-data');
  }

  const boundary = contentType.split('boundary=')[1];
  if (!boundary) {
    throw new Error('No boundary found in Content-Type');
  }

  const rawData = await collectRequestData(req, { raw: true });
  const parts = parseMultipartParts(rawData, boundary);
  
  const files = {};
  const fields = {};

  parts.forEach(part => {
    if (part.filename) {
      files[part.name] = {
        data: part.data,
        name: part.filename,
        size: part.data.length,
        mimetype: part.contentType || 'application/octet-stream'
      };
    } else {
      fields[part.name] = part.data.toString('utf8');
    }
  });

  return { files, fields };
}

function parseMultipartParts(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
  
  let start = 0;
  let end = buffer.indexOf(boundaryBuffer, start);
  
  while (end !== -1) {
    if (start > 0) {
      const partData = buffer.slice(start, end);
      const part = parsePart(partData);
      if (part) {
        parts.push(part);
      }
    }
    start = end + boundaryBuffer.length;
    
    if (buffer.slice(start, start + 2).toString() === '--') {
      break;
    }
    
    if (buffer.slice(start, start + 2).toString() === '\r\n') {
      start += 2;
    }
    
    end = buffer.indexOf(boundaryBuffer, start);
  }
  
  return parts;
}

function parsePart(partBuffer) {
  const headerEnd = partBuffer.indexOf('\r\n\r\n');
  if (headerEnd === -1) {
    return null;
  }
  
  const headers = partBuffer.slice(0, headerEnd).toString('utf8');
  const data = partBuffer.slice(headerEnd + 4);
  const actualData = data.slice(0, -2);
  const part = { data: actualData };
  
  const dispositionMatch = headers.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
  if (dispositionMatch) {
    part.name = dispositionMatch[1];
    part.filename = dispositionMatch[2];
  }
  
  const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
  if (contentTypeMatch) {
    part.contentType = contentTypeMatch[1].trim();
  }
  
  return part;
}

module.exports = {
  parseMultipartData
};
