import React, { useState, useEffect } from 'react';
import { Briefcase, Users } from 'lucide-react';

export const Navbar = ({ navigate }) => {
  const [hash, setHash] = useState(window.location.hash);
  
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const NavItem = ({ href, icon: Icon, children }) => {
    const isActive = hash.startsWith(href);
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          navigate(href.substring(1)); // remove #
        }}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
          isActive
            ? 'bg-indigo-700 text-white'
            : 'text-indigo-100 hover:bg-indigo-500 hover:bg-opacity-75'
        }`}
      >
        <Icon className="h-5 w-5 mr-2" />
        {children}
      </a>
    );
  };

  return (
    <nav className="bg-indigo-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold text-white">TalentFlow</h1>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <NavItem href="#/jobs" icon={Briefcase}>Jobs</NavItem>
                <NavItem href="#/candidates" icon={Users}>Candidates</NavItem>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};