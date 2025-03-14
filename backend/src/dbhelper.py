import psycopg2
from psycopg2.extras import RealDictCursor
import os
import logging

logger = logging.getLogger(__name__)

hostname = os.environ.get('SUPABASE_HOSTNAME')
database = os.environ.get('SUPABASE_DBNAME')
port = os.environ.get('SUPABASE_PORT')
username = os.environ.get('SUPABASE_USERNAME')
password = os.environ.get('SUPABASE_PASSWORD')

def get_db_connection():
    """Create a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(database=database, user=username, password=password, host=hostname, port=port, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise

def execute_query(query, params=None):
    """Execute a query and return all results."""
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                if cur.description:  # Only fetch if there are results to fetch
                    return cur.fetchall()
                return None
    except Exception as e:
        logger.error(f"Query execution error: {e}")
        raise
    finally:
        conn.close()