"""
Motor de sintese procedural - pack de sons de criaturas 16-bit
Sem dependencias externas alem de numpy.
"""
import numpy as np
import wave
import os

SR = 22050  # sample rate retro (SNES-ish)


# ---------------------------------------------------------------- utilidades

def n_samples(dur):
    return int(SR * dur)


def env(n, points, curve=1.0):
    """Envelope por breakpoints [(t_frac, level), ...]"""
    xs = np.array([p[0] for p in points]) * (n - 1)
    ys = np.array([p[1] for p in points], dtype=float)
    e = np.interp(np.arange(n), xs, ys)
    if curve != 1.0:
        e = np.sign(e) * np.abs(e) ** curve
    return e


def osc(freq, n, shape='saw', phase0=0.0):
    """Oscilador com frequencia escalar ou array (glide)."""
    if np.isscalar(freq):
        freq = np.full(n, float(freq))
    ph = np.cumsum(freq) / SR + phase0
    t = ph % 1.0
    if shape == 'saw':
        return 2.0 * t - 1.0
    if shape == 'sqr':
        return np.where(t < 0.5, 1.0, -1.0)
    if shape == 'pulse':
        return np.where(t < 0.25, 1.0, -1.0)
    if shape == 'sin':
        return np.sin(2 * np.pi * ph)
    if shape == 'tri':
        return 2.0 * np.abs(2.0 * t - 1.0) - 1.0
    raise ValueError(shape)


def noise(n, rng):
    return rng.uniform(-1.0, 1.0, n)


def svf(x, cutoff, res=0.6, mode='lp'):
    """Filtro state-variable (Chamberlin). cutoff escalar ou array em Hz."""
    n = len(x)
    if np.isscalar(cutoff):
        cutoff = np.full(n, float(cutoff))
    cutoff = np.clip(cutoff, 20.0, SR * 0.45)
    f = 2.0 * np.sin(np.pi * cutoff / SR)
    q = np.clip(1.0 - res, 0.02, 1.0)
    low = band = 0.0
    out = np.zeros(n)
    for i in range(n):
        low += f[i] * band
        high = x[i] - low - q * band
        band += f[i] * high
        if mode == 'lp':
            out[i] = low
        elif mode == 'bp':
            out[i] = band
        else:
            out[i] = high
        # seguranca contra instabilidade
        if not np.isfinite(low) or abs(low) > 50:
            low = band = 0.0
    return np.nan_to_num(out, nan=0.0, posinf=0.0, neginf=0.0)


def formants(x, freqs, gains, res=0.85):
    """Bancada de bandpass paralelos -> caracter 'vocal'."""
    out = np.zeros_like(x)
    for fq, g in zip(freqs, gains):
        out += g * svf(x, fq, res=res, mode='bp')
    return out


def drive(x, amount=3.0):
    return np.tanh(x * amount)


