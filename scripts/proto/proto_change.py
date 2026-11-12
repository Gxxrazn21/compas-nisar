"""Prototipo: cambio entre dos browse GCOV reales de la misma pila. Uso: proto_change.py STACK lon lat outdir [fecha_a fecha_b]"""
import io
import json
import re
import sys
from pathlib import Path
import httpx
import numpy as np
from PIL import Image
from scipy import ndimage

CMR = 'https://cmr.earthdata.nasa.gov/search'
RANK = {'NISAR_L2_GCOV_V1': 3, 'NISAR_L2_GCOV_PROVISIONAL_V1': 2, 'NISAR_L2_GCOV_BETA_V1': 1}
stack, lon, lat, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), Path(sys.argv[4])
out.mkdir(parents=True, exist_ok=True)
client = httpx.Client(timeout=90, follow_redirects=True, headers={'User-Agent': 'nisar-explorer/0.1'})


def scenes():
    r = client.get(f'{CMR}/granules.umm_json', params={'short_name': 'NISAR_L2_GCOV*', 'options[short_name][pattern]': 'true', 'point': f'{lon},{lat}', 'attribute[]': f'string,STACK_ID,{stack}', 'page_size': 400, 'sort_key': 'start_date'})
    r.raise_for_status()
    best = {}
    for item in r.json()['items']:
        u = item['umm']
        date = u['TemporalExtent']['RangeDateTime']['BeginningDateTime'][:10]
        urls = [x['URL'] for x in u['RelatedUrls'] if x['URL'].startswith('https')]
        png = next((x for x in urls if x.endswith('_LATLON.png')), None)
        kml = next((x for x in urls if x.endswith('_LATLON.kml') and '/BROWSE/' in x), None)
        rank = RANK.get(u['CollectionReference'].get('ShortName'), 0)
        if png and (date not in best or rank > best[date]['rank']):
            best[date] = {'date': date, 'png': png, 'kml': kml, 'rank': rank, 'ur': u['GranuleUR'], 'col': u['CollectionReference'].get('ShortName')}
    return [best[d] for d in sorted(best)]


def load(scene):
    cache = out / (scene['ur'] + '.png')
    if not cache.exists():
        cache.write_bytes(client.get(scene['png']).content)
    kml = client.get(next(x['kml'] for x in sc if x['kml'])).text
    pts = [tuple(map(float, p.split(','))) for p in re.search(r'<coordinates>([^<]+)</coordinates>', kml).group(1).split()]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    a = np.asarray(Image.open(cache).convert('RGB'))
    return a, (min(xs), min(ys), max(xs), max(ys))


def to_grid(a, box, grid_box, shape):
    """Remuestrea al grid común por vecino más cercano."""
    h, w = shape
    west, south, east, north = grid_box
    xs = west + (np.arange(w) + .5) * (east - west) / w
    ys = north - (np.arange(h) + .5) * (north - south) / h
    col = np.floor((xs - box[0]) / (box[2] - box[0]) * a.shape[1]).astype(int)
    row = np.floor((box[3] - ys) / (box[3] - box[1]) * a.shape[0]).astype(int)
    ok_c, ok_r = (col >= 0) & (col < a.shape[1]), (row >= 0) & (row < a.shape[0])
    res = np.zeros((h, w, 3), np.uint8)
    res[np.ix_(ok_r, ok_c)] = a[np.ix_(row[ok_r], col[ok_c])]
    return res


