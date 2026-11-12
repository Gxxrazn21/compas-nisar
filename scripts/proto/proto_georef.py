"""Valida la georreferencia por huella CMR frente al KML oficial y la estabilidad de la cuadrícula entre fechas."""
import re
import sys
from pathlib import Path
import httpx
import numpy as np
from PIL import Image

CMR = 'https://cmr.earthdata.nasa.gov/search'
stack, lon, lat, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), Path(sys.argv[4])
out.mkdir(parents=True, exist_ok=True)
c = httpx.Client(timeout=90, follow_redirects=True, headers={'User-Agent': 'nisar-explorer/0.1'})
r = c.get(f'{CMR}/granules.umm_json', params={'short_name': 'NISAR_L2_GCOV*', 'options[short_name][pattern]': 'true', 'point': f'{lon},{lat}', 'attribute[]': f'string,STACK_ID,{stack}', 'page_size': 400, 'sort_key': 'start_date'})
rows = []
for it in r.json()['items']:
    u = it['umm']
    urls = sorted({x['URL'] for x in u['RelatedUrls'] if x['URL'].startswith('https')})
    png = next((x for x in urls if x.endswith('_LATLON.png')), None)
    kml = next((x for x in urls if x.endswith('_LATLON.kml') and '/BROWSE/' in x), None)
    if not png:
        continue
    pts = u['SpatialExtent']['HorizontalSpatialDomain']['Geometry']['GPolygons'][0]['Boundary']['Points']
    xs, ys = [p['Longitude'] for p in pts], [p['Latitude'] for p in pts]
    rows.append({'date': u['TemporalExtent']['RangeDateTime']['BeginningDateTime'][:10], 'ur': u['GranuleUR'], 'png': png, 'kml': kml, 'foot': (min(xs), min(ys), max(xs), max(ys)), 'npts': len(pts)})
want = sys.argv[5:] or [x['date'] for x in rows]
for row in rows:
    if row['date'] not in want:
        continue
    f = out / (row['ur'] + '.png')
    if not f.exists():
        f.write_bytes(c.get(row['png']).content)
    a = np.asarray(Image.open(f).convert('RGB'))
    valid = a.max(axis=2) > 0
    h, w = valid.shape
    cols = np.where(valid.sum(axis=0) >= 3)[0]
    rws = np.where(valid.sum(axis=1) >= 3)[0]
    c0, c1, r0, r1 = cols[0], cols[-1] + 1, rws[0], rws[-1] + 1
    fw, fs, fe, fn = row['foot']
    sx, sy = (fe - fw) / (c1 - c0), (fn - fs) / (r1 - r0)
    est = (fw - c0 * sx, fn - r1 * sy - (h - r1) * sy + 0, fw - c0 * sx + w * sx, fn + r0 * sy)
    est = (fw - c0 * sx, fn + r0 * sy - h * sy, fw - c0 * sx + w * sx, fn + r0 * sy)
    line = f"{row['date']} size={w}x{h} validbox=({c0},{r0},{c1},{r1}) npts={row['npts']} est={tuple(round(v, 4) for v in est)}"
    if row['kml']:
        t = c.get(row['kml']).text
        p = [tuple(map(float, q.split(','))) for q in re.search(r'<coordinates>([^<]+)</coordinates>', t).group(1).split()]
        k = (min(q[0] for q in p), min(q[1] for q in p), max(q[0] for q in p), max(q[1] for q in p))
        px = ((est[0] - k[0]) / sx, (est[1] - k[1]) / sy, (est[2] - k[2]) / sx, (est[3] - k[3]) / sy)
        line += f"\n    KML={tuple(round(v, 4) for v in k)} error_px(w,s,e,n)={tuple(round(v, 2) for v in px)} res=({(k[2]-k[0])/w:.6f},{(k[3]-k[1])/h:.6f}) est_res=({sx:.6f},{sy:.6f})"
    print(line)
