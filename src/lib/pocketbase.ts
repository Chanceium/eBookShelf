import PocketBase from 'pocketbase';

// Create a single PocketBase instance to use throughout the app
export const pb = new PocketBase('http://127.0.0.1:8090');

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

// Helper function to get the file URL
export const getFileUrl = (collectionId: string, recordId: string, fileName: string) => {
  return `${pb.baseUrl}/api/files/${collectionId}/${recordId}/${fileName}`;
};