sc = scenes()
print('fechas:', [(s['date'], s['col'][13:]) for s in sc])
da, db = (sys.argv[5], sys.argv[6]) if len(sys.argv) > 6 else (sc[0]['date'], sc[-1]['date'])
A, B = next(s for s in sc if s['date'] == da), next(s for s in sc if s['date'] == db)
a, box_a = load(A)
b, box_b = load(B)
print('A', A['ur'], a.shape, box_a)
print('B', B['ur'], b.shape, box_b)
res_a = ((box_a[2] - box_a[0]) / a.shape[1], (box_a[3] - box_a[1]) / a.shape[0])
res_b = ((box_b[2] - box_b[0]) / b.shape[1], (box_b[3] - box_b[1]) / b.shape[0])
print('res A', res_a, 'res B', res_b)
gb = (max(box_a[0], box_b[0]), max(box_a[1], box_b[1]), min(box_a[2], box_b[2]), min(box_a[3], box_b[3]))
w = int(round((gb[2] - gb[0]) / res_a[0])); h = int(round((gb[3] - gb[1]) / res_a[1]))
ga, gbb = to_grid(a, box_a, gb, (h, w)), to_grid(b, box_b, gb, (h, w))
valid = (ga.max(axis=2) > 0) & (gbb.max(axis=2) > 0)
print('grid', (h, w), 'valid frac', valid.mean().round(3))


def db_like(dn):
    """Brillo browse → dB relativo bajo la hipótesis DN ∝ sqrt(potencia)."""
    return 20 * np.log10(np.maximum(dn.astype(float), 1) / 255)


def smooth(x, valid, size=5):
    num = ndimage.uniform_filter(np.where(valid, x, 0.0), size)
    den = ndimage.uniform_filter(valid.astype(float), size)
    return np.where(den > .5, num / np.maximum(den, 1e-6), 0.0)


stats = {}
deltas = {}
for name, ch in (('HH', 0), ('HV', 1)):
    pa, pb = smooth(ga[..., ch].astype(float), valid), smooth(gbb[..., ch].astype(float), valid)
    d = db_like(pb) - db_like(pa)
    sat = (ga[..., ch] <= 2) | (gbb[..., ch] <= 2) | (ga[..., ch] >= 254) | (gbb[..., ch] >= 254)
    med = np.median(d[valid & ~sat])
    d = d - med
    deltas[name] = d
    v = d[valid]
    stats[name] = {'offset_removed': round(float(med), 3), 'p5': round(float(np.percentile(v, 5)), 2), 'p95': round(float(np.percentile(v, 95)), 2), 'dec3': round(float((v <= -3).mean()), 4), 'inc3': round(float((v >= 3).mean()), 4), 'std': round(float(v.std()), 2)}
print(json.dumps(stats, indent=1))

# Correlación entre fechas como prueba de alineación
ha, hb = ga[..., 0].astype(float)[valid], gbb[..., 0].astype(float)[valid]
print('corr HH', np.corrcoef(ha, hb)[0, 1].round(3))
for shift in ((0, 1), (1, 0), (0, 3), (3, 0)):
    sb = np.roll(gbb[..., 0].astype(float), shift, axis=(0, 1))
    print(' corr con desplazamiento', shift, np.corrcoef(ga[..., 0].astype(float)[valid], sb[valid])[0, 1].round(3))


def ramp(d, lo=-8, hi=8):
    t = np.clip((d - lo) / (hi - lo), 0, 1)[..., None]
    stops = np.array([[0, 180, 216], [120, 220, 232], [20, 24, 32], [255, 170, 90], [255, 80, 60]], float)
    pos = t * (len(stops) - 1)
    i = np.minimum(pos.astype(int), len(stops) - 2)
    f = pos - i
    return (stops[i[..., 0]] * (1 - f) + stops[i[..., 0] + 1] * f).astype(np.uint8)


scale = 900 / max(h, w)
size = (int(w * scale), int(h * scale))
Image.fromarray(ga).resize(size).save(out / 'before.png')
Image.fromarray(gbb).resize(size).save(out / 'after.png')
rgba = np.dstack([ramp(deltas['HH']), np.where(valid, 255, 0).astype(np.uint8)])
Image.fromarray(rgba).resize(size).save(out / 'change_hh.png')
rgba = np.dstack([ramp(deltas['HV']), np.where(valid, 255, 0).astype(np.uint8)])
Image.fromarray(rgba).resize(size).save(out / 'change_hv.png')
comp = np.dstack([gbb[..., 0], ga[..., 0], ga[..., 0]])
Image.fromarray(comp).resize(size).save(out / 'composite.png')
print('ok', out)
