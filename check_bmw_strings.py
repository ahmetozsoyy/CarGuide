import sqlite3
import pandas as pd

conn = sqlite3.connect('asistan.db')
df = pd.read_sql_query("SELECT marka, seri, model FROM arac_ilanlari WHERE marka LIKE '%BMW%'", conn)
conn.close()

print("BMW SERI:")
print(df['seri'].value_counts().head(10))
print("BMW MODELLERI (3 Serisi):")
print(df[df['seri'].str.contains('3', na=False, case=False)]['model'].value_counts().head(10))
