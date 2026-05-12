import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import jwt
import datetime
import base64
import tempfile
from io import BytesIO
from PIL import Image
from werkzeug.security import generate_password_hash, check_password_hash
from google import genai

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'AIzaSyDJ9MqZ41UVVb6dZGkqrUIoqj3dxU3rVKM' # Should be in env

# Initialize Database for Users
def init_db():
    conn = sqlite3.connect('users.db')
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

# Configure Gemini AI
api_key = "AIzaSyDJ9MqZ41UVVb6dZGkqrUIoqj3dxU3rVKM"
if api_key:
    client = genai.Client(api_key=api_key)
    print("Gemini AI configured successfully.")
else:
    client = None
    print("WARNING: GEMINI_API_KEY environment variable not found. AI translation will be disabled.")

# ── YOLO Hasar Tespit Modeli ─────────────────────────────────────────────
try:
    from ultralytics import YOLO as _YOLO
    _yolo_model_yolu = 'trained.pt'
    if os.path.exists(_yolo_model_yolu):
        damage_model = _YOLO(_yolo_model_yolu)
        car_detector = _YOLO("yolov8n.pt") # Araç tespiti için standart model
        print("Hasar ve Araç tespit modelleri yüklendi.")
    else:
        damage_model = None
        print("UYARI: trained.pt bulunamadı.")
except Exception as e:
    damage_model = None
    print(f"Hasar modeli yüklenirken hata: {e}")

# İngilizce sınıf → Türkçe etiket eşlemesi
SINIF_TR = {
    'dent':          'Ezik / Göçük',
    'scratch':       'Çizik',
    'crack':         'Çatlak',
    'glass shatter': 'Cam Kırığı',
    'lamp broken':   'Lamba Hasarı',
    'tire flat':     'Lastik Hasarı',
    # Yeni modelin (trained.pt) sınıf isimleri:
    'shattered_glass': 'Cam Kırığı',
    'broken_lamp':     'Lamba Hasarı',
    'flat_tire':       'Lastik Hasarı',
    # Küçük harf / büyük harf varyasyonları
    'Dent':          'Ezik / Göçük',
    'Scratch':       'Çizik',
    'Crack':         'Çatlak',
    'Glass Shatter': 'Cam Kırığı',
    'Lamp Broken':   'Lamba Hasarı',
    'Tire Flat':     'Lastik Hasarı',
}

AGIRLIK_TR = {
    'low':    'Düşük',
    'medium': 'Orta',
    'high':   'Yüksek',
}

def _hasar_siddeti(guven: float) -> str:
    """Güven skoruna göre hasar şiddeti döner."""
    if guven >= 0.75:
        return 'high'
    elif guven >= 0.50:
        return 'medium'
    else:
        return 'low'

def _gemini_ozet(tespitler: list) -> str:
    """Tespit edilen hasarlar için Gemini ile Türkçe özet oluştur."""
    if not client or not tespitler:
        return None
    liste = ", ".join([f"{t['etiket']} (%{t['guven']:.0f})" for t in tespitler])
    prompt = (
        f"Sen uzman bir otomotiv hasar değerlendirme uzmanısın. "
        f"Araç görüntüsünde şu hasarlar tespit edildi: {liste}. "
        f"Türkçe, resmi ve profesyonel bir dille 2-3 cümlelik kısa bir değerlendirme yap. "
        f"Hasarların olası etkisini ve ne yapılması gerektiğini belirt."
    )
    try:
        resp = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        return resp.text
    except Exception as e:
        print(f"Gemini özet hatası: {e}")
        return None


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
        conn = sqlite3.connect('users.db')
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

    conn = sqlite3.connect('users.db')
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
        import pandas as pd
        try:
            df_obd = pd.read_csv('obdTR.csv')
        except Exception as e:
            return jsonify({'success': False, 'error': 'obdTR.csv dosyası okunamadı.'})

        match = df_obd[df_obd['id'] == code]

        if match.empty:
            return jsonify({'success': False, 'error': 'Bu OBD kodu bulunamadı.'})

        technical_desc = str(match.iloc[0]['desc_tr'])
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


