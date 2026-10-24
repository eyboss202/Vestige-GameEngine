# Creature SFX — 16-bit Pack

59 efeitos sonoros de criaturas, sintetizados proceduralmente.
**Formato:** WAV · 22050 Hz · mono · 16-bit PCM (estética SNES/Mega Drive).

**Licença:** domínio público / CC0. Gerado do zero por síntese — sem samples de terceiros.
Usa livremente em projetos comerciais ou não comerciais, sem atribuição.

---

## Conteúdo

| Pasta | Ficheiros | Uso típico |
|---|---|---|
| `grunts/` | `grunt_small/mid/big_01-03` | vocalizações curtas, esforço, ataque leve |
| `growls/` | `growl_loop_01-03` (~1.4s) | ambiente, criatura por perto, **loopável** |
| `roars/` | `roar_mid/big_01-03` | boss, entrada em cena, ataque especial |
| `screams/` | `screech_01-04` | morcegos, aves, criaturas agudas, susto |
| `hurt/` | `hurt_small/mid/big_01-03` | dano recebido |
| `death/` | `death_mid/big_01-03` | morte (queda de tom + gorgolejo) |
| `idle/` | `chirp_01-04`, `hiss_01-03`, `alert_01-03` | idle de bicho pequeno, réptil, deteção do jogador |
| `attack/` | `chomp_01-03`, `slime_blob_01-03` | mordida, criatura gelatinosa |
| `steps/` | `step_small/big_01-03` | passos |

Abre `player.html` no browser para ouvires tudo (tem de estar na mesma pasta que as subpastas).

---

## Notas de integração

**Variação sem repetição.** Cada tipo tem 3-4 variantes precisamente para evitares fadiga auditiva.
Escolhe aleatoriamente, mas evita repetir a última:

```gdscript
# Godot 4
@export var variants: Array[AudioStream]
var _last := -1

func play_random(player: AudioStreamPlayer) -> void:
    var i := randi() % variants.size()
    if variants.size() > 1 and i == _last:
        i = (i + 1) % variants.size()
    _last = i
    player.stream = variants[i]
    player.pitch_scale = randf_range(0.92, 1.08)  # variação extra grátis
    player.play()
```

**Pitch shift = criaturas novas.** O mesmo `grunt_mid` a `pitch_scale` 0.6 vira um monstro
enorme; a 1.5 vira um goblin. Uma boa parte do bestiário sai daqui.

**`growl_loop`** foi feito com fades curtos nas pontas. Para loop perfeitamente contínuo,
corta os ~10 ms finais no teu editor ou usa crossfade loop.

**Headroom.** Todos normalizados a -1 dBFS. Se tocares vários em simultâneo, baixa o volume
do bus de SFX para ~-6 dB para não clipar na mistura.

**Unity:** importa como `Decompress on Load` (ficheiros pequenos), Force Mono ligado.
**Godot:** os WAV importam direto; ativa Loop só nos `growl_loop` se quiseres.

---

## Gerar mais sons

`synth.py` + `build_pack.py` estão incluídos. Requer só `numpy`:

```bash
pip install numpy
python3 build_pack.py
```

Para variantes novas, muda o `seed` inicial em `build_pack.py` ou aumenta o número de
variantes na lista `JOBS`. Cada seed dá um resultado diferente mas coerente com a família.

Parâmetros que vale a pena mexer em `synth.py`:

- `SR` — 22050 é a estética retro; 44100 dá som mais limpo e moderno.
- `bitcrush(..., bits=8, rate_div=2)` — menos bits = mais sujo. `bits=6, rate_div=3` fica bem cru.
- `drive(v, 3.0)` — distorção. Acima de ~5 fica muito agressivo.
- `formants(src, [340, 780, 1900], ...)` — as frequências dos formantes definem a "vogal" da
  criatura. Baixar dá som mais cavernoso; subir dá som mais pequeno e nasal.
