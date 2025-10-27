import React from 'react';

export const Footer = () => {
  const user = {
    name: "Priyanshu Kumar",
    github: "https://github.com/priyanshuk6395/",
    linkedin: "https://www.linkedin.com/in/priyanshu-kumar-51452b232/",
  };

  return (
    <footer className="bg-gray-800 text-gray-300 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Column 1: About This Project */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Why TALENTFLOW?
          </h3>
          <p className="text-sm text-gray-400">
            This project is a high-fidelity portfolio piece built to demonstrate
            advanced frontend capabilities. As a developer with a backend focus,
            I built this to showcase proficiency in complex UI, state management,
            and API design, proving full-stack versatility.
          </p>
        </div>

        {/* Column 2: Tech Highlights */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Core Technologies</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>React, Hooks, and Dnd-kit</li>
            <li>Tailwind CSS</li>
            <li>Dexie.js (IndexedDB)</li>
            <li>Mock Service Worker (MSW)</li>
            <li>react-window (Virtualization)</li>
          </ul>
        </div>

        {/* Column 3: About Me */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">About Me</h3>
          <p className="text-sm text-gray-400 mb-4">
             IT undergrad (B.Tech 2026) with hands-on experience in full-stack web development, blockchain systems, and cloud
 solutions. Proficient in C++, JavaScript, React, Node.js and MongoDB. Skilled at building secure, scalable
 software and collaborating in agile teams. Seeking software-engineering internships.
          </p>
          <div className="flex space-x-4">
            <a
              href={user.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white"
            >
              <span className="sr-only">GitHub</span>
              {/* Inlined GitHub Icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-1.5 6-6.5a5.4 5.4 0 0 0-1.5-3.75a5 5 0 0 0-.1-3.75s-1-.3-3.5 1.3a12.3 12.3 0 0 0-6.5 0C5.1 2.8 4.1 3.1 4.1 3.1s-.1 1.4-.1 3.75a5.4 5.4 0 0 0-1.5 3.75c0 5 3 6.5 6 6.5a4.8 4.8 0 0 0-1 3.5v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
            </a>
            <a
              href={user.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white"
            >
              <span className="sr-only">LinkedIn</span>
              {/* Inlined LinkedIn Icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-gray-700 pt-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} {user.name}. All rights reserved.
      </div>
    </footer>
  );
};