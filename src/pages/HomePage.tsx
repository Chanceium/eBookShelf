import React, { useEffect, useState, useRef } from 'react';
import { pb } from '../lib/pocketbase';
import BookCard from '../components/BookCard';
import CategoryFilter from '../components/CategoryFilter';
import { Book, Category, SiteSettings, getFileUrl } from '../lib/pocketbase';
import { Library, BookOpen, GraduationCap, Quote, Loader2 } from 'lucide-react';
import { useBooks } from '../hooks/useApi'; // Import the useBooks hook

const HomePage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const isInitialLoad = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [heroLoading, setHeroLoading] = useState(true);
  const [animateBooks, setAnimateBooks] = useState(false);

  // Use the useBooks hook to fetch books with visibility filter
  const categoryFilter = selectedCategory ? `category="${selectedCategory}"` : '';
  const { 
    books, 
    loading: booksLoading, 
    error: booksError,
    refetch: refetchBooks 
  } = useBooks(1, 100, categoryFilter, true);

  // Fetch site settings and categories when the component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch site settings
        setHeroLoading(true);
        try {
          const siteSettingsData = await pb.collection('site_settings').getFirstListItem<SiteSettings>('');
          setSiteSettings(siteSettingsData);
        } catch (err) {
          console.error('Could not fetch site settings:', err);
        } finally {
          // Ensure hero loading is set to false even if there's an error
          setHeroLoading(false);
        }

        // Fetch categories
        const categoriesData = await pb.collection('categories').getFullList<Category>({
          $cancelKey: `categories-${Date.now()}`,
        });
        setCategories(categoriesData);
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
      } finally {
        // Set loading to false after initial data fetch
        setLoading(false);
        // Mark initial load as complete
        isInitialLoad.current = false;
      }
    };

    fetchInitialData();
  }, []);

  // Update the error state when booksError changes
  useEffect(() => {
    if (booksError) {
      setError(booksError);
    } else {
      setError(null);
    }
  }, [booksError]);

  // Handle animation timing
  useEffect(() => {
    // When books finish loading, trigger animation
    if (!booksLoading && !loading) {
      // Reset animation state first
      setAnimateBooks(false);
      
      // Small delay before starting animation
      const timer = setTimeout(() => {
        setAnimateBooks(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [booksLoading, loading, books]);

  const handleCategorySelect = (categoryId: string | null) => {
    // Prevent page refresh by using React state
    setSelectedCategory(categoryId);
  };

  // Only show error if it's not the initial load
  const shouldShowError = error && !loading && !booksLoading && !isInitialLoad.current;
  
  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-16">
          {heroLoading ? (
            // Skeleton loader for the hero section while loading
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <Loader2 size={40} className="animate-spin mx-auto text-white opacity-70 mb-4" />
                <p className="text-blue-200">Loading site information...</p>
              </div>
            </div>
          ) : (
            // Render the actual content once loaded
            <div className="flex flex-col lg:flex-row items-center">
              <div className="lg:w-1/2 mb-8 lg:mb-0 order-2 lg:order-1">
                <div className="flex items-center mb-4">
                  <GraduationCap size={40} className="mr-3 text-yellow-300" />
                  <h1 className="text-4xl md:text-5xl font-bold">
                    {siteSettings?.site_title || "eBookShelf"}
                  </h1>
                </div>
                <h2 className="text-2xl font-semibold mb-6 text-blue-200">
                  {siteSettings?.subtitle || "Digital Library"}
                </h2>
                
                <div className="mb-8 pl-4 border-l-4 border-yellow-400">
                  <Quote size={24} className="text-yellow-300 mb-2" />
                  <p className="text-xl italic text-blue-100">
                    "{siteSettings?.quote || "Learning is a treasure that will follow its owner everywhere"}"
                  </p>
                  <p className="text-right mt-2 text-blue-200 font-medium">
                    {siteSettings?.quote_name ? `— ${siteSettings.quote_name}` : ""}
                  </p>
                </div>
                
                <p className="text-lg mb-6 text-blue-100">
                  {siteSettings?.site_description || "Welcome to this collection of educational resources and literature."}
                </p>
                
                <div className="flex items-center">
                  <BookOpen size={20} className="mr-2 text-yellow-300" />
                  <span className="text-blue-200 font-medium">
                    {books.length} {books.length === 1 ? 'book' : 'books'} available in the collection
                  </span>
                </div>
              </div>
              <div className="lg:w-1/2 flex justify-center order-1 lg:order-2">
                <div className="relative mt-4 mb-12 sm:mb-8 lg:mb-0">
                  <div className="w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden border-4 border-white shadow-2xl transform rotate-3">
                    {siteSettings?.hero_photo ? (
                      <img 
                        src={getFileUrl('site_settings', siteSettings.id, siteSettings.hero_photo)} 
                        alt={siteSettings.hero_caption || "Hero image"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src="/hero.jpg" 
                        alt="Default hero image" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="absolute -bottom-3 sm:-bottom-4 -right-2 sm:-right-4 bg-yellow-400 text-blue-900 rounded-lg py-1 sm:py-2 px-3 sm:px-4 shadow-lg transform rotate-3">
                    <p className="font-bold text-xs sm:text-sm">
                      {siteSettings?.hero_caption || "Digital Library"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <CategoryFilter 
          categories={categories} 
          selectedCategory={selectedCategory} 
          onSelectCategory={handleCategorySelect} 
        />
        
        {/* Replace the loading and content sections with this fixed version */}
        <div className="relative min-h-[16rem]">
          {/* Loading spinner with absolute positioning */}
          {(booksLoading && !isInitialLoad.current) && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                <p className="text-gray-600">Loading books...</p>
              </div>
            </div>
          )}
          
          {/* Initial loading with absolute positioning */}
          {loading && isInitialLoad.current && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                <p className="text-gray-600">Loading books...</p>
              </div>
            </div>
          )}
          
          {/* Error message with fixed retry button */}
          {shouldShowError && (
            <div className="rounded-lg bg-red-50 p-4 text-center text-red-800">
              <p>{error}</p>
              <button 
                onClick={() => {
                  // Fix: Use refetchBooks instead of nonexistent setBooksLoading
                  refetchBooks();
                }} 
                className="mt-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Content section with improved transition */}
          <div className={`transition-opacity duration-300 ${(booksLoading || loading) ? 'opacity-0' : 'opacity-100'}`}>
            {!shouldShowError && (
              <>
                {books.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {books.map((book, index) => (
                      <div 
                        key={book.id}
                        className={`transform transition-all duration-500 ${
                          animateBooks 
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-8'
                        }`}
                        style={{ 
                          transitionDelay: animateBooks ? `${index * 100}ms` : '0ms' 
                        }}
                      >
                        <BookCard book={book} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center rounded-lg bg-gray-50 p-12 text-center
                                  transition-all duration-500 ${animateBooks ? 'opacity-100' : 'opacity-0'}`}>
                    <Library size={64} className="mb-4 text-gray-400" />
                    <h3 className="mb-2 text-xl font-semibold text-gray-700">No books found</h3>
                    <p className="text-gray-500">
                      {selectedCategory 
                        ? "There are no books in this category yet." 
                        : "Your library is empty. Add some books to get started!"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;