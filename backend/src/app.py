from flask import Flask, jsonify, request
from flask_cors import CORS
import src.dbhelper as db
import src.gpio as gpio
from src.websocket import init_websocket, notify_operation_started, notify_operation_completed, notify_operation_failed
import logging


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)

# Initialize WebSocket
socketio = init_websocket(app)

# Define API routes
@app.route('/', methods=['GET'])
def welcome():
    """welcome endpoint."""
    return 'Benvenuto nelle API di VelvetPour'

@app.route('/getBottles', methods=['GET'])
def get_bottles():
    """Get data from the database."""
    try:
        
        query = """
        SELECT * FROM bottle ORDER BY type
        """
        
        # Execute query
        results = db.execute_query(query)
        logger.info("result: %s" % results)
        
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error retrieving data: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/getBottlesMounted', methods=['GET'])
def get_bottles_mounted():
    """Get data from the database."""
    try:
        
        query = """
        SELECT * 
        FROM bottle b 
        RIGHT JOIN bottle_mounted_rel bm_rel ON b.id=bm_rel.bottle_id 
        ORDER BY bm_rel.id
        """
        
        # Execute query
        results = db.execute_query(query)
        
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error retrieving data: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    
@app.route('/postBottlesMounted', methods=['POST'])
def set_bottles_mounted():
    """Get data from the database."""
    try:
        # Get query parameters
        param = request.args.get('param', 'default_value')
        
        # Example query - modify based on your data model
        query = """
        SELECT * FROM bottle
        """
        
        # Execute query
        results = db.execute_query(query, (param,))
        
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error retrieving data: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    
@app.route('/getDrinkAvaiable', methods=['GET'])
def get_drink_avaiable():
    """Get data from the database."""
    try:
        
        query = """
        SELECT DISTINCT d.*
        FROM drink d 
        RIGHT JOIN drink_rel dr ON d.id=dr.drink_id JOIN bottle_mounted_rel bm_rel ON dr.bottle_id=bm_rel.bottle_id 
        ORDER BY d.is_favourite, d.name
        """
        
        # Execute query
        results = db.execute_query(query)
        
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error retrieving data: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/getDrinkData/<int:id>', methods=['GET'])
def get_single_drink(id):
    """Get a single item by ID."""
    try:
        results = get_single_drink_data(id)
        
        if not results:
            return jsonify({'error': 'Item not found'}), 404
            
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error retrieving item: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    

@app.route('/prepCocktail/<drink_id>', methods=['POST'])
def prepare_drink(drink_id):
    """API to prepare a drink and notify clients via WebSocket."""
    try:
        drink_data = get_single_drink_data(drink_id)
        drink_name = drink_data[0]["name"]
        # Notify all clients that preparation has started
        notify_operation_started(drink_name)

        # Simulate drink preparation (replace with actual business logic)
        try:
            # Here you would normally:
            # 1. Check if ingredients are available
            # 2. Update inventory in database
            # 3. Send commands to the machine
            # 4. Wait for completion
            
            code,message = gpio.spill_drink(drink_data)
            if code == 500:
                notify_operation_failed(drink_name, message)
                return jsonify({
                    'status': 'error',
                    'message': f'Failed to prepare {drink_name}: {message}'
                }), 500
            
            # Notify all clients that preparation is complete
            notify_operation_completed(drink_name)
            
            return jsonify({
                'status': 'success',
                'message': f'Successfully prepared {drink_name}',
                'drink': drink_name
            })
            
        except Exception as e:
            # If preparation fails, notify clients about the failure
            error_message = str(e)
            notify_operation_failed(drink_name, error_message)
            return jsonify({
                'status': 'error',
                'message': f'Failed to prepare {drink_name}: {error_message}'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in drink preparation endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500


def get_single_drink_data(id):
    query = "SELECT name,img_path,dr.bottle_id,oz,bm_rel.id as valv_id FROM drink d JOIN drink_rel dr ON d.id=dr.drink_id JOIN bottle_mounted_rel bm_rel ON bm_rel.bottle_id=dr.bottle_id WHERE d.id = %s"
    results = db.execute_query(query, (id,))
    return results