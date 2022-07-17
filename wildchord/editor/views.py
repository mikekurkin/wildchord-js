from django.http import HttpResponse
from django.shortcuts import render


# Create your views here.
def index(request):
    return render(request, 'editor/editor.html')
    # return HttpResponse("hello world")
