from django.contrib.auth.models import AbstractUser
from django.db import models


# Create your models here.
class User(AbstractUser):
    pass


class Record(models.Model):
    author = models.ForeignKey(
        "User", on_delete=models.PROTECT, related_name="records")
    contents = models.TextField(max_length=10000, blank=True, null=True)
    create_timestamp = models.DateTimeField(auto_now_add=True)
    update_timestamp = models.DateTimeField(auto_now=True)

    @classmethod
    def nth_non_empty_line(self, ls, n):
        if ls is None or n <= 0:
            return None
        i = 0
        while i < n:
            if ls.strip() == '':
                return None
            l, ls = ls.split('\n', 1)
            if l.strip() != '':
                i += 1
        return l

    def save(self, *args, **kwargs):
        # Add new line to the end of the contents
        if self.contents == '' or self.contents[-1] != '\n':
            self.contents += '\n'
        return super().save(*args, **kwargs)

    def title_line(self):
        return "New Record" if (first := Record.nth_non_empty_line(self.contents, 1)) is None else first[:100]

    def second_line(self):
        return "No text" if (line := Record.nth_non_empty_line(self.contents, 2)) is None else line[:100]

    def __str__(self):
        return f'Record #{self.id}: {self.title_line()}'
