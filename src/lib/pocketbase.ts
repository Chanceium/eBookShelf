import PocketBase from 'pocketbase';

// Determine the appropriate PocketBase URL
const getPocketBaseUrl = () => {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV !== 'production';
  
  // For server-side requests in development, we use localhost
  if (isDev && typeof window === 'undefined') {
    return 'http://localhost:8090';
  }
  
  // For server-side requests in production, we use the Docker service name
  if (typeof window === 'undefined') {
    return 'http://pocketbase:8090';
  }
  
  // This is a fallback for any remaining client-side usage
  // Eventually, all direct PocketBase calls should be on the server
  return `${window.location.protocol}//${window.location.hostname}:8090`;
};

// Create a single PocketBase instance to use throughout the app
export const pb = new PocketBase(getPocketBaseUrl());

// Types for our collections
export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  coverImage: string;
  pdfFile: string;
  created: string;
  updated: string;
}

export interface Category {
  id: string;
  name: string;
  created: string;
  updated: string;
}

// Helper function to get the file URL - now returns API endpoint path instead of direct PB URL
export const getFileUrl = (collectionId: string, recordId: string, fileName: string) => {
  // Use our own API endpoint instead of direct PocketBase URL
  return `/api/files/${collectionId}/${recordId}/${fileName}`;
};
