/**
 * PLACEHOLDER CONVERSATIONS.
 *
 * None of this is story text — it exists to exercise every feature of the
 * dialogue system so the writing can be dropped in later without touching code:
 *
 *   speaker / portrait      who is talking, which face to show
 *   [tags] inside text      colour, shake, wave, typing speed, pauses
 *   set                     writes world flags on entry
 *   branches                picks a different node based on those flags
 *   choices                 player options, each with its own flags and target
 *   next: null              ends the conversation
 *
 * Portrait keys map to columns of assets/ui/portraits_placeholder.png
 * via PORTRAIT_INDEX in ui/DialogueBox.js.
 */
export const DIALOGUES = {
  npc_placeholder_a: {
    // First visit goes to `intro`; every later visit goes to `repeat`.
    branches: [{ ifFlag: 'met_npc_a', equals: true, next: 'repeat' }],
    start: 'intro',
    nodes: {
      intro: {
        speaker: { en: 'SURVIVOR', pt: 'SOBREVIVENTE' },
        portrait: 'survivor',
        set: { met_npc_a: true },
        text: {
          en: 'PLACEHOLDER LINE 001. This box demonstrates word wrap across more than two lines of text so that paging can be verified.',
          pt: 'LINHA TEMPORARIA 001. Esta caixa demonstra a quebra de linha em mais de duas linhas para verificar a paginacao.',
        },
        next: 'choices',
      },
      choices: {
        speaker: { en: 'SURVIVOR', pt: 'SOBREVIVENTE' },
        portrait: 'survivor',
        text: {
          en: 'PLACEHOLDER LINE 002. [c=#7fe0a8]Coloured text[/c], [shake]shaking text[/shake] and [wave]waving text[/wave] all render here.',
          pt: 'LINHA TEMPORARIA 002. [c=#7fe0a8]Texto colorido[/c], [shake]texto a tremer[/shake] e [wave]texto ondulado[/wave] aparecem aqui.',
        },
        choices: [
          { text: { en: 'Placeholder option A', pt: 'Opcao temporaria A' }, next: 'branch_a', set: { npc_a_choice: 'a' } },
          { text: { en: 'Placeholder option B', pt: 'Opcao temporaria B' }, next: 'branch_b', set: { npc_a_choice: 'b' } },
          { text: { en: 'Say nothing', pt: 'Nao dizer nada' }, next: null },
        ],
      },
      branch_a: {
        speaker: { en: 'SURVIVOR', pt: 'SOBREVIVENTE' },
        portrait: 'survivor',
        text: {
          en: 'PLACEHOLDER BRANCH A. The chosen option was recorded as a world flag.',
          pt: 'RAMO TEMPORARIO A. A opcao escolhida ficou registada como flag do mundo.',
        },
        next: null,
      },
      branch_b: {
        speaker: { en: 'SURVIVOR', pt: 'SOBREVIVENTE' },
        portrait: 'survivor',
        text: {
          en: 'PLACEHOLDER BRANCH B.[p=0.4] A pause tag was used before this sentence.',
          pt: 'RAMO TEMPORARIO B.[p=0.4] Foi usada uma pausa antes desta frase.',
        },
        next: null,
      },
      repeat: {
        speaker: { en: 'SURVIVOR', pt: 'SOBREVIVENTE' },
        portrait: 'survivor',
        text: {
          en: 'PLACEHOLDER REPEAT LINE. Shown on every visit after the first.',
          pt: 'LINHA TEMPORARIA REPETIDA. Aparece em todas as visitas seguintes.',
        },
        next: null,
      },
    },
  },

  npc_placeholder_b: {
    start: 'line',
    nodes: {
      line: {
        speaker: { en: '???', pt: '???' },
        portrait: 'wanderer',
        text: {
          en: '[s=0.45]PLACEHOLDER SLOW LINE.[/c] Typing speed was halved with a tag.',
          pt: '[s=0.45]LINHA TEMPORARIA LENTA.[/c] A velocidade foi reduzida com uma tag.',
        },
        next: null,
      },
    },
  },

  npc_placeholder_c: {
    start: 'line',
    nodes: {
      line: {
        speaker: { en: 'WANDERER', pt: 'ERRANTE' },
        portrait: 'wanderer',
        text: {
          en: 'PLACEHOLDER OUTDOOR LINE. Replace with written dialogue later.',
          pt: 'LINHA TEMPORARIA EXTERIOR. Substituir por dialogo escrito mais tarde.',
        },
        next: null,
      },
    },
  },

  prop_terminal: {
    start: 'boot',
    nodes: {
      boot: {
        speaker: { en: 'TERMINAL', pt: 'TERMINAL' },
        text: {
          en: '[c=#7fe0a8]> PLACEHOLDER RECORD[/c]\n> No data written to this entry.',
          pt: '[c=#7fe0a8]> REGISTO TEMPORARIO[/c]\n> Sem dados nesta entrada.',
        },
        next: null,
      },
    },
  },

  prop_locked: {
    start: 'locked',
    nodes: {
      locked: {
        // Requires an item flag — set by picking up the blue keycard.
        branches: [{ ifFlag: 'has_blue_keycard', equals: true, next: 'unlocked' }],
        speaker: { en: 'TERMINAL', pt: 'TERMINAL' },
        text: {
          en: '[c=#e0a458]> ACCESS DENIED[/c]\n> Placeholder lock. A keycard exists on this floor.',
          pt: '[c=#e0a458]> ACESSO NEGADO[/c]\n> Bloqueio temporario. Existe um cartao neste piso.',
        },
        next: null,
      },
      unlocked: {
        speaker: { en: 'TERMINAL', pt: 'TERMINAL' },
        set: { terminal_c_unlocked: true },
        text: {
          en: '[c=#7fe0a8]> ACCESS GRANTED[/c]\n> Placeholder payload. Hook a quest or cutscene here.',
          pt: '[c=#7fe0a8]> ACESSO CONCEDIDO[/c]\n> Conteudo temporario. Liga aqui uma missao ou cena.',
        },
        next: null,
      },
    },
  },

  npc_trader: {
    // Repeat visits skip straight to the offer instead of the greeting.
    branches: [{ ifFlag: 'met_trader', equals: true, next: 'offer' }],
    start: 'greet',
    nodes: {
      greet: {
        speaker: { en: 'TRADER', pt: 'COMERCIANTE' },
        portrait: 'survivor',
        set: { met_trader: true },
        text: {
          en: 'PLACEHOLDER TRADER GREETING. Got scrip? I\'ve got supplies.',
          pt: 'SAUDACAO TEMPORARIA DO COMERCIANTE. Tens fichas? Eu tenho mantimentos.',
        },
        next: 'offer',
      },
      offer: {
        speaker: { en: 'TRADER', pt: 'COMERCIANTE' },
        portrait: 'survivor',
        text: { en: 'Take a look.', pt: 'Da uma vista de olhos.' },
        choices: [
          // emit is the seam the engine already documents for opening a shop
          // screen from a conversation — see docs/EXTENDING.md.
          { text: { en: 'Trade', pt: 'Negociar' }, next: null, emit: 'shop:open' },
          { text: { en: 'Never mind', pt: 'Deixa estar' }, next: null },
        ],
      },
    },
  },

  note_field: {
    // A readable item (see ItemDatabase.js `dialogueId`/`readable()`) — same
    // tree shape as a prop, just opened from the inventory instead of the world.
    start: 'read',
    nodes: {
      read: {
        speaker: { en: 'FIELD NOTES', pt: 'NOTAS DE CAMPO' },
        text: {
          en: '[c=#e0a458]PLACEHOLDER LOG ENTRY.[/c]\nHandwriting, water-damaged. Contents to be written.',
          pt: '[c=#e0a458]REGISTO TEMPORARIO.[/c]\nEscrita a mao, danificada pela agua. Conteudo por escrever.',
        },
        next: null,
      },
    },
  },

  note_audio: {
    start: 'play',
    nodes: {
      play: {
        speaker: { en: 'RECORDING', pt: 'GRAVACAO' },
        text: {
          en: '[shake]*static*[/shake][p=0.3] PLACEHOLDER AUDIO TRANSCRIPT. Contents to be written.',
          pt: '[shake]*estatica*[/shake][p=0.3] TRANSCRICAO TEMPORARIA. Conteudo por escrever.',
        },
        next: null,
      },
    },
  },

  note_bunker: {
    start: 'read',
    nodes: {
      read: {
        speaker: { en: 'LOGBOOK', pt: 'DIARIO' },
        text: {
          en: '[c=#9fd8ff]PLACEHOLDER SHELTER LOG.[/c]\nContents to be written.',
          pt: '[c=#9fd8ff]REGISTO TEMPORARIO DO ABRIGO.[/c]\nConteudo por escrever.',
        },
        next: null,
      },
    },
  },

  // Played by GameScene's 'trigger:reveal' listener (Cutscene.play) — see
  // maps/bunker's 'reveal' trigger. Not tied to any item or NPC.
  note_bunker_reveal: {
    start: 'stir',
    nodes: {
      stir: {
        text: {
          en: '[shake]PLACEHOLDER: something shifts further in.[/shake]',
          pt: '[shake]TEMPORARIO: algo se mexe la dentro.[/shake]',
        },
        next: null,
      },
    },
  },

  prop_sign: {
    start: 'read',
    nodes: {
      read: {
        text: {
          en: 'PLACEHOLDER SIGN. Weathered past reading.',
          pt: 'SINAL TEMPORARIO. Demasiado gasto para se ler.',
        },
        next: null,
      },
    },
  },

  // Played by cutscenes/intro.js — a chained 3-node inner monologue, run once
  // as a 'dialogue' step inside the intro Cutscene. No speaker name/portrait
  // (reads as thought, not speech); demonstrates chaining via `next` so one
  // Cutscene 'dialogue' step can cover several pages/nodes at once.
  intro_wake: {
    start: 'a',
    nodes: {
      a: {
        text: {
          en: 'PLACEHOLDER INTRO LINE 001. [p=0.3]Cold floor. Quiet, past the hum of the lights.',
          pt: 'LINHA TEMPORARIA DE ABERTURA 001. [p=0.3]Chao frio. Silencio, para alem do zumbido das luzes.',
        },
        next: 'b',
      },
      b: {
        text: {
          en: 'PLACEHOLDER INTRO LINE 002. [c=#7fe0a8]Something[/c] is still running down here.',
          pt: 'LINHA TEMPORARIA DE ABERTURA 002. [c=#7fe0a8]Algo[/c] ainda esta a funcionar aqui em baixo.',
        },
        next: 'c',
      },
      c: {
        text: {
          en: 'PLACEHOLDER INTRO LINE 003. Best find out what, before it finds you first.',
          pt: 'LINHA TEMPORARIA DE ABERTURA 003. Melhor descobrir o que e, antes que te encontre primeiro.',
        },
        next: null,
      },
    },
  },
};
