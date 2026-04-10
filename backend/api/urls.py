from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import UserProfileView, RegisterUserView, GeminiChatView, IngredientAnalyserView, GoogleLoginView

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'), 
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('chat/', GeminiChatView.as_view(), name='chat'),
    path('analyze/', IngredientAnalyserView.as_view(), name='analyze'),
    path('password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
]