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
  
  // For browser client requests, always use the /pb path
  return `${window.location.origin}/pb`;
};

// Create and configure PocketBase instance
const pb = new PocketBase(getPocketBaseUrl());

// Set additional options for better error handling
pb.autoCancellation(false);

// Log the base URL for debugging
console.log('PocketBase initialized with URL:', pb.baseUrl);

export { pb };

// Types for our collections
export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  coverImage: string;
  pdfFile: string;
  isbn: string;
  published_date: Date;
  edition: string;
  subtitle: string;
  created: string;
  updated: string;
}

export interface Category {
  id: string;
  name: string;
  created: string;
  updated: string;
}

export interface SiteSettings {
  id: string;
  site_title: string;
  site_description: string;
  subtitle: string;
  quote: string;
  quote_name: string;
  hero_photo: File;
  hero_caption: string;
  created: string;
  updated: string;
}

// Helper function to get the file URL - now returns API endpoint path instead of direct PB URL
export const getFileUrl = (collectionId: string, recordId: string, fileName: string) => {
  // Use our own API endpoint instead of direct PocketBase URL
  return `/api/files/${collectionId}/${recordId}/${fileName}`;
};