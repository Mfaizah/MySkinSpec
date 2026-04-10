from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import SkinProfile

# This allows the SkinProfile to show up INSIDE the standard User page
class SkinProfileInline(admin.StackedInline):
    model = SkinProfile
    can_delete = False
    verbose_name_plural = 'Skin Profile Data'

# Define a new User admin
class UserAdmin(BaseUserAdmin):
    inlines = (SkinProfileInline,)
    # This explicitly shows the email column in the admin list
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

# Also register SkinProfile as its own standalone page so you can bulk-delete survey results
@admin.register(SkinProfile)
class SkinProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'skin_type', 'sensitivity')
    search_fields = ('user__username', 'user__email', 'skin_type')
