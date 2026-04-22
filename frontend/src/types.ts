// Defining all the possible screens or pages my app can show so TypeScript catches any typos if I try to navigate to a screen that doesn't exist.
export type ViewState = 'home' | 'quiz' | 'chat' | 'analyse' | 'reviews' | 'profile' | 'routine';

// Setting up the blueprint for chat messages so I always know exactly what data exists when building the AI chat interface.
export interface Message {
  id: string; 
  role: 'user' | 'model'; //differentiating between my user's text and the AI's response so I can style their chat bubbles differently on the screen.
  text: string; // The actual written content of the message.
  timestamp: Date; // Keeping track of exactly when the message was sent to order the chat history properly.
}

// Creating the structure for cosmetic ingredients so the analysis page can cleanly display their specific safety ratings and functions.
export interface Ingredient {
  name: string; // The standard name of the ingredient.
  function: string; // What the ingredient actually does in a formula, like "Hydration" or "Exfoliation".
  safetyRating: 'Safe' | 'Caution' | 'Avoid'; //Forcing the safety rating to be one of these three exact words so my UI color-coding logic never breaks.
  description: string; // A longer, detailed explanation of the ingredient's benefits or potential risks.
}

// Laying out exactly what details every skincare product needs to have when I pull them from my database or external APIs.
export interface Product {
  id: string; 
  name: string; 
  brand: string; 
  price: number; 
  image: string; 
  ingredients: string[]; // A standard array holding the list of ingredient names inside the product.
  ethicalScore: number; // A custom numeric score I am using to rate how eco-friendly or ethical the brand is.
}

// Mirroring my Django backend's SkinProfile model here in the frontend so TypeScript knows exactly what user data to expect and save.
export interface SurveyResult {
  skin_type?: string; // The user's basic skin category, marked with a question mark (optional) because they might not have finished the survey yet.
  skin_color?: string; // The user's skin tone.
  sensitivity?: string; // How easily the user's skin reacts to strong products.
  country?: string; // Where the user lives so the AI can recommend locally available products rather than things they can't buy.
  concerns?: string[]; // A list of the user's specific skin issues, like acne or wrinkles.
  item_count?: string; // How many steps or products the user actually wants in their daily routine.
  recommended_routine?: string[]; // The final generated list of products the AI picks out for them to use.
}


