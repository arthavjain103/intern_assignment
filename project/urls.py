from django.urls import re_path ,path, include

urlpatterns = [
    path('api/', include('core.urls')),
      
     
]
