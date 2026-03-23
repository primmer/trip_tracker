import React from 'react';

export const Trips: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Trips</h1>
      <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-100">
        <p className="text-gray-500 text-lg">No trips yet. Sync with Strava to get started.</p>
      </div>
    </div>
  );
};


