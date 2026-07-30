import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { setupSocketHandler } from './socketHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // 10MB limit for uploading custom images/tokens
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static tokens & equip from root folders
app.use('/Tokens', express.static(path.join(rootDir, 'Tokens')));
app.use('/Equip', express.static(path.join(rootDir, 'Equip')));

// Serve client dist in production
const clientDistPath = path.join(rootDir, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// API to list preset tokens in Tokens folder
app.get('/api/tokens', (req, res) => {
  const tokensDir = path.join(rootDir, 'Tokens');
  if (!fs.existsSync(tokensDir)) {
    return res.json([]);
  }
  fs.readdir(tokensDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao ler a pasta Tokens' });
    }
    const tokenFiles = files
      .filter(file => /\.(png|jpe?g|svg|webp)$/i.test(file))
      .map(file => ({
        filename: file,
        name: file.replace(/\.[^/.]+$/, ''),
        url: `/Tokens/${file}`
      }));
    res.json(tokenFiles);
  });
});

// API to list preset equipment items in Equip folder
app.get('/api/equip', (req, res) => {
  const equipDir = path.join(rootDir, 'Equip');
  if (!fs.existsSync(equipDir)) {
    return res.json([]);
  }
  fs.readdir(equipDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao ler a pasta Equip' });
    }
    const equipFiles = files
      .filter(file => /\.(png|jpe?g|svg|webp)$/i.test(file))
      .map(file => {
        const basename = file.replace(/\.[^/.]+$/, '');
        // Extract grid dimensions from filename e.g. IC1x2 -> width 1, height 2
        let gridW = 1;
        let gridH = 1;
        const match = basename.match(/(\d+)x(\d+)/i);
        if (match) {
          gridW = parseInt(match[1], 10);
          gridH = parseInt(match[2], 10);
        }
        return {
          filename: file,
          name: basename,
          gridW,
          gridH,
          url: `/Equip/${file}`
        };
      });
    res.json(equipFiles);
  });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.send('Cosmos VTT Server running. Build client to access full application UI.');
  }
});

setupSocketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Cosmos VTT Server rodando na porta ${PORT}`);
});
