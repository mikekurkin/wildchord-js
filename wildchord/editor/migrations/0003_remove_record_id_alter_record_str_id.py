# Generated by Django 4.0.6 on 2022-07-17 16:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('editor', '0002_record_str_id'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='record',
            name='id',
        ),
        migrations.AlterField(
            model_name='record',
            name='str_id',
            field=models.CharField(blank=True, editable=False, max_length=8, primary_key=True, serialize=False, unique=True),
        ),
    ]