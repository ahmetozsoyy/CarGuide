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
from dotenv import load_dotenv
import json

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_fallback')

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
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            marka TEXT NOT NULL,
            seri TEXT NOT NULL,
            model TEXT NOT NULL,
            yil INTEGER NOT NULL,
            kilometre INTEGER NOT NULL,
            yakit_tipi TEXT NOT NULL,
            vites_tipi TEXT NOT NULL,
            photos TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

import json as json_lib
from functools import wraps

def get_user_from_token():
    """Extract user_id from JWT token in Authorization header. Returns None if invalid."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload.get('user_id')
    except Exception:
        return None

def save_history(user_id, analysis_type, title, summary, details=None):
    """Save an analysis result to history."""
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO analysis_history (user_id, type, title, summary, details) VALUES (?, ?, ?, ?, ?)',
            (user_id, analysis_type, title, summary, json_lib.dumps(details, ensure_ascii=False) if details else None)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f'History save error: {e}')

# Load the trained ML model
try:
    model = joblib.load('price_prediction_model.pkl')
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Configure Gemini AI
api_key = os.getenv('GEMINI_API_KEY')
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

        result = {
            'success': True,
            'predicted_price': predicted_price,
            'min_price': min_price,
            'max_price': max_price,
            'formatted_price': formatted_range
        }

        # Save to history if user is authenticated
        user_id = get_user_from_token()
        if user_id:
            title = f"{data.get('marka')} {data.get('seri')} {data.get('model')}"
            summary = f"{data.get('yil')} | {int(float(data.get('kilometre'))):,} km | {formatted_range}".replace(',', '.')
            save_history(user_id, 'price', title, summary, data)

        return jsonify(result)
        
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
                simplified_desc = f"Yapay zeka çevirisi şu an yapılamadı. Hata: {str(e)}\n\nTeknik Tanım: {technical_desc}"
        else:
            simplified_desc = f"{technical_desc}\n\n(Not: Daha basit bir açıklama için sunucuya GEMINI_API_KEY eklenmelidir.)"

        result = {
            'success': True,
            'title': f"{code} Arıza Kodu",
            'technical_desc': technical_desc,
            'desc': simplified_desc
        }

        # Save to history if user is authenticated
        user_id = get_user_from_token()
        if user_id:
            save_history(user_id, 'obd', f"{code} Arıza Kodu", technical_desc)

        return jsonify(result)

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
                pad = 50
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
            # Sadece ezik(0), çizik(1), çatlak(2) → cam/lamba/lastik ışık yansımalarından hatalı sonuç veriyor
            sonuc = damage_model.predict(
                source=tmp_yolu,
                conf=0.25,          # Dengelenmiş eşik: düşük=fazla yanlış, yüksek=gerçek hasarı kaçırır
                iou=0.45,
                classes=[0, 1, 2],  # 0:dent, 1:scratch, 2:crack (glass/lamp/tire hariç)
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

                    # Bounding box koordinatları (oransal)
                    x1, y1, x2, y2 = [float(v) for v in box.xyxyn[0]]

                    # Çok küçük alanları filtrele (kapı arası boşluklar, yansıma gürültüsü)
                    area = (x2 - x1) * (y2 - y1)
                    if area < 0.002:  # Görüntü alanının %0.2'sinden küçükse atla
                        continue

                    siddet   = _hasar_siddeti(guven)

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

    # Save to history if user is authenticated
    user_id = get_user_from_token()
    if user_id and toplam_hasar > 0:
        hasar_listesi = []
        for s in tum_sonuclar:
            for t in s.get('tespitler', []):
                hasar_listesi.append(t.get('etiket', ''))
        title = f"{toplam_hasar} Hasar Tespit Edildi"
        summary = ', '.join(hasar_listesi[:5])
        save_history(user_id, 'damage', title, summary)

    return jsonify({
        'success':         True,
        'goruntu_sayisi':  len(goruntular),
        'toplam_hasar':    toplam_hasar,
        'sonuclar':        tum_sonuclar,
    })


# ── Analiz Geçmişi Endpoint ──────────────────────────────────────────────
@app.route('/history', methods=['GET'])
def get_history():
    """Kullanıcının analiz geçmişini döner."""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': 'Yetkilendirme gerekli.'}), 401

    analysis_type = request.args.get('type')  # 'price', 'obd', 'damage' or None for all

    try:
        conn = sqlite3.connect('users.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        if analysis_type:
            cursor.execute(
                'SELECT * FROM analysis_history WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 50',
                (user_id, analysis_type)
            )
        else:
            cursor.execute(
                'SELECT * FROM analysis_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
                (user_id,)
            )

        rows = cursor.fetchall()
        conn.close()

        history = []
        for row in rows:
            history.append({
                'id': row['id'],
                'type': row['type'],
                'title': row['title'],
                'summary': row['summary'],
                'created_at': row['created_at'],
            })

        return jsonify({'success': True, 'history': history})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/history', methods=['DELETE'])
def clear_history():
    """Kullanıcının tüm analiz geçmişini siler."""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': 'Yetkilendirme gerekli.'}), 401

    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM analysis_history WHERE user_id = ?', (user_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Geçmiş temizlendi.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Araç Tavsiye Sistemi ─────────────────────────────────────────────────
@app.route('/recommend', methods=['POST'])
def recommend_vehicle():
    """Kullanıcı tercihlerine göre DB + AI hibrit araç tavsiyesi."""
    data = request.json or {}

    # Kullanıcıdan gelen filtreler
    min_fiyat = data.get('min_fiyat')
    max_fiyat = data.get('max_fiyat')
    max_km = data.get('max_km')
    min_yil = data.get('min_yil')
    yakit = data.get('yakit_tipi')
    vites = data.get('vites_tipi')
    tercihler = data.get('tercihler', '')  # Serbest metin: "performanslı, az arızalı, konforlu"

    if not tercihler and not max_fiyat:
        return jsonify({'success': False, 'error': 'Lütfen en az bütçe veya tercih belirtin.'}), 400

    # 1. AŞAMA: SQL ile DB'den aday araçları filtrele
    try:
        conn = sqlite3.connect('asistan.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        query = "SELECT DISTINCT marka, seri, model, yil, yakit_tipi, vites_tipi, kilometre, fiyat FROM arac_ilanlari WHERE 1=1"
        params = []

        if max_fiyat:
            query += " AND CAST(REPLACE(fiyat, '.', '') AS INTEGER) <= ?"
            params.append(int(max_fiyat))
        if min_fiyat:
            query += " AND CAST(REPLACE(fiyat, '.', '') AS INTEGER) >= ?"
            params.append(int(min_fiyat))
        if max_km:
            query += " AND CAST(REPLACE(kilometre, '.', '') AS INTEGER) <= ?"
            params.append(int(max_km))
        if min_yil:
            query += " AND yil >= ?"
            params.append(int(min_yil))
        if yakit and yakit != 'Farketmez':
            query += " AND yakit_tipi = ?"
            params.append(yakit)
        if vites and vites != 'Farketmez':
            query += " AND vites_tipi = ?"
            params.append(vites)

        # Farklı bütçe ve özelliklerdeki araçları yakalamak için rastgele sırala (sadece en ucuzları almasın)
        query += " ORDER BY RANDOM() LIMIT 200"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return jsonify({
                'success': True,
                'message': 'Filtrelere uygun araç bulunamadı. Bütçe aralığını veya kilometre limitini genişletmeyi deneyin.',
                'recommendations': []
            })

        # Benzersiz marka-seri kombinasyonlarını çıkar ve fiyat aralıklarını hesapla
        unique_cars = {}
        for row in rows:
            key = f"{row['marka']} {row['seri']}"
            fiyat_str = str(row['fiyat']).replace('.', '') if row['fiyat'] else '0'
            fiyat_int = int(fiyat_str) if fiyat_str.isdigit() else 0
            
            if key not in unique_cars:
                unique_cars[key] = {
                    'marka': row['marka'],
                    'seri': row['seri'],
                    'model': row['model'],
                    'yakit_tipi': row['yakit_tipi'] or 'Belirtilmemiş',
                    'vites_tipi': row['vites_tipi'] or 'Belirtilmemiş',
                    'kilometre': row['kilometre'],
                    'fiyatlar': [fiyat_int],
                    'yillar': [row['yil']]
                }
            else:
                unique_cars[key]['fiyatlar'].append(fiyat_int)
                unique_cars[key]['yillar'].append(row['yil'])
                
        # Fiyatları ve Yılları min-max aralığına çevir
        for key in unique_cars:
            fiyatlar = [f for f in unique_cars[key]['fiyatlar'] if f > 0]
            if not fiyatlar:
                unique_cars[key]['fiyat'] = 'Belirtilmemiş'
            elif len(fiyatlar) > 1:
                min_f = min(fiyatlar)
                max_f = max(fiyatlar)
                if min_f != max_f:
                    unique_cars[key]['fiyat'] = f"{min_f:,} - {max_f:,}".replace(',', '.')
                else:
                    unique_cars[key]['fiyat'] = f"{min_f:,}".replace(',', '.')
            else:
                unique_cars[key]['fiyat'] = f"{fiyatlar[0]:,}".replace(',', '.')
            del unique_cars[key]['fiyatlar']

            yillar = [y for y in unique_cars[key]['yillar'] if y]
            if not yillar:
                unique_cars[key]['yil'] = 'Belirtilmemiş'
            else:
                min_y = min(yillar)
                max_y = max(yillar)
                unique_cars[key]['yil'] = f"{min_y}-{max_y}" if min_y != max_y else str(min_y)
            del unique_cars[key]['yillar']

        # AI kotasını aşmamak için en fazla 15 farklı aracı gönder (30 araç token limitini dolduruyor olabilir)
        aday_listesi = list(unique_cars.values())[:15]

        # 2. AŞAMA: Gemini AI ile akıllı sıralama ve tavsiye
        if not client:
            # AI yoksa sadece DB sonuçlarını döndür
            return jsonify({
                'success': True,
                'message': f'{len(aday_listesi)} araç bulundu (AI analizi devre dışı).',
                'recommendations': aday_listesi[:5]
            })

        araclar_str = "\n".join([
            f"- {a['marka']} {a['seri']} {a['model']} ({a['yil']}) | {a['yakit_tipi']} | {a['vites_tipi']} | {a['kilometre']} km | {a['fiyat']} TL"
            for a in aday_listesi
        ])

        prompt = f"""Sen Türkiye otomotiv pazarında uzman bir danışmansın. 

