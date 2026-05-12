import sqlite3
import pandas as pd

conn = sqlite3.connect('asistan.db')
df = pd.read_sql_query("SELECT marka, seri, model FROM arac_ilanlari WHERE marka LIKE '%Mercedes%' AND seri LIKE '%E%'", conn)
conn.close()

print("MERCEDES E SERISI UNIK MODELLER:")
print(df['model'].value_counts().head(15))
print("\nMERCEDES MARKALAR:")
print(df['marka'].value_counts())
