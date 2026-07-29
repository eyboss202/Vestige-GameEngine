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


def sfx_reload(name, dur=0.42, rate=22050, vol=0.20):
    """Two short mechanical clacks (mag out, mag in) — noise transients with
    a bit of pitch, distinct from the softer page_turn swish above."""
    n = int(dur * rate)
    rnd = random.Random(29)
    out = [0.0] * n
    clacks = [0.04, 0.30]
    for onset in clacks:
        i0 = int(onset * rate)
        cn = int(0.05 * rate)
        for i in range(cn):
            if i0 + i >= n:
                break
            v = rnd.uniform(-1, 1) * env(i, cn, 0.01, 0.7)
            v += 0.4 * square(i / rate, 260) * env(i, cn, 0.01, 0.5)
            out[i0 + i] += v * vol
    write(name, out, rate)


def sfx_page_turn(name, dur=0.16, rate=22050, vol=0.16):
    """Short filtered-noise swish with a rising pitch-y sweep laid under it —
    reads as paper rather than the blockier UI blips above."""
    n = int(dur * rate)
    rnd = random.Random(23)
    prev = 0.0
    out = []
    for i in range(n):
        t = i / n
        prev = prev + 0.5 * (rnd.uniform(-1, 1) - prev)
        s = prev * (0.5 + 0.5 * math.sin(math.pi * t))
        s += 0.06 * math.sin(2 * math.pi * (900 + 500 * t) * (i / rate))
        out.append(s * env(i, n, 0.05, 0.55) * vol)
    write(name, out, rate)


def soft_clip(x, amount=1.6):
    """Tanh saturation — cheap analogue-style grit with no extra deps. Pushes
    a clean tone/noise mix into something that reads as an organic growl
    instead of a pure synth tone once it's driven hard enough to round off."""
    return math.tanh(x * amount) / math.tanh(amount)


def svf_coeff(rate, cutoff):
    """Chamberlin state-variable-filter coefficient for a given cutoff."""
    return 2 * math.sin(math.pi * min(cutoff, rate * 0.45) / rate)


def svf_step(state, x, f, q_inv):
    """One sample of a Chamberlin SVF. `state` (a plain dict) carries the
    low/band memory across calls, so a filter can live inline in a per-sample
    generator loop instead of needing a whole-buffer pass. Returns
    (low, band, high) — band reads as a resonant/vocal-formant band-pass,
    which is what turns flat noise into something throat- or breath-shaped."""
    low = state.get('low', 0.0) + f * state.get('band', 0.0)
    high = x - low - q_inv * state.get('band', 0.0)
    band = state.get('band', 0.0) + f * high
    state['low'], state['band'] = low, band
    return low, band, high


def add_echo(samples, rate, delay=0.045, decay=0.4, repeats=2):
    """Cheap slap-echo (read-only feedback over the finished buffer) — gives
    screams/death cries a 'corridor' tail instead of stopping dead, without
    needing a real convolution reverb."""
    d = int(delay * rate)
    out = list(samples)
    for r in range(1, repeats + 1):
        amp = decay ** r
        off = d * r
        for i in range(len(samples) - off):
            out[i + off] += samples[i] * amp
    return out


def limiter(samples, ceiling=0.9):
    """Peak-normalizes down to `ceiling` only if something's hot enough to
    clip — cheap insurance for the extra layers below (sub-harmonics, ring
    mod, echo) stacking louder than any single layer was tuned for."""
    peak = max((abs(s) for s in samples), default=0.0)
    if peak > ceiling:
        scale = ceiling / peak
        return [s * scale for s in samples]
    return samples


