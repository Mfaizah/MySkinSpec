from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import UserProfileView, RegisterUserView, GeminiChatView

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'), 
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('chat/', GeminiChatView.as_view(), name='chat'),
]