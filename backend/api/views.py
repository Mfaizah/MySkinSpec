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
from django.dispatch import receiver
from django.urls import reverse
from django_rest_passwordreset.signals import reset_password_token_created
from django.core.mail import send_mail

# Load environment variables so I don't accidentally push my private API keys to GitHub!
load_dotenv() 

# Configure the Gemini API using the secret key from the .env file
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY is missing from the .env file!")

# --- SAFETY SETTINGS OVERRIDE ---
# Google's API sometimes blocks medical terms. I added this to prevent the AI 
# from crashing when a user says they have "Acne" or "Redness".
safe_config = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

# --- OPEN BEAUTY FACTS API TOOL ---
# This function acts as a tool for the AI. It searches a free, open-source database
# to find real skincare products based on the user's country and needs.
def search_beauty_product(product_type_or_name: str) -> str:
    # Formatting the URL to query the Open Beauty Facts API
    url = f"https://world.openbeautyfacts.org/cgi/search.pl?search_terms={product_type_or_name}&search_simple=1&action=process&json=1"
    try:
        # Added a custom User-Agent as good practice for uni projects making API calls
        headers = {'User-Agent': 'MySkinSpec_UniProject/1.0'}
        response = python_requests.get(url, headers=headers)
        data = response.json()
        
        # If products are found, extract the first two to send back to the AI
        if data.get('products') and len(data['products']) > 0:
            results = []
            for i in range(min(2, len(data['products']))):
                prod = data['products'][i]
                name = prod.get('product_name', 'Unknown')
                brand = prod.get('brands', 'Unknown Brand')
                ingredients = prod.get('ingredients_text', 'No ingredients listed')
                image_url = prod.get('image_url', '') # Grabbing the image URL to display in the React frontend
                
                # Format the data so Gemini can easily read it and construct a routine
                results.append(f"Product: {name} by {brand}. Image URL: {image_url}. Ingredients: {ingredients}")
            
            return "\n\n".join(results)
        return f"No products found matching '{product_type_or_name}'."
    except Exception as e:
        return f"Database search failed: {str(e)}"

# --- GEMINI CHATBOT VIEW ---
# This endpoint handles the main AI consultant chat. 
# It takes the profile data sent by the React frontend and generates a tailored routine.
class GeminiChatView(APIView):
    permission_classes = [AllowAny] # Allow non-logged in users to test the chat

    def post(self, request):
        # Extract the conversation history sent from the React frontend
        chat_history = request.data.get('history', [])
        
        # This is the "System Prompt" - it dictates exactly how the AI should behave.
        # I updated this to skip asking questions, as the user now completes a UI survey first.
        system_instruction = """
        You are MySkinSpec, a professional AI skincare consultant.
        The user has already completed their profile survey. They will provide their profile in their first message.
        
        YOUR MISSION:
        1. Instantly generate a personalised skincare routine based on their specific profile.
        2. Keep in mind their 'item_count' limit (e.g., if they want 1-2 items, only give them a cleanser and moisturiser).
        3. Use the `search_beauty_product` tool to find real products. Try to find products available in their 'country'.
        4. When you recommend a product, format images exactly like this: [IMAGE: url] so the frontend can render them.
        
        At the very end of your routine, ask:
        "Would you like to dive deeper into these ingredients on our Analyser page? [OPTIONS: Yes, take me there!, No thanks]"
        
        If they say Yes to navigating, append this secret tag: [NAVIGATE_ANALYSER]
        """

        # Initialize the Gemini 2.5 Flash model with my instructions, tools, and safety overrides
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_instruction,
            tools=[search_beauty_product],
            safety_settings=safe_config 
        )

        try:
            # Reformat the React chat history into the specific format Gemini requires
            formatted_history = []
            for msg in chat_history:
                formatted_history.append({"role": "model" if msg['role'] == "model" else "user", "parts": [msg['text']]})

            # Start the chat. If there is history, pass it in so the AI remembers the context.
            if len(formatted_history) > 1:
                chat = model.start_chat(history=formatted_history[:-1], enable_automatic_function_calling=True) 
                response = chat.send_message(formatted_history[-1]["parts"][0]) 
            else:
                chat = model.start_chat(enable_automatic_function_calling=True)
                response = chat.send_message(formatted_history[0]["parts"][0])

            # --- UNBREAKABLE FAILSAFE ---
            # The Gemini API sometimes glitches and returns an empty message when using tools.
            # This try/except block catches that error so the Django server doesn't crash.
            reply_text = ""
            if response.parts:
                try:
                    reply_text = response.text
                except ValueError:
                    pass # Caught the empty response glitch
            
            # If the AI panicked and returned nothing, provide a hardcoded backup response
            if not reply_text.strip():
                print("GEMINI GLITCH CAUGHT. Executing manual fallback response.")
                reply_text = "Here is your routine! Would you like to analyse these products? [OPTIONS: Yes, take me there!, No thanks]"

            # Send the AI's response back to the React frontend
            return Response({"reply": reply_text})

        except Exception as e:
            print("GEMINI ERROR:", str(e))
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- USER REGISTRATION ---
# Handles the creation of new user accounts in the SQLite database
class RegisterUserView(APIView):
    permission_classes = [AllowAny] 

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        # Check if user already exists to prevent duplication errors
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # Create the core Django User object
        user = User.objects.create_user(username=username, password=password)
        # Immediately create a linked SkinProfile object to store their survey data later
        SkinProfile.objects.create(user=user)
        
        return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)

