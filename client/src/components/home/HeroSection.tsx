'use client';

export function HeroSection() {
  return (
    <div className="relative bg-gradient-to-r from-cult-900 to-cult-700 py-24">
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Welcome to{' '}
          <span className="gradient-text">The Stream Cult</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-cult-100">
          Experience the future of live streaming with token-based tipping, 
          real-time interactions, and community-driven content across multiple categories.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="#streams"
            className="rounded-md bg-cult-purple px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cult-purple/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cult-purple"
          >
            Watch Live Streams
          </a>
          <a
            href="/register"
            className="text-sm font-semibold leading-6 text-white hover:text-cult-100"
          >
            Join the Cult <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}