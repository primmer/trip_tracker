import React from 'react';
import ReactDOM from 'react-dom/client';
import { APIProvider } from '@vis.gl/react-google-maps';
import { App } from './App';
import './sentry';
import './index.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['geometry', 'maps3d']}>
      <App />
    </APIProvider>
  </React.StrictMode>,
);