def _flavor_texture(flavor, t, rnd2, state, rate, rate_mult=1.0):
    """One extra texture layer mixed under idle/attack/death, keyed by
    per-archetype `flavor` (see MONSTER_VOICES) so species that share a pitch
    range still don't share a voice:
      wet      bubbling/gurgling — flesh, acid sacs
      crack    sparse sharp transients — bone popping under mass
      click    fast chittering ticks — insectile, many small limbs
      whisper  breathy high-passed hiss — a predator you hear before you see
    `state` is a small persistent dict the caller keeps across samples
    (timers/filter memory); `rate_mult` scales trigger frequency/duration so
    two archetypes sharing a flavor (e.g. brute/sentinel both 'crack') still
    don't sound identical. Returns the extra sample value. """
    if flavor == 'wet':
        v = rnd2.uniform(-1, 1)
        # Slowly sweeping band-pass on noise reads as a wet throat gurgle
        # rather than the plain smoothed-noise bubble the old version used.
        f = svf_coeff(rate, 200 + 110 * math.sin(2 * math.pi * 0.7 * rate_mult * t))
        low, band, _ = svf_step(state, v, f, 1.0 / 1.3)
        gurgle = 0.5 + 0.5 * math.sin(2 * math.pi * 4.5 * rate_mult * t + band * 3)
        return (band * 0.9 + low * 0.25) * gurgle
    if flavor == 'crack':
        dur = max(1, int(0.01 * rate / rate_mult))
        if state.get('timer', 0) <= 0 and rnd2.random() < 0.0018 * rate_mult:
            state['timer'] = dur
        if state.get('timer', 0) > 0:
            s = rnd2.uniform(-1, 1) * 1.1 * (state['timer'] / dur)
            state['timer'] -= 1
            return s
        return 0.0
    if flavor == 'click':
        dur = max(1, int(0.007 * rate))
        if state.get('timer', 0) <= 0 and rnd2.random() < 0.008 * rate_mult:
            state['timer'] = dur
        if state.get('timer', 0) > 0:
            s = rnd2.uniform(-1, 1) * 0.9 * (state['timer'] / dur)
            state['timer'] -= 1
            return s
        return 0.0
    if flavor == 'whisper':
        # High-passed noise (SVF 'high' output) — breathy hiss instead of the
        # old smoothed-noise hush, closer to an actual exhale through teeth.
        v = rnd2.uniform(-1, 1)
        f = svf_coeff(rate, 3400)
        _, _, high = svf_step(state, v, f, 1.0 / 0.9)
        return high * 0.5
    return 0.0


def monster_idle(name, freq=90, growl=0.5, dur=0.9, rate=22050, vol=0.14, seed=0, flavor='breath', flavor_rate=1.0):
    """Breathing/growl loop cue — a fundamental plus a sub-octave layer for
    chest weight, both driven through soft_clip() for grit, breathing in and
    out on a squared sine (reads as an inhale/exhale rather than a flat
    tremolo). A slow pitch-wobble keeps the tone from locking to a dead-flat
    oscillator (real throats waver), and a subsonic ring-modulation adds a
    throat-rattle edge, with a per-archetype texture layer (see
    _flavor_texture) on top so no two archetypes sound alike even at the
    same pitch."""
    n = int(dur * rate)
    rnd = random.Random(seed)
    rnd2 = random.Random(seed + 5000)
    wobble_rnd = random.Random(seed + 9000)
    prev = 0.0
    wobble = 0.0
    state = {}
    out = []
    for i in range(n):
        t = i / rate
        breath = 0.4 + 0.6 * (0.5 + 0.5 * math.sin(2 * math.pi * 1.6 * t)) ** 2
        wobble = wobble + 0.4 * (wobble_rnd.uniform(-1, 1) - wobble)
        f = freq * (1 + 0.03 * wobble)
        s = math.sin(2 * math.pi * f * t) * breath
        s += math.sin(2 * math.pi * f * 0.5 * t) * 0.35 * breath
        prev = prev + growl * (rnd.uniform(-1, 1) - prev)
        s += prev * 0.55
        s = soft_clip(s, 1.3 + growl)
        s *= 0.8 + 0.2 * math.sin(2 * math.pi * 32 * t)   # subsonic throat rattle
        s += _flavor_texture(flavor, t, rnd2, state, rate, flavor_rate)
        out.append(s * env(i, n, 0.08, 0.3) * vol)
    write(name, limiter(out), rate)


def monster_alert(name, f0=220, f1=420, dur=0.32, rate=22050, vol=0.20, seed=1, flavor='breath', flavor_rate=1.0):
    """Terrifying "it just saw you" shriek, played once on first detection.
    A real scream doesn't glide cleanly from f0 to f1 — it wavers — so the
    sweep rides a fast pitch-jitter LFO, doubled up with a fifth-above
    harmonic for a raw, throat-torn edge, then pushed hard into soft-clip.
    A short slap-echo tail (see add_echo) makes it read as a scream in a
    hard, empty space instead of a clean studio blip."""
    n = int(dur * rate)
    rnd = random.Random(seed)
    rnd2 = random.Random(seed + 5000)
    jitter_rnd = random.Random(seed + 7000)
    prev = 0.0
    jitter = 0.0
    state = {}
    out = []
    for i in range(n):
        t = i / n
        jitter = jitter + 0.5 * (jitter_rnd.uniform(-1, 1) - jitter)
        f = (f0 + (f1 - f0) * (t ** 1.4)) * (1 + 0.05 * jitter)
        prev = prev + 0.35 * (rnd.uniform(-1, 1) - prev)
        s = 0.5 * square(i / rate, f) + 0.25 * square(i / rate, f * 1.5)
        s += prev * 0.5
        s = soft_clip(s, 2.1)
        s += _flavor_texture(flavor, i / rate, rnd2, state, rate, flavor_rate) * 0.6
        out.append(s * env(i, n, 0.015, 0.5) * vol)
    write(name, limiter(add_echo(out, rate, delay=0.05, decay=0.3, repeats=2)), rate)


def monster_attack(name, freq=180, dur=0.18, rate=22050, vol=0.22, seed=2, flavor='breath', flavor_rate=1.6):
    """Attack lunge/bite cue — a driven square-wave snarl reinforced with a
    sub-octave for weight, a sharp broadband noise transient right at the
    onset (the actual "snap" of the bite/strike landing, not just a tone
    getting louder), and the flavor layer boosted (flavor_rate) so the
    moment it lands hits harder than the idle breathing does."""
    n = int(dur * rate)
    rnd = random.Random(seed)
    rnd2 = random.Random(seed + 5000)
    prev = 0.0
    state = {}
    out = []
    snap_n = max(1, int(0.018 * rate))
    for i in range(n):
        t = i / rate
        prev = prev + 0.65 * (rnd.uniform(-1, 1) - prev)
        s = 0.45 * square(t, freq) + 0.25 * square(t, freq * 0.5)
        s += prev * 0.65
        if i < snap_n:
            s += rnd.uniform(-1, 1) * (1 - i / snap_n) * 0.9
        s = soft_clip(s, 2.2)
        s += _flavor_texture(flavor, t, rnd2, state, rate, flavor_rate) * 0.7
        out.append(s * env(i, n, 0.005, 0.6) * vol)
    write(name, limiter(out), rate)


def monster_death(name, f0=500, f1=80, dur=0.55, rate=22050, vol=0.24, seed=3, flavor='breath', flavor_rate=1.0):
    """Descending death cry — the falling pitch sweep stays the dominant,
    readable element (it has to say "that thing just died"); an exponential
    (rather than linear) fall reads more like a real collapsing throat than
    a mechanical slide. Soft-clip grit and a fading flavor layer give it a
    last, uglier breath underneath, a short slap-echo gives it somewhere to
    die in, and a closing sub-bass thud marks the body actually hitting the
    ground."""
    n = int(dur * rate)
    rnd = random.Random(seed)
    rnd2 = random.Random(seed + 5000)
    prev = 0.0
    state = {}
    out = []
    thud_start = int(n * 0.82)
    for i in range(n):
        t = i / n
        f = f0 * ((f1 / f0) ** t)
        prev = prev + 0.45 * (rnd.uniform(-1, 1) - prev)
        s = 0.6 * math.sin(2 * math.pi * f * (i / rate)) + prev * 0.45
        s = soft_clip(s, 1.7)
        s += _flavor_texture(flavor, i / rate, rnd2, state, rate, flavor_rate) * (1 - t) * 0.6
        if i >= thud_start:
            thud_t = (i - thud_start) / max(1, n - thud_start)
            s += 0.5 * math.sin(2 * math.pi * 45 * (i / rate)) * (1 - thud_t)
        out.append(s * env(i, n, 0.01, 0.75) * vol)
    write(name, limiter(add_echo(out, rate, delay=0.06, decay=0.22, repeats=1)), rate)


