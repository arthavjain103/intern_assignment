from django.urls import re_path ,path, include

urlpatterns = [
    path('api/', include('core.urls')),
      re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
     
]
