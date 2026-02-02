from django.urls import re_path ,path, include
from django.views.generic import TemplateView
urlpatterns = [
    path('api/', include('core.urls')),
      re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
     
]
