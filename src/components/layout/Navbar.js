'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Navbar({ title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Sidebar isMobile onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="فتح القائمة"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Page Title */}
        <h1 className="text-lg font-bold text-gray-800 lg:hidden">{title}</h1>

        {/* Desktop: empty left side */}
        <div className="hidden lg:block" />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:block">
            {new Date().toLocaleDateString('ar-SA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </header>
    </>
  );
}
