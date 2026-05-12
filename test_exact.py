import pandas as pd
import joblib
import json

model = joblib.load('price_prediction_model.pkl')

with open('AutoAssistant/constants/VehicleData.json', 'r', encoding='utf-8') as f:
    vdata = json.load(f)

# Find exact strings in VehicleData
marka = "Mercedes - Benz"
seri = [s for s in vdata['marka_to_seri'].get(marka, []) if "E" in s][0]
mdl = [m for m in vdata['seri_to_model'].get(seri, []) if "250" in m][0]

print(f"VehicleData JSON Exact matches: Marka: {marka}, Seri: {seri}, Model: {mdl}")

df_merc = pd.DataFrame([{
    'marka': marka,
    'seri': seri,
    'model': mdl,
    'yil': 2014,
    'vites_tipi': 'Otomatik',
    'yakit_tipi': 'Dizel',
    'kilometre': 200000.0
}])

pred = model.predict(df_merc)[0]
print(f"Predicted price for this EXACT input: {pred:,.0f} TL")
