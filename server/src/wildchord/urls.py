"""wildchord URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from editor import api
from rest_framework import routers

router = routers.DefaultRouter(trailing_slash=False)
router.register(r'users', api.UserViewSet)
router.register(r'records', api.RecordViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/user/', api.ApiUserDetailsView.as_view()),
    path('api/auth/register/', include('dj_rest_auth.registration.urls')),
    path('admin/', admin.site.urls),
]
