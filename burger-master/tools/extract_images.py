import sys
from PIL import Image
lst=open(sys.argv[1]).read().splitlines()[2:]
rows=[l.split() for l in lst]
want={16:'base_pan',18:'corona_regular',20:'mostaza',22:'ketchup',25:'pepinillos',27:'carne_10_1',29:'cebolla_rehidratada',38:'queso_cheddar',46:'bigmac_corona',48:'bigmac_club',50:'lechuga',52:'salsa_bigmac',56:'carne_4_1',58:'corona_cuarto',60:'cebolla_fresca',66:'mayonesa',68:'tomate',78:'bacon_tiras',84:'pattie_pollo',88:'corona_papa',90:'filete_apanado',94:'spicy_pepper',102:'corona_muffin',104:'base_muffin',106:'huevo',108:'salchicha',126:'corona_brioche',128:'cebolla_grillada',138:'espiral_bbq',140:'cebolla_crispy',150:'salsa_tasty',152:'bacon_picado'}
done=set()
for i,r in enumerate(rows):
  num=int(r[1]); typ=r[2]; oid=int(r[10])
  if typ!='image' or oid not in want or oid in done: continue
  im=Image.open(f'{sys.argv[2]}/i-{num:03d}.png').convert('RGB')
  if i+1<len(rows) and rows[i+1][2]=='smask':
    m=Image.open(f'{sys.argv[2]}/i-{int(rows[i+1][1]):03d}.png').convert('L').resize(im.size)
    im.putalpha(m)
  im=im.convert('RGBA'); bb=im.getbbox()
  if bb: im=im.crop(bb)
  if im.width>260: im=im.resize((260,round(im.height*260/im.width)),Image.LANCZOS)
  im.save(f'{sys.argv[3]}/{want[oid]}.png',optimize=True); done.add(oid)
  print(oid,want[oid],im.size)
print(set(want)-done)
