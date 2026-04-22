// 1. Importing React and our hooks for memory
import React, { useState, useEffect } from 'react';

// 2. Building the Routine component
const Routine: React.FC = () => {
  //  STATE MEMORY
  // We need React state so the page actually re-renders when the data arrives!
  const [routine, setRoutine] = useState<string[]>([]);
  const [skinType, setSkinType] = useState<string>('unique');

  //  THE POLLING TRICK
  // This forces the component to constantly check local storage for the routine
  useEffect(() => {
    const loadRoutineData = () => {
      const savedProfileStr = localStorage.getItem('myskinspec_profile');
      if (savedProfileStr) {
        const profileData = JSON.parse(savedProfileStr);
        // Safely update the state with the routine array and skin type
        setRoutine(profileData.recommended_routine || []);
        setSkinType(profileData.skin_type || 'unique');
      }
    };

    // Run it immediately when the page loads
    loadRoutineData();

    // Check again every 1 second (1000ms) to catch the data as soon as Django syncs it!
    const interval = setInterval(loadRoutineData, 1000);
    
    // Clean up to prevent memory leaks
    return () => clearInterval(interval);
  }, []);

  return (
    // The main wrapper with our pastel fade
    <div className="max-w-4xl mx-auto my-12 animate-fade-in">
      
      {/* Header Section */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Your Daily Routine</h1>
        <p className="text-lg text-slate-500">Custom-built for your {skinType} skin.</p>
      </div>

      {/* If the routine array is empty, show a friendly empty state */}
      {routine.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-xl border border-white text-center">
          <div className="text-6xl mb-6">🛍️</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">No routine found!</h2>
          <p className="text-slate-500 mb-8">You haven't generated an AI routine yet. Head over to the AI Consultant to get your personalised recommendations.</p>
        </div>
      ) : (
        /* If they DO have a routine, map through it and draw the shopping cards! */
        <div className="space-y-6">
          {routine.map((productName, index) => {
            // We create a Google Shopping link by putting the product name into the URL!
            // 'encodeURIComponent' makes sure spaces are turned into safe URL characters (like %20)
            const shoppingLink = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(productName)}`;

            return (
              <div key={index} className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-md border border-white flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-lg transition-shadow">
                
                {/* Left Side: Step Number & Product Name */}
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  {/* Big Step Number */}
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 font-black text-2xl rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Step {index + 1}</p>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{productName}</h3>
                  </div>
                </div>

                {/* Right Side: Buy Button */}
                <div className="w-full sm:w-auto shrink-0">
                  <a 
                    href={shoppingLink} 
                    target="_blank" // Opens the link in a new tab!
                    rel="noopener noreferrer" // Security best practice when opening new tabs
                    className="block w-full sm:w-auto text-center px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl transition-colors shadow-sm"
                  >
                    Find Retailer 🛒
                  </a>
                </div>
              </div>
            );
          })}

          {/* A helpful tip at the bottom */}
          <div className="bg-teal-50 p-6 rounded-3xl border border-teal-100 text-center mt-8">
            <p className="text-teal-800 font-medium">
              <span className="font-bold text-teal-600">💡 Tip:</span> Want to swap a product? Head to the AI Consultant and ask for an alternative!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Exporting it so App.tsx can use it
export default Routine;
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
//https://developer.chrome.com/docs/lighthouse/best-practices/external-anchors-use-rel-noopener
