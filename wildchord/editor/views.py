from django.shortcuts import render


# Create your views here.
def index(request, record_id=None):
    return render(request, 'editor/editor.html')
