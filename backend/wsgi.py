# backend/wsgi.py
from src.app import app, socketio

application = app

if __name__ == '__main__':
    socketio.run(application)