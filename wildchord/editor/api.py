from dj_rest_auth.views import UserDetailsView
from django.shortcuts import get_object_or_404
from rest_framework import filters, permissions, serializers, viewsets
from rest_framework.decorators import permission_classes
from rest_framework.exceptions import NotAuthenticated
from rest_framework.response import Response

from .models import Record, User


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        # fields = ['url', 'id', 'username', 'records']
        fields = ['id', 'url', 'username']


class RecordSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Record
        fields = ['id', 'url', 'contents', 'author', 'title_line', 'second_line',
                  'create_timestamp', 'update_timestamp', 'is_public', 'can_edit']

    author = serializers.HyperlinkedRelatedField(
        view_name="user-detail", read_only=True)
    title_line = serializers.SerializerMethodField()
    second_line = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    def get_title_line(_, obj):
        return obj.title_line()

    def get_second_line(_, obj):
        return obj.second_line()

    def get_can_edit(self, obj):
        request = self.context.get('request')
        return obj.author == request.user

    def get_fields(self, *args, **kwargs):
        fields = super().get_fields(*args, **kwargs)
        request = self.context.get('request')
        if request is not None and request.method == "GET" and not request.parser_context.get('kwargs'):
            fields.pop('contents', None)
        return fields


@permission_classes([permissions.IsAuthenticated])
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer


class ProfileView(UserDetailsView):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    serializer_class = UserSerializer

    def retrieve(self, request, *args, **kwargs):
        request_user = request.user
        response = {'is_anonymous': request_user.is_anonymous}

        if not request_user.is_anonymous:
            user_instance = get_object_or_404(
                User.objects.all(), id=request_user.id)
            serializer = self.serializer_class(
                user_instance, context={'request': request})
            response = response | dict(serializer.data)

        return Response(response)


class IsAuthorOrPublicReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow authors of a record to edit it.
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
