from django.db import transaction, IntegrityError, connection, models
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate

from .models import Post, Comment, PostLike, CommentLike
from .serializers import PostSerializer, CommentSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterAPIView(APIView):
    """User registration endpoint"""
    permission_classes = (AllowAny,)
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(APIView):
    """User login endpoint"""
    permission_classes = (AllowAny,)
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            })
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )


class CurrentUserAPIView(APIView):
    """Get current authenticated user"""
    permission_classes = (IsAuthenticated,)
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class PostListCreateAPIView(generics.ListCreateAPIView):
    queryset = Post.objects.all().select_related('author').prefetch_related('likes', 'comments')
    serializer_class = PostSerializer
    permission_classes = (AllowAny,)

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        serializer.save(author=self.request.user)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset().annotate(
            like_count=models.Count('likes', distinct=True)
        ).order_by('-created_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class PostDetailAPIView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, pk):
        post = generics.get_object_or_404(Post.objects.select_related('author'), pk=pk)
        # Fetch all comments for the post in one query and build tree in memory
        comments_qs = Comment.objects.filter(post=post).select_related('author').prefetch_related('likes').order_by('created_at')
        # build id -> node mapping
        nodes = {}
        for c in comments_qs:
            nodes[c.id] = {
                'id': c.id,
                'author': {'id': c.author.id, 'username': c.author.username},
                'content': c.content,
                'created_at': c.created_at.isoformat(),
                'parent': c.parent_id,
                'like_count': c.likes.count(),
                'children': []
            }
        root = []
        for nid, node in nodes.items():
            pid = node['parent']
            if pid:
                parent_node = nodes.get(pid)
                if parent_node is not None:
                    parent_node['children'].append(node)
            else:
                root.append(node)

        post_data = {
            'id': post.id,
            'author': {'id': post.author.id, 'username': post.author.username},
            'content': post.content,
            'created_at': post.created_at.isoformat(),
            'like_count': post.likes.count(),
            'comments': root,
        }
        return Response(post_data)


class PostLikeAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        post = generics.get_object_or_404(Post, pk=pk)

        try:
            with transaction.atomic():
                PostLike.objects.create(user=request.user, post=post)
        except IntegrityError:
            return Response({'detail': 'Already liked'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'liked'})


class CommentCreateAPIView(generics.CreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = (IsAuthenticated,)

    def perform_create(self, serializer):
        post_id = self.request.data.get('post')
        serializer.save(author=self.request.user, post_id=post_id)


class CommentLikeAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        comment = generics.get_object_or_404(Comment, pk=pk)

        try:
            with transaction.atomic():
                CommentLike.objects.create(user=request.user, comment=comment)
        except IntegrityError:
            return Response({'detail': 'Already liked'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'liked'})


class LeaderboardAPIView(APIView):
    """Return top 5 users by karma in last 24 hours. Uses raw SQL union aggregation to avoid ORM join multiplication issues."""
    permission_classes = (AllowAny,)
    
    def get(self, request):
        cutoff = timezone.now() - timedelta(days=1)
        with connection.cursor() as cursor:
            # union likes with weights, then aggregate per user
            cursor.execute(
                """
                SELECT u.id, u.username, COALESCE(SUM(t.weight),0) as karma
                FROM (
                  SELECT p.author_id as user_id, 5 as weight, pl.created_at as created_at
                  FROM core_post p JOIN core_postlike pl ON pl.post_id = p.id
                  UNION ALL
                  SELECT c.author_id as user_id, 1 as weight, cl.created_at as created_at
                  FROM core_comment c JOIN core_commentlike cl ON cl.comment_id = c.id
                ) t
                JOIN auth_user u ON u.id = t.user_id
                WHERE t.created_at >= %s
                GROUP BY u.id, u.username
                ORDER BY karma DESC
                LIMIT 5
                """,
                [cutoff]
            )
            rows = cursor.fetchall()
        result = [{'user_id': r[0], 'username': r[1], 'karma': int(r[2])} for r in rows]
        return Response(result)