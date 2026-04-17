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
  
  // FIX #1: We tell React to look in sessionStorage to remember what page we were on before the refresh!
  const [currentView, setCurrentView] = useState<ViewState | 'profile'>(() => {
    return (sessionStorage.getItem('current_view') as ViewState | 'profile') || 'home';
  });
  
  const [userProfile, setUserProfile] = useState<SurveyResult | null>(null);
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('user_name'));

  // --- MY CUSTOM ROUTER & GATEKEEPER ---
  const handleViewChange = (newView: ViewState | 'profile') => {
    const isLoggedIn = !!localStorage.getItem('user_name');
    if ((newView === 'routine' || newView === 'analyse') && !isLoggedIn) {
      alert('🔒 Please sign in or create a free account to save your routine and unlock the Analyser!');
      setCurrentView('profile');
      sessionStorage.setItem('current_view', 'profile'); // Save view to memory
    } else {
      setCurrentView(newView);
      sessionStorage.setItem('current_view', newView); // Save view to memory
    }
  };

  // --- DB SYNC ON LOGIN / REFRESH ---
  useEffect(() => {
    if (userName) {
      const token = localStorage.getItem('access_token');
      if (token) {
        
        // FIX #2: If we have a local profile, push it up to Django FIRST so Django doesn't accidentally wipe it!
        const localData = localStorage.getItem('myskinspec_profile');
        if (localData) {
           const parsed = JSON.parse(localData);
           if (parsed.skin_type && parsed.skin_type !== 'Unknown') {
               fetch('http://127.0.0.1:8000/api/profile/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(parsed)
               }).catch(e => console.log("Upward sync failed"));
           }
        }

        // Then pull the authoritative version from Django
        fetch('http://127.0.0.1:8000/api/profile/', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data && !data.error && Object.keys(data).length > 0) {
            // ONLY overwrite local storage if Django actually has a real profile saved
            if (data.skin_type !== 'Unknown' || (data.recommended_routine && data.recommended_routine.length > 0)) {
              setUserProfile(data);
              localStorage.setItem('myskinspec_profile', JSON.stringify(data));
            }
          }
        })
        .catch(err => console.log("Silent background sync failed.")); 
      }
    }
  }, [userName]); 

  // --- THE POLLING TRICK ---
  useEffect(() => {
    const checkProfile = () => {
      const saved = localStorage.getItem('myskinspec_profile');
      if (saved) setUserProfile(JSON.parse(saved));
    };
    
    checkProfile();
    const interval = setInterval(checkProfile, 2000);
    return () => clearInterval(interval);
  }, []); 

  // --- MANUAL PROFILE EDITS ---
  const handleProfileUpdate = (key: string, value: any) => {
    if (!userProfile) return; 
    const updated = { ...userProfile, [key]: value };
    
    setUserProfile(updated);
    localStorage.setItem('myskinspec_profile', JSON.stringify(updated));
    
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch('http://127.0.0.1:8000/api/profile/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updated)
      }).catch(e => console.log("Save failed"));
    }
  };

  // --- RESET PROFILE LOGIC ---
  const handleResetProfile = async () => {
    const blankProfile = {
      skin_type: 'Unknown',
      skin_color: 'Unknown',
      sensitivity: 'Unknown',
      country: 'Unknown',
      item_count: 'Unknown',
      concerns: [],
      recommended_routine: [] 
    };

    localStorage.removeItem('myskinspec_chat');
    localStorage.removeItem('myskinspec_analyser');

    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        await fetch('http://127.0.0.1:8000/api/profile/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(blankProfile)
        });
      } catch (err) {
        console.log("Database reset failed");
      }
    }

    setUserProfile(blankProfile);
    localStorage.setItem('myskinspec_profile', JSON.stringify(blankProfile));

    alert("✨ Profile and Routine have been completely reset! You can now take the quiz again.");
    
    handleViewChange('quiz'); // Safely change the view
  };

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_name');
    
    localStorage.removeItem('myskinspec_profile'); 
    sessionStorage.removeItem('current_view'); // Wipe the saved view so it goes back to home
    
    // (Note: Deliberately keeping the chat memory intact here as requested!)
    
    setUserProfile(null);
    setUserName(null);
    setCurrentView('home');
  };

  // --- JSX RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-yellow-50 font-sans text-slate-800 flex flex-col">
      
      <Navbar currentView={currentView as ViewState} setView={handleViewChange} />
      
      <main className="flex-grow">
        {currentView === 'home' && <Main onStartChat={() => handleViewChange('quiz')} onLearnMore={() => handleViewChange('analyse')} />}
        {currentView === 'quiz' && <SkinQuiz onComplete={() => handleViewChange('chat')} />}
        {currentView === 'chat' && <ChatBot onNavigateToAnalyser={() => handleViewChange('analyse')} />}
        {currentView === 'analyse' && <ProductAnalyser />} 
        {currentView === 'routine' && <Routine />} 
        
        {currentView === 'profile' && (
          <div className="max-w-4xl mx-auto my-12 p-8 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white relative animate-fade-in">

            {!userName ? (
              <div className="grid md:grid-cols-2 gap-12 items-center mt-6">
                <div className="text-center md:text-left">
                  <div className="bg-yellow-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl shadow-sm mx-auto md:mx-0">🔒</div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">Unlock your skin profile.</h2>
                  <p className="text-slate-500 mb-8 leading-relaxed">Save your personalised AI recommendations, track your routines, and get faster ingredient analysis.</p>
                </div>
                
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <AuthForm onSuccessLogin={(name) => setUserName(name)} />
                  
                  <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">Or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                  
                  <div className="flex justify-center">
                    <GoogleAuthButton onSuccessLogin={(name) => setUserName(name)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-100 pb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800">Hello, {userName}! ✨</h2>
                    <p className="text-slate-500 mt-1">Manage your complete Skin Profile data below.</p>
                  </div>
                  
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={handleResetProfile} 
                      className="w-full md:w-auto text-red-500 text-sm font-semibold hover:bg-red-50 px-5 py-2 rounded-full transition-colors border border-red-200"
                    >
                      Reset Profile
                    </button>
                    <button 
                      onClick={handleLogout} 
                      className="w-full md:w-auto text-slate-500 text-sm font-semibold hover:bg-slate-100 px-5 py-2 rounded-full transition-colors border border-slate-200"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>

                {(!userProfile || userProfile.skin_type === 'Unknown') ? (
                  <div className="text-center py-16 bg-gradient-to-b from-blue-50 to-white rounded-3xl border border-blue-100">
                    <div className="text-4xl mb-4">🤔</div>
                    <p className="text-slate-500 mb-6 text-lg">You haven't built your profile yet!</p>
                    <button onClick={() => handleViewChange('quiz')} className="bg-blue-400 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-500 transition-all">
                      Take the Skin Quiz
                    </button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
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
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Concerns (Comma Separated)</label>
                        <input type="text" value={userProfile.concerns?.join(', ') || ""} onChange={(e) => handleProfileUpdate('concerns', e.target.value.split(',').map(s => s.trim()))} className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium text-slate-700"/>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-b from-yellow-50 to-white rounded-3xl p-6 flex flex-col justify-center items-center text-center border border-yellow-100 shadow-sm h-full">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl mb-4 shadow-sm border border-yellow-100">✨</div>
                      <h3 className="font-bold text-slate-800 text-lg mb-2">Profile Synced</h3>
                      <p className="text-slate-600 text-sm mb-4">Your AI Consultant and Ingredient Analyser are actively using this data.</p>
                      
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

      <footer className="bg-slate-900 text-slate-400 py-10 px-6 mt-auto">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs leading-relaxed">
            <strong className="text-slate-300">Medical Disclaimer:</strong> MySkinSpec is an AI-powered educational tool. The information and recommendations provided by our AI Consultant and Ingredient Analyser are not intended as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician, dermatologist, or other qualified health provider with any questions you may have regarding a medical condition or severe skin concern.
          </p>
        </div>
      </footer>
    </div>
  );
};

const AuthForm = ({ onSuccessLogin }: { onSuccessLogin: (name: string) => void }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState(''); 
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
      
      {error && <p className={`text-xs font-semibold ${error.includes('successful') ? 'text-green-600' : 'text-red-500'}`}>{error}</p>}
      
      <button type="submit" className="w-full py-3 bg-blue-400 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-sm mt-2">
        {isRegistering ? 'Register' : 'Sign In'}
      </button>
      
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