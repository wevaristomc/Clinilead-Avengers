import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para ESM (já que package.json tem "type": "module")
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloud Run injeta a porta via variável de ambiente PORT. Fallback para 8080.
const PORT = process.env.PORT || 8080;
const BUILD_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'application/font-woff',
  '.woff2': 'font/woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  let relativePath = req.url === '/' ? 'index.html' : req.url;
  relativePath = relativePath.split('?')[0]; // Remove query string
  
  let filePath = path.join(BUILD_DIR, relativePath);

  // Segurança: impede sair do diretório dist
  if (!filePath.startsWith(BUILD_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // SPA Fallback: Se arquivo não existe e não é asset, serve index.html
  if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
    const ext = path.extname(relativePath);
    if (!ext || ext === '.html') {
       filePath = path.join(BUILD_DIR, 'index.html');
    } else {
       res.writeHead(404);
       res.end('Not Found');
       return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback final de segurança
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// OBRIGATÓRIO: host '0.0.0.0' para o Cloud Run
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
  console.log(`Serving files from: ${BUILD_DIR}`);
});