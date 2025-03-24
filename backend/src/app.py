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
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})

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
        SELECT * FROM bottle ORDER BY name
        """
        
        # Execute query
        results = db.execute_query(query)
        
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
    
@app.route('/setBottlesMounted', methods=['POST'])
def set_bottles_mounted():
    """Get data from the database."""
    try:
        # Get query parameters
        req = request.json
        bottle_id = req["bottleId"]
        handler_id = req["handlerId"]
        
        # Example query - modify based on your data model
        query = """
        UPDATE bottle_mounted_rel SET bottle_id=%s WHERE id=%s
        """
        
        # Execute query
        results = db.execute_query(query, (bottle_id,handler_id))
        
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error retrieving data: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    
@app.route('/getDrinkAvaiable', methods=['GET'])
def get_drink_avaiable():
    """Get data from the database."""
    drink_list = []
    try:
        
        query = """
        SELECT DISTINCT d.*
        FROM drink d 
        RIGHT JOIN drink_rel dr ON d.id=dr.drink_id JOIN bottle_mounted_rel bm_rel ON dr.bottle_id=bm_rel.bottle_id 
        ORDER BY d.is_favourite, d.name
        """
        
        # Execute query
        results = db.execute_query(query)

        for res in results:
            query = """
            SELECT b.*,oz 
            FROM bottle b JOIN drink_rel dr ON b.id=dr.bottle_id 
            WHERE dr.drink_id = %s        
            """
            drink = dict()
            drink["ingredients"] = db.execute_query(query,(res["id"],))
            drink["id"] = res["id"]
            drink["name"] = res["name"]
            drink["is_favourite"] = res["is_favourite"]
            drink["img_path"] = res["img_path"]
            drink_list.append(drink)
        
        return jsonify(drink_list)
    
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