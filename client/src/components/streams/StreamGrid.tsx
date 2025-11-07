'use client';

import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import Link from 'next/link';
import { 
  EyeIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Stream } from '@/lib/api';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

export function StreamGrid() {
  const [filters, setFilters] = useState({
    region_id: '',
    category_id: '',
    sort: 'viewer_count',
    nsfw: 'false'
  });

  // Fetch streams
  const { 
    data: streamsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery<{ streams: Stream[]; total: number }>(
    ['streams', filters],
    () => getStreams(filters),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 15000, // Consider data stale after 15 seconds
    }
  );

  const streams = streamsData?.streams || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-error-500" />
        <h3 className="mt-2 text-sm font-medium text-cult-900">Error loading streams</h3>
        <p className="mt-1 text-sm text-cult-500">
          Unable to load live streams. Please try again.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-primary"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-cult-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-cult-900">No live streams</h3>
        <p className="mt-1 text-sm text-cult-500">
          There are no live streams matching your criteria. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {streams.map((stream) => (
        <StreamCard key={stream.id} stream={stream} />
      ))}
    </div>
  );
}

interface StreamCardProps {
  stream: Stream;
}

function StreamCard({ stream }: StreamCardProps) {
  const isLive = stream.is_live;
  
  return (
    <Link
      href={`/stream/${stream.id}`}
      className={`group relative block rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg ${
        isLive ? 'ring-2 ring-error-500 shadow-cult' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-cult-200">
        {stream.thumbnail_url ? (
          <img
            src={stream.thumbnail_url}
            alt={stream.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-cult-100 to-cult-200">
            <svg
              className="h-12 w-12 text-cult-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        
        {/* Live Badge */}
        {isLive && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center rounded-full bg-error-500 px-2 py-1 text-xs font-medium text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white mr-1" />
              LIVE
            </span>
          </div>
        )}

        {/* NSFW Badge */}
        {stream.is_nsfw && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-1 text-xs font-medium text-white">
              18+
            </span>
          </div>
        )}

        {/* Viewer Count */}
        <div className="absolute bottom-2 left-2">
          <div className="flex items-center rounded-full bg-black/50 px-2 py-1 text-xs text-white">
            <EyeIcon className="h-3 w-3 mr-1" />
            {stream.viewer_count.toLocaleString()}
          </div>
        </div>

        {/* Total Tips */}
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center rounded-full bg-cult-gold/80 px-2 py-1 text-xs text-black font-medium">
            <CurrencyDollarIcon className="h-3 w-3 mr-1" />
            {stream.total_tips.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-cult-900 line-clamp-2 group-hover:text-cult-700 transition-colors">
          {stream.title}
        </h3>
        
        <p className="mt-1 text-sm text-cult-600">
          {stream.streamer_name}
        </p>
        
        <div className="mt-2 flex items-center justify-between text-xs text-cult-500">
          <span>{stream.category_name}</span>
          <div className="flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            {formatDistanceToNow(new Date(stream.start_time), { addSuffix: true })}
          </div>
        </div>

        {/* Description */}
        {stream.description && (
          <p className="mt-2 text-sm text-cult-600 line-clamp-2">
            {stream.description}
          </p>
        )}
      </div>
    </Link>
  );
}

// API function to fetch streams
async function getStreams(filters: any) {
  const params = new URLSearchParams();
  
  if (filters.region_id) params.append('region_id', filters.region_id);
  if (filters.category_id) params.append('category_id', filters.category_id);
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.nsfw) params.append('nsfw', filters.nsfw);
  
  params.append('limit', '20');
  
  const response = await api.get(`/streams/live?${params.toString()}`);
  return response.data;
}