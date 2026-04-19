// first, i bring in react and the 'useState' hook to give my quiz memory
import React, { useState } from 'react';

// importing my custom rulebook that defines what a completed 'SurveyResult' object looks like
import { SurveyResult } from '../types';

// this tells typescript that this component needs a function from App.tsx to know what to do when the quiz finishes
interface SkinQuizProps {
  onComplete: (profile: SurveyResult) => void;
}

// building the actual multi-step quiz component
const SkinQuiz: React.FC<SkinQuizProps> = ({ onComplete }) => {
  
  // --- SETTING UP MY MEMORY (STATE) ---
  
  // memory space to track which question number we are currently looking at (starts at index 0)
  const [step, setStep] = useState(0);
  
  // a temporary memory space to slowly build the user's profile object as they click through the questions.
  // i initialize it with an empty 'concerns' array so the multi-select logic doesn't crash on the first click.
  const [profile, setProfile] = useState<SurveyResult>({ concerns: [] });

  // --- THE QUIZ DATA ---
  // this is an array of objects holding all my questions.
  // doing it this way means i don't have to write 6 separate blocks of HTML; i can just loop through this list!
  const questions = [
    { key: 'skin_type', title: 'What is your general skin type?', options: ['Oily', 'Dry', 'Combination', 'Normal'] },
    { key: 'skin_color', title: 'What is your skin tone?', options: ['Fair', 'Medium', 'Olive', 'Deep'] },
    // notice this one has 'multi: true' so my code knows to let them pick more than one option!
    { key: 'concerns', title: 'What are your primary skin concerns? (Select all that apply)', options: ['Acne', 'Ageing', 'Redness', 'Texture', 'Dullness'], multi: true },
    { key: 'sensitivity', title: 'Do you experience skin sensitivity?', options: ['None', 'Occasional Redness', 'Frequent Irritation'] },
    { key: 'country', title: 'Which country are you located in?', options: ['UK', 'US', 'Canada', 'Australia', 'Other'] },
    { key: 'item_count', title: 'How many items do you want in your routine?', options: ['3 items (Basic)', '4-5 items (Advanced)', '6+ items (Comprehensive)'] }  ];

  // --- HANDLING USER CLICKS ---
  // this function runs every time a user taps one of the answer buttons
  const handleSelect = (option: string) => {
    // figure out exactly which question we are currently on
    const currentQ = questions[step];
    
    // --- MULTI-SELECT LOGIC ---
    // if the current question is flagged as 'multi' (like the concerns question)...
    if (currentQ.multi) {
      // grab their current list of concerns (or an empty array if they haven't picked any yet)
      const currentConcerns = profile.concerns || [];
      
      // if they clicked an option they already selected, we want to DESELECT it
      if (currentConcerns.includes(option)) {
        // so we 'filter' the array to remove that specific word, and save the updated list
        setProfile({ ...profile, concerns: currentConcerns.filter(c => c !== option) });
      } else {
        // if they haven't selected it yet, we add it to the end of their existing list!
        setProfile({ ...profile, concerns: [...currentConcerns, option] });
      }
    } else {
      // --- SINGLE-SELECT LOGIC ---
      // for all normal questions, we just take whatever they clicked and save it directly to that question's 'key'
      setProfile({ ...profile, [currentQ.key]: option });
    }
  };

  // --- HANDLING THE 'CONTINUE' BUTTON ---
  // made this an async function so it can wait for django to save
  const handleNext = async () => {
    // check if we are on the very last question or not
    if (step < questions.length - 1) {
      // if not, simply increase the step counter by 1 to show the next question
      setStep(step + 1);
    } else {
      // IF IT IS THE LAST QUESTION:
      // save their completely finished profile into the browser's local storage memory
      localStorage.setItem('myskinspec_profile', JSON.stringify(profile));
      
      // FIX #3: Immediately push the quiz answers to Django so it is safely stored in the database!
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          await fetch('http://127.0.0.1:8000/api/profile/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(profile)
          });
        } catch (e) {
          console.log("Failed to save quiz to database");
        }
      }

      // then fire the 'onComplete' function to tell App.tsx to change the screen to the Chatbot!
      onComplete(profile);
    }
  };

  // --- HELPER VARIABLES ---
  const currentQ = questions[step]; // grab the data for the specific question we are on right now
  const progress = ((step + 1) / questions.length) * 100; // mathematically calculate how far along they are (as a percentage)

  // --- THE VISUAL PART (HTML/TAILWIND) ---
  return (
    // the main glassy card wrapper for the quiz
    <div className="max-w-2xl mx-auto my-12 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white p-8 animate-fade-in">
      
      {/* --- THE PROGRESS BAR --- */}
      <div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
        {/* i inject the mathematically calculated percentage directly into the CSS width property! */}
        {/* 'transition-all duration-500' makes the bar slide smoothly when it grows */}
        <div className="bg-blue-400 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
      </div>

      {/* --- THE QUESTION HEADER --- */}
      <div className="text-center mb-8">
        {/* a tiny yellow pill showing their step count (e.g. "Step 1 of 6") */}
        <div className="inline-block px-4 py-1.5 bg-yellow-100 text-yellow-700 font-bold text-xs rounded-full uppercase tracking-wider mb-4">Step {step + 1} of {questions.length}</div>
        {/* the actual question text */}
        <h2 className="text-3xl font-bold text-slate-800">{currentQ.title}</h2>
      </div>

      {/* --- THE CLICKABLE OPTIONS --- */}
      <div className="grid gap-4 mb-8">
        {/* i loop through all the options for this specific question and draw a button for each one */}
        {currentQ.options.map((opt) => {
          
          // i need to check if this specific button is currently selected in my memory.
          // if it's the multi-select question, i check if the word is inside the concerns array.
          // if it's a normal question, i just check if it matches the single saved value.
          const isSelected = currentQ.multi ? profile.concerns?.includes(opt) : profile[currentQ.key as keyof SurveyResult] === opt;
          
          return (
            <button
              key={opt}
              // trigger the selection logic when clicked
              onClick={() => handleSelect(opt)}
              // dynamic styling! if 'isSelected' is true, it turns blue and pops out slightly. if false, it stays grey.
              className={`p-4 text-lg font-semibold rounded-2xl border-2 transition-all text-left flex justify-between items-center ${
                isSelected ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-md transform scale-[1.02]' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50'
              }`}
            >
              {opt}
              {/* if they selected it, i also draw a little blue checkmark icon next to the text! */}
              {isSelected && <span className="text-blue-500 text-xl">✓</span>}
            </button>
          )
        })}
      </div>

      {/* --- BOTTOM NAVIGATION BUTTONS --- */}
      <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
        
        {/* The 'Back' Button */}
        {/* Math.max(0, step - 1) ensures the step counter never accidentally drops below zero and crashes the app */}
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-6 py-3 text-slate-500 font-bold disabled:opacity-30 hover:bg-slate-50 rounded-xl transition-colors">
          Back
        </button>
        
        {/* The 'Continue' / 'Finish' Button */}
        <button 
          onClick={handleNext} 
          className="px-8 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md transform hover:-translate-y-0.5"
        >
          {/* dynamic text: if we are on the very last question, the button says "Build My Routine", otherwise it just says "Continue" */}
          {step === questions.length - 1 ? 'Build My Routine ✨' : 'Continue'}
        </button>
      </div>

    </div>
  );
};

// exporting it so the App router can find it
export default SkinQuiz;
//https://react.dev/learn/state-a-components-memory
//https://react.dev/learn/updating-objects-in-state
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
//https://react.dev/learn/javascript-in-jsx-with-curly-braces
