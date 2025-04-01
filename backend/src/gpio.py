import logging
import time
import eventlet

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def spill_drink(data, callback_complete=None):
    """
    Non-blocking function to prepare a drink using eventlet
    
    Args:
        data: Drink data
        callback_complete: Function to call when drink preparation is complete
    
    Returns:
        tuple: (status code, message)
    """
    status = 200
    message = ''
    
    try:
        logger.info("Starting drink preparation with data: %s" % data)
        
        # Define the preparation task
        def prepare_drink_task():
            try:
                logger.info("Drink preparation task started")
                # Simulate drink preparation
                eventlet.sleep(5)  # Non-blocking sleep for 5 seconds
                logger.info("Drink preparation complete, calling callback")
                
                # If a callback was provided, call it when done
                if callback_complete:
                    try:
                        callback_complete()
                        logger.info("Callback executed successfully")
                    except Exception as callback_error:
                        logger.error("Error in completion callback: %s" % callback_error)
                else:
                    logger.warning("No completion callback provided")
                    
            except Exception as e:
                logger.error("Error during async drink preparation: %s" % e)
        
        # Spawn a greenlet to handle the preparation
        eventlet.spawn(prepare_drink_task)
        logger.info("Preparation task spawned and function returning")
        
    except Exception as e:
        logger.error("Error initiating drink preparation: %s" % e)
        status = 500
        message = str(e)
        
    return status, message