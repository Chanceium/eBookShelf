import express from 'express';
import cors from 'cors';
import PocketBase from 'pocketbase';

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

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});