# Tez Sunumu: Yapay Zeka Destekli Otomotiv Asistanı (AutoAssistant)

Bu doküman, bitirme tezi/proje sunumunuzda kullanabileceğiniz, projenizin tüm boyutlarını akademik ve profesyonel bir dille özetleyen bir taslaktır. Sunum slaytlarınızı hazırlarken bu başlıkları referans alabilirsiniz.

---

## 1. Projenin Amacı
Projenin temel amacı; araç sahipleri, alıcılar ve satıcılar için uçtan uca hizmet veren, akıllı bir otomotiv yönetim ve danışmanlık platformu geliştirmektir. 
- İkinci el araç alım-satım süreçlerindeki bilgi asimetrisini (fiyat belirsizliği, gizli kaporta hasarları, anlaşılamayan motor arızaları) modern yapay zeka teknolojileri ile en aza indirmek hedeflenmiştir.
- Araç bakım, teşhis ve değerleme süreçlerini son kullanıcılar için şeffaf, güvenilir ve kolay erişilebilir bir mobil deneyime dönüştürmek projenin ana motivasyonudur.

## 2. Genel İçerik ve Karşılanan İhtiyaçlar
Proje, otomotiv sektöründeki spesifik problemleri çözmeye yönelik 4 ana modülden oluşmaktadır:
* **Yapay Zeka Destekli Fiyat Tahmini:** İkinci el piyasasındaki fiyat manipülasyonlarını önler. Araç özelliklerine göre veriye dayalı, adil piyasa değeri hesaplayarak alıcı ve satıcıya rehberlik eder.
* **Görüntü İşleme ile Hasar Tespiti:** Gözden kaçabilecek veya gizlenmeye çalışılan kaporta hasarlarını (çizik, göçük vb.) bilgisayarlı görü ile tespit ederek ekspertiz öncesi güvenilir bir ön kontrol imkanı sunar.
* **Akıllı OBD-II Hata Kodu Yorumlama:** Sadece teknik servislerin anlayabildiği karmaşık motor arıza kodlarını (DTC), yapay zeka yardımıyla son kullanıcının anlayacağı sade bir dille açıklar ve çözüm önerileri sunar.
* **Kişiselleştirilmiş Araç Öneri Motoru:** Kullanıcıların bütçe ve spesifik beklentilerine (konfor, performans, güvenilirlik) en uygun araçları bularak kişisel bir otomotiv danışmanı gibi çalışır.

## 3. Materyal ve Yöntem (Teknik Bilgi)
Projenin mimarisinde modern, performanslı ve ölçeklenebilir yazılım teknolojileri kullanılmıştır:
* **Frontend (Mobil Arayüz):** Kullanıcı etkileşimini sağlamak için platformlar arası (iOS/Android) destek sunan **React Native** ve **Expo** framework'ü kullanılmıştır.
* **Backend (Sunucu Mimarisi):** Veri işleme ve yapay zeka modelleriyle iletişim için **Python** tabanlı, hızlı ve esnek bir API altyapısı tercih edilmiştir.
* **Makine Öğrenmesi (ML) & Derin Öğrenme:**
  * *Hasar Tespiti:* **PyTorch** üzerinde çalışan **YOLOv11** nesne tespiti modeli kullanıldı. Model, çeşitli hasar veri setleriyle eğitilmiş, doğruluk oranını artırmak için güven eşiği (confidence threshold) optimizasyonları ve GPU hızlandırması (CUDA) uygulanmıştır.
  * *Fiyat Tahmini:* Veritabanındaki (`asistan.db`) tarihsel araç verileri üzerinde makine öğrenmesi regresyon algoritmaları kullanılarak tahminsel modelleme yapılmıştır.
* **Üretken Yapay Zeka (GenAI):** Sistemde **Google Gemini AI** entegrasyonu mevcuttur. OBD-II kodlarının doğal dil işleme ile yorumlanması ve subjektif kullanıcı kriterlerine göre araç eşleştirmelerinin mantıksal açıklamaları için kullanılmıştır.
* **Veritabanı:** **SQLite** kullanılarak araç bilgileri, fiyat geçmişi ve kullanıcı verileri ilişkisel bir yapıda yönetilmiştir.

## 4. Projenin Yenilikçi Yanları
* **Çoklu Yapay Zeka Disiplinlerinin Birleşimi:** Bilgisayarlı Görü (Computer Vision), Tahminsel Modelleme (Predictive ML) ve Üretken Yapay Zekanın (Generative AI) tek bir mobil ekosistemde başarıyla bir araya getirilmesi.
* **Karmaşık Teknik Verinin Demokratikleştirilmesi:** Gemini AI kullanımı sayesinde, normalde teknik bilgi gerektiren arıza teşhis sürecinin herkesin anlayabileceği bir formata dönüştürülmesi.
* **Hibrit Öneri Sistemi:** Klasik filtreleme (SQL) yöntemleri ile yapay zekanın "konfor, estetik, dayanıklılık" gibi soyut/subjektif kavramları analiz etme yeteneğinin birleştirilmesi.
* **Performanslı Edge-to-Cloud Mimari:** Ağır yapay zeka modellerinin (YOLO) sunucu tarafında çalıştırılıp, mobil cihazın işlemcisini yormadan hafif bir son kullanıcı deneyimi sunulması.

## 5. Sektöre Katkısı ve Uygulanabilirliği
* **Sektöre Katkısı:** İkinci el araç pazarında "güven" sorununu teknoloji ile çözer. Bireysel kullanıcıları güçlendirerek sanayi/servis süreçlerinde bilinçli kararlar almalarını sağlar ve haksız fiyatlandırmaların önüne geçer.
* **Uygulanabilirliği:** Geliştirilen sistem yalnızca akademik bir kavram kanıtlama (Proof of Concept) değil; gerçek dünya verisiyle test edilmiş, API'leri yazılmış ve doğrudan son kullanıcıya sunulabilecek ticari potansiyeli yüksek, tam teşekküllü bir ürün prototipidir.

## 6. Esinlenilen ve Faydalanılan Kaynaklar
* **Veri Setleri:** Açık kaynaklı ikinci el araç fiyat veri setleri ve görsel hasar tespiti için kullanılan spesifik veri setleri (örn. CarDD).
* **Akademik ve Teknik Altyapı:** Ultralytics YOLOv11 resmi dokümantasyonları, PyTorch optimizasyon rehberleri.
* **Bulut ve AI Servisleri:** Google Gemini API dokümantasyonu ve Prompt Engineering (İstem Mühendisliği) yöntemleri.
* **Yazılım Geliştirme Kaynakları:** React Native/Expo topluluk kütüphaneleri ve Python backend geliştirme pratikleri.

## 7. Sonuç ve Genel Değerlendirme
AutoAssistant projesi; günümüzün en güçlü yapay zeka teknolojilerinin, günlük hayatta sıkça karşılaşılan pratik bir probleme (araç yönetimi ve güvenli alışveriş) nasıl yenilikçi bir çözüm getirebileceğinin başarılı bir örneğidir. Projenin geliştirilme sürecinde karşılaşılan makine öğrenmesi optimizasyon zorlukları (örneğin donanım hızlandırma ve model ince ayarları) aşılarak, kararlı ve yüksek doğrulukla çalışan entegre bir sistem ortaya konmuştur. Bu çalışma, hem farklı yapay zeka modellerinin mobil sistemlere entegrasyonu konusunda başarılı bir mühendislik pratiği sergilemekte, hem de otomotiv ekosistemine değer katacak inovatif bir ürün vizyonu sunmaktadır.
