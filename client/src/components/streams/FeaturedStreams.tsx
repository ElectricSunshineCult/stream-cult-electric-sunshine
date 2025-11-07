'use client';

import { useState } from 'react';
import { useQuery } from 'react-query';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function FeaturedStreams() {
  const [regionId] = useState(1); // Default to North America

  const { data: streamsData, isLoading } = useQuery(
    ['featured-streams', regionId],
    () => getFeaturedStreams(regionId),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-cult-900 mb-4">Featured Streams</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const featuredStreams = streamsData?.streams?.slice(0, 3) || [];

  return (
    <section className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-cult-900">Featured Streams</h2>
        <p className="mt-2 text-cult-600">Discover the most popular streams right now</p>
      </div>
      
      {featuredStreams.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {featuredStreams.map((stream) => (
            <div key={stream.id} className="card-hover p-6">
              <div className="aspect-video bg-cult-200 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-cult-500">Stream Preview</span>
              </div>
              <h3 className="font-semibold text-cult-900">{stream.title}</h3>
              <p className="text-sm text-cult-600">{stream.streamer_name}</p>
              <div className="mt-2 flex items-center justify-between text-sm text-cult-500">
                <span>{stream.viewer_count} viewers</span>
                <span className="live-indicator">Live</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-cult-500">
          No featured streams available at the moment
        </div>
      )}
    </section>
  );
}

async function getFeaturedStreams(regionId: number) {
  const response = await api.get(`/streams/live?region_id=${regionId}&sort=viewer_count&limit=3`);
  return response.data;
}