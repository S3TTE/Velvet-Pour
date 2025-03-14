import json
import asyncio
import logging
from flask import Flask
from flask_socketio import SocketIO, emit

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize SocketIO
socketio = SocketIO()

# Machine status tracker
machine_status = {
    "status": "available",  # available, busy
    "current_operation": None,
    "start_time": None,
    "connected_clients": 0
}

def init_websocket(app):
    """Initialize the WebSocket with the Flask app"""
    socketio.init_app(app, cors_allowed_origins="*", async_mode='eventlet')
    return socketio

def get_machine_status():
    """Get the current machine status"""
    return machine_status

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

def notify_operation_started(operation_name):
    """Notify all clients that an operation has started"""
    machine_status['status'] = 'busy'
    machine_status['current_operation'] = operation_name
    
    logger.info(f"Operation started: {operation_name}")
    socketio.emit('operation_started', {
        'status': 'busy',
        'operation': operation_name,
        'message': f"Machine is busy preparing: {operation_name}"
    })

def notify_operation_completed(operation_name):
    """Notify all clients that an operation has completed"""
    machine_status['status'] = 'available'
    machine_status['current_operation'] = None
    
    logger.info(f"Operation completed: {operation_name}")
    socketio.emit('operation_completed', {
        'status': 'available',
        'operation': operation_name,
        'message': f"Machine has finished preparing: {operation_name}"
    })

def notify_operation_failed(operation_name, error_message):
    """Notify all clients that an operation has failed"""
    machine_status['status'] = 'available'
    machine_status['current_operation'] = None
    
    logger.info(f"Operation failed: {operation_name} - {error_message}")
    socketio.emit('operation_failed', {
        'status': 'available',
        'operation': operation_name,
        'error': error_message,
        'message': f"Failed to prepare {operation_name}: {error_message}"
    })