def bitcrush(x, bits=8, rate_div=1):
    if rate_div > 1:
        idx = (np.arange(len(x)) // rate_div) * rate_div
        x = x[np.clip(idx, 0, len(x) - 1)]
    levels = 2 ** (bits - 1)
    return np.round(x * levels) / levels


def normalize(x, peak=0.89):
    x = np.nan_to_num(x)
    m = np.max(np.abs(x))
    if m < 1e-9:
        return x
    return x / m * peak


def fades(x, ms_in=3, ms_out=12):
    n = len(x)
    a = min(int(SR * ms_in / 1000), n // 2)
    b = min(int(SR * ms_out / 1000), n // 2)
    if a > 0:
        x[:a] *= np.linspace(0, 1, a)
    if b > 0:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def dc_block(x, r=0.995):
    """Remove offset DC (highpass 1-polo ~18 Hz)."""
    y = np.zeros_like(x)
    x1 = y1 = 0.0
    for i in range(len(x)):
        y1 = x[i] - x1 + r * y1
        x1 = x[i]
        y[i] = y1
    return y


def save(x, path):
    x = fades(normalize(dc_block(np.asarray(x, dtype=float))))
    data = np.clip(x, -1.0, 1.0)
    pcm = (data * 32767).astype('<i2')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return len(x) / SR


# ---------------------------------------------------------------- geradores

def grunt(rng, size='mid'):
    base = {'small': 190, 'mid': 120, 'big': 72}[size]
    base *= rng.uniform(0.92, 1.08)
    dur = {'small': 0.22, 'mid': 0.30, 'big': 0.42}[size] * rng.uniform(0.9, 1.15)
    n = n_samples(dur)
    pitch = base * env(n, [(0, 1.25), (0.12, 1.0), (1, 0.78)])
    growl = 1.0 + 0.35 * osc(rng.uniform(24, 34), n, 'sin')
    src = osc(pitch, n, 'saw') * growl
    src += 0.45 * osc(pitch * 0.5, n, 'sqr')
    src += 0.18 * noise(n, rng)
    v = formants(src, [base * 3.2, base * 6.0, 2400], [1.0, 0.7, 0.25])
    v = 0.6 * v + 0.4 * svf(src, base * 9, res=0.4)
    v = drive(v, 2.6)
    a = env(n, [(0, 0), (0.04, 1), (0.35, 0.75), (1, 0)], curve=1.3)
    return bitcrush(v * a, bits=8, rate_div=2)


def growl_loop(rng):
    dur = 1.4 * rng.uniform(0.9, 1.1)
    n = n_samples(dur)
    base = 62 * rng.uniform(0.9, 1.1)
    wobble = 1.0 + 0.06 * osc(rng.uniform(2.5, 4.0), n, 'sin')
    pitch = base * wobble * env(n, [(0, 1.0), (0.5, 1.1), (1, 0.92)])
    am = 0.55 + 0.45 * osc(rng.uniform(26, 36), n, 'sin')
    src = osc(pitch, n, 'saw') * am + 0.5 * osc(pitch * 1.5, n, 'sqr') * am
    src += 0.22 * svf(noise(n, rng), 900, res=0.5)
    v = formants(src, [340, 780, 1900], [1.0, 0.8, 0.35])
    v = 0.7 * v + 0.3 * svf(src, 1600, res=0.3)
    v = drive(v, 3.4)
    a = env(n, [(0, 0), (0.1, 1), (0.85, 0.9), (1, 0)])
    return bitcrush(v * a, bits=8, rate_div=2)


def roar(rng, size='big'):
    dur = {'mid': 0.9, 'big': 1.5}[size] * rng.uniform(0.92, 1.1)
    n = n_samples(dur)
    base = {'mid': 130, 'big': 78}[size] * rng.uniform(0.92, 1.08)
    pitch = base * env(n, [(0, 0.75), (0.10, 1.35), (0.45, 1.15), (1, 0.62)])
    rasp = 1.0 + 0.40 * osc(rng.uniform(16, 24), n, 'sin')
    src = osc(pitch, n, 'saw') * rasp
    src += 0.55 * osc(pitch * 0.5, n, 'saw')
    src += 0.30 * osc(pitch * 2.01, n, 'sqr')
    nz = svf(noise(n, rng), pitch * 8 + 600, res=0.35)
    src += 0.35 * nz
    v = formants(src, [base * 4, 1100, 2600], [1.0, 0.75, 0.4])
    v = 0.65 * v + 0.35 * svf(src, 2200, res=0.25)
    v = drive(v, 4.5)
    a = env(n, [(0, 0), (0.06, 1), (0.6, 0.85), (0.85, 0.6), (1, 0)])
    return bitcrush(v * a, bits=8, rate_div=2)


def screech(rng):
    dur = 0.55 * rng.uniform(0.9, 1.2)
    n = n_samples(dur)
    base = 780 * rng.uniform(0.85, 1.2)
    pitch = base * env(n, [(0, 0.7), (0.15, 1.6), (0.6, 1.75), (1, 1.1)])
    jitter = 1.0 + 0.05 * svf(noise(n, rng), 60, res=0.2) * 8
    src = osc(pitch * jitter, n, 'sqr')
    src += 0.6 * osc(pitch * 1.497, n, 'saw')
    src += 0.25 * svf(noise(n, rng), pitch * 2, res=0.6, mode='bp') * 4
    v = drive(src, 3.2)
    v = svf(v, 5200, res=0.2)
    a = env(n, [(0, 0), (0.03, 1), (0.55, 0.9), (1, 0)], curve=1.2)
    return bitcrush(v * a, bits=7, rate_div=2)


def hurt(rng, size='mid'):
    dur = {'small': 0.20, 'mid': 0.28, 'big': 0.38}[size] * rng.uniform(0.9, 1.1)
    n = n_samples(dur)
    base = {'small': 420, 'mid': 250, 'big': 140}[size] * rng.uniform(0.9, 1.1)
    pitch = base * env(n, [(0, 1.5), (0.18, 1.9), (1, 0.65)])
    src = osc(pitch, n, 'saw') * (1 + 0.25 * osc(38, n, 'sin'))
    src += 0.4 * osc(pitch * 2, n, 'sqr')
    src += 0.3 * svf(noise(n, rng), 2500, res=0.4)
    v = formants(src, [base * 2.4, base * 5, 3000], [1.0, 0.6, 0.3])
    v = drive(v, 3.0)
    a = env(n, [(0, 0), (0.02, 1), (0.3, 0.7), (1, 0)], curve=1.5)
    return bitcrush(v * a, bits=8, rate_div=2)


def death(rng, size='mid'):
    dur = {'mid': 0.85, 'big': 1.25}[size] * rng.uniform(0.9, 1.1)
    n = n_samples(dur)
    base = {'mid': 200, 'big': 110}[size] * rng.uniform(0.9, 1.1)
    pitch = base * env(n, [(0, 1.6), (0.15, 1.2), (0.6, 0.7), (1, 0.32)], curve=1.0)
    gurgle = 1.0 + 0.5 * osc(np.linspace(30, 9, n), n, 'sin')
    src = osc(pitch, n, 'saw') * gurgle
    src += 0.45 * osc(pitch * 0.5, n, 'sqr') * gurgle
    wet = svf(noise(n, rng), np.linspace(1800, 350, n), res=0.55)
    src += 0.4 * wet
    v = formants(src, [base * 3, 900, 2000], [1.0, 0.7, 0.25])
    v = drive(v, 2.8)
    a = env(n, [(0, 0), (0.03, 1), (0.35, 0.8), (0.7, 0.35), (1, 0)], curve=1.4)
    return bitcrush(v * a, bits=8, rate_div=3)


def chirp(rng):
    blips = rng.integers(2, 4)
    parts = []
    for i in range(int(blips)):
        d = rng.uniform(0.05, 0.09)
        n = n_samples(d)
        f = rng.uniform(900, 1500) * (1.0 - 0.08 * i)
        pitch = f * env(n, [(0, 0.8), (0.3, 1.35), (1, 0.95)])
        s = osc(pitch, n, 'sqr') * 0.8 + 0.3 * osc(pitch * 2, n, 'pulse')
        a = env(n, [(0, 0), (0.08, 1), (1, 0)], curve=1.6)
        parts.append(s * a)
        gap = n_samples(rng.uniform(0.03, 0.07))
        parts.append(np.zeros(gap))
    v = np.concatenate(parts)
    return bitcrush(v, bits=6, rate_div=3)


def hiss(rng):
    dur = 0.75 * rng.uniform(0.9, 1.2)
    n = n_samples(dur)
    nz = noise(n, rng)
    band = svf(nz, np.linspace(3200, 5200, n), res=0.55, mode='bp') * 3
    band += 0.5 * svf(nz, 1800, res=0.4, mode='bp') * 2
    flutter = 1.0 + 0.18 * osc(rng.uniform(11, 17), n, 'sin')
    v = band * flutter
    v = drive(v, 1.8)
    a = env(n, [(0, 0), (0.25, 1), (0.7, 0.85), (1, 0)], curve=1.1)
    return bitcrush(v * a, bits=8, rate_div=2)


def chomp(rng):
    dur = 0.28
    n = n_samples(dur)
    v = np.zeros(n)
    # impacto 1 (fecho)
    n1 = n_samples(0.09)
    click = svf(noise(n1, rng), np.linspace(4500, 900, n1), res=0.45) * 3
    thump = osc(np.linspace(180, 55, n1), n1, 'sin') * 1.2
    seg = (click + thump) * env(n1, [(0, 1), (0.15, 0.6), (1, 0)], curve=1.8)
    v[:n1] += seg
    # impacto 2 (crunch)
    off = n_samples(rng.uniform(0.09, 0.13))
    n2 = n_samples(0.12)
    if off + n2 < n:
        cr = svf(noise(n2, rng), np.linspace(2600, 600, n2), res=0.5) * 2.6
        cr += osc(np.linspace(140, 48, n2), n2, 'tri') * 0.9
        v[off:off + n2] += cr * env(n2, [(0, 1), (0.2, 0.5), (1, 0)], curve=1.6)
    v = drive(v, 2.2)
    return bitcrush(v, bits=8, rate_div=2)


def slime(rng):
    dur = 0.6 * rng.uniform(0.9, 1.2)
    n = n_samples(dur)
    base = 150 * rng.uniform(0.85, 1.15)
    warble = 1.0 + 0.45 * osc(np.linspace(6, 20, n), n, 'sin')
    pitch = base * warble * env(n, [(0, 0.8), (0.4, 1.3), (1, 0.7)])
    src = osc(pitch, n, 'sin') * 1.2 + 0.4 * osc(pitch * 2, n, 'tri')
    wet = svf(noise(n, rng), np.linspace(600, 2200, n), res=0.6, mode='bp') * 2
    src += 0.35 * wet
    v = svf(src, 2600, res=0.35)
    a = env(n, [(0, 0), (0.15, 1), (0.6, 0.7), (1, 0)], curve=1.2)
    return bitcrush(v * a, bits=8, rate_div=3)


def alert(rng):
    """Som de 'deteccao' / criatura repara em ti."""
    dur = 0.35
    n = n_samples(dur)
    base = 330 * rng.uniform(0.9, 1.15)
    pitch = base * env(n, [(0, 1.0), (0.45, 1.0), (0.5, 1.5), (1, 1.5)])
    src = osc(pitch, n, 'sqr') * 0.9 + 0.4 * osc(pitch * 1.5, n, 'pulse')
    src += 0.15 * noise(n, rng)
    v = svf(src, 3800, res=0.3)
    a = env(n, [(0, 0), (0.03, 1), (0.44, 0.8), (0.5, 1), (1, 0)], curve=1.3)
    return bitcrush(v * a, bits=7, rate_div=2)


def footstep(rng, size='big'):
    dur = 0.22
    n = n_samples(dur)
    f0 = {'small': 120, 'big': 55}[size] * rng.uniform(0.9, 1.1)
    thump = osc(np.linspace(f0 * 2.2, f0 * 0.6, n), n, 'sin') * 1.4
    grit = svf(noise(n, rng), np.linspace(2200, 400, n), res=0.4) * 1.6
    v = (thump + 0.7 * grit) * env(n, [(0, 1), (0.12, 0.5), (1, 0)], curve=1.8)
    v = drive(v, 1.9)
    return bitcrush(v, bits=8, rate_div=2)
