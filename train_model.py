import sqlite3
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import re

def clean_numeric(text):
    if pd.isna(text):
        return np.nan
    # Extract only digits
    num = re.sub(r'\D', '', str(text))
    if num == '':
        return np.nan
    return float(num)

def load_and_preprocess_data(db_path):
    # Load data
    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query("SELECT * FROM arac_ilanlari", conn)
    conn.close()

    print("Data loaded. Initial shape:", df.shape)

    # Clean target variable (fiyat) and continuous feature (kilometre)
    df['fiyat'] = df['fiyat'].apply(clean_numeric)
    df['kilometre'] = df['kilometre'].apply(clean_numeric)
    
    # Drop rows with missing values in critical columns
    df.dropna(subset=['fiyat', 'kilometre', 'yil'], inplace=True)
    
    # Remove Outliers
    # Keep prices between 50k and 15M TL (removes extreme typos like 180M TL)
    # Keep kilometers below 1M km (removes typos like 30M km)
    df = df[(df['fiyat'] >= 50000) & (df['fiyat'] <= 15000000)]
    df = df[df['kilometre'] <= 1000000]

    print("Shape after dropping NaNs and Outliers:", df.shape)

    # Convert year to numeric if it's not
    df['yil'] = pd.to_numeric(df['yil'], errors='coerce')
    df.dropna(subset=['yil'], inplace=True)

    # Select features
    features = ['marka', 'seri', 'model', 'yil', 'vites_tipi', 'yakit_tipi', 'kilometre']
    X = df[features]
    y = df['fiyat']

    return X, y

def train_and_evaluate(X, y):
    # Categorical and numerical columns
    cat_cols = ['marka', 'seri', 'model', 'vites_tipi', 'yakit_tipi']
    num_cols = ['yil', 'kilometre']

    # Preprocessing for numerical data
    num_transformer = StandardScaler()

    # Preprocessing for categorical data
    cat_transformer = OneHotEncoder(handle_unknown='ignore', sparse_output=False)

    # Bundle preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', num_transformer, num_cols),
            ('cat', cat_transformer, cat_cols)
        ])

    # Define model using HistGradientBoostingRegressor
    model = HistGradientBoostingRegressor(max_iter=300, random_state=42)

    # Bundle preprocessing and modeling code in a pipeline
    my_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                  ('model', model)])

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training model...")
    # Preprocessing of training data, fit model
    my_pipeline.fit(X_train, y_train)

    # Preprocessing of validation data, get predictions
    preds = my_pipeline.predict(X_test)
    
    # Evaluate the model
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)

    print("-" * 30)
    print("Model Evaluation Results:")
    print(f"MAE:  {mae:,.2f} TL")
    print(f"RMSE: {rmse:,.2f} TL")
    print(f"R2 Score: {r2:.4f}")
    print("-" * 30)

    # Save the model
    import joblib
    joblib.dump(my_pipeline, 'price_prediction_model.pkl')
    print("Model saved as 'price_prediction_model.pkl'")

    # Feature Importance (Optional, extracting from pipeline can be tricky with OHE)
    return my_pipeline

if __name__ == '__main__':
    db_path = 'asistan.db'
    X, y = load_and_preprocess_data(db_path)
    model = train_and_evaluate(X, y)
