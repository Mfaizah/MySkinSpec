from django.db import models
from django.contrib.auth.models import User

class SkinProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Matching React survey values exactly
    skin_type = models.CharField(max_length=50, default="Unknown") 
    sensitivity = models.CharField(max_length=50, default="Unknown")
    concerns = models.JSONField(default=list) # Stores the array of concerns

    def __str__(self):
        return f"{self.user.username}'s Profile"