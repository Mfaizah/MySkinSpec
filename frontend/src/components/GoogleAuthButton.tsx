// first, i bring in react and the 'useState' hook so i can keep track of any error messages
import React, { useState } from 'react';

// this is the official google login button tool that i installed using npm
import { GoogleLogin } from '@react-oauth/google';

// this is my typescript rulebook so the button knows what function it gets from the main App.tsx file
interface GoogleAuthButtonProps {
  onSuccessLogin: (name: string) => void; // a function to tell the app "hey, google says this person is legit!"
}

// building the actual google button component
const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onSuccessLogin }) => {
  // i set up a small memory space just in case the login fails and i need to show a red error message
  const [error, setError] = useState('');

  // --- THE SUCCESS FUNCTION ---
  // this runs automatically the exact second the user clicks their google account and google says "approved"
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      // google gives us a secure 'credential' token. i use fetch to send this token straight to my django backend
      const res = await fetch('https://myskinspec.onrender.com/api/google-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // packaging up the google token into a JSON string
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      
      // wait for django to verify the token with google's servers and send data back
      const data = await res.json();
      
      // if django says "yes, this token is real" (200 OK)
      if (res.ok) {
        // i save the secure JWT tokens django generated into the browser's local memory
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        
        // i also save their first name so i can say "Hello, Name!" on the profile page
        localStorage.setItem('user_name', data.name);
        
        // finally, i fire the success function to tell the rest of the app to change the view
        onSuccessLogin(data.name);
      } else {
        // if django rejects the token, i set a custom error message
        setError('Failed to authenticate with our servers.');
      }
    } catch (err) {
      // --- THE UPDATED CATCH BLOCK ---
      // Clean, professional error message!
      setError('Network error. Please check your connection.');
    }
  };

  // --- THE VISUAL PART ---
  return (
    // a simple flexbox column to stack the button and the error message on top of each other
    <div className="flex flex-col items-center gap-2">
      
      {/* This is the actual Google button! 
        - onSuccess: calls my function if they click their account
        - onError: sets a basic error if the popup fails to load
        - useOneTap: automatically signs them in if they've done it before (super smooth UX!)
        - shape="pill": makes the button rounded to match my app's theme
      */}
      <GoogleLogin 
        onSuccess={handleGoogleSuccess} 
        onError={() => setError('Google popup failed to load.')} 
        useOneTap 
        shape="pill" 
      />
      
      {/* If there is an error in my memory, draw a tiny red text box below the button */}
      {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}
      
    </div>
  );
};

// exporting it so the Auth form can use it
export default GoogleAuthButton;

//https://www.npmjs.com/package/@react-oauth/google
//https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
//https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage