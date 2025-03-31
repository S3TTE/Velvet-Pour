# backend/run.py
from dotenv import load_dotenv
load_dotenv()

from src.app import app
from src.websocket import socketio

if __name__ == '__main__':
    # Use socketio.run instead of app.run for proper WebSocket initialization
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)