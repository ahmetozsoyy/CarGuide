import pandas as pd
import joblib

# Load model
model = joblib.load('price_prediction_model.pkl')

# 1. BMW 320i 2014 100,000km Petrol Auto
df_bmw = pd.DataFrame([{
    'marka': 'BMW',
    'seri': '3 Serisi',
    'model': '320i',
    'yil': 2014,
    'vites_tipi': 'Otomatik',
    'yakit_tipi': 'Benzin',
    'kilometre': 100000.0
}])

# 2. Mercedes E250d AMG 2014 Diesel Auto 200,000km
df_merc = pd.DataFrame([{
    'marka': 'Mercedes - Benz',
    'seri': 'E Serisi',
    'model': 'E 250 CDI AMG',  # Based on the typical model name
    'yil': 2014,
    'vites_tipi': 'Otomatik',
    'yakit_tipi': 'Dizel',
    'kilometre': 200000.0
}])

pred_bmw = model.predict(df_bmw)
pred_merc = model.predict(df_merc)

print(f"BMW 320i (2014, 100k km): {pred_bmw[0]:,.0f} TL")
print(f"Mercedes E250 (2014, 200k km): {pred_merc[0]:,.0f} TL")
