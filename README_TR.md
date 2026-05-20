# AutoAssistant (CarGuide)

[🇬🇧 English Version](README.md)

İkinci el araç pazarındaki bilgi eksikliğini ve belirsizliği (fiyat manipülasyonu, gizli hasarlar, anlaşılamayan arızalar) gidermek amacıyla geliştirilmiş, uçtan uca yapay zeka destekli akıllı otomotiv danışmanlık ve yönetim platformu. 

## 🚀 Öne Çıkan Özellikler

* **Görüntü İşleme ile Hasar Tespiti:** Eğitilmiş **YOLOv11** modeli kullanılarak kaporta hasarlarını (çizik, göçük, çatlak) bilgisayarlı görü ile tespit eder ve hasar şiddetini derecelendirir. Ekspertiz öncesi ön kontrol imkanı sunar.
* **Yapay Zeka Destekli Fiyat Tahmini:** Veritabanındaki geçmiş ilan verileri üzerinden eğitilmiş **Scikit-learn** regresyon algoritmasıyla araçların adil piyasa değerini hesaplar.
* **Akıllı OBD-II Arıza Kodu Yorumlama:** Yalnızca ustaların anlayabildiği teknik motor hata kodlarını (DTC), **Google Gemini AI** yardımıyla normal bir kullanıcının anlayacağı sade ve profesyonel bir dile çevirir. Çözüm önerisi sunar.
* **Kişiselleştirilmiş Hibrit Araç Öneri Motoru:** Bütçe, kilometre, yıl gibi katı SQL filtrelemeleri ile "konfor, estetik, dayanıklılık" gibi soyut kavramları değerlendirebilen Üretken Yapay Zeka (Gemini) analizini birleştirerek en ideal araçları kullanıcılara tavsiye eder.

## 🛠️ Kullanılan Teknolojiler

* **Frontend (Mobil Arayüz):** React Native, Expo, Glassmorphism tarzında Premium/Modern arayüz tasarımı.
* **Backend:** Python, Flask, REST API mimarisi, JWT tabanlı güvenli kimlik doğrulama.
* **Makine Öğrenmesi ve Yapay Zeka:** PyTorch, YOLOv11 (Bilgisayarlı Görü), Scikit-Learn (Tahminsel Modelleme), Google Gemini (Üretken Yapay Zeka / NLP).
* **Veri Yönetimi:** SQLite (İlişkisel yapı, kullanıcı hesapları, analiz geçmişi ve araç listeleri), Pandas.

## 🏗️ Mimari
Proje, ağır yapay zeka modellerinin (YOLO, ML modelleri) sunucu tarafında çalıştırılarak mobil uygulamanın işlemciyi yormadan hafif ve akıcı çalışmasını sağlayan performanslı "Edge-to-Cloud" mimarisi ile geliştirilmiştir.
