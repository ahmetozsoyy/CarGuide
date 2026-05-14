import sqlite3
c = sqlite3.connect('asistan.db').cursor()
c.execute('SELECT DISTINCT marka FROM arac_ilanlari ORDER BY marka')
markalar = [x[0] for x in c.fetchall()]
print(f'{len(markalar)} marka:', markalar[:20])
c.execute('SELECT DISTINCT yakit_tipi FROM arac_ilanlari')
print('Yakit:', [x[0] for x in c.fetchall()])
c.execute('SELECT DISTINCT vites_tipi FROM arac_ilanlari')
print('Vites:', [x[0] for x in c.fetchall()])
c.execute('SELECT MIN(yil),MAX(yil) FROM arac_ilanlari')
print('Yil aralik:', c.fetchall())
