// utils/helpers.js
// Functie pentru a colecta datele din cerere
async function collectRequestData(req) {
  return new Promise((resolve, reject) => {
    const body = [];
    req.on("data", (chunk) => {
      body.push(chunk);
    });
    req.on("end", () => {
      const parsedBody = Buffer.concat(body).toString();
      try {
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

// Functie pentru a trimite raspunsuri HTTP
function sendResponse(res, statusCode, data) {
  if (res.headersSent) {
    console.warn("Headers already sent, cannot send response");
    return;
  }

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Adaugat Authorization
  });

  let responseBody;
  try {
    const safeStringify = (obj) => {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        // Evitam referintele circulare si obiectele mari de conexiune Oracle
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
  res.end(responseBody);
}

module.exports = {
  collectRequestData,
  sendResponse
};