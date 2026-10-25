"""Convierte una lámina de poses generada (fondo plano) en sprites de pixel art reales.

Uso: python3 pixelizar.py <lamina.png> <prefijo_salida> <alto_ref_px> <nombres,separados,por,coma> [cortes,x,...]
- Recorta cada pose, quita el fondo, reduce a una grilla real de píxeles con una paleta
  compartida de 32 colores (más colores reservados) y añade un contorno exterior de 1 px.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUTLINE = (28, 16, 40)          # morado muy oscuro
RESERVADOS = [(236, 232, 245),  # papel / blanco
              (122, 112, 224),  # lente violeta
              (240, 80, 138),   # destello magenta
              (245, 192, 96),   # chispa ámbar
              (95, 211, 154),   # brillo verde (curación)
              (79, 201, 196)]   # aura cian


def recortar(path, cortes, umbral=26):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    esquinas = np.concatenate([a[:20, :20].reshape(-1, 3), a[:20, -20:].reshape(-1, 3),
                               a[-20:, :20].reshape(-1, 3), a[-20:, -20:].reshape(-1, 3)])
    bg = np.median(esquinas, axis=0)
    mask = np.sqrt(((a - bg) ** 2).sum(2)) > umbral
    mask = ndimage.binary_closing(mask, iterations=2)
    crops = []
    for x0, x1 in zip(cortes[:-1], cortes[1:]):
        m = mask[:, x0:x1]
        lab, k = ndimage.label(m)
        sizes = ndimage.sum(m, lab, range(1, k + 1))
        keep = np.zeros_like(m)
        for j, s in enumerate(sizes):
            comp = lab == (j + 1)
            toca_borde = comp[:, 0].any() or comp[:, -1].any()
            if s > sizes.max() * 0.004 and not (toca_borde and s < sizes.max() * 0.06):
                keep |= comp
        keep = ndimage.binary_fill_holes(keep)
        ys, xs = np.where(keep)
        y0, y1, xa, xb = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = np.dstack([a[y0:y1, x0 + xa:x0 + xb], keep[y0:y1, xa:xb] * 255]).astype(np.uint8)
        crops.append(Image.fromarray(rgba, 'RGBA'))
    return crops


def pixelizar(crops, alto_objetivo, alto_ref, ncol=32):
    s = alto_objetivo / alto_ref
    small = []
    for c in crops:
        w, h = c.size
        sm = c.resize((max(1, round(w * s)), max(1, round(h * s))), Image.BOX)
        arr = np.asarray(sm).astype(float)
        al = arr[..., 3] > 110
        # quitar islas diminutas (píxeles sueltos)
        lab, k = ndimage.label(al)
        if k:
            sizes = ndimage.sum(al, lab, range(1, k + 1))
            for j, sz in enumerate(sizes):
                comp = lab == (j + 1)
                abajo = np.where(comp)[0].min() > al.shape[0] * 0.8
                if sz < 6 or (abajo and sz < 25 and sz < sizes.max() * 0.2):
                    al[comp] = False
        small.append((arr[..., :3], al))
    pix = np.concatenate([rgb[al] for rgb, al in small]).astype(np.uint8)
    base = Image.fromarray(pix.reshape(1, -1, 3), 'RGB').quantize(ncol - len(RESERVADOS),
                                                                 method=Image.Quantize.MEDIANCUT)
    pal = base.getpalette()[:3 * (ncol - len(RESERVADOS))]
    for c in RESERVADOS:
        pal += list(c)
    pal_img = Image.new('P', (1, 1))
    pal_img.putpalette(pal + [0] * (768 - len(pal)))
    out = []
    for rgb, al in small:
        q = Image.fromarray(rgb.astype(np.uint8), 'RGB').quantize(palette=pal_img, dither=Image.Dither.NONE)
        q = np.asarray(q.convert('RGB')).copy()
        # blancos (papel, dientes): claros y poco saturados van al blanco reservado
        mx, mn = rgb.max(2), rgb.min(2)
        blanco = al & (mx > 175) & ((mx - mn) < 60)
        q[blanco] = RESERVADOS[0]
        img = np.zeros(q.shape[:2] + (4,), np.uint8)
        img[al, :3] = q[al]
        img[al, 3] = 255
        anillo = ndimage.binary_dilation(al) & ~al
        img[anillo, :3] = OUTLINE
        img[anillo, 3] = 255
        out.append(Image.fromarray(img, 'RGBA'))
    return out


def lamina(sprites, ruta, escala=3, fondo=(12, 9, 22, 255)):
    W = sum(s.size[0] for s in sprites) + 8 * (len(sprites) + 1)
    H = max(s.size[1] for s in sprites) + 8
    hoja = Image.new('RGBA', (W, H), fondo)
    x = 8
    for s in sprites:
        hoja.alpha_composite(s, (x, H - 4 - s.size[1]))
        x += s.size[0] + 8
    hoja.resize((W * escala, H * escala), Image.NEAREST).save(ruta)


if __name__ == '__main__':
    path, prefijo, alto_ref, nombres = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4].split(',')
    cortes = [int(c) for c in sys.argv[5].split(',')]
    crops = recortar(path, cortes)
    sprites = pixelizar(crops, 128, alto_ref)
    for n, s in zip(nombres, sprites):
        s.save(f'{prefijo}_{n}.png')
    lamina(sprites, f'{prefijo}__lamina.png')
    print({n: s.size for n, s in zip(nombres, sprites)})
