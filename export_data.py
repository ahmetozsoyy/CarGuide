import sqlite3
import json

conn = sqlite3.connect('c:\\tez2\\asistan.db')
cursor = conn.cursor()
data = {}
for col in ['marka', 'seri', 'model', 'vites_tipi', 'yakit_tipi']:
    cursor.execute(f'SELECT DISTINCT {col} FROM arac_ilanlari WHERE {col} IS NOT NULL')
    data[col] = sorted([row[0] for row in cursor.fetchall() if str(row[0]).strip()])

with open('c:\\tez2\\AutoAssistant\\constants\\VehicleData.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("VehicleData.json created successfully.")
