import express from 'express';
import cors from 'cors';
import PocketBase from 'pocketbase';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Create PocketBase instance (server-side only)
const pb = new PocketBase(
  process.env.NODE_ENV === 'production' 
    ? 'http://pocketbase:8090' 
    : 'http://localhost:8090'
);

app.use(express.json());
app.use(cors());

// Update the PocketBase proxy middleware with more detailed options
app.use('/pb', createProxyMiddleware({
  target: process.env.NODE_ENV === 'production' 
    ? 'http://pocketbase:8090' 
    : 'http://localhost:8090',
  changeOrigin: true,
  pathRewrite: {
    '^/pb': '' // Remove the /pb prefix when forwarding
  },
  ws: true, // Enable websocket proxying
  logLevel: 'debug',
  // Add additional options to help with debugging
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying request to: ${req.method} ${req.url}`);
    
    // If the request has a body, properly handle it for the proxy
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Received response from PocketBase: ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.writeHead(500, {
      'Content-Type': 'text/plain',
    });
    res.end('Proxy error: ' + err);
  }
}));

// Serve static files from the Vite build output directory
if (process.env.NODE_ENV === 'production') {
  // Path to the Vite build output (adjust if your build outputs to a different location)
  const distPath = path.resolve(__dirname, '../../dist/client');
  
  // Serve static files
  app.use(express.static(distPath));
  console.log(`Serving static files from: ${distPath}`);
}

// Books API endpoints
app.get('/api/books', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const filter = req.query.filter as string || '';
    
    const resultList = await pb.collection('books').getList(page, perPage, { filter });
    res.json(resultList);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const record = await pb.collection('books').getOne(req.params.id);
    res.json(record);
  } catch (error) {
    console.error(`Error fetching book ${req.params.id}:`, error);
    res.status(404).json({ error: 'Book not found' });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const record = await pb.collection('books').create(req.body);
    res.json(record);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

app.patch('/api/books/:id', async (req, res) => {
  try {
    const record = await pb.collection('books').update(req.params.id, req.body);
    res.json(record);
  } catch (error) {
    console.error(`Error updating book ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    await pb.collection('books').delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting book ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Categories API endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const resultList = await pb.collection('categories').getFullList({
      sort: 'name'
    });
    res.json(resultList);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// File serving endpoint
app.get('/api/files/:collection/:id/:filename', async (req, res) => {
  try {
    const { collection, id, filename } = req.params;
    
    // Get the file URL from PocketBase
    const fileUrl = `${pb.baseUrl}/api/files/${collection}/${id}/${filename}`;
    
    // Fetch the file
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      return res.status(404).send('File not found');
    }
    
    // Get content type and forward the file
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Pipe the response
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).send('Could not serve file');
  }
});

// Catch-all route to return the main HTML page
// This should be added AFTER all API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Exclude API routes from being redirected to index.html
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.resolve(__dirname, '../../dist/client/index.html'));
    }
  });
}

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});