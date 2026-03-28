import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Main from './components/Main'; 
import ChatBot from './components/ChatBot';
import ProductAnalyser from './components/ProductAnalyser'; 
import { SkinSurvey } from './components/SkinSurvey';
import { ViewState, SurveyResult } from './types'; 



const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [showSurvey, setShowSurvey] = useState(false);
  const [userProfile, setUserProfile] = useState<SurveyResult | null>(null);

 
  useEffect(() => {
    const saved = localStorage.getItem('myskinspec_profile');
    if (saved) {
      setUserProfile(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="min-h-screen bg-pastel-gradient font-sans text-slate-800">
      <Navbar currentView={currentView} setView={setCurrentView} />
      
      
      {!userProfile && currentView === 'home' && (
        <div className="bg-blue-600 text-white text-center py-2 px-4 cursor-pointer hover:bg-blue-700 transition-colors"
             onClick={() => setShowSurvey(true)}>
          <span className="font-medium text-sm">✨ Personalize your AI results! Click here to take the Skin Quiz.</span>
        </div>
      )}

  
      {userProfile && (
        <div className="fixed bottom-4 right-4 z-40 bg-white p-3 rounded-2xl shadow-lg border border-blue-100 flex items-center gap-3 animate-fade-in">
          <div className="bg-green-100 text-green-700 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Your Profile</p>
            <p className="text-sm font-semibold text-slate-800">{userProfile.skinType} • {userProfile.sensitivity} Sensitivity</p>
          </div>
          <button 
            onClick={() => { localStorage.removeItem('myskinspec_profile'); setUserProfile(null); }}
            className="text-xs text-red-400 hover:underline ml-2"
          >
            Reset
          </button>
        </div>
      )}

      <main>
        {currentView === 'home' && (
          <Main 
            onStartChat={() => setCurrentView('chat')} 
            onLearnMore={() => setCurrentView('analyse')} 
          />
        )}
        
        {currentView === 'chat' && <ChatBot />}
        
       
        {currentView === 'analyse' && <ProductAnalyser />} 
        
        {currentView === 'reviews' && (
          <div className="text-center py-20 text-xl text-slate-500">
            Reviews Section (Placeholder)
          </div>
        )}
      </main>

      
      {showSurvey && (
        <SkinSurvey 
          onClose={() => setShowSurvey(false)}
          onComplete={(result) => {
            setUserProfile(result);
            setShowSurvey(false);
          }} 
        />
      )}
    </div>
  );
};

export default App;