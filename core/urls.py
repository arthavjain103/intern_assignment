from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Authentication
    path('auth/register/', views.RegisterAPIView.as_view(), name='register'),
    path('auth/login/', views.LoginAPIView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', views.CurrentUserAPIView.as_view(), name='current-user'),
    
    # Posts
    path('posts/', views.PostListCreateAPIView.as_view(), name='post-list'),
    path('posts/<int:pk>/', views.PostDetailAPIView.as_view(), name='post-detail'),
    path('posts/<int:pk>/like/', views.PostLikeAPIView.as_view(), name='post-like'),
    
    # Comments
    path('comments/create/', views.CommentCreateAPIView.as_view(), name='comment-create'),
    path('comments/<int:pk>/like/', views.CommentLikeAPIView.as_view(), name='comment-like'),
    
    # Leaderboard
    path('leaderboard/', views.LeaderboardAPIView.as_view(), name='leaderboard'),
]