'use client';

import { useState } from 'react';
import { useQuery } from 'react-query';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { api, Region } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function RegionSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('all');

  const { data: regionsData, isLoading } = useQuery<{ regions: Region[] }>(
    'regions',
    () => api.get('/regions').then(res => res.data)
  );

  const regions = regionsData?.regions || [];

  return (
    <div className="relative">
      <button
        type="button"
        className="input pr-8 text-left min-w-0"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span className="truncate">
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : selectedRegion === 'all' ? (
            'All Regions'
          ) : (
            regions.find(region => region.id.toString() === selectedRegion)?.name || 'All Regions'
          )}
        </span>
        <ChevronDownIcon className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-cult-400" />
      </button>

      {isOpen && !isLoading && (
        <div className="absolute z-10 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1 max-h-64 overflow-y-auto" role="menu">
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-cult-700 hover:bg-cult-100"
              onClick={() => {
                setSelectedRegion('all');
                setIsOpen(false);
              }}
            >
              All Regions
            </button>
            {regions
              .filter(region => region.parent_id === null) // Only show continents
              .map((region) => (
                <button
                  key={region.id}
                  type="button"
                  className="block w-full px-4 py-2 text-left text-sm text-cult-700 hover:bg-cult-100"
                  onClick={() => {
                    setSelectedRegion(region.id.toString());
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{region.name}</span>
                    {region.live_stream_count !== undefined && (
                      <span className="text-xs text-cult-500">
                        {region.live_stream_count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}