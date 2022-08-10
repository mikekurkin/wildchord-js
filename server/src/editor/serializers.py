from typing import OrderedDict

from django.core.paginator import EmptyPage
from rest_framework import pagination, serializers
from rest_framework.response import Response

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


class NumberBasedPagination(pagination.PageNumberPagination):
    def get_paginated_response(self, data):
        data: OrderedDict = super().get_paginated_response(data).data
        prev_page = None
        next_page = None

        try:
            prev_page = self.page.previous_page_number()
        except EmptyPage:
            pass

        try:
            next_page = self.page.next_page_number()
            print(self.page)
        except EmptyPage:
            pass

        data.update({
            'previous': prev_page,
            'next': next_page,
        })

        print(data)

        return Response(data)
