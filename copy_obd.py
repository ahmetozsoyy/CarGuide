import sqlite3
import pandas as pd

try:
    # Connect to both databases
    conn_old = sqlite3.connect('asistan-eski.db')
    conn_new = sqlite3.connect('asistan.db')

    # Read obd_kodlari from old DB into pandas
    df_obd = pd.read_sql_query("SELECT * FROM obd_kodlari", conn_old)

    # Write to new DB
    df_obd.to_sql('obd_kodlari', conn_new, if_exists='replace', index=False)

    print("OBD kodları başarıyla eski veritabanından yeni veritabanına kopyalandı!")

except Exception as e:
    print(f"Hata oluştu: {e}")

finally:
    conn_old.close()
    conn_new.close()
