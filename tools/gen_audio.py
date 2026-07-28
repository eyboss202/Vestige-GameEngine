"""Placeholder audio generator for VESTIGE. Pure stdlib, writes 16-bit mono WAV.
Replace the files in /assets/audio with real music/SFX using the same names."""
import math, os, random, struct, wave

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")


def write(name, samples, rate):
    path = os.path.join(OUT, name)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = b"".join(struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples)
        w.writeframes(frames)
    print(name, round(os.path.getsize(path) / 1024), "KB")


def env(i, n, a=0.01, r=0.3):
    at, rl = int(n * a), int(n * r)
    if i < at:
        return i / max(at, 1)
    if i > n - rl:
        return (n - i) / max(rl, 1)
    return 1.0


def square(t, f):
    return 1.0 if (t * f) % 1.0 < 0.5 else -1.0


def sfx_blip(name, f0, f1, dur=0.08, rate=22050, vol=0.25, wave_fn=square):
    n = int(dur * rate)
    out = []
    for i in range(n):
        t = i / rate
        f = f0 + (f1 - f0) * (i / n)
        out.append(wave_fn(t, f) * env(i, n, 0.02, 0.5) * vol)
    write(name, out, rate)


def sfx_noise(name, dur=0.09, rate=22050, vol=0.18, lp=0.35):
    n = int(dur * rate)
    rnd = random.Random(7)
    prev, out = 0.0, []
    for i in range(n):
        v = rnd.uniform(-1, 1)
        prev = prev + lp * (v - prev)
        out.append(prev * env(i, n, 0.005, 0.8) * vol)
    write(name, out, rate)


def ambient_lab(dur=14.0, rate=11025):
    n = int(dur * rate)
    rnd = random.Random(3)
    prev = 0.0
    out = []
    for i in range(n):
        t = i / rate
        loop = t / dur
        # low drone with two detuned partials + slow amplitude LFO
        s = 0.30 * math.sin(2 * math.pi * 55 * t)
        s += 0.16 * math.sin(2 * math.pi * 82.4 * t + 0.6)
        s += 0.08 * math.sin(2 * math.pi * 110.5 * t)
        s *= 0.75 + 0.25 * math.sin(2 * math.pi * loop * 2)
        # filtered noise bed (ventilation)
        prev = prev + 0.02 * (rnd.uniform(-1, 1) - prev)
        s += prev * 3.0 * 0.25
        # distant electrical hum that fades in and out once per loop
        s += 0.05 * math.sin(2 * math.pi * 220 * t) * max(0.0, math.sin(2 * math.pi * loop))
        out.append(s * 0.55 * env(i, n, 0.03, 0.03))
    write("ambient_lab_placeholder.wav", out, rate)


def ambient_outside(dur=14.0, rate=11025):
    n = int(dur * rate)
    rnd = random.Random(11)
    p1 = p2 = 0.0
    out = []
    for i in range(n):
        t = i / rate
        loop = t / dur
        p1 = p1 + 0.010 * (rnd.uniform(-1, 1) - p1)          # wind body
        p2 = p2 + 0.060 * (rnd.uniform(-1, 1) - p2)          # leaf rustle
        gust = 0.5 + 0.5 * math.sin(2 * math.pi * loop * 3 + 1.0)
        s = p1 * 6.0 * (0.35 + 0.5 * gust) + p2 * 1.2 * 0.25 * gust
        s += 0.05 * math.sin(2 * math.pi * 41 * t)
        out.append(s * 0.5 * env(i, n, 0.03, 0.03))
    write("ambient_outside_placeholder.wav", out, rate)


def menu_theme(dur=16.0, rate=11025):
    """Slow minor pad + sparse arpeggio. Loops cleanly on `dur`."""
    n = int(dur * rate)
    root = 110.0
    chords = [[1.0, 1.2, 1.5], [0.89, 1.06, 1.33], [1.19, 1.5, 1.78], [0.94, 1.19, 1.41]]
    arp = [2.0, 3.0, 2.4, 4.0, 3.0, 2.4]
    rnd = random.Random(5)
    prev = 0.0
    out = []
    for i in range(n):
        t = i / rate
        loop = t / dur
        ci = int(loop * len(chords)) % len(chords)
        ph = (loop * len(chords)) % 1.0
        s = 0.0
        for m in chords[ci]:
            s += 0.10 * math.sin(2 * math.pi * root * m * t)
            s += 0.04 * math.sin(2 * math.pi * root * m * 2 * t + 1.3)
        s *= 0.55 + 0.45 * math.sin(math.pi * ph) ** 0.5
        # arpeggio bell every 1/3 of a chord
        step = (t * 3.0) % 1.0
        ai = int(t * 3.0) % len(arp)
        if step < 0.35:
            e = math.exp(-step * 12)
            s += 0.13 * math.sin(2 * math.pi * root * arp[ai] * t) * e
            s += 0.05 * math.sin(2 * math.pi * root * arp[ai] * 2.01 * t) * e
        prev = prev + 0.01 * (rnd.uniform(-1, 1) - prev)
        s += prev * 2.0 * 0.10
        out.append(s * 0.6 * env(i, n, 0.02, 0.02))
    write("menu_theme_placeholder.wav", out, rate)


if __name__ == "__main__":
    sfx_blip("ui_move_placeholder.wav", 420, 520, 0.05, vol=0.18)
    sfx_blip("ui_select_placeholder.wav", 520, 780, 0.10, vol=0.20)
    sfx_blip("ui_back_placeholder.wav", 500, 260, 0.09, vol=0.18)
    sfx_blip("text_blip_placeholder.wav", 640, 600, 0.035, vol=0.10)
    sfx_blip("pickup_placeholder.wav", 660, 990, 0.13, vol=0.18)
    sfx_blip("hurt_placeholder.wav", 300, 120, 0.16, vol=0.22)
    sfx_noise("footstep_placeholder.wav", 0.07, vol=0.14)
    sfx_noise("door_placeholder.wav", 0.35, vol=0.16, lp=0.08)
    # combat
    sfx_noise("attack_melee_placeholder.wav", 0.09, vol=0.20, lp=0.5)
    sfx_blip("attack_gun_placeholder.wav", 900, 180, 0.07, vol=0.24)
    sfx_blip("throw_placeholder.wav", 380, 700, 0.09, vol=0.16)
    sfx_noise("explosion_placeholder.wav", 0.45, vol=0.30, lp=0.15)
    sfx_blip("trap_placeholder.wav", 700, 240, 0.12, vol=0.22)
    ambient_lab()
    ambient_outside()
    menu_theme()
    print("audio done")
