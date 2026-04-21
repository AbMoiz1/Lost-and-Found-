"""
Database migration for the Matching Service.
Creates the matches table if it does not already exist.
Run once on service startup or manually.
"""
from db import get_connection

CREATE_MATCHES_TABLE = """
CREATE TABLE IF NOT EXISTS matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id  UUID NOT NULL,
  found_item_id UUID NOT NULL,
  score         NUMERIC(4,3) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lost_item_id, found_item_id)
);
"""


def run_migrations():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(CREATE_MATCHES_TABLE)
        conn.commit()
        print("Migration complete: matches table ready.")
    finally:
        conn.close()


if __name__ == "__main__":
    run_migrations()
