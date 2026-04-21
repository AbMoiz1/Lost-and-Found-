"""
Database connection helper for the Matching Service.
Uses psycopg2 with DATABASE_URL environment variable.
"""
import os
import psycopg2


def get_connection():
    """Return a new psycopg2 connection using DATABASE_URL env var."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return psycopg2.connect(database_url)
