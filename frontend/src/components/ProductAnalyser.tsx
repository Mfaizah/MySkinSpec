// first, i bring in react and the hooks i need for memory and interactivity
import React, { useState, useRef, useEffect } from 'react';

// --- MY RULEBOOKS (INTERFACES) ---
// i built this rulebook to tell typescript exactly what the AI's JSON response will look like.
interface AnalysisResult {
  identified_input: string;
  benefits: string[];
  risks: string[];
  verdict: string;
  cheaper_alts: {name: string, reason: string}[];
  eco_alts: {name: string, reason: string}[];
}

// this rulebook defines what a single chat bubble contains
interface Message {
  role: 'user' | 'model' | 'error'; // who is talking (i added 'error' so i can make red warning bubbles)
  text?: string; // standard text (optional)
  analysis?: AnalysisResult; // the structured data card from the AI (also optional)
}

// building the main Analyser component
const ProductAnalyser: React.FC = () => {
  // a memory spot to track whatever the user is typing in the input box
  const [input, setInput] = useState('');
  
  // --- NEW MEMORY FEATURE ---
  // i check the browser's localStorage to see if they already scanned something!
  const [messages, setMessages] = useState<Message[]>(() => {
    // try to grab the saved chat from the browser's memory
    const savedChat = localStorage.getItem('myskinspec_analyser');
    // if i found it, unpack the JSON and put it on the screen
    if (savedChat) return JSON.parse(savedChat);
    
    // if memory is empty, i just give them the default greeting bubble
    return [{ role: 'model', text: 'Hello! Paste a product name, or click the button below to analyse the routine I just built for you!' }];
  });

  // this useEffect watches the 'messages' array. every time a new message is added, 
  // it saves the newest version of the chat straight into localStorage
  useEffect(() => {
    localStorage.setItem('myskinspec_analyser', JSON.stringify(messages));
  }, [messages]);
  
  // a simple true/false switch to turn on my bouncy loading dots
  const [isLoading, setIsLoading] = useState(false);
  
  // an invisible anchor point at the bottom of the chat to help with auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // --- CHECKING FOR A SAVED ROUTINE ---
  // i look in local storage to see if they completed the AI Consultant chat
  const savedProfileStr = localStorage.getItem('myskinspec_profile');
  
  // i create a true/false variable to check if they actually have a routine saved in their profile
  const hasSavedRoutine = savedProfileStr ? (JSON.parse(savedProfileStr).recommended_routine?.length > 0) : false;

  // this useEffect forces the screen to scroll down smoothly whenever a new message appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- THE MAIN SEND FUNCTION ---
  // this talks to the django backend when the user clicks send
  const handleSend = async (textToSend: string = input) => {
    // if the box is empty, don't do anything
    if (!textToSend.trim()) return;

    // clear the text box immediately
    setInput('');
    
    // add their new message to the chat history and draw it on the screen
    const newHistory = [...messages, { role: 'user', text: textToSend } as Message];
    setMessages(newHistory);
    
    // turn on the loading dots
    setIsLoading(true);

    // secretly unpack their profile from local storage so the AI knows their exact skin type when analysing!
    const profileData = savedProfileStr ? JSON.parse(savedProfileStr) : {};

    try {
      // grab their security token
      const token = localStorage.getItem('access_token');
      const headers: any = { 'Content-Type': 'application/json' };
      
      // send BOTH the text they typed AND their profile data to the Django analyser endpoint
      const res = await fetch('http://127.0.0.1:8000/api/analyse/', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ ingredients: textToSend, profile: profileData })
      });

      // wait for django to process it with Gemini and send the JSON back
      const data = await res.json();
      
      // turn off the loading dots
      setIsLoading(false);

      if (res.ok) {
        // if it worked, i add a new AI message to the screen containing the structured JSON data!
        setMessages(prev => [...prev, { role: 'model', analysis: data }]);
      } else {
        // if django threw an error, i show it in a red error bubble
        setMessages(prev => [...prev, { role: 'error', text: data.error || 'Failed to analyse product.' }]);
      }
    } catch (err) {
      // --- THE UPDATED CATCH BLOCK ---
      // Swapped out the old Django warning for a professional error message.
      setIsLoading(false);
      setMessages(prev => [...prev, { role: 'error', text: 'Network error. Please check your connection.' }]);
    }
  };

  // --- RESTART BUTTON FUNCTION ---
  // this wipes the session memory completely and refreshes the page to start over
  const handleRestart = () => {
    localStorage.removeItem('myskinspec_analyser');
    window.location.reload(); 
  };

  // --- THE VISUAL PART (HTML/TAILWIND) ---
  return (
    // the massive frosted glass box that holds the whole chat interface
    <div className="max-w-3xl mx-auto my-8 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white flex flex-col h-[700px] overflow-hidden animate-fade-in">
      
      {/* Top Header Section */}
      <div className="bg-blue-50 p-5 border-b border-blue-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-2xl shadow-sm">🔍</div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Ingredient Analyser</h2>
            <p className="text-xs text-slate-500">Checking products against your unique skin profile</p>
          </div>
        </div>

        {/* The clear history button in the top right corner */}
        <button onClick={handleRestart} className="text-xs font-bold text-slate-400 hover:text-red-500 px-3 py-1.5 border border-transparent hover:border-red-100 hover:bg-red-50 rounded-full transition-all">
          Clear History
        </button>
      </div>

      {/* Middle Chat Feed Section */}
      <div className="flex-grow p-6 overflow-y-auto bg-slate-50/50 flex flex-col gap-6">
        
        {/* --- THE MAGIC BUTTON --- */}
        {/* This button ONLY shows up if two conditions are met: 
            1. They actually have a routine saved in local storage.
            2. The chat only has exactly 1 message (the greeting). 
            If they type anything, this button disappears! */}
        {hasSavedRoutine && messages.length === 1 && (
          <div className="flex justify-center mb-4">
            <button 
              // when clicked, it automatically sends this specific prompt to the AI
              onClick={() => handleSend("Please analyse my currently recommended routine and explain why you chose these products.")}
              className="bg-yellow-100 text-yellow-800 font-bold py-2 px-6 rounded-full shadow-sm hover:bg-yellow-200 border border-yellow-200 transition-all text-sm animate-pulse"
            >
              ✨ Analyse My Saved Routine
            </button>
          </div>
        )}

        {/* i loop through every message and draw a chat bubble on screen */}
        {messages.map((msg, idx) => (
          // i align the user to the right, and the AI/errors to the left
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            
            {/* dynamic styling for the chat bubbles */}
            <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-400 text-white rounded-br-sm' // User gets a blue box
                : msg.role === 'error'
                ? 'bg-red-50 border border-red-200 text-red-600 rounded-bl-sm font-semibold' // Errors get a red warning box
                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm' // AI gets a white box
            }`}>
              
              {/* If it's just a normal text message (like the greeting or an error), print the text */}
              {msg.text && <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>}
              
              {/* --- THE AI ANALYSIS CARD --- */}
              {/* If the message contains structured JSON 'analysis' data, we draw this beautiful custom card! */}
              {msg.analysis && (
                <div className="space-y-4">
                  
                  {/* Title showing what the AI actually scanned */}
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-lg text-slate-800">{msg.analysis.identified_input}</h3>
                  </div>
                  
                  {/* The AI's Medical Verdict (Blue box) */}
                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-50/50">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      <span className="font-bold">🩺 AI Verdict:</span> {msg.analysis.verdict}
                    </p>
                  </div>

                  {/* A 2-column CSS grid for Pros and Cons */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    
                    {/* Green Benefits Box */}
                    <div className="bg-green-50/30 p-3 rounded-xl border border-green-50">
                      <h4 className="font-bold text-green-600 text-xs uppercase tracking-wider mb-2">✅ Benefits</h4>
                      <ul className="space-y-1.5">
                        {/* Map through the benefits array and draw a list item for each one */}
                        {msg.analysis.benefits?.map((b, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5"><span className="text-green-400 mt-0.5">•</span> {b}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Red Risks Box */}
                    <div className="bg-red-50/30 p-3 rounded-xl border border-red-50">
                      <h4 className="font-bold text-red-500 text-xs uppercase tracking-wider mb-2">⚠️ Risks</h4>
                      <ul className="space-y-1.5">
                        {/* A ternary operator! If there are risks, map them. If the array is empty, print "No risks detected." */}
                        {msg.analysis.risks?.length > 0 ? msg.analysis.risks.map((r, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5"><span className="text-red-400 mt-0.5">•</span> {r}</li>
                        )) : <li className="text-xs text-slate-400 italic mt-0.5">No risks detected.</li>}
                      </ul>
                    </div>
                  </div>

                  {/* Alternative Product Suggestions */}
                  {/* I check if EITHER the cheaper OR eco alternatives array has items before drawing this section */}
                  {(msg.analysis.cheaper_alts?.length > 0 || msg.analysis.eco_alts?.length > 0) && (
                    <div className="pt-3 border-t border-slate-100">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">💡 Suggestions</h4>
                      <div className="space-y-2">
                        {/* Draw the cheaper alternatives */}
                        {msg.analysis.cheaper_alts?.map((alt, i) => (
                          <div key={i} className="text-xs"><span className="font-bold text-slate-700">💰 {alt.name}</span> <span className="text-slate-500">- {alt.reason}</span></div>
                        ))}
                        {/* Draw the eco-friendly alternatives */}
                        {msg.analysis.eco_alts?.map((alt, i) => (
                          <div key={i} className="text-xs"><span className="font-bold text-slate-700">🌱 {alt.name}</span> <span className="text-slate-500">- {alt.reason}</span></div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* LOADING BUBBLES */}
        {/* if the ai is thinking, show three little bouncing dots */}
        {isLoading && (
           <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-bl-sm shadow-sm flex items-center gap-2 w-20">
             <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"></div>
             <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
             <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
           </div>
        )}
        {/* invisible div to force the screen to scroll to the bottom */}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Section */}
      <div className="p-4 bg-white border-t border-blue-50">
        <div className="flex gap-2 relative">
          {/* the text box where the user types */}
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            // if they hit the enter key, trigger the send function
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Paste a product name or ingredients here..." 
            className="flex-grow p-4 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
          />
          {/* the send button */}
          <button 
            onClick={() => handleSend()}
            // disable the button if the ai is loading or if the input is empty
            disabled={isLoading || !input.trim()}
            className="px-8 bg-blue-400 text-white rounded-full font-bold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// exporting it so the rest of the app can use it
export default ProductAnalyser;
//https://www.typescriptlang.org/docs/handbook/interfaces.html
//https://react.dev/learn/conditional-rendering
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining

