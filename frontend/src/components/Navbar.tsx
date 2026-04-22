// first, i bring in react and the 'useState' hook so i can create a toggle switch for the mobile menu
import React, { useState } from 'react';

// i import my custom 'ViewState' rulebook so the navbar knows exactly which pages are allowed to exist
import { ViewState } from '../types';

// i import two specific icons from the lucide-react library: a hamburger menu and a close (X) button
import { Menu, X } from 'lucide-react'; 

// this is a typescript interface. it tells the main App.tsx file what tools it needs to pass down to this Navbar
interface NavbarProps {
  setView: (view: ViewState | 'profile') => void; // a function to actually change the page (the gatekeeper!)
  currentView: ViewState | 'profile'; // a variable that tells the navbar what page we are currently looking at
}

// building the actual Navbar component
const Navbar: React.FC<NavbarProps> = ({ setView, currentView }) => {
  // i check the browser's local memory to see if a username is saved. 
  // the '!!' turns the result into a simple true/false boolean!
  const isLoggedIn = !!localStorage.getItem('user_name');
  
  // a memory switch to track if the mobile dropdown menu is open or closed (starts closed/false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // NEW MENU DATA
  // i created an array of objects to hold all my navigation links. 
  // i added an optional 'locked' property to flag my premium features!
  const navItems: { label: string; view: ViewState | 'profile'; locked?: boolean }[] = [
    { label: 'Home', view: 'home' },
    { label: 'Skin Quiz', view: 'quiz' },
    { label: 'AI Consultant', view: 'chat' },
    // These two are flagged as premium/locked features!
    { label: 'My Routine', view: 'routine', locked: true }, 
    { label: 'Ingredient Analyser', view: 'analyse', locked: true },
  ];

  // a tiny helper function that handles clicking a link
  const handleNavigation = (view: ViewState | 'profile') => {
    // first, it passes the requested page to the App.tsx gatekeeper...
    setView(view);
    // ...then it forces the mobile menu to close automatically so it doesn't block the screen!
    setIsMobileMenuOpen(false); 
  };

  // THE VISUAL PART (HTML/TAILWIND)
  return (
    // The master wrapper for the navigation bar.
    // 'sticky top-0 z-50' makes it freeze at the top of the screen when you scroll down.
    // 'bg-white/80 backdrop-blur-md' gives it that modern, slightly see-through frosted glass look.
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-blue-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* a flexbox container to spread the logo to the left and the links to the right */}
        <div className="flex justify-between items-center h-20">
          
          {/* THE LOGO */}
          {/* clicking the text logo always takes you back to the 'home' view */}
          <div className="flex items-center cursor-pointer" onClick={() => handleNavigation('home')}>
            <span className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
              MySkinSpec
            </span>
          </div>

          {/* DESKTOP NAVIGATION LINKS*/}
          {/* 'hidden lg:flex' means this entire block hides on small phone screens, but shows as a row on laptops */}
          <div className="hidden lg:flex space-x-6">
            
            {/* i use the .map() function to loop through my navItems array and draw a button for each one */}
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.view)}
                // Dynamic styling! If the current page matches the button, make it black with a yellow underline.
                // If not, make it grey text that turns dark when hovered over.
                className={`text-sm font-bold transition-colors duration-200 flex items-center gap-1.5 ${
                  currentView === item.view 
                    ? 'text-slate-900 border-b-2 border-yellow-400' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
                
                {/* THE PADLOCK UI */}
                {/* If they are NOT logged in, AND the item is locked, draw a tiny padlock emoji! */}
                {!isLoggedIn && item.locked && (
                  <span className="text-xs opacity-50" title="Sign in required">🔒</span>
                )}
              </button>
            ))}
          </div>

          {/* DESKTOP PROFILE BUTTON */}
          {/* also hidden on phones! */}
          <div className="hidden lg:flex items-center gap-4">
             <button 
                onClick={() => handleNavigation('profile')}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-2 px-6 rounded-full transition-all shadow-sm transform hover:-translate-y-0.5 border border-yellow-200"
             >
               {/* magically change the button text depending on if they are logged in or not */}
               {isLoggedIn ? 'My Profile' : 'Sign In'}
             </button>
          </div>

          {/* MOBILE NAVIGATION */}
          {/* 'lg:hidden' means this block ONLY shows on small phone screens! */}
          <div className="lg:hidden flex items-center gap-3">
            
            {/* A smaller version of the Profile/Sign In button just for mobile */}
            <button 
                onClick={() => handleNavigation('profile')}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-1.5 px-4 text-sm rounded-full transition-all border border-yellow-200"
             >
               {isLoggedIn ? 'Profile' : 'Sign In'}
             </button>
            
            {/* The Hamburger Menu Button */}
            {/* clicking this flips my 'isMobileMenuOpen' switch between true and false */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 hover:text-slate-900 focus:outline-none p-1">
              {/* If the menu is open, show the 'X' icon. If it's closed, show the Hamburger 'Menu' icon. */}
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU */}
      {/* This entire block of HTML only draws on the screen if 'isMobileMenuOpen' is true! */}
      {isMobileMenuOpen && (
        // absolute positioning makes it drop down right over the top of the page content
        <div className="lg:hidden bg-white border-b border-blue-100 shadow-lg absolute w-full animate-fade-in">
          <div className="px-4 pt-2 pb-6 space-y-2 flex flex-col">
            
            {/* Loop through my navItems array again, but style them as big chunky rows for phone tapping */}
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.view)}
                // Dynamic styling again! Highlights the current page in blue.
                className={`text-left px-4 py-3 rounded-xl text-base font-bold transition-colors flex justify-between items-center ${
                  currentView === item.view 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
                {/* Mobile version of the padlock UI */}
                {!isLoggedIn && item.locked && (
                  <span className="text-sm opacity-50">🔒</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

// exporting it so App.tsx can use it
export default Navbar;

//https://tailwindcss.com/docs/responsive-design
//https://react.dev/learn/conditional-rendering
//https://react.dev/learn/rendering-lists
//https://tailwindcss.com/docs/position
//https://tailwindcss.com/docs/backdrop-filter-blur