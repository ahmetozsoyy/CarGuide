import sqlite3
import pandas as pd
import re

def clean_numeric(text):
    if pd.isna(text):
        return None
    num = re.sub(r'\D', '', str(text))
    if num == '':
        return None
    return float(num)

conn = sqlite3.connect('asistan.db')
df = pd.read_sql_query("SELECT marka, seri, model, yil, fiyat, kilometre FROM arac_ilanlari", conn)
conn.close()

df['fiyat'] = df['fiyat'].apply(clean_numeric)
df['yil'] = pd.to_numeric(df['yil'], errors='coerce')

# BMW 320i
bmw = df[(df['marka'].str.contains('BMW', na=False, case=False)) & 
         (df['seri'].str.contains('3 Serisi', na=False, case=False) | df['model'].str.contains('320i', na=False, case=False)) & 
         (df['yil'] == 2014)]

print("=== BMW 3 Serisi 2014 Fiyat İstatistikleri ===")
if len(bmw) > 0:
    print(f"Toplam İlan: {len(bmw)}")
    print(f"Min Fiyat: {bmw['fiyat'].min():,.0f} TL")
    print(f"Max Fiyat: {bmw['fiyat'].max():,.0f} TL")
    print(f"Ortalama:  {bmw['fiyat'].mean():,.0f} TL")
    print(f"Medyan:    {bmw['fiyat'].median():,.0f} TL")
    print("\nEn Düşük 5 İlan:")
    print(bmw.nsmallest(5, 'fiyat')[['marka', 'seri', 'model', 'fiyat', 'kilometre']])
else:
    print("İlan bulunamadı.")

print("\n")

# Mercedes E250
merc = df[(df['marka'].str.contains('Mercedes', na=False, case=False)) & 
          (df['seri'].str.contains('E Serisi', na=False, case=False) | df['model'].str.contains('250', na=False, case=False)) & 
          (df['yil'] == 2014)]

print("=== Mercedes E Serisi 2014 Fiyat İstatistikleri ===")
if len(merc) > 0:
    print(f"Toplam İlan: {len(merc)}")
    print(f"Min Fiyat: {merc['fiyat'].min():,.0f} TL")
    print(f"Max Fiyat: {merc['fiyat'].max():,.0f} TL")
    print(f"Ortalama:  {merc['fiyat'].mean():,.0f} TL")
    print(f"Medyan:    {merc['fiyat'].median():,.0f} TL")
    print("\nEn Yüksek 5 İlan:")
    print(merc.nlargest(5, 'fiyat')[['marka', 'seri', 'model', 'fiyat', 'kilometre']])
else:
    print("İlan bulunamadı.")
