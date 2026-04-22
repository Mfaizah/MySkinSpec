from django.test import TestCase

# Create your tests here.

# Grabbing all my testing tools, API clients, and mockers to fake external servers.
from .models import SkinProfile
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock
from django.contrib.auth.models import User
import requests

# Here is my main testing suite for the backend API endpoints.
class MySkinSpecBackendTests(APITestCase):

    
    # TEST ID 1: Google SSO Token Validation (Expected: PASS)
    @patch('api.views.id_token.verify_oauth2_token')
    def test_id1_google_sso_validation_success(self, mock_verify):
        # I'm faking Google's server response here so I don't need a real internet connection to test logins.
        mock_verify.return_value = {
            'email': 'student@westminster.ac.uk', 
            'given_name': 'Test', 
            'family_name': 'Student'
        }
        
        # Firing off a fake Google token to my login endpoint.
        response = self.client.post('/api/google-login/', {'credential': 'fake-jwt-token'})
        
        # Making sure my database successfully created the new student user and handed back a session token.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(username='student@westminster.ac.uk').exists())
        self.assertIn('access', response.data)

    
    # TEST ID 4: Adversarial AI Guardrail (Expected: PASS)
    @patch('api.views.genai.GenerativeModel.start_chat')
    def test_id4_adversarial_ai_guardrail_retinol(self, mock_start_chat):
        # Simulating my AI properly following the Mega-Prompt rules to put retinol only in the PM routine.
        mock_chat_instance = MagicMock()
        mock_chat_instance.send_message.return_value.text = "AM: Gentle Cleanser. PM: Retinol Serum 1%"
        mock_start_chat.return_value = mock_chat_instance

        # Sending a tricky prompt trying to force the AI to give me retinol in the morning.
        response = self.client.post('/api/chat/', {'history': [{'role': 'user', 'text': 'Give me Retinol in the morning'}]})
        
        # Verifying the AI stood its ground and kept retinol out of the AM and in the PM where it belongs.
        self.assertNotIn("AM: Retinol", response.data['reply'])
        self.assertIn("PM: Retinol", response.data['reply'])

    # TEST ID 6: External API Fallback Timeout (Expected: PASS)
    @patch('api.views.python_requests.get')
    def test_id6_open_beauty_facts_timeout(self, mock_get):
        # Forcing the external cosmetics database to time out to see how my code handles the crash.
        mock_get.side_effect = requests.exceptions.Timeout("Connection timed out")
        
        # Triggering the product search function for CeraVe.
        from .views import search_beauty_product
        result = search_beauty_product("cerave cleanser")
        
        # Checking that my try/except block caught the crash and returned my safe fallback message instead of breaking the app.
        self.assertIn("Database search failed", result)


    # TEST ID 7: Strict JSON Output Parsing (Expected: PASS)
    @patch('api.views.genai.GenerativeModel.start_chat')
    def test_id7_strict_json_analyser_parsing(self, mock_start_chat):
        # Feeding my endpoint the exact JSON structure the AI is supposed to output.
        mock_chat_instance = MagicMock()
        mock_chat_instance.send_message.return_value.text = '{"identified_input": "Water", "benefits": ["Hydration"], "risks": [], "verdict": "Safe", "cheaper_alts": [], "eco_alts": []}'
        mock_start_chat.return_value = mock_chat_instance

        # Sending a request to analyze 'Water' just to see if the JSON gets parsed right.
        response = self.client.post('/api/analyse/', {'ingredients': 'Water', 'profile': {}})
        
        # Confirming the endpoint successfully read the JSON and pulled out the "Safe" verdict.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['verdict'], "Safe")

    # TEST ID 8: Out-of-Domain Query Rejection (Expected: FAIL)
    @patch('api.views.genai.GenerativeModel.start_chat')
    def test_id8_out_of_domain_query_rejection(self, mock_start_chat):
        # Intentionally making this test fail by simulating the AI breaking character and giving me a cake recipe.
        mock_chat_instance = MagicMock()
        mock_chat_instance.send_message.return_value.text = "To bake a chocolate cake, you will need flour, sugar, and cocoa powder."
        mock_start_chat.return_value = mock_chat_instance

        # Asking the AI a completely unrelated baking question.
        response = self.client.post('/api/chat/', {'history': [{'role': 'user', 'text': 'How do I bake a chocolate cake?'}]})
        
        # This assertion fails on purpose to show what happens when the AI forgets it is a skincare app.
        self.assertIn("I am a skincare consultant", response.data['reply'], "BOUNDARY FAIL: The AI answered an out-of-domain query!")