# Per-archetype voice tuning, used only by monster_voices() below — the
# synthesized fallback (see the __main__ comment above). The actual voices
# currently shipped for every archetype are real recordings copied in from
# creature-sfx-16bit/ straight to assets/audio/{id}_{cue}_placeholder.wav:
#
#   husk      idle=growls/growl_loop_01  alert=idle/alert_01      attack=attack/chomp_01        death=death/death_mid_01
#   mutant    idle=growls/growl_loop_02  alert=idle/alert_02      attack=attack/chomp_02        death=death/death_mid_02
#   brute     idle=growls/growl_loop_03  alert=roars/roar_mid_01  attack=grunts/grunt_big_01    death=death/death_big_01
#   stalker   idle=idle/hiss_01          alert=screams/screech_01 attack=grunts/grunt_small_01  death=death/death_mid_03
#   spitter   idle=idle/hiss_02          alert=idle/alert_03      attack=attack/slime_blob_01   death=death/death_mid_01
#   swarmling idle=idle/chirp_01         alert=screams/screech_02 attack=grunts/grunt_small_02  death=death/death_mid_02
#   sentinel  idle=roars/roar_mid_02     alert=roars/roar_big_01  attack=roars/roar_big_02      death=death/death_big_02
#
# data/enemies.js `voicePitch` (Enemy.js's playback `rate`) adds further
# distinctiveness on top of this, especially where two archetypes share a
# source file (mid-tier deaths only have 3 variants for 5 archetypes).
#
# Every tuning value below is deliberately different so no two archetypes
# would share a voice if this were regenerated; `flavor`/`flavor_rate` (see
# _flavor_texture) layer a distinct texture on top so species sharing a
# flavor (brute/sentinel both 'crack') still don't sound the same once pitch
# and rate differ this much.
MONSTER_VOICES = {
    "husk":      dict(idle=(85, 0.45),  alert=(240, 440), attack=(170, 0.16), death=(480, 90,  0.45), flavor='breath',  rate=1.0),
    "mutant":    dict(idle=(65, 0.60),  alert=(200, 360), attack=(140, 0.20), death=(420, 70,  0.55), flavor='wet',     rate=1.0),
    "brute":     dict(idle=(50, 0.70),  alert=(160, 300), attack=(110, 0.26), death=(360, 55,  0.70), flavor='crack',  rate=1.3),
    "stalker":   dict(idle=(150, 0.30), alert=(320, 700), attack=(260, 0.10), death=(700, 140, 0.35), flavor='whisper', rate=1.4),
    "spitter":   dict(idle=(75, 0.65),  alert=(210, 380), attack=(150, 0.20), death=(440, 80,  0.50), flavor='wet',     rate=1.8),
    "swarmling": dict(idle=(260, 0.25), alert=(420, 900), attack=(360, 0.08), death=(900, 220, 0.22), flavor='click',  rate=1.6),
    "sentinel":  dict(idle=(40, 0.55),  alert=(150, 260), attack=(95,  0.30), death=(300, 45,  0.85), flavor='crack',  rate=0.5),
}


def monster_voices():
    for i, (name, cfg) in enumerate(MONSTER_VOICES.items()):
        flavor, rate_mult = cfg['flavor'], cfg['rate']
        f, g = cfg["idle"]
        monster_idle(f"{name}_idle_placeholder.wav", freq=f, growl=g, seed=100 + i, flavor=flavor, flavor_rate=rate_mult)
        f0, f1 = cfg["alert"]
        monster_alert(f"{name}_alert_placeholder.wav", f0=f0, f1=f1, seed=200 + i, flavor=flavor, flavor_rate=rate_mult)
        f, d = cfg["attack"]
        monster_attack(f"{name}_attack_placeholder.wav", freq=f, dur=d, seed=300 + i, flavor=flavor, flavor_rate=rate_mult * 1.6)
        f0, f1, d = cfg["death"]
        monster_death(f"{name}_death_placeholder.wav", f0=f0, f1=f1, dur=d, seed=400 + i, flavor=flavor, flavor_rate=rate_mult)


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


