import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Book, Category, SiteSettings, getFileUrl } from '../lib/pocketbase';
import { Plus, Trash, Edit, BookOpen, FolderPlus, X, Loader2, Settings } from 'lucide-react';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookForm, setShowBookForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Book form state
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [bookCategory, setBookCategory] = useState('');
  const [bookCover, setBookCover] = useState<File | null>(null);
  const [bookPdf, setBookPdf] = useState<File | null>(null);
  // New book fields
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookPublishedDate, setBookPublishedDate] = useState('');
  const [bookEdition, setBookEdition] = useState('');
  const [bookSubtitle, setBookSubtitle] = useState('');
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [existingCoverImage, setExistingCoverImage] = useState<string>('');
  const [existingPdfFile, setExistingPdfFile] = useState<string>('');
  
  // Category form state
  const [categoryName, setCategoryName] = useState('');

  // Add upload progress state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Add retry state
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Site Settings state
  const [showSiteSettingsForm, setShowSiteSettingsForm] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [siteSubtitle, setSiteSubtitle] = useState('');
  const [siteQuote, setSiteQuote] = useState('');
  const [siteQuoteName, setSiteQuoteName] = useState('');
  const [siteHeroPhoto, setSiteHeroPhoto] = useState<File | null>(null);
  const [siteHeroCaption, setSiteHeroCaption] = useState('');
  const [existingHeroPhoto, setExistingHeroPhoto] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    // Check if user is authenticated as admin
    if (!pb.authStore.isValid) {
      navigate('/login');
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories
        const categoriesData = await pb.collection('categories').getFullList<Category>();
        setCategories(categoriesData);
        
        // Fetch books
        const booksData = await pb.collection('books').getFullList<Book>({
          sort: '-created',
        });
        setBooks(booksData);

        // Fetch site settings - there should be only one record
        try {
          const siteSettingsData = await pb.collection('site_settings').getFirstListItem<SiteSettings>('');
          setSiteSettings(siteSettingsData);
        } catch (err) {
          console.log('No site settings found. Will create new on save.');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const resetBookForm = () => {
    setBookTitle('');
    setBookAuthor('');
    setBookDescription('');
    setBookCategory('');
    setBookCover(null);
    setBookPdf(null);
    // Reset new fields
    setBookIsbn('');
    setBookPublishedDate('');
    setBookEdition('');
    setBookSubtitle('');
    setEditMode(false);
    setEditBookId(null);
    setExistingCoverImage('');
    setExistingPdfFile('');
    setFormError(null);
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editMode && (!bookCover || !bookPdf)) {
      setFormError('Please select both a cover image and PDF file');
      return;
    }
    
    // Check file size limits
    if (bookPdf && bookPdf.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
      setFormError('PDF file size exceeds the 2GB limit. Please optimize your file or split it into smaller parts.');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setFormError(null);
      
      // Calculate total file size for progress tracking
      const coverSize = bookCover ? bookCover.size : 0;
      const pdfSize = bookPdf ? bookPdf.size : 0;
      const totalSize = coverSize + pdfSize;
      
      // Prepare FormData
      const formData = new FormData();
      formData.append('title', bookTitle);
      formData.append('author', bookAuthor);
      formData.append('description', bookDescription);
      formData.append('category', bookCategory);
      // Add new fields
      formData.append('isbn', bookIsbn);
      formData.append('published_date', bookPublishedDate);
      formData.append('edition', bookEdition);
      formData.append('subtitle', bookSubtitle);
      
      if (bookCover) {
        formData.append('coverImage', bookCover);
      }
      
      if (bookPdf) {
        formData.append('pdfFile', bookPdf);
      }
      
      // Function to perform upload with retry capability
      const performUploadWithRetry = async (currentRetry = 0) => {
        return new Promise((resolve, reject) => {
          // If we've reached max retries, give up
          if (currentRetry > MAX_RETRIES) {
            reject(new Error(`Failed after ${MAX_RETRIES} attempts. Please try again.`));
            return;
          }
          
          // If this is a retry, update UI
          if (currentRetry > 0) {
            setRetryCount(currentRetry); // Update retry count state
            setFormError(`Network error detected. Automatically retrying... (Attempt ${currentRetry}/${MAX_RETRIES})`);
          }
          
          // Create request
          const xhr = new XMLHttpRequest();
          
          // Last known progress for stall detection
          let lastProgress = 0;
          let stallDetectionTimer: NodeJS.Timeout | null = null;
          
          // Set up progress event with stall detection
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.floor((event.loaded / event.total) * 100);
              setUploadProgress(Math.min(percentComplete, 99)); // Cap at 99% until server confirms
              console.log(`Upload progress: ${percentComplete}%`);
              
              // Update last progress for stall detection
              lastProgress = percentComplete;
              
              // Reset stall detection timer
              if (stallDetectionTimer) clearTimeout(stallDetectionTimer);
              
              // Set new stall detection timer - if no progress for 30 seconds, consider it stalled
              stallDetectionTimer = setTimeout(() => {
                console.log("Upload appears stalled, will retry automatically if it fails");
              }, 30000);
            }
          });
          
          // Completion handler
          xhr.onload = async function() {
            // Clear stall detection
            if (stallDetectionTimer) clearTimeout(stallDetectionTimer);
            
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(100);
              
              // Success pause to show 100%
              await new Promise(resolve => setTimeout(resolve, 800));
              
              // Reset form & refresh book list
              resetBookForm();
              setShowBookForm(false);
              
              const booksData = await pb.collection('books').getFullList<Book>({
                sort: '-created',
              });
              setBooks(booksData);
              
              resolve(true);
            } else {
              console.error(`Server error: ${xhr.status} ${xhr.statusText}`);
              
              // Server error (not network error) - no automatic retry
              reject(new Error(`Server responded with status ${xhr.status}: ${xhr.statusText}`));
            }
          };
          
          // Error handler - retry for network errors
          xhr.onerror = function() {
            console.error(`Network error occurred during upload (attempt ${currentRetry + 1})`);
            
            // Clear stall detection
            if (stallDetectionTimer) clearTimeout(stallDetectionTimer);
            
            // For network errors, we want to retry automatically
            setTimeout(() => {
              console.log(`Retrying upload (attempt ${currentRetry + 1} of ${MAX_RETRIES})`);
              performUploadWithRetry(currentRetry + 1)
                .then(resolve)
                .catch(reject);
            }, 3000); // Wait 3 seconds before retry
          };
          
          // Abort handler
          xhr.onabort = function() {
            console.log("Upload was aborted");
            if (stallDetectionTimer) clearTimeout(stallDetectionTimer);
            reject(new Error('Upload was aborted'));
          };
          
          // Set timeout - 30 minutes for large files
          xhr.timeout = 30 * 60 * 1000; // 30 minutes
          xhr.ontimeout = function() {
            console.error("Upload timed out");
            if (stallDetectionTimer) clearTimeout(stallDetectionTimer);
            
            // For timeouts, we also want to retry automatically
            setTimeout(() => {
              console.log(`Retrying upload after timeout (attempt ${currentRetry + 1} of ${MAX_RETRIES})`);
              performUploadWithRetry(currentRetry + 1)
                .then(resolve)
                .catch(reject);
            }, 3000); // Wait 3 seconds before retry
          };
          
          // Open and send the request
          const url = editMode && editBookId
            ? `/pb/api/collections/books/records/${editBookId}`
            : `/pb/api/collections/books/records`;
          
          xhr.open(editMode && editBookId ? 'PATCH' : 'POST', url, true);
          
          // Add authentication header
          if (pb.authStore.isValid) {
            xhr.setRequestHeader('Authorization', pb.authStore.token);
          }
          
          // Add manual retry header so server can recognize retry attempts
          xhr.setRequestHeader('X-Retry-Count', currentRetry.toString());
          
          // Send the FormData
          xhr.send(formData);
        });
      };
      
      // Start the upload process
      return performUploadWithRetry()
        .catch(err => {
          console.error('Final error after retries:', err);
          setFormError(`Upload failed: ${err.message}. Please try again.`);
        })
        .finally(() => {
          setIsUploading(false);
          setRetryCount(0); // Reset retry count when complete
        });
    } catch (err) {
      console.error('Error preparing upload:', err);
      setFormError(`Failed to ${editMode ? 'update' : 'add'} book: ${err.message || 'Unknown error'}. Please try again.`);
      setIsUploading(false);
    }
  };

  const handleEditBook = (book: Book) => {
    // Set form to edit mode
    setEditMode(true);
    setEditBookId(book.id);
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookDescription(book.description);
    setBookCategory(book.category);
    setExistingCoverImage(book.coverImage);
    setExistingPdfFile(book.pdfFile);
    
    // Set new fields
    setBookIsbn(book.isbn || '');
    setBookPublishedDate(book.published_date ? new Date(book.published_date).toISOString().split('T')[0] : '');
    setBookEdition(book.edition || '');
    setBookSubtitle(book.subtitle || '');
    
    // Show the form
    setShowBookForm(true);
    
    // Remove automatic scrolling
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setShowBookForm(false);
    resetBookForm();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await pb.collection('categories').create({
        name: categoryName,
      });
      
      // Reset form
      setCategoryName('');
      setShowCategoryForm(false);
      
      // Refresh categories list
      const categoriesData = await pb.collection('categories').getFullList<Category>();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error adding category:', err);
      setFormError('Failed to add category. Please try again.');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await pb.collection('books').delete(id);
        
        // Update books list
        setBooks(books.filter(book => book.id !== id));
      } catch (err) {
        console.error('Error deleting book:', err);
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? This may affect books using this category.')) {
      try {
        await pb.collection('categories').delete(id);
        
        // Update categories list
        setCategories(categories.filter(category => category.id !== id));
      } catch (err) {
        console.error('Error deleting category:', err);
      }
    }
  };

  const handleEditSiteSettings = () => {
    // Populate form with existing settings if available
    if (siteSettings) {
      setSiteTitle(siteSettings.site_title || '');
      setSiteDescription(siteSettings.site_description || '');
      setSiteSubtitle(siteSettings.subtitle || '');
      setSiteQuote(siteSettings.quote || '');
      setSiteQuoteName(siteSettings.quote_name || '');
      setExistingHeroPhoto(siteSettings.hero_photo || '');
      setSiteHeroCaption(siteSettings.hero_caption || '');
    }
    
    setShowSiteSettingsForm(true);
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSavingSettings(true);
      setFormError(null);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('site_title', siteTitle);
      formData.append('site_description', siteDescription);
      formData.append('subtitle', siteSubtitle);
      formData.append('quote', siteQuote);
      formData.append('quote_name', siteQuoteName);
      formData.append('hero_caption', siteHeroCaption);
      
      if (siteHeroPhoto) {
        formData.append('hero_photo', siteHeroPhoto);
      }
      
      let updatedSettings;
      
      if (siteSettings) {
        // Update existing record
        updatedSettings = await pb.collection('site_settings').update(siteSettings.id, formData);
      } else {
        // Create new record
        updatedSettings = await pb.collection('site_settings').create(formData);
      }
      
      setSiteSettings(updatedSettings);
      setShowSiteSettingsForm(false);
      
      // Show success message
      alert('Site settings updated successfully!');
    } catch (err) {
      console.error('Error saving site settings:', err);
      setFormError(`Failed to save site settings: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCancelSiteSettings = () => {
    setShowSiteSettingsForm(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      
      {/* Site Settings Section */}
      <div className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Site Settings</h2>
          {!showSiteSettingsForm && (
            <button
              onClick={handleEditSiteSettings}
              className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              <Settings size={16} className="mr-2" />
              Edit Site Settings
            </button>
          )}
        </div>
        
        {showSiteSettingsForm && (
          <div className="mb-6 rounded-lg bg-gray-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">Edit Site Settings</h3>
              <button 
                onClick={handleCancelSiteSettings}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {formError && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleSaveSiteSettings}>
              <div className="mb-4">
                <label htmlFor="siteTitle" className="mb-1 block text-sm font-medium text-gray-700">
                  Site Title
                </label>
                <input
                  id="siteTitle"
                  type="text"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  required
                  className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="siteDescription" className="mb-1 block text-sm font-medium text-gray-700">
                  Site Description
                </label>
                <textarea
                  id="siteDescription"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  required
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Used for SEO and social media sharing</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="siteSubtitle" className="mb-1 block text-sm font-medium text-gray-700">
                  Subtitle
                </label>
                <input
                  id="siteSubtitle"
                  type="text"
                  value={siteSubtitle}
                  onChange={(e) => setSiteSubtitle(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="siteQuote" className="mb-1 block text-sm font-medium text-gray-700">
                    Quote
                  </label>
                  <textarea
                    id="siteQuote"
                    value={siteQuote}
                    onChange={(e) => setSiteQuote(e.target.value)}
                    rows={2}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="siteQuoteName" className="mb-1 block text-sm font-medium text-gray-700">
                    Quote Attribution
                  </label>
                  <input
                    id="siteQuoteName"
                    type="text"
                    value={siteQuoteName}
                    onChange={(e) => setSiteQuoteName(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="siteHeroPhoto" className="mb-1 block text-sm font-medium text-gray-700">
                  Hero Image
                </label>
                {existingHeroPhoto && (
                  <div className="mb-2 flex items-center">
                    <div className="mr-4 h-20 w-32 overflow-hidden rounded border">
                      <img 
                        src={getFileUrl('site_settings', siteSettings?.id as string, existingHeroPhoto)} 
                        alt="Current hero" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-gray-600">Current hero image</p>
                  </div>
                )}
                <input
                  id="siteHeroPhoto"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSiteHeroPhoto(e.target.files?.[0] || null)}
                  className="block w-full rounded-md border border-gray-300 p-2 text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {existingHeroPhoto ? "Only select a file if you want to change the current image" : "Recommended: JPG or PNG, 1920x1080px"}
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="siteHeroCaption" className="mb-1 block text-sm font-medium text-gray-700">
                  Hero Caption
                </label>
                <input
                  id="siteHeroCaption"
                  type="text"
                  value={siteHeroCaption}
                  onChange={(e) => setSiteHeroCaption(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelSiteSettings}
                  className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className={`rounded-md px-4 py-2 text-white ${
                    savingSettings 
                      ? 'bg-purple-400 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {savingSettings ? (
                    <span className="flex items-center">
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {!showSiteSettingsForm && siteSettings && (
          <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 bg-white">
              <dl className="divide-y divide-gray-200">
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Site Title</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{siteSettings.site_title}</dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Site Description</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{siteSettings.site_description}</dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Subtitle</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{siteSettings.subtitle}</dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Quote</dt>
                  <dd className="text-sm text-gray-900 col-span-2">
                    {siteSettings.quote && (
                      <>
                        <p>"{siteSettings.quote}"</p>
                        {siteSettings.quote_name && (
                          <p className="italic mt-1">— {siteSettings.quote_name}</p>
                        )}
                      </>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
        
        {!showSiteSettingsForm && !siteSettings && (
          <div className="rounded-lg bg-gray-50 p-6 text-center">
            <p className="text-gray-600">No site settings found. Click "Edit Site Settings" to set up your site configuration.</p>
          </div>
        )}
      </div>
      
      <div className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Categories</h2>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            {showCategoryForm ? 'Cancel' : (
              <>
                <FolderPlus size={16} className="mr-2" />
                Add Category
              </>
            )}
          </button>
        </div>
        
        {showCategoryForm && (
          <div className="mb-6 rounded-lg bg-gray-50 p-6">
            <h3 className="mb-4 text-lg font-medium text-gray-800">Add New Category</h3>
            <form onSubmit={handleAddCategory}>
              <div className="mb-4">
                <label htmlFor="categoryName" className="mb-1 block text-sm font-medium text-gray-700">
                  Category Name
                </label>
                <input
                  id="categoryName"
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        )}
        
        {categories.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-6 text-center">
            <p className="text-gray-600">No categories found. Add your first category to get started.</p>
          </div>
        )}
      </div>
      
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Books</h2>
          {!showBookForm && (
            <button
              onClick={() => setShowBookForm(true)}
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              <Plus size={16} className="mr-2" />
              Add Book
            </button>
          )}
        </div>
        
        {showBookForm && (
          <div className="mb-6 rounded-lg bg-gray-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">
                {editMode ? 'Edit Book' : 'Add New Book'}
              </h3>
              <button 
                onClick={handleCancelForm}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>
            
            {formError && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleAddBook}>
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="bookTitle" className="mb-1 block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    id="bookTitle"
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    required
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="bookAuthor" className="mb-1 block text-sm font-medium text-gray-700">
                    Author
                  </label>
                  <input
                    id="bookAuthor"
                    type="text"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    required
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* New field: Subtitle */}
              <div className="mb-4">
                <label htmlFor="bookSubtitle" className="mb-1 block text-sm font-medium text-gray-700">
                  Subtitle (optional)
                </label>
                <input
                  id="bookSubtitle"
                  type="text"
                  value={bookSubtitle}
                  onChange={(e) => setBookSubtitle(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="bookDescription" className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="bookDescription"
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                  required
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* New field: ISBN */}
                <div>
                  <label htmlFor="bookIsbn" className="mb-1 block text-sm font-medium text-gray-700">
                    ISBN (optional)
                  </label>
                  <input
                    id="bookIsbn"
                    type="text"
                    value={bookIsbn}
                    onChange={(e) => setBookIsbn(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                
                {/* New field: Published Date */}
                <div>
                  <label htmlFor="bookPublishedDate" className="mb-1 block text-sm font-medium text-gray-700">
                    Published Date (optional)
                  </label>
                  <input
                    id="bookPublishedDate"
                    type="date"
                    value={bookPublishedDate}
                    onChange={(e) => setBookPublishedDate(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                
                {/* New field: Edition */}
                <div>
                  <label htmlFor="bookEdition" className="mb-1 block text-sm font-medium text-gray-700">
                    Edition (optional)
                  </label>
                  <input
                    id="bookEdition"
                    type="text"
                    value={bookEdition}
                    onChange={(e) => setBookEdition(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="bookCategory" className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="bookCategory"
                  value={bookCategory}
                  onChange={(e) => setBookCategory(e.target.value)}
                  required
                  className="block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="bookCover" className="mb-1 block text-sm font-medium text-gray-700">
                    Cover Image
                  </label>
                  {editMode && existingCoverImage && (
                    <div className="mb-2 flex items-center">
                      <div className="mr-4 h-24 w-16 overflow-hidden rounded border">
                        <img 
                          src={getFileUrl('books', editBookId as string, existingCoverImage)} 
                          alt="Current cover" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="text-sm text-gray-600">Current cover</p>
                    </div>
                  )}
                  <input
                    id="bookCover"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBookCover(e.target.files?.[0] || null)}
                    required={!editMode}
                    className="block w-full rounded-md border border-gray-300 p-2 text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {editMode ? "Only select a file if you want to change the current cover" : "Recommended: JPG or PNG, 500x800px"}
                  </p>
                </div>
                
                <div>
                  <label htmlFor="bookPdf" className="mb-1 block text-sm font-medium text-gray-700">
                    PDF File
                  </label>
                  {editMode && existingPdfFile && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">
                        Current file: {existingPdfFile}
                      </p>
                    </div>
                  )}
                  <input
                    id="bookPdf"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setBookPdf(e.target.files?.[0] || null)}
                    required={!editMode}
                    className="block w-full rounded-md border border-gray-300 p-2 text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {editMode && (
                    <p className="mt-1 text-xs text-gray-500">
                      Only select a file if you want to change the current PDF
                    </p>
                  )}
                </div>
              </div>
              
              {/* Enhanced progress UI with retry information */}
              {isUploading && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {uploadProgress < 99 ? 'Uploading files...' : 'Processing files...'}
                    </span>
                    <span className="text-sm font-medium text-blue-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        formError && formError.includes('retry') 
                          ? 'bg-amber-500 animate-pulse'
                          : uploadProgress === 99 
                            ? 'bg-yellow-500 animate-pulse' 
                            : 'bg-blue-600'
                      }`} 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  
                  <div className="mt-2 flex justify-between">
                    <p className="text-xs text-gray-500">
                      {formError && formError.includes('retry') ? (
                        <span className="font-medium text-amber-600">{formError}</span>
                      ) : uploadProgress < 95 ? (
                        "Please don't close the browser window during upload."
                      ) : uploadProgress < 100 ? (
                        "Server is processing your upload. This may take several minutes."
                      ) : (
                        "Upload complete! Processing..."
                      )}
                    </p>
                    
                    {uploadProgress === 99 && !formError && (
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Reload page if stuck
                      </button>
                    )}
                    
                    {formError && formError.includes('Network') && !formError.includes('retry') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          // Clear error and retry
                          setFormError(null);
                          handleAddBook(e);
                        }}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Retry Upload
                      </button>
                    )}
                  </div>
                  
                  {/* Enhanced information for network issues */}
                  {formError && formError.includes('Network') && (
                    <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200">
                      <p className="text-sm text-amber-800">
                        <strong>Network issue detected</strong><br />
                        Your internet connection may be unstable. The system will retry automatically, but you can also:
                        <ul className="list-disc ml-5 mt-1">
                          <li>Check your internet connection</li>
                          <li>Wait for automatic retry</li>
                          <li>Click "Retry Upload" to try again manually</li>
                        </ul>
                      </p>
                    </div>
                  )}
                  
                  {/* For large files, show file size information */}
                  {bookPdf && bookPdf.size > 100 * 1024 * 1024 && (
                    <div className={`mt-3 p-3 rounded-md ${
                      bookPdf.size > 1024 * 1024 * 1024 ? 
                      'bg-yellow-50 border border-yellow-200' : 'bg-blue-50'
                    }`}>
                      <p className="text-sm text-blue-700">
                        <strong>
                          {bookPdf.size > 1024 * 1024 * 1024 ? 
                            `Large file: ${(bookPdf.size / (1024 * 1024 * 1024)).toFixed(2)} GB` :
                            `Large file: ${Math.round(bookPdf.size / (1024 * 1024))} MB`
                          }
                        </strong>
                        <br />
                        {bookPdf.size > 1024 * 1024 * 1024 ? (
                          <>
                            For files this large, occasional network disruptions are common. If the upload stops:
                            <ul className="list-disc ml-5 mt-1">
                              <li>The system will automatically retry up to 3 times</li>
                              <li>Your progress is preserved between retries</li>
                              <li>Upload will continue from where it left off when possible</li>
                            </ul>
                          </>
                        ) : (
                          "Large files take longer to upload. The system will automatically retry if connection issues occur."
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`rounded-md px-4 py-2 text-white ${
                    isUploading 
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isUploading ? (
                    <span className="flex items-center">
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    editMode ? 'Update Book' : 'Save Book'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {books.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Book
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {books.map((book) => {
                  const category = categories.find(c => c.id === book.category);
                  return (
                    <tr key={book.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded">
                            <img 
                              src={getFileUrl('books', book.id, book.coverImage)} 
                              alt="" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{book.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-500">{book.author}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                          {category?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/book/${book.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View"
                          >
                            <BookOpen size={16} />
                          </button>
                          <button
                            onClick={() => handleEditBook(book)}
                            className="text-amber-600 hover:text-amber-900"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-6 text-center">
            <p className="text-gray-600">No books found. Add your first book to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;