from ultralytics import YOLO

try:
    print("Yükleniyor...")
    model = YOLO("trained.pt")
    print("\nModel başarıyla yüklendi!")
    print("Sınıflar (Classes):")
    for i, name in model.names.items():
        print(f"  ID {i}: {name}")
except Exception as e:
    print("\n[HATA]: Model yüklenirken bir sorun oluştu.")
    print(e)
