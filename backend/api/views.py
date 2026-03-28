import os
from dotenv import load_dotenv
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import SkinProfile
from .serializers import SkinProfileSerializer

# --- NEW: GEMINI AI IMPORTS & CONFIGURATION ---
import google.generativeai as genai

# Load the secret variables from your .env file
load_dotenv() 

# Safely get the API key
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY is missing from your .env file!")

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

        # THE UPDATED SYSTEM PROMPT WITH STRICT SKINFOCUS
        system_instruction = """
        You are MySkinSpec, a professional, empathetic, and highly knowledgeable AI skincare consultant.
        Your goal is to build a personalized skincare profile for the user by asking them questions, and to answer their skincare questions.
        
        CRITICAL RULES:
        1. THE GUARDRAIL: You are strictly a skincare consultant. If the user asks you about politics, coding, math, history, or anything completely unrelated to skincare, dermatology, or cosmetics, you MUST politely refuse to answer. Say something like: "I am a dedicated skincare consultant, so I can only answer questions related to skin health and products."
        2. Survey Mode: If you are building their profile, ask exactly ONE question at a time. Give multiple-choice options (A, B, C, D).
        3. You need to find out: 
           - skin_type (Oily, Dry, Combination, Normal)
           - concerns (Acne, Aging, Redness, Texture, Dullness, Dark Spots)
           - sensitivity (Low, Moderate, High)
        4. Once you have gathered all 3 pieces of information, thank them, summarize their profile, and recommend 3 products.
        
        DATA SAVING RULE:
        At the very end of your final recommendation message, include a hidden data tag exactly like this:
        [PROFILE_DATA: {"skin_type": "Oily", "concerns": ["Acne"], "sensitivity": "Low"}]
        """

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction
        )

        try:
            formatted_history = []
            for msg in chat_history:
                formatted_history.append({
                    "role": "model" if msg['role'] == "model" else "user",
                    "parts": [msg['text']]
                })

            if len(formatted_history) > 1:
                chat = model.start_chat(history=formatted_history[:-1]) 
                response = chat.send_message(formatted_history[-1]["parts"][0]) 
            else:
                chat = model.start_chat()
                response = chat.send_message(formatted_history[0]["parts"][0])

            return Response({"reply": response.text})

        except Exception as e:
            # This prints the exact error in your Django terminal so we can see why it fails!
            print("GEMINI ERROR:", str(e)) 
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)