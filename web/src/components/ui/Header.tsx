/**
 * Main header component
 */
'use client';

import { useLayoutStore } from '@/stores';

export default function Header() {
  const { isMenuOpen, toggleMenu } = useLayoutStore();
  
  return (
    <header className="w-full h-16 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex items-center justify-between px-4 shadow-sm z-10">
      <div className="flex items-center">
        <h1 className="text-xl font-bold">MANDRAKE</h1>
      </div>
      
      <button
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>
    </header>
  );
}
