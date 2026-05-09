import sqlite3
import json
from collections import defaultdict

conn = sqlite3.connect('c:\\tez2\\asistan.db')
cursor = conn.cursor()

# Get distinct static fields
data = {
    'vites_tipi': [],
    'yakit_tipi': [],
    'marka': [],
    'marka_to_seri': defaultdict(set),
    'seri_to_model': defaultdict(set)
}

cursor.execute("SELECT DISTINCT vites_tipi FROM arac_ilanlari WHERE vites_tipi IS NOT NULL")
data['vites_tipi'] = sorted([row[0] for row in cursor.fetchall() if str(row[0]).strip()])

cursor.execute("SELECT DISTINCT yakit_tipi FROM arac_ilanlari WHERE yakit_tipi IS NOT NULL")
data['yakit_tipi'] = sorted([row[0] for row in cursor.fetchall() if str(row[0]).strip()])

# Build relational hierarchy
cursor.execute("SELECT marka, seri, model FROM arac_ilanlari WHERE marka IS NOT NULL")
for row in cursor.fetchall():
    marka = str(row[0]).strip() if row[0] else ""
    seri = str(row[1]).strip() if row[1] else ""
    model = str(row[2]).strip() if row[2] else ""
    
    if marka:
        if marka not in data['marka']:
            data['marka'].append(marka)
        
        if seri:
            data['marka_to_seri'][marka].add(seri)
            if model:
                data['seri_to_model'][seri].add(model)

# Convert sets to sorted lists
data['marka'] = sorted(list(set(data['marka'])))
for k in data['marka_to_seri']:
    data['marka_to_seri'][k] = sorted(list(data['marka_to_seri'][k]))
for k in data['seri_to_model']:
    data['seri_to_model'][k] = sorted(list(data['seri_to_model'][k]))

with open('c:\\tez2\\AutoAssistant\\constants\\VehicleData.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Relational VehicleData.json created successfully.")
