import React from 'react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <div>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">About This App</h1>
        </div>

        <section className="space-y-3">
          <p>
            A web app for tracking bike trips and bikepacking adventures. Integrates Strava for
            routes and activity data, Google Photos for geotagged imagery, and Google Maps for
            interactive satellite and 3D map display. The emphasis is on visual storytelling and
            photo presentation, not data logging.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">How It Works</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>
              Strava activities are grouped into multi-day trips via hashtags. Individual rides can
              also be explored standalone.
            </li>
            <li>
              Photos are imported from Google Photos and geolocated by matching each photo's
              timestamp against the GPS stream of a ride. Photos taken during a ride appear on the
              map at the right spot; photos taken off-bike show up in the gallery only.
            </li>
            <li>
              Route and elevation data comes from Strava activity streams, stored in Firestore for
              fast rendering.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">The Map</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>
              Full-bleed satellite map with 3D tilt and rotation via Google Maps vector rendering.
            </li>
            <li>
              Scrubbable elevation chart at the bottom -- hover to see distance, elevation, and
              grade, with a live marker on the map.
            </li>
            <li>
              Multi-day trips have ride selector pills to switch between activities or view all at
              once.
            </li>
            <li>Route animation plays a dot along the path with play/pause and speed controls.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Photos</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>
              Map markers are circular photo thumbnails at their GPS location. Click to preview,
              then jump to the gallery lightbox.
            </li>
            <li>
              Gallery is a grid of thumbnails grouped by date with a full-screen lightbox, keyboard
              navigation, and swipe gestures.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Tech Stack</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>React + TypeScript + Tailwind CSS frontend, built with Vite.</li>
            <li>Firebase Hosting, Cloud Functions, and Firestore.</li>
            <li>Strava API, Google Photos Picker API, Google Maps JavaScript API.</li>
          </ul>
        </section>

        <div className="pt-6 border-t border-gray-800 text-sm text-gray-600">
          Built by Dave Primmer &middot;{' '}
          <a href="https://github.com/primmer" className="hover:text-gray-400 transition-colors">
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
};
