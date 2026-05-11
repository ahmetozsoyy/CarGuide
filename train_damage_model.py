"""
CarDD (Car Damage Detection) - YOLOv8 Model Eğitim Scripti
============================================================
Bu script:
1. CarDD veri setini Roboflow API üzerinden otomatik olarak indirir
2. YOLOv8m (medium) modelini ince ayar (fine-tune) ile eğitir
3. Eğitilen modeli 'damage_model.pt' olarak kaydeder (ve Google Drive'a kopyalar)

Çalıştırmadan önce:
  pip install ultralytics roboflow
  $env:ROBOFLOW_API_KEY = "YOUR_KEY"   (PowerShell)
  veya .env dosyasına ROBOFLOW_API_KEY=... ekleyin

Roboflow CarDD projesi: car-damage-det/car-damage-detection/4
(Ücretsiz hesapla erişilebilir - universe.roboflow.com)
"""

import os
import sys
import shutil
import time
import zipfile
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Güvenilir ZIP indirici (yeniden deneme + devam) ─────────────────────────

def _indir_zip_retry(url: str, hedef_zip: str, max_deneme: int = 8):
    """Bağlantı kesilmelerine karşı yeniden deneme + byte-range ile devam destekli indirici."""
    for deneme in range(1, max_deneme + 1):
        try:
            mevcut = os.path.getsize(hedef_zip) if os.path.exists(hedef_zip) else 0
            baslik  = {"Range": f"bytes={mevcut}-"} if mevcut > 0 else {}
            print(f"  [İndirme] Deneme {deneme}/{max_deneme}  (offset: {mevcut} byte)")

            resp = requests.get(url, headers=baslik, stream=True, timeout=120)
            if resp.status_code not in (200, 206):
                print(f"  [UYARI] HTTP {resp.status_code}")
                time.sleep(8 * deneme); continue

            mod    = "ab" if mevcut > 0 and resp.status_code == 206 else "wb"
            toplam = int(resp.headers.get("Content-Length", 0)) + (mevcut if mod == "ab" else 0)

            with open(hedef_zip, mod) as f:
                indir = mevcut
                for chunk in resp.iter_content(chunk_size=131072):
                    if chunk:
                        f.write(chunk)
                        indir += len(chunk)
                        yuzde  = int(indir / toplam * 100) if toplam else 0
                        print(f"\r  İlerleme: {yuzde}%  ({indir//1024} KB)", end="", flush=True)
            print()
            return True
        except Exception as e:
            print(f"\n  [HATA] {e}")
            bekle = 15 * deneme
            print(f"  {bekle} sn bekleniyor...")
            time.sleep(bekle)
    raise RuntimeError(f"{max_deneme} denemede indirme tamamlanamadı.")


# ── Dataset indir ────────────────────────────────────────────────────────────

