"""Factibilidad: leer una ventana de un GCOV HDF5 remoto con peticiones por rangos. Uso: h5_remote.py <repo>"""
import io, sys, time
sys.path.insert(0, sys.argv[1])
import h5py, httpx, numpy as np
from backend import config

G = 'NISAR_L2_PR_GCOV_034_011_D_084_4005_DHDH_A_20261024T232804_20261024T232838_P05036_N_F_J_001'
URL = f'https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_V1/{G}/{G}.h5'

class RangeFile(io.RawIOBase):
    """Archivo de solo lectura sobre HTTP con caché de bloques."""
    BLOCK = 2 * 1024 * 1024
    def __init__(self, url):
        self.client = httpx.Client(timeout=120, follow_redirects=False, headers={'User-Agent': config.USER_AGENT})
        r = self.client.get(url, headers={'Authorization': f'Bearer {config.EARTHDATA_TOKEN}'})
        self.signed = r.headers['location']
        head = self.client.get(self.signed, headers={'Range': 'bytes=0-0'})
        self.size = int(head.headers['content-range'].split('/')[1])
        self.pos, self.blocks, self.requests, self.bytes = 0, {}, 0, 0
    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos
    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        return self.pos
    def _block(self, i):
        if i not in self.blocks:
            start = i * self.BLOCK; end = min(start + self.BLOCK, self.size) - 1
            r = self.client.get(self.signed, headers={'Range': f'bytes={start}-{end}'})
            r.raise_for_status(); self.requests += 1; self.bytes += len(r.content)
            self.blocks[i] = r.content
        return self.blocks[i]
    def readinto(self, buffer):
        n = min(len(buffer), self.size - self.pos)
        done = 0
        while done < n:
            i, off = divmod(self.pos, self.BLOCK)
            chunk = self._block(i)[off:off + n - done]
            buffer[done:done + len(chunk)] = chunk
            done += len(chunk); self.pos += len(chunk)
        return done

t = time.time()
raw = RangeFile(URL)
print(f'tamaño {raw.size/1e9:.2f} GB; firma lista en {time.time()-t:.1f}s')
f = h5py.File(raw, 'r')
print(f'abierto en {time.time()-t:.1f}s, peticiones={raw.requests}, MB={raw.bytes/1e6:.1f}')
g = f['science/LSAR/GCOV/grids/frequencyA']
print('contenido:', list(g.keys()))
d = g['HHHH']
print('HHHH', d.shape, d.dtype, 'chunks', d.chunks, 'compresión', d.compression, d.compression_opts, 'shuffle', d.shuffle, {k: (v.decode() if isinstance(v, bytes) else v) for k, v in d.attrs.items() if k in ('units', 'description', '_FillValue', 'grid_mapping')})
x, y = g['xCoordinates'], g['yCoordinates']
print('x', x.shape, float(x[0]), float(x[-1]), 'y', y.shape, float(y[0]), float(y[-1]), 'paso', float(x[1]-x[0]), float(y[1]-y[0]))
proj = g['projection']
print('proyección', proj[()], {k: (v.decode() if isinstance(v, bytes) else v) for k, v in proj.attrs.items() if k in ('epsg_code', 'utm_zone_number', 'grid_mapping_name')})
print(f'metadatos leídos en {time.time()-t:.1f}s, peticiones={raw.requests}, MB={raw.bytes/1e6:.1f}')
r0, c0 = d.shape[0] // 2, d.shape[1] // 2
t2 = time.time(); before = (raw.requests, raw.bytes)
w = d[r0:r0 + 1024, c0:c0 + 1024]
print(f'ventana 1024x1024 en {time.time()-t2:.1f}s, peticiones +{raw.requests-before[0]}, +{(raw.bytes-before[1])/1e6:.1f} MB; finitos {np.isfinite(w).mean():.2f} mediana {10*np.log10(np.nanmedian(w)):.2f} dB p5/p95 {10*np.log10(np.nanpercentile(w,5)):.2f}/{10*np.log10(np.nanpercentile(w,95)):.2f}')
t3 = time.time(); before = (raw.requests, raw.bytes)
w = d[r0 - 2048:r0 + 2048, c0 - 2048:c0 + 2048]
print(f'ventana 4096x4096 en {time.time()-t3:.1f}s, peticiones +{raw.requests-before[0]}, +{(raw.bytes-before[1])/1e6:.1f} MB')
