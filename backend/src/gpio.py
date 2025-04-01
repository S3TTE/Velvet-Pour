import logging
import time
import eventlet
import RPi.GPIO as GPIO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Conversion constants
ML_TO_OZ = 0.033814  # 1 ml = 0.033814 fluid ounces

# Mapping matrix for pumps: id -> [valve_pin, flow_sensor_pin]
PUMP_MAPPING = {
    1: [16, 18],  # Pump 1: valve on pin 16, flow sensor on pin 18
    2: [22, 24],  # Pump 2
    3: [26, 28],  # Pump 3
    4: [32, 36],  # Pump 4
    # Add more pumps as needed
}

PUMP_GPIO = 5

def init_gpio():
    """Initialize GPIO settings"""
    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BOARD)

def dispense_liquid(pump_id, amount_oz, timeout=30, valve_pin=None, flow_sensor_pin=None):
    """
    Multi-purpose function to dispense liquid or directly control valves.

    Usage modes:
    1. Matrix-based dispensing: dispense_liquid(1, 2.0) - Use pump 1 to dispense 2.0 oz
    2. Direct valve control: dispense_liquid(5, 0, valve_pin=5) - Open valve on GPIO 5
    3. Direct valve control: dispense_liquid(5, -1, valve_pin=5) - Close valve on GPIO 5
    4. Custom pin dispensing: dispense_liquid(99, 1.5, valve_pin=5, flow_sensor_pin=7)

    Args:
        pump_id (int): ID of the pump to use (must exist in PUMP_MAPPING)
        amount_oz (float): Amount to dispense in fluid ounces, or use:
                           0 to just open the valve
                           -1 to just close the valve
        timeout (int): Maximum time in seconds to wait before timing out
        valve_pin (int, optional): Direct GPIO pin for valve, bypassing PUMP_MAPPING
        flow_sensor_pin (int, optional): Direct GPIO pin for flow sensor, bypassing PUMP_MAPPING

    Returns:
        float: Actual amount dispensed in fluid ounces (0 if just opening/closing)
        bool: True if successful, False if timed out or error
    """
    # Initialize GPIO
    init_gpio()

    # Determine pins to use (direct or from mapping)
    if valve_pin is None and flow_sensor_pin is None:
        if pump_id not in PUMP_MAPPING:
            print(f"Error: Pump ID {pump_id} not found in pump mapping")
            return 0, False
        valve_pin, flow_sensor_pin = PUMP_MAPPING[pump_id]
    elif valve_pin is None or (amount_oz > 0 and flow_sensor_pin is None):
        print(f"Error: Must specify both valve_pin and flow_sensor_pin for custom setup")
        return 0, False

    # Setup valve pin
    print(f"Setting up valve pin {valve_pin} as output")
    GPIO.setup(valve_pin, GPIO.OUT)

    # Just close the valve
    if amount_oz == -1:
        print(f"Closing valve on pin {valve_pin}")
        GPIO.output(valve_pin, GPIO.HIGH)  # HIGH = CLOSE (inverted logic)
        return 0, True

    # Just open the valve
    if amount_oz == 0:
        print(f"Opening valve on pin {valve_pin}")
        GPIO.output(valve_pin, GPIO.LOW)  # LOW = OPEN (inverted logic)
        return 0, True

    # Setup flow sensor pin for dispensing
    GPIO.setup(flow_sensor_pin, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

    # Initialize variables for flow measurement
    pulse_count = 0
    total_oz = 0
    last_state = GPIO.input(flow_sensor_pin)
    start_time = time.time()
    success = True

    print(f"Starting to dispense {amount_oz}oz")
    print(f"Opening valve on pin {valve_pin}")

    # Open the valve (LOW = OPEN with inverted logic)
    GPIO.output(valve_pin, GPIO.LOW)

    try:
        # Monitor flow until we reach the target amount
        while total_oz < amount_oz:
            # Check for timeout
            if time.time() - start_time > timeout:
                print(f"Timeout after {timeout} seconds")
                success = False
                break

            # Read flow sensor
            current_state = GPIO.input(flow_sensor_pin)

            # Check for pulse (state change from 1 to 0)
            if current_state == 0 and last_state == 1:
                pulse_count += 1
                print(".", end="", flush=True)  # Visual indicator of pulses

                # Convert pulses to ounces - adjust conversion factor based on your sensor
                # Most flow sensors use pulses per liter (PPL)
                ml_per_pulse = 2.22  # Adjust this value for your specific flow sensor
                oz_per_pulse = ml_per_pulse * ML_TO_OZ
                total_oz = pulse_count * oz_per_pulse

                # Print progress every 0.5oz
                if total_oz % 0.5 < oz_per_pulse:
                    print(f"\nCurrent volume: {total_oz:.2f}oz / {amount_oz}oz")

            last_state = current_state
            time.sleep(0.001)  # Small delay for polling

    except Exception as e:
        print(f"Error during dispensing: {e}")
        success = False
    finally:
        # Close the valve (HIGH = CLOSE with inverted logic)
        print(f"\nClosing valve on pin {valve_pin}")
        GPIO.output(valve_pin, GPIO.HIGH)

        # Calculate final amount
        elapsed_time = time.time() - start_time
        print(f"Dispensed {total_oz:.2f}oz in {elapsed_time:.1f} seconds")

        return total_oz, success

def cleanup():
    """Clean up GPIO pins when done with all operations"""
    GPIO.cleanup()
    print("GPIO cleaned up")

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
                # drink preparation
                # open pump
                logger.debug("Direct valve open ---")
                dispense_liquid(0, 0, valve_pin=PUMP_GPIO)
                for bottle in data:
                    print("Matrix-based dispensing ---")
                    oz_dispensed, success = dispense_liquid(bottle['valv_id'], bottle['oz'])
                    if success:
                        print(f"Successfully dispensed {oz_dispensed:.2f}oz")
                eventlet.sleep(2)  # sleep before close pump
                dispense_liquid(0, -1, valve_pin=PUMP_GPIO)
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