def indir_cardd_dataseti(api_key: str, hedef_klasor: str = "./cardd_dataset") -> str:
    """CarDD veri setini Roboflow REST API üzerinden indirir, data.yaml yolunu döner."""
    hedef = Path(hedef_klasor)

    # Daha önce indirilmiş mi?
    yaml_adaylar = list(hedef.rglob("data.yaml"))
    if yaml_adaylar:
        print(f"[BİLGİ] Veri seti zaten mevcut: {yaml_adaylar[0]}")
        return str(yaml_adaylar[0])

    print("[BİLGİ] CarDD veri seti indiriliyor (6 sınıf, ~2850 görüntü)...")

    # Doğrudan Roboflow REST API ile ZIP export URL al
    api_url = f"https://api.roboflow.com/acxiomkmc-hjkie/cardd-zemgu/1/yolov8?api_key={api_key}"
    print("  Export metadata alınıyor...")
    resp = requests.get(api_url, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # 'export.link' anahtarındaki portal linkini al
    portal_link = data.get("export", {}).get("link")
    if not portal_link:
        raise RuntimeError(f"Portal linki alınamadı. Yanıt: {data}")
    
    print(f"  Portal linki alındı: {portal_link}")
    
    # Portal linkini takip et (redirect) ve gerçek ZIP URL'sini bul
    # Roboflow'un portal linki genellikle 302 ile Google Storage linkine yönlendirir
    print("  Gerçek indirme bağlantısı doğrulanıyor...")
    head_resp = requests.head(portal_link, allow_redirects=True, timeout=30)
    zip_url = head_resp.url
    
    print(f"  ZIP URL alındı.")

    hedef.mkdir(parents=True, exist_ok=True)
    hedef_zip = str(hedef / "cardd.zip")

    # Kendi güvenilir metodumuzla indir
    _indir_zip_retry(zip_url, hedef_zip)

    print("[BİLGİ] ZIP açılıyor...")
    with zipfile.ZipFile(hedef_zip, 'r') as z:
        z.extractall(str(hedef))
    
    # ZIP'i temizle
    try:
        os.remove(hedef_zip)
    except:
        pass

    # data.yaml bul
    yaml_adaylar = list(hedef.rglob("data.yaml"))
    if not yaml_adaylar:
        # Bazı durumlarda dosyalar alt klasörlerde olabilir, onları ana dizine taşıyalim
        # Ya da sadece yolu dönelim
        raise FileNotFoundError(f"data.yaml bulunamadı: {hedef}")
    
    yaml_yolu = str(yaml_adaylar[0])
    print(f"[BİLGİ] Veri seti hazir -> {yaml_yolu}")
    return yaml_yolu


# ── Sınıf isimlerini Türkçe'ye çeviren yardımcı ──────────────────────────

SINIF_CEVIRISI = {
    # Roboflow CarDD sınıf isimleri → Türkçe
    "dent":          "Ezik / Göçük",
    "scratch":       "Çizik",
    "crack":         "Çatlak",
    "glass shatter": "Cam Kırığı",
    "lamp broken":   "Lamba Hasarı",
    "tire flat":     "Lastik Hasarı",
    # Alternatif yazımlar
    "Dent":          "Ezik / Göçük",
    "Scratch":       "Çizik",
    "Crack":         "Çatlak",
    "Glass Shatter": "Cam Kırığı",
    "Lamp Broken":   "Lamba Hasarı",
    "Tire Flat":     "Lastik Hasarı",
}


def data_yaml_guncelle(yaml_yolu: str):
    """data.yaml içindeki names listesini Türkçe ile eşleştirir (meta bilgi olarak)."""
    import yaml

    with open(yaml_yolu, "r", encoding="utf-8") as f:
        veri = yaml.safe_load(f)

    print(f"[BİLGİ] Veri setindeki sınıflar: {veri.get('names', [])}")
    return veri.get("names", [])


# ── Model Eğitimi ────────────────────────────────────────────────────────

def egit(yaml_yolu: str, epochs: int = 100, img_size: int = 640):
    """YOLOv8m modelini CarDD üzerinde eğitir."""
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[HATA] 'ultralytics' paketi bulunamadı. pip install ultralytics")
        sys.exit(1)

    print("\n" + "="*60)
    print("  YOLOv8m Eğitimi Başlıyor")
    print("="*60)
    print(f"  Veri seti  : {yaml_yolu}")
    print(f"  Epoch      : {epochs}")
    print(f"  Görüntü    : {img_size}x{img_size}")
    print("="*60 + "\n")

    # Check for existing checkpoint to resume
    checkpoint_yolu = Path("runs/hasar_tespiti/egitim/weights/last.pt")
    resume_modu = checkpoint_yolu.exists()

    if resume_modu:
        print(f"\n[BİLGİ] Mevcut eğitim bulundu, kaldığı yerden devam ediliyor: {checkpoint_yolu}")
        model = YOLO(str(checkpoint_yolu))
    else:
        model = YOLO("yolov8m.pt")   # Sıfırdan başla

    sonuclar = model.train(
        data=yaml_yolu,
        epochs=epochs,
        imgsz=img_size,
        batch=-1,                # Otomatik batch ayarı (GPU belleğine göre)
        patience=20,
        optimizer="AdamW",
        resume=resume_modu,      # Varsa devam et
        project="runs/hasar_tespiti",
        name="egitim",
        exist_ok=True,
        device="0" if _gpu_var() else "cpu",
        verbose=True,
    )

    # En iyi modeli proje köküne kopyala
    en_iyi = Path("runs/hasar_tespiti/egitim/weights/best.pt")
    hedef  = Path("damage_model.pt")

    if en_iyi.exists():
        shutil.copy(str(en_iyi), str(hedef))
        print(f"\n[BAŞARI] Model kaydedildi → {hedef.resolve()}")
        
        # Google Drive'a kaydet (Colab veya Windows)
        drive_paths = [
            Path("/content/drive/MyDrive/damage_model.pt"), # Colab
            Path("G:/My Drive/damage_model.pt"),            # Windows TR
            Path("G:/Drive/damage_model.pt")                # Windows EN
        ]
        for dp in drive_paths:
            if dp.parent.exists():
                shutil.copy(str(en_iyi), str(dp))
                print(f"[BAŞARI] Model Drive'a da kopyalandı → {dp}")
                break
    else:
        print("[UYARI] 'best.pt' bulunamadı. runs/ klasörünü kontrol edin.")

    _dogrulama_raporu(sonuclar)
    return sonuclar


def _gpu_var() -> bool:
    """CUDA GPU mevcut mu?"""
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


def _dogrulama_raporu(sonuclar):
    """Eğitim metriklerini Türkçe özetle."""
    print("\n" + "="*60)
    print("  Eğitim Sonucu Özeti")
    print("="*60)
    try:
        box = sonuclar.results_dict
        print(f"  mAP50        : {box.get('metrics/mAP50(B)', 'N/A'):.4f}")
        print(f"  mAP50-95     : {box.get('metrics/mAP50-95(B)', 'N/A'):.4f}")
        print(f"  Kesinlik (P) : {box.get('metrics/precision(B)', 'N/A'):.4f}")
        print(f"  Duyarlılık (R): {box.get('metrics/recall(B)', 'N/A'):.4f}")
    except Exception:
        print("  Metrikler doğrudan erişilemedi. runs/ klasörünü inceleyin.")
    print("="*60 + "\n")


# ── Ana Akış ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # API key: ortam değişkeni veya argüman
    api_key = os.environ.get("ROBOFLOW_API_KEY") or (sys.argv[1] if len(sys.argv) > 1 else None)

    if not api_key:
        print(
            "\n[HATA] Roboflow API key bulunamadı!\n"
            "  Seçenek 1: $env:ROBOFLOW_API_KEY = 'key_buraya'\n"
            "  Seçenek 2: python train_damage_model.py <api_key>\n"
            "  API key almak için: https://app.roboflow.com/settings/api\n"
        )
        sys.exit(1)

    # 1. Veri setini indir
    yaml_yolu = indir_cardd_dataseti(api_key=api_key, hedef_klasor="./cardd_dataset")

    # 2. Mevcut sınıf isimlerini göster
    siniflar = data_yaml_guncelle(yaml_yolu)

    print("\n[BİLGİ] Türkçe sınıf eşlemeleri:")
    for s in siniflar:
        tr = SINIF_CEVIRISI.get(s, s)
        print(f"  {s:20s} -> {tr}")

    # 3. Modeli eğit (Ortalama bir süre ve iyi bir isabet oranı için)
    egit(yaml_yolu=yaml_yolu, epochs=100, img_size=640)

    print("\n[TAMAMLANDI] Modeli API'da kullanmak için api.py'yi çalıştırın.")
