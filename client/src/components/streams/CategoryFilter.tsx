'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export function CategoryFilter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: '1', name: 'Gaming' },
    { id: '2', name: 'News Reviews' },
    { id: '3', name: 'Driving' },
    { id: '4', name: 'Music' },
    { id: '5', name: 'NSFW' },
    { id: '6', name: 'Art' },
    { id: '7', name: 'Tech' },
    { id: '8', name: 'Lifestyle' },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        className="input pr-8 text-left min-w-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {categories.find(cat => cat.id === selectedCategory)?.name || 'All Categories'}
        </span>
        <ChevronDownIcon className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-cult-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1" role="menu">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="block w-full px-4 py-2 text-left text-sm text-cult-700 hover:bg-cult-100"
                onClick={() => {
                  setSelectedCategory(category.id);
                  setIsOpen(false);
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}