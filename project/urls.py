
from django.urls import path, include, re_path
from core import views as core_views

urlpatterns = [
    path('api/', include('core.urls')),
    path('', core_views.index, name='index'),
    re_path(r'^.*$', core_views.index),
]