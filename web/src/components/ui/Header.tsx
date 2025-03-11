/**
 * Main header component
 */
'use client';

import { useLayoutStore } from '@/stores';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { isMenuOpen, toggleMenu } = useLayoutStore();
  const pathname = usePathname();
  
  return (
    <header className="w-full h-16 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex items-center justify-between px-4 shadow-sm z-10">
      <div className="flex items-center">
        <Link href="/" className="text-xl font-bold mr-6">MANDRAKE</Link>
        
        <nav className="hidden md:flex space-x-4">
          <Link 
            href="/" 
            className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === '/' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            Home
          </Link>
          <Link 
            href="/workspace" 
            className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === '/workspace' || pathname.startsWith('/workspace/') ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            Workspaces
          </Link>
        </nav>
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
