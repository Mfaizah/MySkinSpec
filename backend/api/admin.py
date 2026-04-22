from django.contrib import admin #Django's built-in administrator panel tools.customise how things look in backend
from django.contrib.auth.models import User#Django's default User model. database table where Django stores standard account info (usernames, passwords, emails)
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin #Imports the default layout for how the User model looks in the admin pane
from .models import SkinProfile #imports skinprofile form model.py

# This allows the SkinProfile to show up INSIDE the standard User page
#Creates a new layout instruction for the admin panel. 
#StackedInline means the fields for the skin profile will appear in a stack at the bottom of the User's edit page
class SkinProfileInline(admin.StackedInline):
    #Tells this inline that it is specifically supposed to display the SkinProfile data.
    model = SkinProfile 
    #Removes the little red "delete" checkbox next to the skin profile on the User page
    #stops me from accidently deleting
    can_delete = False
    #makes the name skin profile data instead of deafault
    verbose_name_plural = 'Skin Profile Data'

# Define a new User admin
# Creates your custom version of the User admin panel. 
# Because we put (BaseUserAdmin) in brakcet
#, it inherits all the standard features of the default Django layout—we are just going to add a few tweaks.
class UserAdmin(BaseUserAdmin):
    #Tells the User page to inject our SkinProfileInline at the bottom
    #tuple/list since it is comma
    inlines = (SkinProfileInline,)
    #when you click users in the admin panel you see the accounts. 
    #dictates which columns show up in summary table
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')

# Re-register UserAdmin
#Removes the default standard Django User admin page
admin.site.unregister(User)
# Re-registers the User model, but this time pairs it with custom UserAdmin class #
#(the one with the SkinProfile attached to it)
admin.site.register(User, UserAdmin)

# Also register SkinProfile as its own standalone page so  can bulk-delete survey results
#b This is the decorator. its a shortcut of telling django egister the class immediately below this line into the admin dashboard
@admin.register(SkinProfile)
# Creates the rules for how the standalone SkinProfile page will look and act
class SkinProfileAdmin(admin.ModelAdmin):
    #Just like with the Users, this sets up the columns i see when viewing the master list of all skin profiles
    list_display = ('user', 'skin_type', 'sensitivity')
    #Adds a search bar to the top of the Skin Profiles page.
    #dobles unserscores bc username and email do not live in skinprofile
    #they live in the user model and __ acts as a bridge
    search_fields = ('user__username', 'user__email', 'skin_type')
