import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StreamGrid } from '@/components/streams/StreamGrid';
import { FeaturedStreams } from '@/components/streams/FeaturedStreams';
import { HeroSection } from '@/components/home/HeroSection';
import { CategoryFilter } from '@/components/streams/CategoryFilter';
import { RegionSelector } from '@/components/RegionSelector';

export default function HomePage() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <HeroSection />
          <div className="container mx-auto px-4 py-8">
            <FeaturedStreams />
            <div className="mt-12">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-cult-900">
                  Live Streams
                </h2>
                <div className="flex gap-4">
                  <RegionSelector />
                  <CategoryFilter />
                </div>
              </div>
              <StreamGrid />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}