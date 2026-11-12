"""v3: normalización simétrica (RMA robusta y cuantil-cuantil) + intervalo comparable. Uso: proto_norm2.py A.png B.png out_prefix"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

a = np.asarray(Image.open(sys.argv[1]).convert('RGB'))
b = np.asarray(Image.open(sys.argv[2]).convert('RGB'))
if a.shape != b.shape:  # misma caja geográfica, distinto muestreo: llevar A a la cuadrícula de B
    a = np.asarray(Image.fromarray(a).resize((b.shape[1], b.shape[0]), Image.NEAREST))
out = sys.argv[3]
valid = ndimage.binary_erosion((a.max(axis=2) > 0) & (b.max(axis=2) > 0), iterations=2)
C = 0.03


def smooth(x, size=5):
    num = ndimage.uniform_filter(np.where(valid, x, 0.0), size)
    den = ndimage.uniform_filter(valid.astype(float), size)
    return np.where(den > .5, num / np.maximum(den, 1e-6), 0.0)


def rma_robust(x, y, iters=5):
    keep = np.ones(x.size, bool)
    for _ in range(iters):
        sx, sy = x[keep].std(), y[keep].std()
        alpha = sy / sx
        beta = y[keep].mean() - alpha * x[keep].mean()
        res = (y - (alpha * x + beta)) / np.sqrt(1 + alpha ** 2)
        sigma = 1.4826 * np.median(np.abs(res[keep] - np.median(res[keep])))
        keep = np.abs(res) < 2.5 * max(sigma, 1e-6)
    return alpha, beta, keep.mean()


def qq(x, y):
    p = np.arange(5, 96, 5)
    alpha, beta = np.polyfit(np.percentile(x, p), np.percentile(y, p), 1)
    return alpha, beta


def delta(qa, qb, alpha, beta):
    qa2 = alpha * qa + beta
    lo, hi = max(0.0, beta), min(1.0, alpha + beta)
    return 10 * np.log10((np.clip(qb, lo, hi) + C) / (np.clip(qa2, lo, hi) + C)), lo, hi


def render(d, path):
    t = np.clip((d + 8) / 16, 0, 1)[..., None]
    lo, mid, hi = np.array([76, 201, 240.]), np.array([10, 22, 38.]), np.array([255, 107, 94.])
    rgb = np.where(t < .5, lo + (mid - lo) * (t * 2), mid + (hi - mid) * ((t - .5) * 2))
    alpha_ch = (np.clip((np.abs(d) - 1) / 2, 0, 1) * 235 * valid).astype(np.uint8)
    im = Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha_ch]))
    bg = Image.new('RGBA', im.size, (10, 22, 38, 255)); bg.alpha_composite(im)
    bg.resize((800, int(800 * d.shape[0] / d.shape[1]))).save(path)


for name, ch in (('HH', 0), ('HV', 1)):
    da, db = a[..., ch].astype(float), b[..., ch].astype(float)
    unsat = (a[..., ch] > 1) & (a[..., ch] < 255) & (b[..., ch] > 1) & (b[..., ch] < 255)
    qa, qb = smooth(((da - 1) / 254).clip(0, 1) ** 2), smooth(((db - 1) / 254).clip(0, 1) ** 2)
    m = valid & unsat
    idx = np.flatnonzero(m)
    sample = np.random.default_rng(0).choice(idx, size=min(300000, idx.size), replace=False)
    x, y = qa.ravel()[sample], qb.ravel()[sample]
    print(f'{name}: media qa={x.mean():.3f} qb={y.mean():.3f} corr={np.corrcoef(x, y)[0, 1]:.3f}')
    for label, (al, be) in (('RMA', rma_robust(x, y)[:2]), ('QQ ', qq(x, y))):
        d, lo, hi = delta(qa, qb, al, be)
        v = d[valid]
        print(f'   {label} alpha={al:.3f} beta={be:+.4f} rango=[{lo:.3f},{hi:.3f}] dec3={np.mean(v <= -3):.4f} inc3={np.mean(v >= 3):.4f} std={v.std():.2f} med={np.median(v):+.2f}')
        if name == 'HH':
            render(d, f'{out}_{label.strip()}.png')
