from rest_framework import serializers
from .models import SkinProfile

class SkinProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkinProfile
        fields = ['skin_type', 'sensitivity', 'concerns']