import { useState, useEffect, useCallback } from 'react';
import { Book, Category } from '../lib/pocketbase';
import { pb } from '../lib/pocketbase'; // Fix: Use named import instead of default import

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
      console.log("Starting book fetch with params:", { page, perPage, initialFilter: filter, visibleOnly });
      
      // DEBUGGING: First get all books without filtering to verify data
      const allBooksResult = await pb.collection('books').getList<Book>(1, 100, {
        sort: '-created',
      });
      
      console.log("Total books in DB:", allBooksResult.items.length);
      console.log("Books with visible=true:", allBooksResult.items.filter(b => b.visible === true).length);
      console.log("Books with visible=false:", allBooksResult.items.filter(b => b.visible === false).length);
      
      // Build the filter expression for visibility
      let filterQuery = filter;

      // PocketBase uses 'true' as a string for boolean filters
      // Fix: PocketBase actually accepts both true (boolean) and 'true' (string)
      if (visibleOnly) {
        filterQuery = filter
          ? `${filter} && visible=true`  // Changed from 'true' to true
          : `visible=true`;              // Changed from 'true' to true
      }

      console.log("Using filter query:", filterQuery);
      
      // Use PocketBase SDK directly
      const result = await pb.collection('books').getList<Book>(page, perPage, {
        filter: filterQuery,
        sort: '-created',
      });

      console.log(`Retrieved ${result.items.length} books with filter: ${filterQuery}`);
      
      // Log detailed information about each book
      console.log('Retrieved books:', result.items.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        visible: book.visible,
        // Add other important fields you want to track
      })));
      
      setBooks(result.items);
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