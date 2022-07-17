from django.contrib import admin

from .models import Record, User


class RecordAdmin(admin.ModelAdmin):
    # Disable default behaviour of stripping contents in admin field
    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'contents':
            kwargs['strip'] = False
        return super().formfield_for_dbfield(db_field, request, **kwargs)


# Register your models here.
admin.site.register(User)
admin.site.register(Record, RecordAdmin)
