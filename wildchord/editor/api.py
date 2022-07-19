from rest_framework import filters, permissions, serializers, viewsets

from .models import Record, User


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['url', 'username', 'records']


class RecordSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Record
        fields = ['id', 'url', 'contents', 'author', 'title_line', 'second_line',
                  'create_timestamp', 'update_timestamp']
        title_line = serializers.SerializerMethodField(
            lambda obj: obj.title_line())
        second_line = serializers.SerializerMethodField(
            lambda obj: obj.second_line())

    author = serializers.PrimaryKeyRelatedField(
        read_only=True,
        default=serializers.CurrentUserDefault()
    )

    def get_fields(self, *args, **kwargs):
        fields = super().get_fields(*args, **kwargs)
        request = self.context.get('request')
        if request is not None and request.method == "GET" and not request.parser_context.get('kwargs'):
            fields.pop('contents', None)
        return fields


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class RecordViewSet(viewsets.ModelViewSet):
    queryset = Record.objects.all().order_by('-update_timestamp')
    filter_backends = [filters.SearchFilter]
    search_fields = ['contents']
    serializer_class = RecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return super().get_queryset().filter(author=user)
