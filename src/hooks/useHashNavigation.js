import { useState, useEffect, useCallback, useRef } from 'react';
import { seedDatabase } from '../db';
import { FullPageSpinner } from '../components/ui/Spinner';

// Manages hash-based routing and app initialization
export const useHashNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [route, setRoute] = useState({ page: 'jobs', id: null });
  const initRef = useRef(false);

  // Parse hash to determine route
  const parseHash = (hash) => {
    const path = hash.substring(1) || '/'; // remove #
    const parts = path.split('/').filter(Boolean); // remove empty strings

    if (parts[0] === 'jobs' && parts[1]) {
      return { page: 'job-detail', id: parts[1] }; // /jobs/:slug
    }
    if (parts[0] === 'jobs') {
      return { page: 'jobs', id: null }; // /jobs
    }
    if (parts[0] === 'candidates' && parts[1]) {
      return { page: 'candidate-detail', id: parts[1] }; // /candidates/:id
    }
    if (parts[0] === 'candidates') {
      return { page: 'candidates', id: null }; // /candidates
    }
    return { page: 'jobs', id: null }; // Default
  };

  // App initialization
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    async function initialize() {
      await seedDatabase();
      // Set initial route from hash *after* seeding
      setRoute(parseHash(window.location.hash));
      setIsLoading(false);
    }
    initialize();
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Navigation function to be passed down
  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);

  return { ...route, navigate, isLoading };
};