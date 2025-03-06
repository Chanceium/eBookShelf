import { useState, useEffect, useCallback } from 'react';
import { Book, Category } from '../lib/pocketbase';
import pb from '../lib/pocketbase';

// Hook for fetching books
export const useBooks = (page = 1, perPage = 20, filter = '', visibleOnly = true) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build the filter expression for visibility
      let filterQuery = filter;
      
      // PocketBase uses 'true' as a string for boolean filters
      if (visibleOnly) {
        // Correctly format the filter query with PocketBase's syntax
        filterQuery = filter ? 
          `(${filter}) && (visible='true' || visible=true)` : 
          `visible='true' || visible=true`;
          
        console.log('Using filter query:', filterQuery); // Debug log
      }
      
      // Use PocketBase SDK directly
      const result = await pb.collection('books').getList<Book>(page, perPage, {
        filter: filterQuery,
        sort: '-created',
      });
      
      console.log(`Retrieved ${result.items.length} books with filter: ${filterQuery}`);
      
      // Double-check visible status in the results
      if (visibleOnly) {
        const visibleBooks = result.items.filter(book => book.visible === true);
        console.log(`After client filtering: ${visibleBooks.length} visible books`);
        setBooks(visibleBooks);
      } else {
        setBooks(result.items);
      }
      
      setTotalItems(result.totalItems);
      setTotalPages(Math.ceil(result.totalItems / perPage));
      setError(null);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, filter, visibleOnly]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return { books, loading, error, totalItems, totalPages, refetch: fetchBooks };
};

// Hook for fetching a single book
export const useBook = (id: string | undefined) => {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBook = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // Use PocketBase SDK directly
      const data = await pb.collection('books').getOne<Book>(id);
      setBook(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching book:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBook(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  return { book, loading, error, refetch: fetchBook };
};

// Hook for fetching categories
export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      // Use PocketBase SDK directly
      const result = await pb.collection('categories').getFullList<Category>();
      setCategories(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
};

// Helper function to get file URLs
export const getFileUrl = (collectionId: string, recordId: string, fileName: string) => {
  return pb.getFileUrl({ collectionId, recordId, fileName });
};