from .SQLMethod import SQLMethod
from .. import database
from ..config import config


def authenticate(username, password):
    if config["ADMIN"]["username"] == username and config["ADMIN"]["password"] == password:
        return 0, "Admin"
    else:
        if SQLMethod.checkPassword(username, password):
            return SQLMethod.getUser(username)
    return None


def passwordHash(password: str, salt: str = None):
    import hashlib
    import os
    _salt = salt if salt else os.urandom(16)
    _hash = hashlib.pbkdf2_hmac('sha256', password.encode(), _salt, 1)
    return _hash if salt else (_hash, _salt)


def createUser(username: str, password: str):
    if username == config["ADMIN"].get("username", "admin"):
        return False

    _hash, salt = passwordHash(password)
    return SQLMethod.createUser(username, _hash, salt)


def changePassword(user: id, password: str):
    _hash, salt = passwordHash(password)
    return SQLMethod.changeHashSalt(user, _hash, salt)


database.conn.create_function("cHash", 2, passwordHash)
