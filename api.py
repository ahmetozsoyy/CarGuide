import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from google import genai

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'sizin_gizli_anahtariniz_buraya' # Should be in env

# Initialize Database for Users
def init_db():
    conn = sqlite3.connect('asistan.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Load the trained ML model
try:
    model = joblib.load('price_prediction_model.pkl')
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Configure Gemini AI (User needs to set GEMINI_API_KEY environment variable)
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
    print("Gemini AI configured successfully.")
else:
    client = None
    print("WARNING: GEMINI_API_KEY environment variable not found. AI translation will be disabled.")


@app.route('/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({'success': False, 'error': 'Lütfen tüm alanları doldurun.'}), 400

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    try:
        conn = sqlite3.connect('asistan.db')
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", (name, email, hashed_password))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Kayıt başarılı!'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'error': 'Bu e-posta adresi zaten kayıtlı.'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'success': False, 'error': 'Lütfen e-posta ve şifrenizi girin.'}), 400

    conn = sqlite3.connect('asistan.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, password FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user[2], password):
        return jsonify({'success': False, 'error': 'E-posta veya şifre hatalı.'}), 401

    token = jwt.encode({
        'user_id': user[0],
        'name': user[1],
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({'success': True, 'token': token, 'name': user[1]})


@app.route('/predict', methods=['POST'])
def predict_price():
    if not model:
        return jsonify({'error': 'Model not loaded on the server.'}), 500

    data = request.json
    
    try:
        df = pd.DataFrame([{
            'marka': data.get('marka'),
            'seri': data.get('seri'),
            'model': data.get('model'),
            'yil': float(data.get('yil')),
            'vites_tipi': data.get('vites_tipi'),
            'yakit_tipi': data.get('yakit_tipi'),
            'kilometre': float(data.get('kilometre'))
        }])

        prediction = model.predict(df)
        predicted_price = float(prediction[0])

        margin = 0.05
        min_price = predicted_price * (1 - margin)
        max_price = predicted_price * (1 + margin)

        def format_price(p):
            rounded = round(p / 1000) * 1000
            return f"{int(rounded):,} TL".replace(',', '.')

        formatted_range = f"{format_price(min_price)}  -  {format_price(max_price)}"

        return jsonify({
            'success': True,
            'predicted_price': predicted_price,
            'min_price': min_price,
            'max_price': max_price,
            'formatted_price': formatted_range
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/obd', methods=['POST'])
def lookup_obd():
    data = request.json
    code = data.get('code', '').strip().upper()
    
    if not code:
        return jsonify({'error': 'Lütfen bir OBD kodu girin.'}), 400

    try:
        conn = sqlite3.connect('asistan.db')
        cursor = conn.cursor()
        cursor.execute("SELECT desc_tr FROM obd_kodlari WHERE id = ?", (code,))
        result = cursor.fetchone()
        conn.close()

        if not result:
            return jsonify({'success': False, 'error': 'Bu OBD kodu veritabanında bulunamadı.'})

        technical_desc = result[0]
        simplified_desc = technical_desc

        if client:
            prompt = f"Sen uzman bir otomotiv mühendisisin. Aracın sisteminden şu teknik hata açıklaması geldi: '{technical_desc}'. Lütfen bu sorunun ne anlama geldiğini araç sahiplerinin anlayabileceği kadar sade, ancak son derece resmi ve profesyonel bir dille açıkla. Açıklama 2-3 cümleyi geçmesin; doğrudan sorunun kaynağını ve olası etkisini temiz bir dille özetle."
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                simplified_desc = f"Teknik Tanım: {technical_desc}\n\nAnaliz:\n{response.text}"
            except Exception as e:
                print("Gemini API Error:", e)
                simplified_desc = f"Yapay zeka çevirisi şu an yapılamadı.\n\nTeknik Tanım: {technical_desc}"
        else:
            simplified_desc = f"{technical_desc}\n\n(Not: Daha basit bir açıklama için sunucuya GEMINI_API_KEY eklenmelidir.)"

        return jsonify({
            'success': True,
            'title': f"{code} Arıza Kodu",
            'technical_desc': technical_desc,
            'desc': simplified_desc
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
