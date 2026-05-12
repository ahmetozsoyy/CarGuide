import sqlite3
conn = sqlite3.connect('asistan.db')
tables = conn.cursor().execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("asistan.db tables:", tables)
conn.close()

conn2 = sqlite3.connect('asistan-eski.db')
tables2 = conn2.cursor().execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("asistan-eski.db tables:", tables2)
conn2.close()
