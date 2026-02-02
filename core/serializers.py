from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Post, Comment, CommentLike
from django.db.models import Count

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username')


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer with additional fields"""
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'date_joined')
        read_only_fields = ('id', 'date_joined')


class CommentSerializer(serializers.ModelSerializer):
    author = UserMinimalSerializer(read_only=True)
    children = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ('id', 'author', 'content', 'created_at', 'parent', 'children', 'post', 'like_count')
    
    def get_like_count(self, obj):
        return obj.likes.count()
    
    def get_children(self, obj):
        # Return empty list for children - they're handled by the tree building in views
        return []


class PostSerializer(serializers.ModelSerializer):
    author = UserMinimalSerializer(read_only=True)
    like_count = serializers.IntegerField(read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ('id', 'author', 'content', 'created_at', 'like_count', 'comment_count')
    
    def get_comment_count(self, obj):
        return obj.comments.count()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user