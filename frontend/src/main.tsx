import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google'; 

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* MUST WRAP THE APP AND INCLUDE YOUR CLIENT ID */}
    <GoogleOAuthProvider clientId="90331173295-8bdc26b1hius708d246sljrfe0ab96i8.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);