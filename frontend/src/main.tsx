import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google'; 

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="90331173295-1arcd395730f4o3qlgv7pe6c00srt20k.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);