import React from 'react'; // Bringing in the core React library to build my user interfaces.
import ReactDOM from 'react-dom/client'; // Importing the ReactDOM tool so I can actually draw my React components onto the web page.
import App from './App'; // Importing my main App component, which is the starting point for my whole application.
import './index.css'; // Pulling in my global stylesheet so the app has my base styles right out of the gate.
import { GoogleOAuthProvider } from '@react-oauth/google'; // Importing the Google OAuth provider so I can easily add "Sign in with Google" functionality to my app.

// Finding the empty 'root' div in my HTML, telling TypeScript it's definitely an HTML element, and taking control of it to render my app.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // Turning on Strict Mode to help me catch bugs and bad practices while I'm developing.
  <React.StrictMode>
    {/* Wrapping my entire app in the Google provider and handing it my specific Client ID so any component inside can securely trigger a Google login. */}
    <GoogleOAuthProvider clientId="90331173295-1arcd395730f4o3qlgv7pe6c00srt20k.apps.googleusercontent.com">
      {/* Injecting my actual application right into the middle of those providers. */}
      <App />
    {/* Closing the Google wrapper. */}
    </GoogleOAuthProvider>
  {/* Closing the Strict Mode wrapper. */}
  </React.StrictMode>,
);