import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

const Layout = ({ children, navigate }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar navigate={navigate} />
      <main className="flex-grow"> {/* Adjusted height for header+footer */}
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;