import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { Book, Category, getFileUrl, pb } from '../lib/pocketbase';
import { ClientResponseError } from 'pocketbase';

const BookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isComponentMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBook = useCallback(async () => {
    if (!id) return;
    
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);
      
      // Add a slight delay before fetching to allow previous requests to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if component is still mounted before making the request
      if (!isComponentMounted.current) return;
      
      // Use a unique request ID to prevent auto-cancellation conflicts
      const requestId = Date.now().toString();
      
      const bookData = await pb.collection('books').getOne<Book>(id, {
        $cancelKey: `book-${id}-${requestId}`, // Unique cancel key with timestamp
      });
      
      // Only update state if component is still mounted
      if (isComponentMounted.current) {
        setBook(bookData);
        setError(null); // Clear any errors after successful fetch
        
        // Fetch category name if we have a category ID
        if (bookData.category) {
          try {
            const categoryData = await pb.collection('categories').getOne<Category>(bookData.category);
            setCategoryName(categoryData.name);
          } catch (categoryErr) {
            console.error('Error fetching category:', categoryErr);
            setCategoryName("Unknown Category");
          }
        } else {
          setCategoryName("Uncategorized");
        }
      }
    } catch (err: any) {
      console.error('Error fetching book:', err);
      
      // Only update error state if component is still mounted
      if (isComponentMounted.current) {
        // Don't show error for intentional cancellations
        if (err instanceof ClientResponseError && err.isAbort) {
          if (abortControllerRef.current?.signal.aborted) {
            // This was an intentional cancellation, don't set error
            return;
          }
        }
        
        const errorMessage = err.message 
          ? `Error: ${err.message}` 
          : 'Failed to load the book. Please try again later.';
        setError(errorMessage);
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isComponentMounted.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    // Set mounted flag
    isComponentMounted.current = true;
    
    fetchBook();
    
    // Cleanup function
    return () => {
      isComponentMounted.current = false;
      
      // Cancel any ongoing requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBook]);

  // Add this new effect to handle auto-retry
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;
    
    // If there's an auto-cancellation error, retry automatically after a delay
    if (error?.includes('autocancelled') || error?.includes('cancelled')) {
      retryTimeout = setTimeout(() => {
        if (isComponentMounted.current) {
          fetchBook();
        }
      }, 1000);
    }
    
    return () => {
      clearTimeout(retryTimeout);
    };
  }, [error, fetchBook]);

  // Function to open PDF in a new tab
  const openInBrowser = () => {
    if (!book) return;
    
    const pdfUrl = getFileUrl('books', book.id, book.pdfFile);
    window.open(pdfUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Loading book...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <p className="text-lg text-red-800">{error || 'Book not found'}</p>
          <div className="mt-4 flex justify-center gap-4">
            <button 
              onClick={fetchBook} 
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Retry
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const coverUrl = getFileUrl('books', book.id, book.coverImage);

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate('/')} 
        className="mb-6 inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
      >
        <ArrowLeft size={16} className="mr-2" />
        Back to Library
      </button>
      
      <div className="mb-8 flex flex-col items-center md:flex-row md:items-start">
        <div className="mb-6 w-48 flex-shrink-0 md:mb-0 md:mr-8">
          <img 
            src={coverUrl} 
            alt={`Cover of ${book.title}`} 
            className="h-auto w-full rounded-lg shadow-md"
          />
        </div>
        
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-800">{book.title}</h1>
          <p className="mb-4 text-lg text-gray-600">by {book.author}</p>
          <div className="mb-4">
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              {categoryName}
            </span>
          </div>
          <p className="text-gray-700">{book.description}</p>
          
          <div className="mt-6">
            {/* Open in browser button */}
            <button
              onClick={openInBrowser}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <ExternalLink size={16} className="mr-2" />
              Open in Browser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookPage;