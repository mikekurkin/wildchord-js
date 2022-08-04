from rest_framework import serializers

from .models import Record, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['is_anonymous', 'id', 'username']


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
