import json
import time
import logging
from flask import Flask
from flask_socketio import SocketIO, emit
import threading
import eventlet

# Ensure monkey patching is done
eventlet.monkey_patch()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logging.getLogger('engineio').setLevel(logging.DEBUG)
logging.getLogger('socketio').setLevel(logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize SocketIO
socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

# Machine status tracker
machine_status = {
    "status": "available",  # available, busy
    "current_operation": None,
    "start_time": None,
    "connected_clients": 0
}

def init_websocket(app):
    """Initialize the WebSocket with the Flask app"""
    socketio.init_app(app)
    logger.info("WebSocket initialized")
    return socketio

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    machine_status['connected_clients'] += 1
    logger.info(f"Client connected. Total clients: {machine_status['connected_clients']}")
    
    # Send current status to the newly connected client
    emit('status_update', machine_status)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    machine_status['connected_clients'] -= 1
    logger.info(f"Client disconnected. Total clients: {machine_status['connected_clients']}")

@socketio.on('message')
def handle_message(message):
    """Handle generic messages from client"""
    logger.info(f"Received message: {message}")
    emit('message', {'response': f'Server received: {message}'})

@socketio.on('ping_server')
def handle_ping(data):
    """Handle ping from client"""
    logger.info(f"Ping received: {data}")
    emit('pong_client', {'time': time.time(), 'received': data})

def notify_operation_started(operation_name):
    """Notify all clients that an operation has started"""
    machine_status['status'] = 'busy'
    machine_status['current_operation'] = operation_name
    machine_status['start_time'] = time.time()
    
    logger.info(f"Operation started: {operation_name}")
    data = {
        'status': 'busy',
        'operation': operation_name,
        'message': f"Machine is busy preparing: {operation_name}"
    }
    
    try:
        # Use a direct emit to all clients
        socketio.emit('operation_started', data, namespace='/')
        logger.info(f"Operation started notification emitted for: {operation_name}")
    except Exception as e:
        logger.error(f"Error emitting operation started: {e}")

def notify_operation_completed(operation_name):
    """Notify all clients that an operation has completed"""
    machine_status['status'] = 'available'
    machine_status['current_operation'] = None
    machine_status['start_time'] = None
    
    logger.info(f"Operation completed: {operation_name}")
    data = {
        'status': 'available',
        'operation': operation_name,
        'message': f"Machine has finished preparing: {operation_name}"
    }
    
    # Use eventlet to schedule the emit in the main thread
    def emit_completion():
        try:
            socketio.emit('operation_completed', data, namespace='/')
            logger.info(f"Operation completed notification emitted for: {operation_name}")
        except Exception as e:
            logger.error(f"Error emitting operation completed: {e}")
    
    # Schedule the emit in the main eventlet thread
    eventlet.spawn(emit_completion)

def notify_operation_failed(operation_name, error_message):
    """Notify all clients that an operation has failed"""
    machine_status['status'] = 'available'
    machine_status['current_operation'] = None
    machine_status['start_time'] = None
    
    logger.info(f"Operation failed: {operation_name} - {error_message}")
    data = {
        'status': 'available',
        'operation': operation_name,
        'error': error_message,
        'message': f"Failed to prepare {operation_name}: {error_message}"
    }
    
    # Use eventlet to schedule the emit in the main thread
    def emit_failure():
        try:
            socketio.emit('operation_failed', data, namespace='/')
            logger.info(f"Operation failed notification emitted for: {operation_name}")
        except Exception as e:
            logger.error(f"Error emitting operation failed: {e}")
    
    # Schedule the emit in the main eventlet thread
    eventlet.spawn(emit_failure)