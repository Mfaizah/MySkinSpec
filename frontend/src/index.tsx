import React from 'react'; // Brings in the core React library needed to build components and user interfaces.
import ReactDOM from 'react-dom/client'; // Imports the tool used to talk to web browsers (the DOM) so React can actually draw things on the screen.
import App from './App'; // Imports your main App component from the App.js file located in the exact same folder.

// Finds the empty HTML div with the id of 'root' where our entire React app will be injected.
const rootElement = document.getElementById('root'); 

// A safety check to make sure the 'root' div actually exists in your index.html file.
if (!rootElement) {
  // Crashes the app immediately with a helpful error message if it can't find that 'root' div.
  throw new Error("Could not find root element to mount to");
}

// Tells React to take control of that 'root' HTML div and set it up as the main base for the app.
const root = ReactDOM.createRoot(rootElement);

// Tells React to actually draw (render) our app inside that base container.
root.render(
  // A wrapper that turns on extra behind-the-scenes checks and warnings to help you catch bugs while building.
  <React.StrictMode>
    {/* This is your actual main application component being placed onto the page. */}
    <App />
  {/* Closes the strict mode wrapper. */}
  </React.StrictMode>
);