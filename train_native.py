import sqlite3
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OrdinalEncoder
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import re

def clean_numeric(text):
    if pd.isna(text):
        return np.nan
    num = re.sub(r'\D', '', str(text))
    if num == '':
        return np.nan
    return float(num)

# Load data
conn = sqlite3.connect('asistan.db')
df = pd.read_sql_query("SELECT * FROM arac_ilanlari", conn)
conn.close()

df['fiyat'] = df['fiyat'].apply(clean_numeric)
df['kilometre'] = df['kilometre'].apply(clean_numeric)
df.dropna(subset=['fiyat', 'kilometre', 'yil'], inplace=True)
df = df[(df['fiyat'] >= 50000) & (df['fiyat'] <= 15000000)]
df = df[df['kilometre'] <= 1000000]
df['yil'] = pd.to_numeric(df['yil'], errors='coerce')
df.dropna(subset=['yil'], inplace=True)

features = ['marka', 'seri', 'model', 'yil', 'vites_tipi', 'yakit_tipi', 'kilometre']
X = df[features]
y = df['fiyat']

cat_cols = ['marka', 'seri', 'model', 'vites_tipi', 'yakit_tipi']
# Use OrdinalEncoder because HistGradientBoostingRegressor needs numerical inputs for categorical columns
preprocessor = ColumnTransformer(
    transformers=[
        ('cat', OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1), cat_cols)
    ],
    remainder='passthrough'
)

# Tell the model which features are categorical after preprocessing
# The preprocessor puts 'cat' columns first (5 columns), then remainder ('yil', 'kilometre')
categorical_features = [0, 1, 2, 3, 4]

model = HistGradientBoostingRegressor(
    categorical_features=categorical_features,
    max_iter=300,
    random_state=42
)

my_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('model', model)
])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training model with NATIVE categorical support...")
my_pipeline.fit(X_train, y_train)

preds = my_pipeline.predict(X_test)
print(f"MAE: {mean_absolute_error(y_test, preds):,.0f} TL")
print(f"R2: {r2_score(y_test, preds):.4f}")

import joblib
joblib.dump(my_pipeline, 'price_prediction_model_native.pkl')

# Test BMW
df_bmw = pd.DataFrame([{'marka': 'BMW', 'seri': '3 Serisi', 'model': '320i', 'yil': 2014, 'vites_tipi': 'Otomatik', 'yakit_tipi': 'Benzin', 'kilometre': 100000.0}])
# Test Mercedes
df_merc = pd.DataFrame([{'marka': 'Mercedes - Benz', 'seri': 'E Serisi', 'model': 'E 250 CDI AMG', 'yil': 2014, 'vites_tipi': 'Otomatik', 'yakit_tipi': 'Dizel', 'kilometre': 200000.0}])

print(f"\nBMW 320i 2014: {my_pipeline.predict(df_bmw)[0]:,.0f} TL")
print(f"Mercedes E250 2014: {my_pipeline.predict(df_merc)[0]:,.0f} TL")
