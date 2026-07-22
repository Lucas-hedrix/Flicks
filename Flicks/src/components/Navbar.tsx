import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaSearch as FaSearchIcon, FaSun, FaMoon } from 'react-icons/fa';
import { TMDBService } from '../services/TMDBService';
import type { MediaItem } from '../services/TMDBService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import headLightLogo from '../assets/head-light_mode.PNG';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close search and dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSuggestions([]);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await TMDBService.searchMulti(searchQuery);
        // Filter out people, only keep movies and tv
        const filtered = res.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 5);
        setSuggestions(filtered);
      } catch (err) {
        console.error("Search failed", err);
      }
    };
    
    const debounce = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSuggestionClick = (item: MediaItem) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSuggestions([]);
    navigate(`/detail/${item.media_type || 'movie'}/${item.id}`, { state: { content: item } });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSuggestions([]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setShowDropdown(false);
    navigate('/');
  };

  // Use a fallback seed if email is not available
  const avatarSeed = user?.email ? encodeURIComponent(user.email) : 'Felix';
  const avatarUrl = `https://api.dicebear.com/10.x/adventurer-neutral/svg?seed=${avatarSeed}`;

  return (
    <header className={`fixed top-0 w-full z-40 transition-colors duration-300 px-4 md:px-12 py-4 flex justify-between items-center ${isScrolled ? 'bg-(--bg-primary) shadow-md dark:shadow-none' : 'bg-linear-to-b from-(--bg-primary) to-transparent'}`}>
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center">
          <img src={headLightLogo} alt="Flicks" className="h-6 md:h-8 dark:invert transition-all" />
        </Link>
        <nav className="hidden md:flex gap-4 text-sm font-semibold text-(--text-secondary)">
          <Link to="/" className={`transition ${location.pathname === '/' ? 'text-(--text-primary) font-bold' : 'hover:text-(--text-primary)'}`}>Home</Link>
          <Link to="/tv" className={`transition ${location.pathname === '/tv' ? 'text-(--text-primary) font-bold' : 'hover:text-(--text-primary)'}`}>TV Shows</Link>
          <Link to="/movies" className={`transition ${location.pathname === '/movies' ? 'text-(--text-primary) font-bold' : 'hover:text-(--text-primary)'}`}>Movies</Link>
          <Link to="/latest" className={`transition ${location.pathname === '/latest' ? 'text-(--text-primary) font-bold' : 'hover:text-(--text-primary)'}`}>New & Popular</Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div ref={searchContainerRef} className="relative flex items-center">
          <form 
            onSubmit={handleSubmit}
            className={`flex items-center border transition-all duration-300 ${isSearchOpen ? 'w-48 md:w-64 bg-(--bg-primary) border-(--border-light) shadow-sm' : 'w-8 bg-transparent border-transparent'}`}
          >
            <button 
              type="button" 
              onClick={() => {
                if (isSearchOpen) {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  setSuggestions([]);
                } else {
                  setIsSearchOpen(true);
                }
              }} 
              className="text-(--text-primary) hover:text-gray-500 shrink-0 flex items-center justify-center w-8 h-8 transition-colors"
            >
              <FaSearchIcon size={isSearchOpen ? 16 : 20} />
            </button>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Titles, people, genres"
              className={`bg-transparent text-(--text-primary) text-sm outline-none transition-all duration-300 ${isSearchOpen ? 'w-full px-2 opacity-100' : 'w-0 px-0 opacity-0 pointer-events-none'}`}
            />
          </form>

          {/* Suggestions Dropdown */}
          {isSearchOpen && suggestions.length > 0 && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-(--bg-primary) border border-(--border-light) rounded shadow-lg overflow-hidden">
              {suggestions.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer border-b border-(--border-light) last:border-0"
                  onClick={() => handleSuggestionClick(item)}
                >
                  {item.poster_path ? (
                    <img src={TMDBService.getImageUrl(item.poster_path, 'w500')} className="w-10 h-14 object-cover rounded" alt={item.title || item.name} />
                  ) : (
                    <div className="w-10 h-14 bg-gray-200 dark:bg-gray-800 rounded flex shrink-0" />
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-(--text-primary) text-sm truncate">{item.title || item.name}</span>
                    <span className="text-(--text-muted) text-xs">{item.media_type === 'movie' ? 'Movie' : 'TV Show'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="text-(--text-primary) hover:text-gray-500 focus:outline-none transition-colors hidden sm:block"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
        </button>

        {/* Auth Section */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button 
              className="w-8 h-8 rounded bg-gray-800 overflow-hidden flex items-center justify-center border border-transparent hover:border-white transition focus:outline-none"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover bg-white" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-(--bg-primary) border border-(--border-light) rounded shadow-xl py-2 z-50">
                <div className="px-4 py-2 text-xs text-(--text-muted) border-b border-(--border-light) truncate">
                  {user.email}
                </div>
                <button 
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10 transition"
                >
                  Sign Out of Flicks
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="bg-netflix-red text-white text-sm font-semibold px-4 py-1.5 rounded hover:bg-red-700 transition">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
