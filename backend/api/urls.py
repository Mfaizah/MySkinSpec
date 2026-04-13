from django.urls import path, include
# Notice we imported EmailTokenObtainPairView here!
from .views import UserProfileView, RegisterUserView, GeminiChatView, IngredientAnalyserView, GoogleLoginView, EmailTokenObtainPairView

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', EmailTokenObtainPairView.as_view(), name='login'), 
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('chat/', GeminiChatView.as_view(), name='chat'),
    path('analyse/', IngredientAnalyserView.as_view(), name='analyse'),
    path('password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
]