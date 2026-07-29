import numpy as np
import os
import synth as S

OUT = os.path.dirname(os.path.abspath(__file__))

# (pasta, nome_base, funcao, kwargs, n_variantes)
JOBS = [
    ("grunts", "grunt_small",   S.grunt,      {"size": "small"}, 3),
    ("grunts", "grunt_mid",     S.grunt,      {"size": "mid"},   3),
    ("grunts", "grunt_big",     S.grunt,      {"size": "big"},   3),
    ("growls", "growl_loop",    S.growl_loop, {},                3),
    ("roars",  "roar_mid",      S.roar,       {"size": "mid"},   3),
    ("roars",  "roar_big",      S.roar,       {"size": "big"},   3),
    ("screams", "screech",      S.screech,    {},                4),
    ("hurt",   "hurt_small",    S.hurt,       {"size": "small"}, 3),
    ("hurt",   "hurt_mid",      S.hurt,       {"size": "mid"},   3),
    ("hurt",   "hurt_big",      S.hurt,       {"size": "big"},   3),
    ("death",  "death_mid",     S.death,      {"size": "mid"},   3),
    ("death",  "death_big",     S.death,      {"size": "big"},   3),
    ("idle",   "chirp",         S.chirp,      {},                4),
    ("idle",   "hiss",          S.hiss,       {},                3),
    ("idle",   "alert",         S.alert,      {},                3),
    ("attack", "chomp",         S.chomp,      {},                3),
    ("attack", "slime_blob",    S.slime,      {},                3),
    ("steps",  "step_small",    S.footstep,   {"size": "small"}, 3),
    ("steps",  "step_big",      S.footstep,   {"size": "big"},   3),
]

total = 0
seed = 1000
rows = []
for folder, name, fn, kw, count in JOBS:
    for v in range(1, count + 1):
        seed += 7
        rng = np.random.default_rng(seed)
        audio = fn(rng, **kw)
        path = os.path.join(OUT, folder, f"{name}_{v:02d}.wav")
        dur = S.save(audio, path)
        rows.append((folder, f"{name}_{v:02d}.wav", round(dur, 3)))
        total += 1

print(f"Gerados {total} ficheiros.")
for r in rows:
    print(f"  {r[0]:8s} {r[1]:22s} {r[2]:.2f}s")
