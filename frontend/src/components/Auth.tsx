// first i need to bring in react and the 'useState' hook so i can make the boxes remember what i type in them
import React, { useState } from 'react';

// this is my rulebook (interface) so the code knows exactly which functions it needs to get from the main App.tsx file
interface AuthProps {
  onClose: () => void; // this function lets me close the popup window
  onLoginSuccess: () => void; // this function tells the rest of the app "hey, they're logged in!"
}

// this is the actual component where the login and register magic happens
export const Auth: React.FC<AuthProps> = ({ onClose, onLoginSuccess }) => {
  // --- SETTING UP MY MEMORY (STATE) ---
  
  // this is a switch to track if we're on the "Log In" view or the "Register" view (it starts on true/login)
  const [isLogin, setIsLogin] = useState(true);
  
  // this is a storage spot for the username they type into the box
  const [username, setUsername] = useState('');
  
  // this is a storage spot for the password (it keeps it secret as i type)
  const [password, setPassword] = useState('');
  
  // if something goes wrong (like a wrong password), i'll save the error message here
  const [error, setError] = useState('');
  
  // if they make a new account successfully, i'll save a "Success!" message here to show them
  const [successMsg, setSuccessMsg] = useState('');
  
  // this is a true/false switch to show a "Processing..." state while the app talks to django
  const [isLoading, setIsLoading] = useState(false);

  // --- THE SUBMIT FUNCTION ---
  // this massive function runs the exact second someone clicks the "Log In" or "Create Account" button
  const handleSubmit = async (e: React.FormEvent) => {
    // this stops the browser from doing a classic "refresh" (standard react trick so we stay on the page!)
    e.preventDefault();
    
    // first i clear out any old error or success messages from the screen
    setError('');
    setSuccessMsg('');
    
    // then i turn on the loading state so the button says "Processing..."
    setIsLoading(true);

    // i check my 'isLogin' switch to decide which backend URL to talk to
    const endpoint = isLogin ? 'http://127.0.0.1:8000/api/login/' : 'http://127.0.0.1:8000/api/register/';

    // now i try to talk to the django server
    try {
      // i use 'fetch' to send a POST request with the username and password inside a JSON package
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      // i wait for django to give me an answer and unpack it
      const data = await response.json();

      // if django says "no" (like a 400 error), i throw an error to trigger the 'catch' block below
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Authentication failed. Please try again.');
      }

      // if we are in Login mode...
      if (isLogin) {
        // i save the security tokens (JWT) into the browser's local storage so they stay logged in
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        
        // then i fire off the success function to let the rest of the app know it's good to go
        onLoginSuccess(); 
      } else {
        // if they were registering, it was a success! so i switch them back to the "Log In" view
        setIsLogin(true);
        // and i show them a nice green message to tell them to log in now
        setSuccessMsg('Account created successfully! ✨ Please log in.');
        // and i clear the password box just to be safe
        setPassword(''); 
      }
    } catch (err: any) {
      // if anything crashed or django said no, i catch the message and put it in my red error box
      setError(err.message);
    } finally {
      // no matter what happens, i turn off the loading animation at the very end
      setIsLoading(false);
    }
  };

  // --- THE VISUAL PART (HTML/CSS) ---
  return (
    // this makes a dark, blurry background that covers the whole website when the popup is open
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      
      {/* this is the actual "Glass" card that holds our form */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/50 animate-fade-in relative">
        
        {/* this is the "X" button in the corner to close the popup */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors"
        >
          {/* standard SVG code for a simple "close" icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* this is just a container with some space (padding) inside the card */}
        <div className="p-10">
          
          {/* the header section with our title and subtitle */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">
              {/* i dynamically change the title depending on if they are logging in or signing up */}
              {isLogin ? 'Welcome Back' : 'Join MySkinSpec'}
            </h2>
            <p className="text-slate-500 text-sm">
              {/* same thing here—the subtitle changes to match the mode */}
              {isLogin ? 'Log in to access your personalized AI skin profile.' : 'Create an account to save your skin journey.'}
            </p>
          </div>

          {/* THE ERROR BOX: i only show this red box if there's actually an error message to display */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          {/* THE SUCCESS BOX: i only show this green box if they just made a new account */}
          {successMsg && (
            <div className="mb-6 p-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl text-center font-medium">
              {successMsg}
            </div>
          )}

          {/* THE FORM: when i press enter or click the button, it calls my 'handleSubmit' function */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* username input field */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Username</label>
              <input
                type="text"
                required
                value={username} // i link this box to my username memory (state)
                onChange={(e) => setUsername(e.target.value)} // update the memory every time they type a letter
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-700"
                placeholder="e.g., SkincareLover99"
              />
            </div>

            {/* password input field */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Password</label>
              <input
                type="password" // 'password' type keeps the text hidden as little dots
                required
                value={password} // link this box to my password memory
                onChange={(e) => setPassword(e.target.value)} // update memory when they type
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-700"
                placeholder="••••••••"
              />
            </div>

            {/* the big submit button */}
            <button
              type="submit"
              disabled={isLoading} // i lock the button so they can't spam-click it while it's loading
              className="w-full mt-4 py-4 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {/* if it's loading, i show a pulsing "Processing" text, otherwise show the right button text */}
              {isLoading ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                isLogin ? 'Log In' : 'Create Account'
              )}
            </button>
          </form>

          {/* this part is for toggling between the two screens */}
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              {/* i show different text depending on which view we're looking at */}
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              {/* when they click this blue button, i flip the switch and clear all old errors/messages */}
              <button 
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-blue-600 font-bold hover:underline transition-all"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};



//https://react.dev/learn/state-a-components-memory
//https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
//https://tailwindcss.com/docs/backdrop-filter-blur