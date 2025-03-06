import { useState } from 'react';
import { useBooks } from '../hooks/useApi';
import { getFileUrl } from '../lib/pocketbase';

const BookList = () => {
  const [page, setPage] = useState(1);
  const { books, loading, error, totalPages } = useBooks(page);
  
  // Filter books to only show visible ones
  const visibleBooks = books.filter(book => book.visible === true);

  if (loading) {
    return <div>Loading books...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  
  if (visibleBooks.length === 0) {
    return <div>No books available.</div>;
  }

  return (
    <div>
      <h1>Books</h1>
      
      <div className="book-grid">
        {visibleBooks.map(book => (
          <div key={book.id} className="book-card">
            <img 
              src={getFileUrl('books', book.id, book.coverImage)} 
              alt={book.title} 
              className="book-cover"
            />
            <h3>{book.title}</h3>
            <p>{book.author}</p>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      <div className="pagination">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        
        <span>Page {page} of {totalPages}</span>
        
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default BookList;