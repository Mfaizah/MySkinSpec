# MySkinSpec

**MySkinSpec** is an AI-powered, full-stack skincare consultant designed to combat beauty industry misinformation. By combining Large Language Models with real-time cosmetic databases, it provides objective, science-backed, and highly personalized skincare routines based on clinical ingredient compatibility.

##  Key Features

* **AI Consultant with "Tool-Use":** Powered by Google Gemini 2.5 Flash. The AI uses function calling to query the live **Open Beauty Facts API**, 
* **Intelligent Ingredient Analyser:** Uses Natural Language Processing (NLP) to parse unstructured user input and output strict JSON verdicts highlighting medical risks, benefits, and eco-friendly alternatives.
* **Dynamic Skin Quiz:** A gamified onboarding flow using React state management to build a comprehensive biological profile without cognitive overload.
* **Secure Authentication Pipeline:** Custom Email-only JSON Web Tokens (JWT) and stateless Google OAuth 2.0 integration.
* **Asynchronous State Polling:** Real-time DOM updates via `setInterval` hooks connecting local browser cache to backend data generation.

## Technology Stack

**Frontend (Presentation Layer)**
* React.js & TypeScript (Single Page Application)
* Tailwind CSS (Glassmorphism UI Design)
* Vite 

**Backend (Application Logic Layer)**
* Python 3 & Django REST Framework (DRF)
* SimpleJWT & Google Auth Transport
* Google Generative AI SDK (`google-generativeai`)

**Data & External APIs**
* Local: SQLite | Production: PostgreSQL (Render)
* Google Gemini 2.5 Flash API
* Open Beauty Facts API

## ⚙️ Getting Started

Follow these steps to run the application locally.

### 1. Clone the repository
```bash
git clone [https://github.com/yourusername/myskinspec.git](https://github.com/yourusername/myskinspec.git)
cd myskinspec
