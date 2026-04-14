
export type ViewState = 'home' | 'quiz' | 'chat' | 'analyse' | 'reviews' | 'profile' | 'routine';



export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Ingredient {
  name: string;
  function: string;
  safetyRating: 'Safe' | 'Caution' | 'Avoid';
  description: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  ingredients: string[];
  ethicalScore: number;
}


export interface SurveyResult {
  skin_type?: string;
  skin_color?: string;
  sensitivity?: string;
  country?: string;
  concerns?: string[];
  item_count?: string; 
  recommended_routine?: string[]; 
}


