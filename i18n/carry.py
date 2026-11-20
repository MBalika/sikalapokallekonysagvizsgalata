"""Fordítás-átvivő: a magyar forrás módosítása után a hiányzó egységekhez megkeresi a leghasonlóbb RÉGI magyar szöveget
és annak angol párját. Ha a változás csak a százalékjel előtti szóközt érinti, az angol pár automatikusan átmegy.
A többit kiírja (új HU / régi HU / régi EN), hogy a régi angolból kiindulva lehessen javítani.
Használat (a repó gyökeréből, sikertelen build után):
  python3 i18n/carry.py <régi_párok.txt> [--write]     # a régi párok: „id\\tfájl:sor\\tosztály / HU: … / EN: …” szerkezetű kivonat (i18n/pairs.mjs)
  python3 i18n/carry.py --prune                         # a fel nem használt sorok törlése a TSV-kből (előtte build!)"""
import sys, re, glob, difflib, subprocess, os
R = os.path.dirname(os.path.abspath(__file__))
def tsv():
    d = {}
    for f in sorted(glob.glob(R + '/en_b*.tsv')):
        for l in open(f, encoding='utf-8').read().split('\n'):
            k = l.find('\t')
            if k > 0: d[l[:k]] = (l[k + 1:], f)
    return d
if '--prune' in sys.argv:
    out = subprocess.run(['python3', 'build.py'], capture_output=True, text=True, cwd=os.path.dirname(R)).stdout
    m = re.search(r'fel nem használt: (\d+)', out); print(m.group(0) if m else out[-300:])
    ids = set(open(R + '/unused.txt', encoding='utf-8').read().split()) if os.path.exists(R + '/unused.txt') else set()
    n = 0
    for f in sorted(glob.glob(R + '/en_b*.tsv')):
        L = open(f, encoding='utf-8').read().split('\n'); K = [l for l in L if l.split('\t')[0] not in ids]; n += len(L) - len(K)
        open(f, 'w', encoding='utf-8').write('\n'.join(K))
    print('törölt sor:', n); sys.exit()
old = {}; cur = None
for l in open(sys.argv[1], encoding='utf-8'):
    l = l.rstrip('\n')
    if l.startswith('  HU: '): old[cur] = [l[6:], None]
    elif l.startswith('  EN: ') and cur in old: old[cur][1] = l[6:]
    elif '\t' in l: cur = l.split('\t')[0]
norm = lambda s: re.sub(r'[  ]%', '%', s)
T = tsv(); add = []; todo = []
for l in open(R + '/missing.tsv', encoding='utf-8').read().split('\n'):
    if not l.strip(): continue
    i, hu = l.split('\t')[:2]
    best = max(old.items(), key=lambda kv: difflib.SequenceMatcher(None, kv[1][0], hu).ratio() if kv[1][1] and abs(len(kv[1][0]) - len(hu)) < 0.6 * len(hu) + 20 else 0)
    r = difflib.SequenceMatcher(None, best[1][0], hu).ratio(); en = best[1][1]
    if en == '(=)': en = best[1][0]
    if norm(best[1][0]) == norm(hu): add.append(f'{i}\t{en}'); continue
    todo.append((i, hu, best[0], best[1][0], en, r))
print(f'automatikusan átvihető: {len(add)} · kézi: {len(todo)}')
for i, hu, oi, ohu, en, r in todo: print(f'\n{i}  (régi: {oi}, hasonlóság {r:.2f})\n  ÚJ HU: {hu}\n  RÉGI HU: {ohu}\n  RÉGI EN: {en}')
if '--write' in sys.argv and add:
    open(R + '/en_b09.tsv', 'a', encoding='utf-8').write('\n' + '\n'.join(add) + '\n'); print('beírva:', len(add))
