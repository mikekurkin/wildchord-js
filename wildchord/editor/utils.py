from base64 import urlsafe_b64encode
from hashlib import shake_256
from uuid import uuid4


def shorthash():
    return urlsafe_b64encode(shake_256(uuid4().bytes).digest(6)).zfill(8)[:8].decode('utf-8')
