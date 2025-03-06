import { useState, useEffect, useCallback } from 'react';
import { Book, Category } from '../lib/pocketbase';

// Base URL for the API
const API_URL = '/api';

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
      // Add visibility filter to the API request when visibleOnly is true
      let filterQuery = filter;
      if (visibleOnly) {
        filterQuery = filterQuery ? `${filterQuery} && visible=true` : 'visible=true';
      }
      
      const response = await fetch(
        `${API_URL}/books?page=${page}&perPage=${perPage}&filter=${encodeURIComponent(filterQuery)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      
      const data = await response.json();
      setBooks(data.items);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
      const response = await fetch(`${API_URL}/books/${id}`);
      
      if (!response.ok) {
        throw new Error('Book not found');
      }
      
      const data = await response.json();
      setBook(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
      const response = await fetch(`${API_URL}/categories`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
  return `${API_URL}/files/${collectionId}/${recordId}/${fileName}`;
};