# ── Hasar Analiz Endpoint ────────────────────────────────────────────────
@app.route('/analyze-damage', methods=['POST'])
def analyze_damage():
    """Tek veya çoklu görüntü analizi - base64 formatında alır, Türkçe sonuç döner."""
    if not damage_model:
        return jsonify({
            'success': False,
            'error': 'Hasar tespit modeli yüklü değil. Lütfen train_damage_model.py dosyasını çalıştırın.'
        }), 503

    data = request.json
    goruntular = data.get('images', [])   # base64 listesi

    if not goruntular:
        return jsonify({'success': False, 'error': 'Görüntü verisi bulunamadı.'}), 400

    tum_sonuclar = []

    for idx, b64_veri in enumerate(goruntular):
        try:
            # base64 → PIL Image → geçici dosya
            if ',' in b64_veri:
                b64_veri = b64_veri.split(',', 1)[1]
            img_bytes = base64.b64decode(b64_veri)
            img = Image.open(BytesIO(img_bytes)).convert('RGB')

            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                img.save(tmp.name, 'JPEG')
                tmp_yolu = tmp.name

            # 1. AŞAMA: Önce Arabayı Tespit Et (İki Aşamalı Mimari)
            car_results = car_detector.predict(source=tmp_yolu, conf=0.15, classes=[2, 5, 7], verbose=False) # 2:car, 5:bus, 7:truck
            car_boxes = car_results[0].boxes

            if len(car_boxes) > 0:
                # Ekranda birden fazla araba varsa en büyüğünü (odaktakini) seç
                max_area = 0
                best_box = None
                for box in car_boxes:
                    bx1, by1, bx2, by2 = [int(v) for v in box.xyxy[0]]
                    area = (bx2 - bx1) * (by2 - by1)
                    if area > max_area:
                        max_area = area
                        best_box = (bx1, by1, bx2, by2)
                
                # Görüntüyü arabanın olduğu yere kırp (Arka planı, gökyüzünü, telleri at)
                bx1, by1, bx2, by2 = best_box
                w, h = img.size
                # Arabanın etrafından azıcık pay (padding) bırak
                pad = 30
                bx1 = max(0, bx1 - pad)
                by1 = max(0, by1 - pad)
                bx2 = min(w, bx2 + pad)
                by2 = min(h, by2 + pad)

                img = img.crop((bx1, by1, bx2, by2))
                
                # Yeni kırpılmış resmi kaydet
                os.unlink(tmp_yolu)
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                    img.save(tmp.name, 'JPEG')
                    tmp_yolu = tmp.name

            # 2. AŞAMA: Sadece Araba Üzerinde Hasar Tespiti
            sonuc = damage_model.predict(
                source=tmp_yolu,
                conf=0.15,          # Nano model zayıf olduğu için eşiği oldukça düşürdük
                iou=0.45,
                verbose=False
            )
            os.unlink(tmp_yolu)

            # Çizimli görüntüyü (bounding box) oluştur
            res_plotted = sonuc[0].plot(line_width=2)
            res_plotted_rgb = res_plotted[..., ::-1] # BGR'den RGB'ye çevir
            plotted_img = Image.fromarray(res_plotted_rgb)
            buffered = BytesIO()
            plotted_img.save(buffered, format="JPEG")
            cizimli_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

            tespitler = []
            for r in sonuc:
                for box in r.boxes:
                    sinif_id = int(box.cls[0])
                    guven    = float(box.conf[0])
                    en_isim  = r.names[sinif_id]
                    tr_isim  = SINIF_TR.get(en_isim, en_isim)
                    
                    # Sadece kaporta ve far aksamı için lastik analizini atla
                    if 'tire' in en_isim.lower() or tr_isim == 'Lastik Hasarı':
                        continue

                    siddet   = _hasar_siddeti(guven)

                    # Bounding box koordinatları (oransal)
                    x1, y1, x2, y2 = [float(v) for v in box.xyxyn[0]]

                    tespitler.append({
                        'etiket':      tr_isim,
                        'etiket_en':   en_isim,
                        'guven':       round(guven * 100, 1),
                        'siddet':      AGIRLIK_TR[siddet],
                        'siddet_en':   siddet,
                        'kutu':        {'x1': round(x1,4), 'y1': round(y1,4),
                                        'x2': round(x2,4), 'y2': round(y2,4)},
                    })

            # Güvene göre sırala
            tespitler.sort(key=lambda x: x['guven'], reverse=True)

            # Gemini ile AI özet
            ai_ozet = _gemini_ozet(tespitler) if tespitler else None

            goruntu_sonucu = {
                'goruntu_no':     idx + 1,
                'tespit_sayisi':  len(tespitler),
                'tespitler':      tespitler,
                'hasar_var':      len(tespitler) > 0,
                'ai_ozet':        ai_ozet,
                'mesaj':          'Herhangi bir hasar tespit edilmedi.' if not tespitler else f'{len(tespitler)} hasar tespit edildi.',
                'cizimli_goruntu': cizimli_b64 if tespitler else None,
            }
            tum_sonuclar.append(goruntu_sonucu)

        except Exception as e:
            tum_sonuclar.append({
                'goruntu_no':    idx + 1,
                'hata':          str(e),
                'tespit_sayisi': 0,
                'tespitler':     [],
                'hasar_var':     False,
            })

    # Genel özet
    toplam_hasar = sum(s.get('tespit_sayisi', 0) for s in tum_sonuclar)

    return jsonify({
        'success':         True,
        'goruntu_sayisi':  len(goruntular),
        'toplam_hasar':    toplam_hasar,
        'sonuclar':        tum_sonuclar,
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
