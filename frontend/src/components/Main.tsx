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
    // 'bg-gradient-to-b' creates my signature pastel fade from blue to white to yellow
    // 'overflow-hidden' ensures that nothing spills out and causes ugly horizontal scrollbars
    <div className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-yellow-50 flex flex-col font-sans">
      
      {/* ========================================== */}
      {/* 1. THE HERO SECTION (Top of the page)        */}
      {/* ========================================== */}
      
      {/* 'grid md:grid-cols-2' is the layout magic! On phones it stacks, but on laptops (md), it splits the screen perfectly in half. */}
      {/* 'min-h-[80vh]' makes sure this top section takes up at least 80% of the screen height */}
      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 grid md:grid-cols-2 gap-16 items-center z-10 min-h-[80vh]">
        
        {/* --- LEFT SIDE: The Welcome Text & Buttons --- */}
        {/* i use flexbox here to stack the text and align it cleanly to the left */}
        <div className="flex flex-col items-start text-left animate-fade-in">

          {/* the massive main headline */}
          {/* 'leading-[1.1]' squishes the line height slightly so the big text looks tighter and more professional */}
          <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-6 tracking-tight">
            Discover Your <br />
            
            {/* The Gradient Text Trick! */}
            {/* 'text-transparent bg-clip-text' makes the actual text invisible, but cuts the background gradient to the shape of the letters! */}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-yellow-500">
              Perfect Skincare
            </span> <br />
            Routine.
          </h1>

          {/* a clean, subtitle explaining the app */}
          <p className="text-lg lg:text-xl text-slate-600 mb-10 leading-relaxed max-w-lg">
            Get personalised skincare recommendations tailored to your unique skin type with our intelligent AI consultant. Your journey to radiant skin starts here.
          </p>

          {/* --- THE ACTION BUTTONS --- */}
          {/* on phones they stack ('flex-col'), but on slightly bigger screens they go side-by-side ('sm:flex-row') */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            
            {/* The Main Blue Button */}
            <button 
              onClick={onStartChat} 
              // 'hover:-translate-y-1' makes the button literally lift up a tiny bit when you hover over it!
              className="px-8 py-4 text-base font-bold rounded-full text-white bg-blue-500 hover:bg-blue-600 transition-all shadow-lg shadow-blue-300/50 transform hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Take the Skin Quiz
            </button>
            
            {/* The Secondary White Button */}
            <button 
              onClick={onLearnMore} 
              className="px-8 py-4 text-base font-bold rounded-full text-slate-700 bg-white border-2 border-slate-100 hover:border-yellow-300 hover:bg-yellow-50 transition-all shadow-sm transform hover:-translate-y-1 flex items-center justify-center"
            >
              Scan a Product
            </button>
          </div>
        </div>


        {/* --- RIGHT SIDE: The Simple Wireframe Visual --- */}
        {/* i hide this completely on phones ('hidden'), but show it as a flex container on laptops ('md:flex') */}
        <div className="relative flex justify-center items-center w-full h-[400px] hidden md:flex animate-fade-in" style={{ animationDelay: '0.2s' }}>
          
          {/* THE BACK BOX (Pastel Yellow) */}
          {/* i use 'transform rotate-6' to tilt this box slightly to the right, creating a 3D layered effect */}
          <div className="absolute w-64 h-80 bg-yellow-100 rounded-[2rem] transform rotate-6 border-4 border-white shadow-lg"></div>
          
          {/* THE FRONT BOX (Pastel Blue) */}
          {/* i tilt this one left ('-rotate-3') and put it on top to act like a "fake" phone screen wireframe */}
          <div className="absolute w-64 h-80 bg-blue-100 rounded-[2rem] transform -rotate-3 border-4 border-white shadow-xl flex flex-col p-6">
             
             {/* inside the blue box, i just draw simple white shapes (divs) to mimic my app's layout */}
             {/* Fake Header line */}
             <div className="w-1/2 h-4 bg-white/70 rounded-full mb-6"></div>
             
             {/* Fake Chat Bubble (Left side / AI) */}
             <div className="w-full h-20 bg-white/60 rounded-2xl rounded-tl-sm mb-4"></div>
             
             {/* Fake Chat Bubble (Right side / User) */}
             {/* 'mt-auto self-end' pushes this bubble to the bottom right corner */}
             <div className="w-3/4 h-20 bg-blue-300/30 rounded-2xl rounded-br-sm mt-auto self-end"></div>
             
             {/* Fake Input Box at the very bottom */}
             <div className="w-full h-8 bg-white/80 rounded-full mt-4"></div>
          </div>

        </div>

      </div>

      {/* ========================================== */}
      {/* 2. HOW IT WORKS SECTION (Middle of the page) */}
      {/* ========================================== */}
      {/* this section has a solid white background and a subtle shadow at the top to separate it from the hero section */}
      <div className="relative z-20 bg-white py-24 border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">How it works</h2>
          <p className="text-slate-500 mb-16 max-w-2xl mx-auto text-lg">Three simple steps to take the guesswork out of your daily routine.</p>
          
          {/* i use CSS Grid here again to perfectly space out my 3 feature cards */}
          <div className="grid md:grid-cols-3 gap-10 text-left">
            
            {/* --- Feature Card 1 --- */}
            {/* adding the 'group' class to the parent allows me to trigger hover effects on the elements inside it! */}
            <div className="bg-slate-50 hover:bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-blue-200 transition-all shadow-sm hover:shadow-xl group">
              {/* 'group-hover:scale-110' makes the number icon pop up slightly when the user hovers anywhere on the card */}
              <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">1</div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Share your goals</h3>
              <p className="text-slate-600 leading-relaxed">Tell us about your skin type, sensitivity, and biggest concerns in a quick, simple quiz.</p>
            </div>

            {/* --- Feature Card 2 --- */}
            <div className="bg-slate-50 hover:bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-yellow-200 transition-all shadow-sm hover:shadow-xl group">
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">2</div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Get a custom routine</h3>
              <p className="text-slate-600 leading-relaxed">We match your profile with safe, dermatologist-approved ingredients to build a routine just for you.</p>
            </div>

            {/* --- Feature Card 3 --- */}
            <div className="bg-slate-50 hover:bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-teal-200 transition-all shadow-sm hover:shadow-xl group">
              <div className="w-16 h-16 bg-teal-100 text-teal-500 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">3</div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Scan ingredients</h3>
              <p className="text-slate-600 leading-relaxed">Already have a product? Paste the ingredients into our scanner to see if it's a good match for your skin.</p>
            </div>

          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. MINI FOOTER CTA (Bottom of the page)      */}
      {/* ========================================== */}
      {/* this is a 'Call To Action' banner. i made it dark slate to provide strong contrast and anchor the bottom of the page */}
      <div className="bg-slate-900 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-6">Ready to build your routine?</h2>
        <button 
          onClick={onStartChat} 
          className="px-8 py-4 text-base font-bold rounded-full text-slate-900 bg-yellow-400 hover:bg-yellow-300 transition-all shadow-lg transform hover:-translate-y-1"
        >
          Start the Quiz
        </button>
      </div>

    </div>
  );
};

// exporting the component so App.tsx can render it
export default Main;

//compute0.westminster.ac.uk
//https://tailwindcss.com/docs/grid-template-columns
//https://tailwindcss.com/docs/background-clip
//https://tailwindcss.com/docs/rotate
//https://tailwindcss.com/docs/hover-focus-and-other-states