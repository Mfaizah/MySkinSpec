// grabbing react and the hooks i need to manage state and side effects
import React, { useState, useEffect } from 'react';

// pulling in all the different page screens i built
import Navbar from './components/Navbar';
import Main from './components/Main'; 
import ChatBot from './components/ChatBot';
import ProductAnalyser from './components/ProductAnalyser'; 
import GoogleAuthButton from './components/GoogleAuthButton';
import SkinQuiz from './components/SkinQuiz'; 
import Routine from './components/Routine';

// pulling in my typescript definitions so the app knows what shape the data should be
import { ViewState, SurveyResult } from './types'; 

// the main app component that acts as the shell for the whole site
const App: React.FC = () => {
  // --- STATE SETUP ---
  
  // tracks what page we're currently on. defaults to the home page.
  const [currentView, setCurrentView] = useState<ViewState | 'profile'>('home');
  
  // holds the user's skin profile data in memory
  const [userProfile, setUserProfile] = useState<SurveyResult | null>(null);
  
  // checks local storage right on load to see if someone is already logged in
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('user_name'));

  // --- MY CUSTOM ROUTER & GATEKEEPER ---
  // instead of a normal link, buttons call this function so i can check if they're allowed to view the page
  const handleViewChange = (newView: ViewState | 'profile') => {
    // check if we have a username saved in the browser
    const isLoggedIn = !!localStorage.getItem('user_name');
    
    // if they try to access a premium feature but aren't logged in, block them
    if ((newView === 'routine' || newView === 'analyse') && !isLoggedIn) {
      alert('🔒 Please sign in or create a free account to save your routine and unlock the Analyser!');
      // redirect them to the login screen
      setCurrentView('profile');
    } else {
      // otherwise, let them go to the page they clicked
      setCurrentView(newView);
    }
  };

  // --- DB SYNC ON LOGIN ---
  // this hook fires whenever 'userName' changes (like when they log in)
  // it fetches their specific profile from django so they don't inherit another user's local data
  useEffect(() => {
    if (userName) {
      const token = localStorage.getItem('access_token');
      if (token) {
        // hit the django profile endpoint
        fetch('http://127.0.0.1:8000/api/profile/', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          // if django returns actual data (not an empty object or error), save it
          if (data && !data.error && Object.keys(data).length > 0) {
            setUserProfile(data);
            localStorage.setItem('myskinspec_profile', JSON.stringify(data));
          }
        })
        // failing silently here because it just means they don't have a profile yet
        .catch(err => console.log("Silent background sync failed.")); 
      }
    }
  }, [userName]); 

  // --- THE POLLING TRICK ---
  // this runs once when the app mounts. it constantly checks local storage for profile updates
  useEffect(() => {
    const checkProfile = () => {
      const saved = localStorage.getItem('myskinspec_profile');
      if (saved) setUserProfile(JSON.parse(saved));
    };
    
    // run it immediately
    checkProfile();
    // set an interval to check every 2 seconds. keeps the profile page updated if the AI changes something.
    const interval = setInterval(checkProfile, 2000);
    
    // clean up the interval when the component unmounts to prevent memory leaks
    return () => clearInterval(interval);
  }, []); 

  // --- MANUAL PROFILE EDITS ---
  // fires when the user manually changes a dropdown on their profile page
  const handleProfileUpdate = (key: string, value: any) => {
    if (!userProfile) return; 
    
    // clone the existing profile and update just the one key they changed
    const updated = { ...userProfile, [key]: value };
    
    // update react state and local storage immediately
    setUserProfile(updated);
    localStorage.setItem('myskinspec_profile', JSON.stringify(updated));
    
    // silently fire off a POST request to django to save the edit in the real database
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch('http://127.0.0.1:8000/api/profile/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updated)
      }).catch(e => console.log("Save failed"));
    }
  };

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    // nuke all auth tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_name');
    
    // NUKE ALL PERSONAL DATA. this stops the dreaded state leak bug between different users.
    localStorage.removeItem('myskinspec_profile'); 
    sessionStorage.removeItem('myskinspec_chat');
    sessionStorage.removeItem('myskinspec_analyser');
    
    // wipe the react state and boot them back to the home page
    setUserProfile(null);
    setUserName(null);
    setCurrentView('home');
  };

  // --- JSX RENDER ---
  return (
    // main wrapper. min-h-screen makes sure the gradient always hits the bottom of the monitor
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-yellow-50 font-sans text-slate-800 flex flex-col">
      
      {/* inject the navbar and hand it the gatekeeper function so the links work securely */}
      <Navbar currentView={currentView as ViewState} setView={handleViewChange} />
      
      {/* flex-grow pushes the footer (if i had one) to the bottom and takes up remaining space */}
      <main className="flex-grow">
        
        {/* my poor-man's router. just checking the state string and showing the right component */}
        {currentView === 'home' && <Main onStartChat={() => handleViewChange('quiz')} onLearnMore={() => handleViewChange('analyse')} />}
        {currentView === 'quiz' && <SkinQuiz onComplete={() => handleViewChange('chat')} />}
        {currentView === 'chat' && <ChatBot onNavigateToAnalyser={() => handleViewChange('analyse')} />}
        {currentView === 'analyse' && <ProductAnalyser />} 
        {currentView === 'routine' && <Routine />} 
        
        {/* --- THE PROFILE DASHBOARD --- */}
        {/* this huge block handles both the login screen and the actual profile data screen */}
        {currentView === 'profile' && (
          <div className="max-w-4xl mx-auto my-12 p-8 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white relative animate-fade-in">

            {/* if they don't have a username, show the login/register view */}
            {!userName ? (
              <div className="grid md:grid-cols-2 gap-12 items-center mt-6">
                
                {/* left side marketing copy */}
                <div className="text-center md:text-left">
                  <div className="bg-yellow-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl shadow-sm mx-auto md:mx-0">🔒</div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">Unlock your skin profile.</h2>
                  <p className="text-slate-500 mb-8 leading-relaxed">Save your personalised AI recommendations, track your routines, and get faster ingredient analysis.</p>
                </div>
                
                {/* right side forms */}
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
                  {/* standard email auth component */}
                  <AuthForm onSuccessLogin={(name) => setUserName(name)} />
                  
                  {/* css trick to make a nice 'OR' divider line */}
                  <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">Or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                  
                  {/* google oauth button */}
                  <div className="flex justify-center">
                    <GoogleAuthButton onSuccessLogin={(name) => setUserName(name)} />
                  </div>
                </div>
              </div>
            ) : (
              
              // if they ARE logged in, show their dashboard
              <div className="mt-6">
                
                {/* welcome header and sign out button */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-100 pb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800">Hello, {userName}! 👋</h2>
                    <p className="text-slate-500 mt-1">Manage your complete Skin Profile data below.</p>
                  </div>
                  <button onClick={handleLogout} className="text-slate-500 text-sm font-semibold hover:bg-slate-100 px-5 py-2 rounded-full transition-colors border border-slate-200">
                    Sign Out
                  </button>
                </div>

                {/* if they are logged in but haven't taken the quiz yet, prompt them to do it */}
                {!userProfile ? (
                  <div className="text-center py-16 bg-gradient-to-b from-blue-50 to-white rounded-3xl border border-blue-100">
                    <div className="text-4xl mb-4">🤔</div>
                    <p className="text-slate-500 mb-6 text-lg">You haven't built your profile yet!</p>
                    <button onClick={() => handleViewChange('quiz')} className="bg-blue-400 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-500 transition-all">
                      Take the Skin Quiz
                    </button>
                  </div>
                ) : (
                  
                  // the actual form data they can edit
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* standard controlled select inputs. changing them fires handleProfileUpdate */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skin Type</label>
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
                          <option>1-2 items (Minimalist)</option><option>3-4 items (Standard)</option><option>5+ items (Comprehensive)</option><option>Unknown</option>
                        </select>
                      </div>
                      
                      {/* the concerns input is tricky. it has to split the string by commas to save as an array, and join by commas to display it. */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Concerns (Comma Separated)</label>
                        <input type="text" value={userProfile.concerns?.join(', ') || ""} onChange={(e) => handleProfileUpdate('concerns', e.target.value.split(',').map(s => s.trim()))} className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium text-slate-700"/>
                      </div>
                    </div>
                    
                    {/* status card letting them know the AI is linked to this data */}
                    <div className="bg-gradient-to-b from-yellow-50 to-white rounded-3xl p-6 flex flex-col justify-center items-center text-center border border-yellow-100 shadow-sm h-full">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl mb-4 shadow-sm border border-yellow-100">✨</div>
                      <h3 className="font-bold text-slate-800 text-lg mb-2">Profile Synced</h3>
                      <p className="text-slate-600 text-sm mb-4">Your AI Consultant and Ingredient Analyser are actively using this data.</p>
                      
                      {/* only show the routine button if the array exists and actually has stuff in it */}
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
    </div>
  );
};

// --- AUTH FORM COMPONENT ---
const AuthForm = ({ onSuccessLogin }: { onSuccessLogin: (name: string) => void }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState(''); // Changed from username to email!
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError('');
    const endpoint = isRegistering ? 'register/' : 'login/';
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Sending 'email' instead of 'username'
        body: JSON.stringify({ email, password }) 
      });
      const data = await res.json();
      
      if (res.ok) {
        if (isRegistering) {
          setIsRegistering(false);
          setError('Registration successful! Please sign in.');
        } else {
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          
          // UX TRICK: Split the email at the '@' symbol and grab the first part 
          // so it says "Hello, sarah!" instead of "Hello, sarah@gmail.com!"
          const displayName = email.split('@')[0];
          
          localStorage.setItem('user_name', displayName);
          onSuccessLogin(displayName);
        }
      } else {
        setError(data.error || data.detail || 'Authentication failed.');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="font-bold text-slate-800 mb-4 text-center">{isRegistering ? 'Create an Account' : 'Sign in with Email'}</h3>
      
      {/* Changed type="text" to type="email" to force the browser to validate the @ symbol */}
      <input 
        type="email" 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
        placeholder="Email Address" 
        required 
        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 focus:outline-none" 
      />
      <input 
        type="password" 
        value={password} 
        onChange={e => setPassword(e.target.value)} 
        placeholder="Password" 
        required 
        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-400 focus:outline-none" 
      />
      
      {error && <p className={`text-xs font-semibold ${error.includes('successful') ? 'text-green-600' : 'text-red-500'}`}>{error}</p>}
      
      <button type="submit" className="w-full py-3 bg-blue-400 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-sm">
        {isRegistering ? 'Register' : 'Sign In'}
      </button>
      
      <p onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-xs text-center text-slate-500 cursor-pointer hover:text-blue-500 mt-2">
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