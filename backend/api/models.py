#Brings in Django's built-in database tools. 
#This gives you all the building blocks (like text fields, numbers, and relationships) needed to create database tables.
from django.db import models
#Imports Django's default User mode
#need this because you are going to link new SkinProfile directly to these existing user accounts
from django.contrib.auth.models import User

# This creates a new table in database called SkinProfile
# by putting models.Moodels in brackets its tell Django to 
    # treat this class like a database table, and give it all thats needed to save, delete, and search for data
class SkinProfile(models.Model):
    #This creates a strict, exclusive link. 
    #It means one User can only have exactly one Skin Profile, and one Skin Profile belongs to exactly one User
    #on_delete=models.CASCADE: This is a cleanup rule. It means if a user deletes their main account, 
    #their attached SkinProfile will "cascade" and automatically be deleted too
    #related_name='profile': This is a super handy shortcut. If  looking at a User in code,
    # i can just type user.profile to instantly grab all their skincare dat
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    #These lines create the standard "columns" in your database to hold basic text
    skin_type = models.CharField(max_length=50, default="Unknown") 
    skin_color = models.CharField(max_length=50, default="Unknown") 
    sensitivity = models.CharField(max_length=50, default="Unknown")
    country = models.CharField(max_length=100, default="Unknown") 
    item_count = models.CharField(max_length=50, default="Unknown") 
    #A JSONField is special. Instead of just holding a single word, it can hold complex data structures, like a list of multiple items
    concerns = models.JSONField(default=list) 
    
    # saving the AI's final product picks here
    recommended_routine = models.JSONField(default=list) 

    def __str__(self):
        #       # This line tells Django to look at the linked user, grab their username, and stick "'s Profile" at the end of it. So it wil; display "users name "profile
        return f"{self.user.username}'s Profile"