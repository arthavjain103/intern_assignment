from django.urls import path, include

urlpatterns = [
    path('api/', include('core.urls')),
      path('', RedirectView.as_view(url='/api/', permanent=False)),
]
