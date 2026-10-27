import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './app/App';
import { runPendingDeviceWipe } from './lib/storage/db';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// Resolve any pending device wipe before mounting, so the app never loads a
// vault that is about to be destroyed into memory first.
void runPendingDeviceWipe().finally(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