def sfx_death_sting(name, dur=1.1, rate=22050, vol=0.5):
    """The player's own death cue (entities/player/Player.js startDeath(),
    played once by GameScene on `player:down`) — deliberately not a monster
    voice: a falling breath/heartbeat rather than a growl, since it's a
    human. A low sine falls away under a fading heartbeat-like double-thud,
    with the last beat drawn out and going flat (the heart stopping)."""
    n = int(dur * rate)
    rnd = random.Random(41)
    out = [0.0] * n
    # Descending "breath leaving" tone underneath everything.
    for i in range(n):
        t = i / n
        f = 130 * ((55 / 130) ** t)
        s = 0.5 * math.sin(2 * math.pi * f * (i / rate))
        out[i] += s * (1 - t) ** 1.5 * vol

    # Three heartbeats, slowing and quietening — the third trails into silence
    # instead of a clean stop, reading as it just... doesn't beat again.
    beats = [0.05, 0.32, 0.68]
    for bi, onset in enumerate(beats):
        i0 = int(onset * n)
        bn = int(0.16 * rate)
        fade = 1.0 - bi * 0.32
        for i in range(bn):
            if i0 + i >= n:
                break
            e = env(i, bn, 0.01, 0.85 if bi == 2 else 0.6)
            thud = 0.6 * math.sin(2 * math.pi * 60 * (i / rate)) * e
            thud += rnd.uniform(-1, 1) * 0.15 * e
            out[i0 + i] += thud * fade * vol
    write(name, limiter(out), rate)


def death_ambient(dur=18.0, rate=11025):
    """Somber drone for DeathScene — a slow minor dyad, no melody, a distant
    detuned sub-bass and a very slow, quiet heartbeat-like pulse throughout
    so the You Died screen never feels like total silence. Loops on `dur`."""
    n = int(dur * rate)
    root = 73.0   # low D — a step below menu_theme's root, deliberately duller
    rnd = random.Random(17)
    prev = 0.0
    out = []
    for i in range(n):
        t = i / rate
        loop = t / dur
        # A minor third + a detuned unison, both breathing very slowly.
        breathe = 0.6 + 0.4 * math.sin(2 * math.pi * loop * 2)
        s = 0.16 * math.sin(2 * math.pi * root * t)
        s += 0.10 * math.sin(2 * math.pi * root * 1.19 * t + 0.4)
        s += 0.07 * math.sin(2 * math.pi * root * 0.998 * t)   # slow beating detune
        s *= breathe
        # Filtered noise bed — cold room tone, not wind.
        prev = prev + 0.015 * (rnd.uniform(-1, 1) - prev)
        s += prev * 2.2 * 0.12
        # A slow, quiet pulse — twice per loop, never resolving into a beat you'd tap to.
        pulse_phase = (loop * 2) % 1.0
        if pulse_phase < 0.08:
            s += 0.05 * math.sin(2 * math.pi * 50 * t) * math.exp(-pulse_phase * 40)
        out.append(s * 0.6 * env(i, n, 0.04, 0.04))
    write("death_ambient_placeholder.wav", out, rate)


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
    sfx_page_turn("page_turn_placeholder.wav")
    sfx_reload("reload_placeholder.wav")
    sfx_death_sting("death_sting_placeholder.wav")
    # monster_voices() is NOT called here on purpose: the {archetype}_{idle,
    # alert,attack,death}_placeholder.wav files it would (re)generate are now
    # real recordings copied in from creature-sfx-16bit/ (see the mapping
    # comment above MONSTER_VOICES) — running it would silently overwrite
    # them with the old synthesized placeholders. It's kept as a fallback:
    # copy in real files for a NEW archetype's four cues too, or call
    # monster_voices() by hand for one you haven't sourced real audio for
    # yet.
    ambient_lab()
    ambient_outside()
    menu_theme()
    death_ambient()
    print("audio done")
