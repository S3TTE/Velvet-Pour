import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def spill_drink(data):
    status = 200
    message = ''
    try:
        logger.info("drink data: %s" % data)
        # For demonstration, we'll just simulate a delay
        time.sleep(5)  # Simulate 5 seconds of preparation time
    except Exception as e:
        logger.error("Errore nella creazione del drink: %s" % e)
        status = 500
        message = e
    return status,message