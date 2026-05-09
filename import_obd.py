import sqlite3
import pandas as pd

# Load CSV
df = pd.read_csv('c:\\tez2\\obdTR.csv')

# Connect to DB
conn = sqlite3.connect('c:\\tez2\\asistan.db')

# Write to SQLite
df.to_sql('obd_kodlari', conn, if_exists='replace', index=False)

print(f"Successfully imported {len(df)} OBD codes into asistan.db")
conn.close()