# --- USER PROFILE MANAGEMENT ---
# Allows logged-in users to retrieve (GET) or update (POST) their Skin Profile data
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated] # Security: Only logged-in users can access this

    def get(self, request):
        # Fetch the profile linked to the JWT token making the request
        profile, _ = SkinProfile.objects.get_or_create(user=request.user)
        serializer = SkinProfileSerializer(profile)
        return Response(serializer.data)

    def post(self, request):
        # Update the profile with new survey data sent from the React frontend
        profile, _ = SkinProfile.objects.get_or_create(user=request.user)
        serializer = SkinProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- INGREDIENT ANALYSER VIEW ---
# A separate AI endpoint strictly for analysing product ingredients against a user's profile
class IngredientAnalyserView(APIView):
    permission_classes = [AllowAny] 

    def post(self, request):
        user_query = request.data.get('ingredients', '')
        profile = request.data.get('profile', {}) 

        if not user_query:
            return Response({"error": "No input provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Format the user's saved profile into a string the AI can read
        profile_text = "Unknown/General User"
        if profile:
            profile_text = f"Skin Type: {profile.get('skin_type', 'Unknown')}, Sensitivity: {profile.get('sensitivity', 'Unknown')}, Concerns: {', '.join(profile.get('concerns', []))}"

        # Strict instructions forcing the AI to return a structured JSON response
        system_instruction = f"""
        You are a master dermatologist AI. 
        Your job is to analyse the following input based on the user's skin profile:
        USER PROFILE: {profile_text}
        
        You MUST return your response as a valid JSON object using exactly this structure. 
        Do not add any extra text outside the JSON.
        {{
          "identified_input": "State what you analysed (e.g., 'Product: CeraVe Cleanser')",
          "benefits": ["Benefit 1 based on profile", "Benefit 2"],
          "risks": ["Risk 1 based on profile", "Risk 2"],
          "verdict": "A 2-sentence summary of whether this is safe for their specific skin type.",
          "cheaper_alts": [{{"name": "Affordable Product Name", "reason": "Why it's a good cheaper alternative"}}],
          "eco_alts": [{{"name": "Eco-Friendly Product Name", "reason": "Why it's a good sustainable alternative"}}]
        }}
        """

        # Setting response_mime_type to application/json guarantees the output won't break the React UI
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash", 
            system_instruction=system_instruction,
            generation_config={"response_mime_type": "application/json"},
            safety_settings=safe_config 
        )       

        try:
            chat = model.start_chat()
            response = chat.send_message(f"Analyse this input: {user_query}")
            
            # Parse the AI's string response into a Python dictionary, then send as JSON
            analysis_data = json.loads(response.text)
            return Response(analysis_data, status=status.HTTP_200_OK)

        except Exception as e:
            print("GEMINI ANALYSER ERROR:", str(e))
            return Response({"error": "Failed to analyse input."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- GOOGLE OAUTH LOGIN ---
# Verifies Google tokens securely on the backend so users don't have to make a new password
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('credential') 
        try:
            # Verify the token against Google's official servers to prevent spoofing
            CLIENT_ID = "90331173295-8bdc26b1hius708d246sljrfe0ab96i8.apps.googleusercontent.com"
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)

            # Extract the user's verified details
            email = idinfo['email']
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            # Create an account for them if it's their first time logging in
            user, created = User.objects.get_or_create(username=email, defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name
            })

            # Generate local JWT tokens so Django remembers they are logged in
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'email': user.email,
                'name': user.first_name,
                'message': 'Successfully logged in with Google!'
            }, status=status.HTTP_200_OK)

        except ValueError:
            return Response({'error': 'Invalid Google Token'}, status=status.HTTP_400_BAD_REQUEST)

# --- PASSWORD RESET EMAIL HANDLER ---
# Listens for a password reset request and fires off an email with a unique recovery link
@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    # Construct the URL pointing back to the React frontend with the secure token
    frontend_reset_url = f"http://localhost:5173/?reset_token={reset_password_token.key}"
    
    email_subject = "Reset Your MySkinSpec Password"
    email_body = f"Hello! \n\nYou requested a password reset for MySkinSpec. \n\nClick this link to create a new password: \n{frontend_reset_url} \n\nIf you did not request this, please ignore this email."

    # Sends the email using Django's core mail system (currently routes to the console for dev testing)
    send_mail(
        email_subject,
        email_body,
        "noreply@myskinspec.com",
        [reset_password_token.user.email],
        fail_silently=False,
    )