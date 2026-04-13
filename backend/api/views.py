# pulling in all the built-in python tools i need for the backend
import os
import json

# i rename the standard 'requests' library to 'python_requests' 
# so it doesn't get confused with django's internal 'request' object!
import requests as python_requests

# dotenv lets me hide my secret API keys in a .env file so they don't end up on github and get stolen
from dotenv import load_dotenv

# bringing in all the django rest framework tools to build my API endpoints
from rest_framework import status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated

# bringing in django's built-in user system and my custom skin profile model
from django.contrib.auth.models import User
from .models import SkinProfile
from .serializers import SkinProfileSerializer

# google authentication tools for the SSO login feature
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# JWT tools to generate secure login tokens, PLUS the tools i need to override the default login view
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

# the official google gemini AI library
import google.generativeai as genai

# tools for the password reset email feature
from django.dispatch import receiver
from django.urls import reverse
from django_rest_passwordreset.signals import reset_password_token_created
from django.core.mail import send_mail

# this executes the load, actually pulling the secret variables from my .env file into the code
load_dotenv() 

# --- AI SETUP ---
# grabbing my gemini key and configuring the AI. if i forget to add it to my .env, it prints a warning.
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY is missing from the .env file!")

# setting up safety filters to stop the AI from generating inappropriate content. 
# i set them to BLOCK_NONE here because skincare terms (like "acid" or "peel") can sometimes accidentally trigger the filters.
safe_config = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

# --- OPEN BEAUTY FACTS API TOOL ---
# this is a custom python function that i give to the AI so it can search a real cosmetics database!
def search_beauty_product(product_type_or_name: str) -> str:
    # building the search URL dynamically based on what the AI wants to look up
    url = f"https://world.openbeautyfacts.org/cgi/search.pl?search_terms={product_type_or_name}&search_simple=1&action=process&json=1"
    try:
        # setting a custom user agent is good practice so the API owners know who is pinging their server
        headers = {'User-Agent': 'MySkinSpec_UniProject/1.0'}
        response = python_requests.get(url, headers=headers)
        data = response.json()
        
        # if the database actually found products...
        if data.get('products') and len(data['products']) > 0:
            results = []
            # i loop through just the top 2 results so i don't overwhelm the AI's context memory limit
            for i in range(min(2, len(data['products']))):
                prod = data['products'][i]
                
                # safely pulling out the data using .get() so it doesn't crash if a specific field is missing
                name = prod.get('product_name', 'Unknown')
                brand = prod.get('brands', 'Unknown Brand')
                ingredients = prod.get('ingredients_text', 'No ingredients listed')
                image_url = prod.get('image_url', '') 
                
                # packaging it up into a clean string for the AI to read
                results.append(f"Product: {name} by {brand}. Image URL: {image_url}. Ingredients: {ingredients}")
            
            # joining the results together with line breaks
            return "\n\n".join(results)
        
        # if nothing was found, i tell the AI so it knows to try searching something else
        return f"No products found matching '{product_type_or_name}'."
    except Exception as e:
        # if the fetch totally crashes, i pass the error back safely
        return f"Database search failed: {str(e)}"

