import React, { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Trips } from './Trips';

export const Home: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=1920"
            alt="Biking in the mountains"
            className="w-full h-full object-cover"
            onLoad={(e) => (e.currentTarget.style.opacity = '1')}
            style={{ opacity: 0, transition: 'opacity 1s ease-in-out' }}
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-white sm:text-6xl md:text-7xl tracking-tight mb-6 drop-shadow-lg">
            Visualizing your <span className="text-blue-400">bike adventures</span>.
          </h1>
          <p className="mt-3 max-w-md mx-auto text-lg text-gray-200 sm:text-xl md:mt-5 md:text-2xl md:max-w-3xl drop-shadow-md">
            A hub for tracking bike trips and bikepacking adventures. High-resolution photos, interactive maps, and visual storytelling.
          </p>
          <div className="mt-10">
            <button
              onClick={scrollToContent}
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:scale-105 shadow-xl"
            >
              View Trips
              <ChevronDown className="ml-2 w-5 h-5 animate-bounce" />
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10">
          <button 
            onClick={scrollToContent}
            className="text-white/60 hover:text-white transition-colors p-2"
            aria-label="Scroll down"
          >
            <ChevronDown className="w-8 h-8 animate-bounce" />
          </button>
        </div>
      </section>

      {/* Content Section */}
      <div ref={contentRef} className="bg-gray-900 min-h-screen">
        <Trips />
      </div>
    </div>
  );
};


