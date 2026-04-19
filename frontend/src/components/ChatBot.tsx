// first, i'm bringing in react and some special hooks (useState, useRef, useEffect) to give my chatbot memory and make it interactive
import React, { useState, useRef, useEffect } from 'react';

// this is a typescript rulebook i made so the code knows exactly what a "Message" object looks like
interface Message {
  role: 'user' | 'model'; // this tells me who is talking (either the user or the AI model)
  text: string; // this holds the actual text of the chat bubble
  options?: string[]; // this is an optional list of clickable buttons the AI can show us
}

// this tells my chatbot that it's allowed to receive a special function from the main App.tsx file
interface ChatBotProps {
  onNavigateToAnalyser?: () => void; // i use this to automatically jump to the analyser page
}

// here is the main component where i build the actual chatbot screen
const ChatBot: React.FC<ChatBotProps> = ({ onNavigateToAnalyser }) => {
  // i need a memory spot (state) to hold whatever the user is currently typing in the input box
  const [input, setInput] = useState('');
  
  // --- NEW MEMORY FEATURE ---
  // instead of starting with an empty chat, i check the browser's 'localStorage' first.
  // this way, if they click a different page and come back, the chat history doesn't wipe!
  const [messages, setMessages] = useState<Message[]>(() => {
    // try to grab the saved chat from the browser's permanent memory
    const savedChat = localStorage.getItem('myskinspec_chat');
    // if i found it, unpack the JSON. if it's empty, just start with an empty array []
    return savedChat ? JSON.parse(savedChat) : [];
  });
  
  // this useEffect runs every single time the 'messages' list updates.
  // it takes the newest version of the chat and saves it right back into localStorage.
  useEffect(() => {
    localStorage.setItem('myskinspec_chat', JSON.stringify(messages));
  }, [messages]);

  // a simple true/false switch to turn on my bouncy loading bubbles when the AI is thinking
  const [isLoading, setIsLoading] = useState(false);
  
  // i use this as an invisible "anchor" at the bottom of the chat to help with auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // a switch to make sure i only send the secret invisible greeting prompt exactly once when the page loads
  const hasStarted = useRef(false);

  // this useEffect forces the screen to scroll down smoothly to my invisible anchor every time a new message pops up
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // this useEffect runs the exact second the chatbot page opens
  useEffect(() => {
    // --- NEW CHECK --- 
    // i ONLY want to send the secret greeting prompt if this is a brand new, empty chat!
    if (!hasStarted.current && messages.length === 0) {
      // flip the switch so i don't accidentally run this twice
      hasStarted.current = true;
      
      // i look in local storage for the survey answers they just filled out
      const savedProfile = localStorage.getItem('myskinspec_profile');
      
      // if i actually found their survey answers...
      if (savedProfile) {
        // i explicitly tell the AI to just say hello and wait. this makes the first load super fast!
        // i also remind it that the user can ask for Korean products.
        const initialPrompt = `Here is my skin profile: ${savedProfile}. Please say hello, acknowledge my skin type briefly, and ask if I am ready to generate my routine. DO NOT generate the routine yet. Let me know I can ask for Korean products!`;
        
        // i send that message to the AI, but i pass 'true' so it stays hidden from the screen
        handleSend(initialPrompt, true); 
      } else {
        // if they somehow skipped the quiz, i show them a fake AI message telling them to go back
        setMessages([{ role: 'model', text: 'Please complete the Skin Quiz first to build your profile!' }]);
      }
    }
  }, [messages.length]);

  // --- THE MAIN SEND FUNCTION ---
  // this massive function handles sending messages to django. 
  // it defaults to sending whatever is in the 'input' box, and defaults to showing the message on screen
  const handleSend = async (textToSend: string = input, isHidden: boolean = false) => {
    // if the text is completely empty, don't do anything, just stop
    if (!textToSend.trim()) return;
    
    // immediately clear the input box so it's empty for their next message
    setInput('');
    
    // to keep the screen clean, i wipe away any old clickable buttons from previous messages
    const updatedMessages = messages.map(m => ({ ...m, options: [] }));
    
    // i add the user's new message to the end of our chat history array
    const newHistory = [...updatedMessages, { role: 'user', text: textToSend } as Message];
    
    // if this is a normal message (not the secret greeting), i draw it on the screen
    if (!isHidden) setMessages(newHistory);
    
    // i turn on the bouncy loading dots
    setIsLoading(true);

    // now i try to talk to the django backend
    try {
      // i make a POST request to my django chat API
      const res = await fetch('https://myskinspec.onrender.com/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // i send the ENTIRE chat history to django so the AI remembers what we were talking about
        body: JSON.stringify({ history: newHistory }) 
      });

      // i wait for django to send the data back
      const data = await res.json();
      
      // now that the AI replied, i turn off the loading dots
      setIsLoading(false);

      // if the server said OK (200)...
      if (res.ok) {
        // i grab the actual text the AI wrote
        let aiText = data.reply;
        // i create a blank list to hold any interactive buttons the AI gives us
        let extractedOptions: string[] = [];

        // --- CATCHING SECRET TAGS & MERGING ROUTINE DATA ---
        
        // i use regular expressions (Regex) to look for my secret [PROFILE_DATA: { ... }] tag in the text
        const profileRegex = /\[PROFILE_DATA:\s*(\{.*\})\s*\]/;
        const profileMatch = aiText.match(profileRegex);
        
        // if i found profile data (which means the AI just built a routine)...
        if (profileMatch) {
          try {
            // i unpack the string into a real JSON object
            const newRoutineData = JSON.parse(profileMatch[1]);
            // i grab the OLD survey data we already have saved in local storage
            const oldProfile = JSON.parse(localStorage.getItem('myskinspec_profile') || '{}');
            
            // i use the spread operator (...) to merge the old survey data with the NEW routine data!
            const mergedProfile = { ...oldProfile, ...newRoutineData };
            
            // i save this newly merged mega-profile back into local storage
            localStorage.setItem('myskinspec_profile', JSON.stringify(mergedProfile));
            
            // i check if they are logged in by looking for their security token
            const token = localStorage.getItem('access_token');
            if (token) {
              // if they are logged in, i send the newly merged profile to Django so it saves in the database permanently!
              fetch('https://myskinspec.onrender.com/api/profile/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(mergedProfile),
              });
            }
            // finally, i delete the ugly secret tag from the text string so the user never sees it
            aiText = aiText.replace(profileRegex, '').trim();
          } catch (e) {} // if the JSON parsing crashes, i just ignore it so the app doesn't break
        }

        // i look for the secret [NAVIGATE_ANALYSER] tag
        if (aiText.includes('[NAVIGATE_ANALYSER]')) {
          // i delete the tag from the text
          aiText = aiText.replace('[NAVIGATE_ANALYSER]', '').trim();
          // if my component has the function, i wait 2 seconds then automatically change the page to the analyser
          if (onNavigateToAnalyser) setTimeout(() => onNavigateToAnalyser(), 2000);
        }

        // i look for the secret [OPTIONS: item1, item2] tag using Regex
        const optionsRegex = /\[OPTIONS:\s*(.*?)\]/i;
        const optionsMatch = aiText.match(optionsRegex);
        
        // if i found buttons...
        if (optionsMatch) {
          // i split the text by commas to create an array of button names, and trim off any extra spaces
          extractedOptions = optionsMatch[1].split(',').map((opt: string) => opt.trim());
          // i delete the ugly tag from the text
          aiText = aiText.replace(optionsRegex, '').trim(); 
        }

        // finally, i add the clean AI text and the clickable buttons to the screen!
        setMessages(prev => [...prev, { role: 'model', text: aiText, options: extractedOptions }]);
      } else {
        // if django sent an error, i show it in the chat window inside an AI bubble
        setMessages(prev => [...prev, { role: 'model', text: 'Error connecting to the server. ' + (data.error || '') }]);
      }
    } catch (err) {
      // --- THE UPDATED CATCH BLOCK ---
      // No more "Is Django running?". We use a clean, professional error message!
      setIsLoading(false);
      setMessages(prev => [...prev, { role: 'model', text: 'Network error. Please check your connection.' }]);
    }
  };

  // --- RESTART BUTTON ---
  // this function wipes the chat memory and refreshes the page to start the chat over
  const handleRestart = () => {
    localStorage.removeItem('myskinspec_chat');
    window.location.reload(); 
  };

  // --- THE VISUAL PART (HTML/TAILWIND) ---
  return (
    // this is the massive box that holds the whole chat, styled with backdrop-blur to look like frosted glass
    <div className="max-w-3xl mx-auto my-8 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white flex flex-col h-[700px] overflow-hidden animate-fade-in">
      
      {/* Top Header Section */}
      <div className="bg-blue-50 p-5 border-b border-blue-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-2xl shadow-sm">✨</div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">AI Consultant</h2>
            <p className="text-xs text-slate-500">Generating routines based on your profile</p>
          </div>
        </div>
        
        {/* The little restart button in the top right corner */}
        <button onClick={handleRestart} className="text-xs font-bold text-slate-400 hover:text-red-500 px-3 py-1.5 border border-transparent hover:border-red-100 hover:bg-red-50 rounded-full transition-all">
          Restart Chat
        </button>
      </div>

      {/* Middle Chat Feed Section (where the messages go) */}
      <div className="flex-grow p-6 overflow-y-auto bg-slate-50/50 flex flex-col gap-6">
        
        {/* i loop through every message in my history and draw a chat bubble for it */}
        {messages.map((msg, idx) => (
          // i use flexbox to push user messages to the right, and AI messages to the left
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            
            {/* the actual chat bubble box. user gets a blue box, AI gets a white box */}
            <div className={`max-w-[80%] p-4 rounded-3xl shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-400 text-white rounded-br-sm' 
                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
            }`}>
              
              <div className="leading-relaxed whitespace-pre-wrap">
                {/* --- MAGIC IMAGE RENDERER --- */}
                {/* i split the text every time it sees [IMAGE: url] */}
                {msg.text.split(/\[IMAGE:\s*(.*?)\]/).map((part, index) => {
                  // because of how split works, every ODD index will be the URL inside the brackets
                  if (index % 2 !== 0) {
                    // so if it's an odd index, i draw an actual HTML image tag! 
                    return <img key={index} src={part} alt="Product" className="max-w-48 h-auto rounded-xl my-3 shadow-md border border-slate-100" onError={(e) => (e.currentTarget.style.display = 'none')} />;
                  }
                  // if it's an even index, it's just normal text, so i wrap it in a span
                  return <span key={index}>{part}</span>;
                })}
              </div>
            </div>
            
            {/* BUTTON RENDERER LOGIC */}
            {msg.options && msg.options.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 ml-2">
                {msg.options.map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSend(opt)}
                    className="capitalize px-5 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full border border-yellow-200 transition-all shadow-sm"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* LOADING BUBBLES */}
        {/* if the AI is currently thinking (isLoading is true), i show three bouncy dots */}
        {isLoading && (
           <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-bl-sm shadow-sm flex items-center gap-2 w-20">
             <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"></div>
             {/* the animation-delay makes them bounce one after another instead of all at once */}
             <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
             <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
           </div>
        )}
        {/* this is my invisible div that the useEffect scrolls down to automatically */}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Section */}
      <div className="p-4 bg-white border-t border-blue-50">
        <div className="flex gap-2 relative">
          {/* the text box where the user types */}
          <input 
            type="text" 
            value={input} // linked to my 'input' state memory
            onChange={(e) => setInput(e.target.value)} // updates memory as they type
            // if they hit the 'Enter' key, it triggers the handleSend function automatically
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message (e.g. Can you make this routine Korean?)" 
            className="flex-grow p-4 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
          />
          {/* the send button */}
          <button 
            onClick={() => handleSend()}
            // i disable the button if the AI is loading OR if the input box is empty
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

export default ChatBot;


//https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
//https://react.dev/learn/manipulating-the-dom-with-refs
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
//https://tailwindcss.com/docs/animation

