from dj_rest_auth.views import UserDetailsView
from django.shortcuts import get_object_or_404
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import permission_classes
from rest_framework.exceptions import NotAuthenticated
from rest_framework.response import Response

from .models import Record, User
from .serializers import RecordSerializer, UserSerializer


@permission_classes([permissions.IsAuthenticated])
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer


class ApiUserDetailsView(UserDetailsView):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)


class IsAuthorOrPublicReadOnly(permissions.BasePermission):
    """Object-level permission to only allow authors of a record to edit it.
    Assumes the model instance has an `author` attribute.
    Record can be displayed to everyone if it is set to public.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS and obj.is_public:
            return True

        return request.user == obj.author


@permission_classes([IsAuthorOrPublicReadOnly])
class RecordViewSet(viewsets.ModelViewSet):
    queryset = Record.objects.all().order_by('-update_timestamp')
    filter_backends = [filters.SearchFilter]
    search_fields = ['contents']
    serializer_class = RecordSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            raise NotAuthenticated
        return super().get_queryset().filter(author=user)

    def retrieve(self, request, pk=None, *args, **kwargs):
        queryset = Record.objects.all()
        record = get_object_or_404(queryset, id=pk)
        self.check_object_permissions(self.request, record)
        serializer = RecordSerializer(record, context={'request': request})
        return Response(serializer.data)