# --- GEMINI CHATBOT VIEW ---
class GeminiChatView(APIView):
    # anyone can use the chatbot, even if they aren't logged in yet (freemium model!)
    permission_classes = [AllowAny] 

    def post(self, request):
        # grab the chat history sent from the react frontend
        chat_history = request.data.get('history', [])
        
        # i try to grab their saved profile from the database if they are logged in!
        profile_string = "Profile provided in chat."
        if request.user.is_authenticated:
            try:
                # look up this specific user's skin profile
                profile = SkinProfile.objects.get(user=request.user)
                profile_data = {
                    "skin_type": profile.skin_type,
                    "sensitivity": profile.sensitivity,
                    "item_count": profile.item_count,
                    "concerns": profile.concerns
                }
                # turn it into a JSON string so i can inject it into the prompt
                profile_string = json.dumps(profile_data)
            except:
                pass # if they don't have one yet, just ignore it and use whatever react sent

        # --- THE ULTIMATE K-BEAUTY & SAFETY MEGA-PROMPT ---
        # this massive f-string is the "brain" of the AI. it forces gemini to follow strict medical rules.
        # notice i use double curly braces {{ }} for the JSON tags so python doesn't get confused by the f-string!
        system_instruction = f"""
        You are MySkinSpec, a professional AI skincare consultant.
        
        CRITICAL RULES YOU MUST FOLLOW EXACTLY:

        1. AM AND PM SPLIT: You must ALWAYS provide a Morning (AM) routine and an Evening (PM) routine.

        2. STRICT ITEM COUNT LOGIC:
        Look at the user's item count preference.
        - If "1-2 items (Minimalist)": AM MUST ONLY be Moisturiser and Sunscreen. PM MUST ONLY be Cleanser and Moisturiser.
        - If "3-4 items (Standard)": AM MUST be Toner/Serum, Moisturiser, Sunscreen. PM MUST be Toner/Serum, Moisturiser.
        - If "5+ items (Comprehensive)": You may include double cleansing, exfoliants, eye creams, etc.

        3. MEDICAL INGREDIENT SAFETY (NON-NEGOTIABLE):
        - SUNSCREEN: AM only. Never PM.
        - VITAMIN C: AM only. Never PM.
        - RETINOL/RETINOIDS: PM only. Never AM.
        - SENSITIVE SKIN WARNING: If the user's sensitivity is "Occasional Redness" or "Frequent Irritation" AND you suggest Retinol or exfoliants, append this exact warning: "(⚠️ Note: Since you have sensitive skin, only use this 1-2 times a week to avoid damaging your skin barrier!)"

        4. GLOBAL AVAILABILITY & K-BEAUTY:
        - Korean skincare (K-Beauty) is highly encouraged globally. Use your tool to find brands like COSRX or Beauty of Joseon.
        - Do not recommend exclusive local store brands outside the US.

        5. THE CHAT FLOW & FORMATTING:
        Step 1: Greet them, acknowledge their profile, and ask: "I've reviewed your profile! Are you ready to create your personalised routine?" -> append: [OPTIONS: Yes please!, Not right now]
        Step 2: When they say Yes, use the `search_beauty_product` tool to find real products.
        Step 3: Format images exactly like this: [IMAGE: url]
        Step 4: Format the routine items as "AM: Product Name" and "PM: Product Name".
        Step 5: At the very end of EVERY routine recommendation, output this exact JSON tag so the app can save it:
        [PROFILE_DATA: {{"recommended_routine": ["AM: Product 1", "PM: Product 2"]}}]
        Step 6: Ask: "Would you like to dive deeper into these on our Analyser page, or swap any products out?" -> append: [OPTIONS: Yes, analyse them!, Swap for K-Beauty]
        If they want the Analyser, append: [NAVIGATE_ANALYSER]

        USER'S SAVED DATABASE PROFILE: 
        {profile_string}
        """

        # setting up the actual gemini model with my rules, the search tool, and the safety config
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_instruction,
            tools=[search_beauty_product],
            safety_settings=safe_config 
        )

        try:
            # i have to reformat the react chat history to match exactly what gemini expects
            formatted_history = []
            for msg in chat_history:
                formatted_history.append({"role": "model" if msg['role'] == "model" else "user", "parts": [msg['text']]})

            # if there is existing history, i start the chat using all the previous messages except the very last one
            if len(formatted_history) > 1:
                chat = model.start_chat(history=formatted_history[:-1], enable_automatic_function_calling=True) 
                response = chat.send_message(formatted_history[-1]["parts"][0]) 
            else:
                # if it's the very first message, i just start a fresh chat
                chat = model.start_chat(enable_automatic_function_calling=True)
                response = chat.send_message(formatted_history[0]["parts"][0])

            reply_text = ""
            # safely extracting the text from the AI's response
            if response.parts:
                try:
                    reply_text = response.text
                except ValueError:
                    pass 
            
            # fallback: if the AI bugs out and sends nothing, i force the standard greeting
            if not reply_text.strip():
                reply_text = "I have reviewed your profile! Are you ready to create your personalised routine? [OPTIONS: Yes please!, Not right now]"

            # sending the text back to my react frontend!
            return Response({"reply": reply_text})

        except Exception as e:
            # if anything crashes, throw a clean 500 server error
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- CUSTOM EMAIL LOGIN SERIALIZER & VIEW ---
# django really, really wants us to use a 'username' to log in by default.
# to fix this and make it modern (email only), i built this custom serializer
# that tricks django into accepting an email instead!
class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # swapping out the required username field for an email field
        self.fields['email'] = serializers.EmailField()
        del self.fields['username']

    def validate(self, attrs):
        # behind the scenes, simplejwt still needs a 'username' key in the dictionary to work.
        # so, i just copy whatever they typed in the email box into the username slot. sneaky!
        attrs['username'] = attrs.get('email')
        return super().validate(attrs)

# this is the actual view that uses my sneaky custom serializer
class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


