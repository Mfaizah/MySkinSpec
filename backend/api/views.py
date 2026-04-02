import os
import json
import requests as python_requests
from dotenv import load_dotenv
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import SkinProfile
from .serializers import SkinProfileSerializer
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken
import google.generativeai as genai

# Load the secret variables from your .env file
load_dotenv() 

# Safely get the API key
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY is missing from your .env file!")

# --- NEW: OPEN BEAUTY FACTS API TOOL ---
def search_beauty_product(product_type_or_name: str) -> str:
    """Searches the Open Beauty Facts database for skincare products and returns their ingredients."""
    # We use their JSON search API
    url = f"https://world.openbeautyfacts.org/cgi/search.pl?search_terms={product_type_or_name}&search_simple=1&action=process&json=1"
    
    try:
        #  to identify your app to their servers
        headers = {'User-Agent': 'MySkinSpec_UniProject/1.0'}
        response = python_requests.get(url, headers=headers)
        data = response.json()
        
        if data.get('products') and len(data['products']) > 0:
            # Grab the top 2 results to give the AI options
            results = []
            for i in range(min(2, len(data['products']))):
                prod = data['products'][i]
                name = prod.get('product_name', 'Unknown')
                brand = prod.get('brands', 'Unknown Brand')
                ingredients = prod.get('ingredients_text', 'No ingredients listed')
                results.append(f"Product: {name} by {brand}. Ingredients: {ingredients}")
            
            return "\n\n".join(results)
        else:
            return f"No products found matching '{product_type_or_name}'."
            
    except Exception as e:
        return f"Database search failed: {str(e)}"

# --- EXISTING AUTH & PROFILE VIEWS ---

class RegisterUserView(APIView):
    permission_classes = [AllowAny] # Anyone can register

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # create the user
        user = User.objects.create_user(username=username, password=password)
        # create an empty profile for them immediately
        SkinProfile.objects.create(user=user)
        
        return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        profile, _ = SkinProfile.objects.get_or_create(user=request.user)
        serializer = SkinProfileSerializer(profile)
        return Response(serializer.data)

    def post(self, request):
        profile, _ = SkinProfile.objects.get_or_create(user=request.user)
        serializer = SkinProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- NEW: GEMINI CHATBOT VIEW ---

