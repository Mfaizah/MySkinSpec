// first, i need to import React so i can build this component
import React from 'react';

// this is my typescript rulebook (interface) that tells my Main component 
// which functions it's going to receive from the parent App.tsx file
interface MainProps {
  onStartChat: () => void; // function to jump to the Quiz/Chat page
  onLearnMore: () => void; // function to jump to the Analyser page
}

// building the actual Home Page component
const Main: React.FC<MainProps> = ({ onStartChat, onLearnMore }) => {
  return (
    // THE MASTER WRAPPER
    // CHANGED: I removed the local background colors completely! 
    // Now it perfectly inherits the 'bg-gradient-to-b from-blue-50 to-yellow-50' from App.tsx.
    <div className="relative flex flex-col w-full">
      
      {/* ========================================== */}
      {/* 1. THE HERO SECTION (Centered & Clean)       */}
      {/* ========================================== */}
      <div className="relative max-w-4xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center justify-center text-center z-10">
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight">
          Discover Your <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-yellow-500">
            Perfect Skincare
          </span> <br className="hidden sm:block" />
          Routine.
        </h1>

        <p className="text-lg md:text-xl text-slate-600 mb-12 leading-relaxed max-w-2xl font-light">
          Get personalised skincare recommendations tailored to your unique skin type with our intelligent AI consultant.
        </p>

        {/* --- THE GLASSMORPHIC BUTTONS --- */}
        {/* These are the only elements on the page with the frosted glass effect */}
        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto justify-center">
          
          {/* Primary Button: Blue Tinted Glass */}
          <button 
            onClick={onStartChat} 
            className="px-8 py-4 text-base font-semibold rounded-full text-blue-700 bg-blue-500/10 backdrop-blur-md border border-blue-200/50 hover:bg-blue-500/20 transition-all shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] hover:-translate-y-0.5"
          >
            Take the Skin Quiz
          </button>
          
          {/* Secondary Button: Frosted White Glass */}
          <button 
            onClick={onLearnMore} 
            className="px-8 py-4 text-base font-semibold rounded-full text-slate-700 bg-white/40 backdrop-blur-md border border-white/60 hover:bg-white/60 transition-all shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] hover:-translate-y-0.5"
          >
            Scan a Product
          </button>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. HOW IT WORKS (The Anti-Box Editorial Layout) */}
      {/* ========================================== */}
      {/* No boxes, no backgrounds. Just clean text and dividers flowing over the inherited pastel gradient. */}
      <div className="relative z-20 py-24">
        <div className="max-w-3xl mx-auto px-6">
          
          {/* Section Header */}
          <div className="mb-16 md:text-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">How it works</h2>
            <p className="text-2xl md:text-3xl text-slate-800 font-medium tracking-tight">
              Three simple steps to take the guesswork out of your daily routine.
            </p>
          </div>
          
          {/* The Editorial List */}
          <div className="flex flex-col">
            
            {/* --- STEP 1 --- */}
            {/* The border-t creates a subtle dividing line instead of wrapping it in a box */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 py-10 border-t border-slate-200/60 group">
              <span className="text-5xl font-light text-blue-300 transition-colors group-hover:text-blue-400">01</span>
              <div>
                <h3 className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">Share your goals</h3>
                <p className="text-slate-600 leading-relaxed font-light text-lg">
                  Tell us about your skin type, sensitivity, and biggest concerns in a quick, simple quiz. No complex jargon required.
                </p>
              </div>
            </div>

            {/* --- STEP 2 --- */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 py-10 border-t border-slate-200/60 group">
              <span className="text-5xl font-light text-yellow-400 transition-colors group-hover:text-yellow-500">02</span>
              <div>
                <h3 className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">Get a custom routine</h3>
                <p className="text-slate-600 leading-relaxed font-light text-lg">
                  We match your profile with safe, dermatologist-approved ingredients to build a personalized routine tailored to your goals.
                </p>
              </div>
            </div>

            {/* --- STEP 3 --- */}
            {/* Added border-b to close out the list cleanly */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 py-10 border-t border-b border-slate-200/60 group">
              <span className="text-5xl font-light text-teal-300 transition-colors group-hover:text-teal-400">03</span>
              <div>
                <h3 className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">Scan ingredients</h3>
                <p className="text-slate-600 leading-relaxed font-light text-lg">
                  Already have a product? Paste the ingredients into our scanner to instantly see if it's a good match for your skin.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. MINI FOOTER CTA                           */}
      {/* ========================================== */}
      <div className="mt-auto py-20 text-center px-6">
        <h2 className="text-3xl font-semibold text-slate-800 mb-8 tracking-tight">Ready to begin?</h2>
        
        {/* We use one more glassmorphic button down here to tie the page together */}
        <button 
          onClick={onStartChat} 
          className="px-10 py-4 text-base font-semibold rounded-full text-slate-800 bg-white/40 backdrop-blur-md border border-white/60 hover:bg-white/60 transition-all shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] hover:-translate-y-0.5"
        >
          Start the Quiz
        </button>
      </div>

    </div>
  );
};

export default Main;
//compute0.westminster.ac.uk
//https://tailwindcss.com/docs/grid-template-columns
//https://tailwindcss.com/docs/background-clip
//https://tailwindcss.com/docs/rotate
//https://tailwindcss.com/docs/hover-focus-and-other-states
//https://www.beside.com/ inspiration for landing page
//https://ui.aceternity.com/templates/nodus-agent-template
//https://github.com/shadcn-ui/ui
