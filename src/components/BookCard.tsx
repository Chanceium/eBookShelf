import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, Category, getFileUrl, pb } from '../lib/pocketbase';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const [categoryName, setCategoryName] = useState<string>("");
  const coverUrl = getFileUrl('books', book.id, book.coverImage);
  
  useEffect(() => {
    // Fetch the category name
    const fetchCategoryName = async () => {
      try {
        if (book.category) {
          const categoryData = await pb.collection('categories').getOne<Category>(book.category);
          setCategoryName(categoryData.name);
        }
      } catch (err) {
        console.error('Error fetching category:', err);
        setCategoryName("Unknown Category");
      }
    };
    
    fetchCategoryName();
  }, [book.category]);
  
  return (
    <Link to={`/book/${book.id}`} className="group">
      <div className="overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:shadow-xl">
        <div className="relative h-64 overflow-hidden">
          <img 
            src={coverUrl} 
            alt={`Cover of ${book.title}`} 
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <h3 className="mb-1 text-lg font-semibold text-gray-800">{book.title}</h3>
          <p className="text-sm text-gray-600">by {book.author}</p>
          <div className="mt-2">
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
              {categoryName}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BookCard;