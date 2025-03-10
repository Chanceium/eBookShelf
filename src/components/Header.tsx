import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, LogOut, User } from 'lucide-react';
import { pb } from '../lib/pocketbase';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/');
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
          <img 
            src="logo.png" 
            alt="eBookShelf Logo" 
            width={24} 
            height={24} 
            className="hidden sm:block" 
          />
          <span>eBookShelf</span>
        </Link>
        
        <nav>
          <ul className="flex items-center space-x-1 sm:space-x-4">
            <li>
              <Link 
                to="/" 
                className={`flex items-center px-2 py-2 text-base sm:text-sm font-medium ${
                  location.pathname === '/' 
                    ? 'text-blue-600' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Home
              </Link>
            </li>
            
            {pb.authStore.isValid && (
              <li>
                <Link 
                  to="/admin" 
                  className={`flex items-center px-2 py-2 text-base sm:text-sm font-medium ${
                    location.pathname.startsWith('/admin') 
                      ? 'text-blue-600' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <Settings size={18} className="mr-1" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </li>
            )}
            
            {!pb.authStore.isValid ? (
              <li>
                <Link 
                  to="/login" 
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-base sm:text-sm font-medium text-white hover:bg-blue-700"
                >
                  <User size={18} className="mr-1 sm:mr-1.5" />
                  Login
                </Link>
              </li>
            ) : (
              <li className="ml-1 sm:ml-2">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1 rounded-md bg-gray-200 px-4 py-2 text-base sm:text-sm font-medium text-gray-700 hover:bg-gray-300"
                  title="Logout"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;