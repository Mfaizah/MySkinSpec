from django.db import models
from django.contrib.auth.models import User

class SkinProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    skin_type = models.CharField(max_length=50, default="Unknown") 
    skin_color = models.CharField(max_length=50, default="Unknown") 
    sensitivity = models.CharField(max_length=50, default="Unknown")
    country = models.CharField(max_length=100, default="Unknown") 
    item_count = models.CharField(max_length=50, default="Unknown") 
    concerns = models.JSONField(default=list) 
    
    # saving the AI's final product picks here
    recommended_routine = models.JSONField(default=list) 

    def __str__(self):
        return f"{self.user.username}'s Profile"