# --- USER REGISTRATION ---
class RegisterUserView(APIView):
    # anyone can hit the registration endpoint
    permission_classes = [AllowAny] 
    def post(self, request):
        # grabbing the email instead of username now!
        email = request.data.get('email') 
        password = request.data.get('password')
        
        # a quick sanity check to make sure they actually sent a valid email shape
        if not email or '@' not in email:
            return Response({"error": "A valid email address is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # checking if an account with this email already exists to prevent duplicate crashes
        if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
            return Response({"error": "An account with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
        # creating the core django user...
        # THE TRICK: i save their email into BOTH the username and email fields so django doesn't complain!
        user = User.objects.create_user(username=email, email=email, password=password)
        
        # instantly creating a blank SkinProfile linked to their new account
        SkinProfile.objects.create(user=user)
        
        return Response({"message": "Account created successfully!"}, status=status.HTTP_201_CREATED)

# --- USER PROFILE MANAGEMENT ---
class UserProfileView(APIView):
    # you MUST be logged in with a valid JWT token to use these endpoints!
    permission_classes = [IsAuthenticated] 
    
    def get(self, request):
        # find the profile for the person currently making the request
        profile, _ = SkinProfile.objects.get_or_create(user=request.user)
        # convert the database model into JSON data using my serializer
        serializer = SkinProfileSerializer(profile)
        return Response(serializer.data)
        
    def post(self, request):
        # find their profile
        profile, _ = SkinProfile.objects.get_or_create(user=request.user)
        # update it with the new data sent from React (partial=True means it's okay if not all fields are included)
        serializer = SkinProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save() # save to the database!
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- INGREDIENT ANALYSER VIEW ---
class IngredientAnalyserView(APIView):
    permission_classes = [AllowAny] 
    def post(self, request):
        # grab the text they pasted into the analyser box
        user_query = request.data.get('ingredients', '')
        # grab their profile data so the AI knows their skin type
        profile = request.data.get('profile', {}) 

        if not user_query:
            return Response({"error": "No input provided"}, status=status.HTTP_400_BAD_REQUEST)

        # unpacking the profile data into simple strings for the AI to read easily
        profile_text = f"Skin Type: {profile.get('skin_type', 'Unknown')}, Sensitivity: {profile.get('sensitivity', 'Unknown')}, Concerns: {', '.join(profile.get('concerns', []))}"
        routine_text = ", ".join(profile.get('recommended_routine', []))

        # another strict mega-prompt! this forces the AI to reply in a perfect JSON format
        # so my react frontend can map the data to the beautiful UI cards.
        system_instruction = f"""
        You are a master dermatologist AI. 
        USER PROFILE: {profile_text}
        USER'S CURRENT ROUTINE: {routine_text}
        
        The user is asking you to analyse: "{user_query}". 
        If they say "Analyse my routine" or "Find alternatives", you must analyse their CURRENT ROUTINE listed above.
        
        You MUST return your response as a valid JSON object using exactly this structure. 
        Do not add any extra text outside the JSON.
        {{
          "identified_input": "State what you analysed",
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
            # this is a super cool feature: forcing gemini's output to strictly be JSON!
            generation_config={"response_mime_type": "application/json"},
            safety_settings=safe_config 
        )       

        try:
            # start a fast, single-turn chat
            chat = model.start_chat()
            response = chat.send_message(f"Analyse this input: {user_query}")
            
            # parse the AI's response string back into a real python dictionary
            analysis_data = json.loads(response.text)
            
            # send the clean JSON right back to react!
            return Response(analysis_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Failed to analyse input."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- GOOGLE OAUTH LOGIN ---
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        # receive the secure credential token that the react frontend got from google
        token = request.data.get('credential') 
        try:
            # this is my public google client ID
            CLIENT_ID = "90331173295-8bdc26b1hius708d246sljrfe0ab96i8.apps.googleusercontent.com"
            
            # verifying the token against google's actual servers to ensure it wasn't faked
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)
            
            # if google says it's real, i pull their personal info out of the token
            email = idinfo['email']
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            # i check if a user with this email already exists. if not, i create a new account for them instantly!
            user, created = User.objects.get_or_create(username=email, defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name
            })

            # i generate my own secure django JWT tokens for them to use
            refresh = RefreshToken.for_user(user)
            
            # send the tokens and their name back to the react frontend
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'email': user.email,
                'name': user.first_name,
                'message': 'Successfully logged in with Google!'
            }, status=status.HTTP_200_OK)

        except ValueError:
            # if google rejects the token, throw an error
            return Response({'error': 'Invalid Google Token'}, status=status.HTTP_400_BAD_REQUEST)

# --- PASSWORD RESET EMAIL FEATURE ---
# this is a django signal receiver. it listens for when a user requests a password reset
@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    # building the URL that points back to my react frontend, including the secret reset token
    frontend_reset_url = f"http://localhost:5173/?reset_token={reset_password_token.key}"
    
    email_subject = "Reset Your MySkinSpec Password"
    email_body = f"Hello! \n\nYou requested a password reset for MySkinSpec. \n\nClick this link to create a new password: \n{frontend_reset_url} \n\nIf you did not request this, please ignore this email."
    
    # sending the actual email via django's built in mailer
    send_mail(email_subject, email_body, "noreply@myskinspec.com", [reset_password_token.user.email], fail_silently=False)
    #https://ai.google.dev/gemini-api/docs/text-generation
    #https://ai.google.dev/gemini-api/docs/function-calling?example=meeting
    #https://ai.google.dev/gemini-api/docs/structured-output?example=recipe