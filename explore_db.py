import sqlite3
import pandas as pd

def explore_db(db_path):
    print(f"--- Exploring {db_path} ---")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get list of tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    if not tables:
        print("No tables found in the database.")
        return

    print("Tables found:", [table[0] for table in tables])

    for table_name in tables:
        table_name = table_name[0]
        print(f"\n--- Table: {table_name} ---")
        
        # Get schema
        cursor.execute(f"PRAGMA table_info('{table_name}')")
        schema = cursor.fetchall()
        print("Columns:")
        for col in schema:
            print(f"  - {col[1]} ({col[2]})")
            
        # Try to load first 5 rows with pandas
        try:
            df = pd.read_sql_query(f"SELECT * FROM '{table_name}' LIMIT 5", conn)
            print("\nFirst 5 rows:")
            print(df)
            
            # Count total rows
            count = pd.read_sql_query(f"SELECT COUNT(*) as cnt FROM '{table_name}'", conn)
            print(f"\nTotal rows: {count['cnt'][0]}")
        except Exception as e:
            print(f"Error reading table {table_name}: {e}")

    conn.close()

if __name__ == '__main__':
    explore_db('asistan.db')