class GeminiChatView(APIView):
    permission_classes = [AllowAny] 

    def post(self, request):
        chat_history = request.data.get('history', [])
        
        system_instruction = """
        You are MySkinSpec, a professional, empathetic, and highly knowledgeable AI skincare consultant.
        Your goal is to build a personalized skincare profile for the user through a natural conversation, and then generate a routine.
        
        CRITICAL RULES:
        1. You must ask exactly ONE question at a time. DO NOT give them the next question until they answer the current one.
        2. Always give them multiple-choice options to make it easy to answer.
        
        THE EXACT SEQUENCE YOU MUST FOLLOW:
        Step 1: Greet the user and ask: "What is your general skin type?" (Options: Oily, Dry, Combination, Normal).
        Step 2: Acknowledge their answer and ask: "What is your beautiful skin color/tone?" (Options: Fair, Medium, Olive, Deep, etc.).
        Step 3: Acknowledge and ask: "What are your primary skin concerns?" (Options: Acne, Aging, Redness, Texture, Dullness, Dark Spots).
        Step 4: Acknowledge and ask: "Do you experience any skin sensitivity?" (Options: None, Occasional Redness, Frequent Irritation).
        Step 5: Ask: "Thank you! I have everything I need. Are you ready for me to generate your personalized routine?"
        
        ROUTINE GENERATION (If they say Yes to Step 5):
        1. Use the `search_beauty_product` tool to look up real products (e.g., search "CeraVe cleanser" or "Salicylic Acid serum") from the Open Beauty Facts database.
        2. Generate a 4-step routine (Cleanser, Treatment, Moisturizer, SPF) specifically tailored to their answers, using the real products and ingredients you just found.
        3. You MUST include a secret data tag at the very end of this routine message exactly like this:
           [PROFILE_DATA: {"skin_type": "Oily", "skin_color": "Medium", "concerns": ["Acne"], "sensitivity": "Frequent Irritation"}]
           (Replace the values with their actual answers. Notice it is skin_type and skin_color).
           
        Step 6 (After the routine): 
        Ask: "Would you like to dive deeper into any of these products to see if their ingredients are safe for you on our Ingredient Analyser page?"
        
        PAGE REDIRECTION (If they say Yes to Step 6):
        Say "Excellent! Transferring you to the Analyser now..." and you MUST append this exact secret tag to the end of your message: [NAVIGATE_ANALYSER]
        """

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_instruction,
            tools=[search_beauty_product] # give geminitool
        )

        try:
            formatted_history = []
            for msg in chat_history:
                formatted_history.append({
                    "role": "model" if msg['role'] == "model" else "user",
                    "parts": [msg['text']]
                })

            # We turn ON automatic function calling!
            if len(formatted_history) > 1:
                chat = model.start_chat(
                    history=formatted_history[:-1],
                    enable_automatic_function_calling=True
                ) 
                response = chat.send_message(formatted_history[-1]["parts"][0]) 
            else:
                chat = model.start_chat(enable_automatic_function_calling=True)
                response = chat.send_message(formatted_history[0]["parts"][0])

            return Response({"reply": response.text})

        except Exception as e:
            # This prints the exact error in your Django terminal so we can see why it fails!
            print("GEMINI ERROR:", str(e)) 
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IngredientAnalyserView(APIView):
    permission_classes = [AllowAny] 

    def post(self, request):
        user_query = request.data.get('ingredients', '')
        profile = request.data.get('profile', {}) 

        if not user_query:
            return Response({"error": "No input provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Build a text summary of the user's profile if it exists
        profile_text = "Unknown/General User"
        if profile:
            profile_text = f"Skin Type: {profile.get('skin_type', 'Unknown')}, Sensitivity: {profile.get('sensitivity', 'Unknown')}, Concerns: {', '.join(profile.get('concerns', []))}"

        system_instruction = f"""
        You are a master dermatologist AI. The user will provide either a specific skincare product name, a single ingredient, or a full ingredient list.
        Your job is to analyze it based on the user's skin profile:
        USER PROFILE: {profile_text}
        
        Step 1: Identify what the user inputted (Product, Single Ingredient, or Ingredient List). If it's a commercial product name, use your internal knowledge to determine its key active and inactive ingredients.
        Step 2: Analyze how those specific ingredients interact with the user's specific skin profile.
        
        You MUST return your response as a valid JSON object using exactly this structure. 
        Do not add any extra text outside the JSON.
        {{
          "identified_input": "State what you analyzed (e.g., 'Product: CeraVe Cleanser' or 'Ingredient: Niacinamide')",
          "benefits": ["Benefit 1 based on profile", "Benefit 2"],
          "risks": ["Risk 1 based on profile", "Risk 2"],
          "verdict": "A 2-sentence summary of whether this is safe for their specific skin type.",
          "cheaper_alts": [{{"name": "Affordable Product Name", "reason": "Why it's a good cheaper alternative"}}],
          "eco_alts": [{{"name": "Eco-Friendly Product Name", "reason": "Why it's a good sustainable alternative"}}]
        }}
        """

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash", 
            system_instruction=system_instruction,
            generation_config={"response_mime_type": "application/json"}
        )       

        try:
            chat = model.start_chat()
            response = chat.send_message(f"Analyze this input: {user_query}")
            
            analysis_data = json.loads(response.text)
            
            return Response(analysis_data, status=status.HTTP_200_OK)

        except Exception as e:
            print("GEMINI ANALYSER ERROR:", str(e))
            return Response({"error": "Failed to analyze input."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # The React frontend will send us Google's token
        token = request.data.get('credential') 
        
        try:
            # Ask Google to verify if this token is real and meant for our app
            CLIENT_ID = "90331173295-8bdc26b1hius708d246sljrfe0ab96i8.apps.googleusercontent.com"
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)

            # extract the users data from Google response
            email = idinfo['email']
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            #look up the user in our database. If they don't exist, create them!
            user, created = User.objects.get_or_create(username=email, defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name
            })

            # Generate own MySkinSpec JWT tokens so they stay logged in
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'email': user.email,
                'name': user.first_name,
                'message': 'Successfully logged in with Google!'
            }, status=status.HTTP_200_OK)

        except ValueError:
            # If a hacker tries to send a fake token, Google's verifier will trigger this
            return Response({'error': 'Invalid Google Token'}, status=status.HTTP_400_BAD_REQUEST)