Kullanıcının tercihleri:
- Bütçe: {min_fiyat or 'belirtilmemiş'} - {max_fiyat or 'belirtilmemiş'} TL
- Maksimum KM: {max_km or 'farketmez'}
- Minimum Yıl: {min_yil or 'farketmez'}
- Yakıt: {yakit or 'farketmez'}
- Vites: {vites or 'farketmez'}
- Özel tercihler: {tercihler if tercihler else 'belirtilmemiş'}

Veritabanımızdaki uygun araç adayları:
{araclar_str}

GÖREV: Bu adaylar arasından en iyi 5 tavsiyeyi seç. Her tavsiye için:
1. Kullanıcının özel tercihlerine (performans, konfor, güvenilirlik, kronik arıza durumu vb.) ne kadar uygun olduğunu değerlendir
2. O aracın bilinen güçlü/zayıf yanlarını, kronik sorunlarını, sürüş deneyimini ve piyasa değerini kısa belirt
3. Neden bu aracı önerdiğini açıkla

YANITINI TAM OLARAK ŞÖYLE JSON FORMATINDA VER (başka hiçbir şey yazma):
[
  {{
    "marka": "...",
    "seri": "...",
    "model": "...",
    "yil": "...",
    "puan": 95,
    "neden": "Bu aracı tercih etmeniz için 2-3 cümlelik açıklama",
    "guclu": "Güçlü yanları (kısa)",
    "zayif": "Zayıf yanları veya dikkat edilmesi gerekenler (kısa)",
    "fiyat": "..."
  }}
]
5 araç öner. Puanı 0-100 arasında ver."""

        try:
            resp = client.models.generate_content(model='gemini-2.5-flash-lite', contents=prompt)
            ai_text = resp.text.strip()

            # JSON'u parse et
            if '```json' in ai_text:
                ai_text = ai_text.split('```json')[1].split('```')[0].strip()
            elif '```' in ai_text:
                ai_text = ai_text.split('```')[1].split('```')[0].strip()

            recommendations = json.loads(ai_text)

            return jsonify({
                'success': True,
                'message': f'{len(rows)} araç filtrelendi, AI ile en iyi {len(recommendations)} tavsiye seçildi.',
                'total_filtered': len(rows),
                'recommendations': recommendations
            })

        except Exception as e:
            print(f"AI tavsiye hatası DETAYI: {e}")
            if 'resp' in locals() and hasattr(resp, 'text'):
                print(f"AI Yanıtı: {resp.text}")
            
            # AI başarısız olursa ham sonuçları dön
            return jsonify({
                'success': True,
                'message': f'{len(aday_listesi)} araç bulundu (AI analizi başarısız).',
                'recommendations': [
                    {**a, 'puan': 0, 'neden': 'AI analizi yapılamadı (Kota aşımı veya sunucu hatası).', 'guclu': '-', 'zayif': '-'}
                    for a in aday_listesi[:5]
                ]
            })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Araç Yönetimi Endpoint'leri ──────────────────────────────────────────
@app.route('/vehicles', methods=['GET'])
def get_vehicles():
    """Kullanıcının kayıtlı araçlarını döner."""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': 'Yetkilendirme gerekli.'}), 401

    try:
        conn = sqlite3.connect('users.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC', (user_id,))
        rows = cursor.fetchall()
        conn.close()

        vehicles = []
        for row in rows:
            vehicles.append({
                'id': row['id'],
                'marka': row['marka'],
                'seri': row['seri'],
                'model': row['model'],
                'yil': row['yil'],
                'kilometre': row['kilometre'],
                'yakit_tipi': row['yakit_tipi'],
                'vites_tipi': row['vites_tipi'],
                'photos': json_lib.loads(row['photos']) if row['photos'] else [],
                'created_at': row['created_at'],
            })

        return jsonify({'success': True, 'vehicles': vehicles})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/vehicles', methods=['POST'])
def add_vehicle():
    """Yeni araç ekler."""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': 'Yetkilendirme gerekli.'}), 401

    data = request.json
    required = ['marka', 'seri', 'model', 'yil', 'kilometre', 'yakit_tipi', 'vites_tipi']
    for field in required:
        if not data.get(field):
            return jsonify({'success': False, 'error': f'{field} alanı zorunlu.'}), 400

    # Photos: array of base64 strings (thumbnails), max 5
    photos = data.get('photos', [])
    if len(photos) > 5:
        photos = photos[:5]

    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO vehicles (user_id, marka, seri, model, yil, kilometre, yakit_tipi, vites_tipi, photos)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (user_id, data['marka'], data['seri'], data['model'],
             int(data['yil']), int(data['kilometre']),
             data['yakit_tipi'], data['vites_tipi'],
             json_lib.dumps(photos))
        )
        conn.commit()
        vehicle_id = cursor.lastrowid
        conn.close()

        return jsonify({'success': True, 'message': 'Araç eklendi.', 'vehicle_id': vehicle_id})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/vehicles/<int:vehicle_id>', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    """Araç siler."""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': 'Yetkilendirme gerekli.'}), 401

    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM vehicles WHERE id = ? AND user_id = ?', (vehicle_id, user_id))
        conn.commit()
        deleted = cursor.rowcount
        conn.close()

        if deleted == 0:
            return jsonify({'success': False, 'error': 'Araç bulunamadı.'}), 404

        return jsonify({'success': True, 'message': 'Araç silindi.'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/vehicles/<int:vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    """Araç bilgilerini günceller."""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': 'Yetkilendirme gerekli.'}), 401

    data = request.json
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()

        # Check ownership
        cursor.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', (vehicle_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Araç bulunamadı.'}), 404

        # Build update query dynamically
        fields = []
        values = []
        for field in ['marka', 'seri', 'model', 'yil', 'kilometre', 'yakit_tipi', 'vites_tipi']:
            if field in data:
                fields.append(f'{field} = ?')
                values.append(data[field])
        if 'photos' in data:
            photos = data['photos'][:5]
            fields.append('photos = ?')
            values.append(json_lib.dumps(photos))

        if fields:
            values.append(vehicle_id)
            cursor.execute(f'UPDATE vehicles SET {", ".join(fields)} WHERE id = ?', values)
            conn.commit()

        conn.close()
        return jsonify({'success': True, 'message': 'Araç güncellendi.'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
