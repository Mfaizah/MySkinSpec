// grabbing react and the hooks i need to manage my state (memory) and side effects (like running code when the page loads)
import React, { useState, useEffect } from 'react';

// pulling in all the different page screens i built in my components folder
import Navbar from './components/Navbar';
import Main from './components/Main'; 
import ChatBot from './components/ChatBot';
import ProductAnalyser from './components/ProductAnalyser'; 
import GoogleAuthButton from './components/GoogleAuthButton';
import SkinQuiz from './components/SkinQuiz'; 
import Routine from './components/Routine';

// pulling in my custom typescript definitions so the app knows exactly what shape my profile data should be
import { ViewState, SurveyResult } from './types'; 

// this is the main shell component that wraps around the entire website
const App: React.FC = () => {
  // --- STATE SETUP (THE APP'S MEMORY) ---
  
  // FIX #1: We tell React to look in the browser's temporary sessionStorage to remember what page we were on before the refresh!
  // if there's nothing saved, we default to the 'home' page.
  const [currentView, setCurrentView] = useState<ViewState | 'profile'>(() => {
    return (sessionStorage.getItem('current_view') as ViewState | 'profile') || 'home';
  });
  
  // memory spot to hold the user's skin profile data (starts as null because we don't know it yet)
  const [userProfile, setUserProfile] = useState<SurveyResult | null>(null);
  
  // memory spot to hold the user's name if they are logged in (we check local storage right away to see if they visited before)
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('user_name'));

  //  MY CUSTOM ROUTER & GATEKEEPER
  // this function runs whenever someone clicks a link to change the page
  const handleViewChange = (newView: ViewState | 'profile') => {
    // first, we check if they are logged in by looking for their saved name
    const isLoggedIn = !!localStorage.getItem('user_name');
    
    // SECURITY CHECK: if they try to access the routine or analyser but ARE NOT logged in...
    if ((newView === 'routine' || newView === 'analyse') && !isLoggedIn) {
      // throw an alert popup telling them to sign in
      alert('🔒 Please sign in or create a free account to save your routine and unlock the Analyser!');
      // force them over to the profile/login page instead
      setCurrentView('profile');
      sessionStorage.setItem('current_view', 'profile'); // save this forced view to memory
    } else {
      // if it's not locked, or they are logged in, just let them go to the page normally!
      setCurrentView(newView);
      sessionStorage.setItem('current_view', newView); // save their new location to memory
    }
  };

  // DATABASE SYNC ON LOGIN / REFRESH 
  // this block of code runs silently in the background whenever the 'userName' variable changes (like when they log in)
  useEffect(() => {
    if (userName) {
      // grab their secret security token from the browser
      const token = localStorage.getItem('access_token');
      if (token) {
        
        // FIX #2: If we have a local profile saved in the browser, push it up to our live Django database FIRST 
        // so Django doesn't accidentally overwrite our new data with a blank profile!
        const localData = localStorage.getItem('myskinspec_profile');
        if (localData) {
           // converting the saved text string back into a usable JavaScript object.
           const parsed = JSON.parse(localData);
           // if the local profile actually has real data (not just 'Unknown')...
           if (parsed.skin_type && parsed.skin_type !== 'Unknown') {
               // send it to the live Render backend!
               fetch('https://myskinspec-backend.onrender.com/api/profile/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(parsed)
               }).catch(e => console.log("Upward sync failed")); // if it fails, just print an error quietly
           }
        }

        // Then, pull the authoritative version down from the live Django database to make sure we are fully synced
        fetch('https://myskinspec-backend.onrender.com/api/profile/', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json()) // unpack the JSON response
        .then(data => {
          // if django sent us real data back...
          if (data && !data.error && Object.keys(data).length > 0) {
            // ONLY overwrite our local storage if Django actually has a real profile saved (not a blank one)
            if (data.skin_type !== 'Unknown' || (data.recommended_routine && data.recommended_routine.length > 0)) {
              setUserProfile(data); // update the react memory
              localStorage.setItem('myskinspec_profile', JSON.stringify(data)); // save it to the browser memory
            }
          }
        })
        .catch(err => console.log("Silent background sync failed.")); // catch any network errors silently
      }
    }
  }, [userName]); 

  //  THE POLLING 
  // this forces the app to constantly check local storage every 2 seconds to see if the profile updated
  // (like if the chatbot just finished generating a new routine)
  useEffect(() => {
    const checkProfile = () => {
      const saved = localStorage.getItem('myskinspec_profile');
      if (saved) setUserProfile(JSON.parse(saved));
    };
    
    checkProfile(); // run it once immediately
    const interval = setInterval(checkProfile, 2000); // then set it on a 2-second repeating loop
    return () => clearInterval(interval); // clean up the loop if the component gets destroyed so it doesn't leak memory
  }, []); 

  // MANUAL PROFILE EDITS 
  // this function runs when the user changes a dropdown menu on their profile page
  const handleProfileUpdate = (key: string, value: any) => {
    if (!userProfile) return; 
    // copy the old profile and overwrite just the specific key that changed
    const updated = { ...userProfile, [key]: value };
    
    // update the local react memory and the browser memory instantly so it feels snappy
    setUserProfile(updated);
    localStorage.setItem('myskinspec_profile', JSON.stringify(updated));
    
    // then silently send the update to the live Django database in the background
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch('https://myskinspec-backend.onrender.com/api/profile/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updated)
      }).catch(e => console.log("Save failed"));
    }
  };

  // RESET PROFILE LOGIC 
  // this runs when they click the red "Reset Profile" button
  const handleResetProfile = async () => {
    // create a totally blank profile object
    const blankProfile = {
      skin_type: 'Unknown',
      skin_color: 'Unknown',
      sensitivity: 'Unknown',
      country: 'Unknown',
      item_count: 'Unknown',
      concerns: [],
      recommended_routine: [] 
    };

    // wipe out the chatbot and analyser memory from the browser so the next quiz is totally fresh
    localStorage.removeItem('myskinspec_chat');
    localStorage.removeItem('myskinspec_analyser');

    // try to wipe the live Django database profile too
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        await fetch('https://myskinspec-backend.onrender.com/api/profile/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(blankProfile)
        });
      } catch (err) {
        console.log("Database reset failed");
      }
    }

    // apply the blank profile to the local memory
    setUserProfile(blankProfile);
    localStorage.setItem('myskinspec_profile', JSON.stringify(blankProfile));

    // show a popup letting them know it worked
    alert("✨ Profile and Routine have been completely reset! You can now take the quiz again.");
    
    // bounce them over to the quiz page to start fresh
    handleViewChange('quiz'); 
  };

  // --- LOGOUT LOGIC ---
  // this runs when they click "Sign Out"
  const handleLogout = () => {
    // totally destroy all the security tokens and saved data in the browser
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_name');
    
    localStorage.removeItem('myskinspec_profile'); 
    sessionStorage.removeItem('current_view'); // wipe the saved view so it goes back to home
    
    // (Note: Deliberately keeping the chat memory intact here so they don't lose their conversation if they log out!)
    
    // reset the react memory to null/home
    setUserProfile(null);
    setUserName(null);
    setCurrentView('home');
  };

  // THE VISUAL PART (JSX RENDER)
  return (
    // the master wrapper for the entire app with our beautiful pastel gradient background
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-yellow-50 font-sans text-slate-800 flex flex-col">
      
      {/* draw the navigation bar at the very top and pass it our routing tools */}
      <Navbar currentView={currentView as ViewState} setView={handleViewChange} />
      
      {/* the main content area that expands to fill available space */}
      <main className="flex-grow">
        
        {/* CONDITIONAL RENDERING: we only draw the component that matches our 'currentView' memory! */}
        {/* swapping out the visible page instantly based on which navigation button they clicked without reloading the browser */}
        {currentView === 'home' && <Main onStartChat={() => handleViewChange('quiz')} onLearnMore={() => handleViewChange('analyse')} />}
        {currentView === 'quiz' && <SkinQuiz onComplete={() => handleViewChange('chat')} />}
        {currentView === 'chat' && <ChatBot onNavigateToAnalyser={() => handleViewChange('analyse')} />}
        {currentView === 'analyse' && <ProductAnalyser />} 
        {currentView === 'routine' && <Routine />} 
        
        {/* The big tricky Profile view! */}
        {currentView === 'profile' && (
          // a nice frosted glass box to hold everything
          <div className="max-w-4xl mx-auto my-12 p-8 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white relative animate-fade-in">

            {/* if they don't have a username (meaning they are NOT logged in), show the login screen */}
            {!userName ? (
              <div className="grid md:grid-cols-2 gap-12 items-center mt-6">
                
                {/* the left side marketing copy */}
                <div className="text-center md:text-left">
                  <div className="bg-yellow-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl shadow-sm mx-auto md:mx-0">🔒</div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">Unlock your skin profile.</h2>
                  <p className="text-slate-500 mb-8 leading-relaxed">Save your personalised AI recommendations, track your routines, and get faster ingredient analysis.</p>
                </div>
                
                {/* the right side login box */}
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
                  {/* render our custom AuthForm component and tell it what to do if login works */}
                  <AuthForm onSuccessLogin={(name) => setUserName(name)} />
                  
                  {/* a simple visual divider line */}
                  <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">Or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                  
                  {/* the magic google login button */}
                  <div className="flex justify-center">
                    <GoogleAuthButton onSuccessLogin={(name) => setUserName(name)} />
                  </div>
                </div>
              </div>
            ) : (
              // IF THEY ARE LOGGED IN, show their actual profile dashboard!
              <div className="mt-6">
                
                {/* the dashboard header with their name and action buttons */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-100 pb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800">Hello, {userName}! ✨</h2>
                    <p className="text-slate-500 mt-1">Manage your complete Skin Profile data below.</p>
                  </div>
                  
                  <div className="flex gap-3 w-full md:w-auto">
                    {/* the danger reset button */}
                    <button 
                      onClick={handleResetProfile} 
                      className="w-full md:w-auto text-red-500 text-sm font-semibold hover:bg-red-50 px-5 py-2 rounded-full transition-colors border border-red-200"
                    >
                      Reset Profile
                    </button>
                    {/* the sign out button */}
                    <button 
                      onClick={handleLogout} 
                      className="w-full md:w-auto text-slate-500 text-sm font-semibold hover:bg-slate-100 px-5 py-2 rounded-full transition-colors border border-slate-200"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* if their profile is basically blank, show a big prompt to take the quiz */}
                {(!userProfile || userProfile.skin_type === 'Unknown') ? (
                  <div className="text-center py-16 bg-gradient-to-b from-blue-50 to-white rounded-3xl border border-blue-100">
                    <div className="text-4xl mb-4">🤔</div>
                    <p className="text-slate-500 mb-6 text-lg">You haven't built your profile yet!</p>
                    <button onClick={() => handleViewChange('quiz')} className="bg-blue-400 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-500 transition-all">
                      Take the Skin Quiz
                    </button>
                  </div>
                ) : (
                  // if they DO have data, draw all the dropdown menus so they can edit it!
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skin Type</label>
                          {/* every time a dropdown changes, it fires my 'handleProfileUpdate' function to save it instantly */}
                          <select value={userProfile.skin_type || "Unknown"} onChange={(e) => handleProfileUpdate('skin_type', e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium text-slate-700">
                            <option>Oily</option><option>Dry</option><option>Combination</option><option>Normal</option><option>Unknown</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Colour/Tone</label>
                          <select value={userProfile.skin_color || "Unknown"} onChange={(e) => handleProfileUpdate('skin_color', e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium text-slate-700">
                            <option>Fair</option><option>Medium</option><option>Olive</option><option>Deep</option><option>Unknown</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sensitivity</label>
                          <select value={userProfile.sensitivity || "Unknown"} onChange={(e) => handleProfileUpdate('sensitivity', e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium text-slate-700">
                            <option>None</option><option>Occasional Redness</option><option>Frequent Irritation</option><option>Unknown</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
                          <select value={userProfile.country || "Unknown"} onChange={(e) => handleProfileUpdate('country', e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium text-slate-700">
                            <option>UK</option><option>US</option><option>Canada</option><option>Australia</option><option>Other</option><option>Unknown</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Routine Size</label>
                        <select value={userProfile.item_count || "Unknown"} onChange={(e) => handleProfileUpdate('item_count', e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium text-slate-700">
                          <option>3 items (Basic)</option>
                          <option>4-5 items (Advanced)</option>
                          <option>6+ items (Comprehensive)</option>
                          <option>Unknown</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Concerns (Comma Separated)</label>
                        {/* this input box requires a little extra math to split the comma-separated text back into a real Array */}
                        <input type="text" value={userProfile.concerns?.join(', ') || ""} onChange={(e) => handleProfileUpdate('concerns', e.target.value.split(',').map(s => s.trim()))} className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium text-slate-700"/>
                      </div>
                    </div>
                    
                    {/* The friendly status box on the right side of the dashboard */}
                    <div className="bg-gradient-to-b from-yellow-50 to-white rounded-3xl p-6 flex flex-col justify-center items-center text-center border border-yellow-100 shadow-sm h-full">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl mb-4 shadow-sm border border-yellow-100">✨</div>
                      <h3 className="font-bold text-slate-800 text-lg mb-2">Profile Synced</h3>
                      <p className="text-slate-600 text-sm mb-4">Your AI Consultant and Ingredient Analyser are actively using this data.</p>
                      
                      {/* if they have an AI routine saved, show a button to jump straight to it! */}
                      {userProfile.recommended_routine && userProfile.recommended_routine.length > 0 && (
                        <button onClick={() => handleViewChange('routine')} className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-6 py-2 rounded-full text-sm transition-colors shadow-sm">
                          View My Saved Routine
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* the standard footer pinned to the bottom of the page */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6 mt-auto">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs leading-relaxed">
            {/* vital medical disclaimer required by my ethics form! */}
            <strong className="text-slate-300">Medical Disclaimer:</strong> MySkinSpec is an AI-powered educational tool. The information and recommendations provided by our AI Consultant and Ingredient Analyser are not intended as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician, dermatologist, or other qualified health provider with any questions you may have regarding a medical condition or severe skin concern.
          </p>
        </div>
      </footer>
    </div>
  );
};


// THE CUSTOM LOGIN FORM COMPONENT
// i built this mini-component right here so i could reuse the login logic easily
const AuthForm = ({ onSuccessLogin }: { onSuccessLogin: (name: string) => void }) => {
  // state to track if we are looking at the "register" screen or the "login" screen
  const [isRegistering, setIsRegistering] = useState(false);
  // setting up standard memory spots for the user's typing in the login form fields.
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // what happens when they click the big blue submit button
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // stop the page from refreshing
    setError(''); // clear old errors
    
    // figure out which live Render URL to talk to based on the screen we are on
    const endpoint = isRegistering ? 'register/' : 'login/';
    
    try {
      // make the API call to our LIVE backend
      const res = await fetch(`https://myskinspec-backend.onrender.com/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }) 
      });
      // converting the raw server response into a format JavaScript can read.
      const data = await res.json();
      
      // if django says 200 OK...
      if (res.ok) {
        if (isRegistering) {
          // if they just registered, flip them back to the login screen and show a success message
          setIsRegistering(false);
          setError('Registration successful! Please sign in.');
        } else {
          // if they logged in successfully, save their new JWT security tokens
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          
          // grab the first part of their email to use as a display name
          const displayName = email.split('@')[0];
          
          localStorage.setItem('user_name', displayName);
          onSuccessLogin(displayName); // tell the parent app to update the dashboard!
        }
      } else {
        // if django rejected the login, show the error
        setError(data.error || data.detail || 'Authentication failed.');
      }
    } catch (err) {
      // if the server is asleep or broken, show a clean network error
      setError('Network error. Please try again later.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* dynamic title */}
      <h3 className="font-bold text-slate-800 mb-4 text-center">{isRegistering ? 'Create an Account' : 'Sign in with Email'}</h3>
      
      {/* the email input box */}
      <input 
        type="email" 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
        placeholder="Email Address" 
        required 
        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 focus:outline-none" 
      />
      {/* the password input box */}
      <input 
        type="password" 
        value={password} 
        onChange={e => setPassword(e.target.value)} 
        placeholder="Password" 
        required 
        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 focus:outline-none" 
      />

      {/* if they are registering, force them to agree to the medical disclaimer checkbox! */}
      {isRegistering && (
        <div className="flex items-start gap-3 mt-4 mb-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
          <input 
            type="checkbox" 
            id="medical-disclaimer" 
            required 
            className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="medical-disclaimer" className="text-xs text-slate-600 leading-tight cursor-pointer">
            I understand that MySkinSpec provides AI-generated recommendations and is <strong className="text-slate-800">not a substitute for professional medical advice</strong>. I agree to consult a dermatologist for medical conditions.
          </label>
        </div>
      )}
      
      {/* the error/success message text box */}
      {error && <p className={`text-xs font-semibold ${error.includes('successful') ? 'text-green-600' : 'text-red-500'}`}>{error}</p>}
      
      <button type="submit" className="w-full py-3 bg-blue-400 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-sm mt-2">
        {isRegistering ? 'Register' : 'Sign In'}
      </button>
      
      {/* the tiny text at the bottom to flip between register and login screens */}
      <p onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-xs text-center text-slate-500 cursor-pointer hover:text-blue-500 mt-2 pt-2">
        {isRegistering ? 'Already have an account? Sign In.' : 'Need an account? Register here.'}
      </p>
    </form>
  );
};

export default App;
//https://react.dev/learn/conditional-rendering
//https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join
//https://react.dev/learn/passing-data-deeply-with-context
//https://react.dev/reference/react-dom/components/input