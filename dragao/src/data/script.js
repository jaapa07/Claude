// Dublagem & narração (PT-BR). JSON-válido após o "=", lido também por tools/voice.py.
// start = segundos na timeline de 20 s do episódio. "say" = forma falada (opcional).
// "sub": false → não aparece nas legendas (risadas, gritos de fundo).
export const SCRIPT = {
  "voices": {
    "pipo":     { "kokoro": "pm_alex",  "speed": 1.12, "fx": "young",   "speaker": "PIPO",       "tag": "70,230,215", "color": [255, 255, 255] },
    "brasa":    { "kokoro": "pm_santa", "speed": 0.98, "fx": "big",     "speaker": "BRASA",      "tag": "255,110,80", "color": [255, 236, 220] },
    "luna":     { "kokoro": "pf_dora",  "speed": 1.06, "fx": "fairy",   "speaker": "LUNA",       "tag": "200,150,255", "color": [255, 250, 225] },
    "rei":      { "kokoro": "pm_santa", "speed": 1.04, "fx": "king",    "speaker": "REI GORAN",  "tag": "255,210,90", "color": [255, 248, 220] },
    "diretor":  { "kokoro": "pm_alex",  "speed": 1.0,  "fx": "bubble",  "speaker": "DIRETOR",    "tag": "190,170,255", "color": [255, 255, 255] },
    "monstro":  { "kokoro": "pm_santa", "speed": 0.9,  "fx": "monster", "speaker": "MONSTRO",    "tag": "140,220,255", "color": [225, 245, 255] },
    "narrador": { "kokoro": "pm_alex",  "speed": 0.96, "fx": "narrator", "color": [255, 255, 255] }
  },
  "lines": [
    { "id": "e1_riso1", "ep": 1, "start": 12.55, "voice": "brasa", "text": "Rá rá rá rá rá!", "say": "Rá, rá, rá, rá, rá!", "sub": false },
    { "id": "e1_riso2", "ep": 1, "start": 12.75, "voice": "monstro", "text": "Rô rô rô!", "say": "Rô, rô, rô, rô!", "sub": false },
    { "id": "e1_brasa", "ep": 1, "start": 13.7, "voice": "brasa", "text": "Você não é dragão! É uma máquina de lavar com asas!" },
    { "id": "e1_atchim", "ep": 1, "start": 17.05, "voice": "pipo", "text": "Ah… ah… ATCHIM!", "say": "Ah... ah... atchim!", "sub": false },
    { "id": "e1_diretor", "ep": 1, "start": 18.25, "voice": "diretor", "text": "ALGUÉM ME TIRA DAQUI!", "say": "Alguém me tira daqui!" },
    { "id": "e2_pipo1", "ep": 2, "start": 1.1, "voice": "pipo", "text": "Aguenta firme, diretor! Eu vou te salvar!" },
    { "id": "e2_luna", "ep": 2, "start": 10.2, "voice": "luna", "text": "Você sabe que dragões normalmente assustam pessoas, né?" },
    { "id": "e2_pipo2", "ep": 2, "start": 13.35, "voice": "pipo", "text": "Eu assusto! Principalmente quando tento pousar!" },
    { "id": "e2_narr", "ep": 2, "start": 15.9, "voice": "narrador", "text": "Mas o reino estava prestes a enfrentar um problema muito maior." },
    { "id": "e3_rei", "ep": 3, "start": 11.7, "voice": "rei", "text": "EU SOU O REI! NÃO UMA BOLINHA DE SABÃO!", "say": "Eu sou o rei! Não uma bolinha de sabão!" },
    { "id": "e3_luna", "ep": 3, "start": 15.5, "voice": "luna", "text": "Pipo! Suas bolhas podem proteger todo o reino!" },
    { "id": "e4_hic", "ep": 4, "start": 5.6, "voice": "pipo", "text": "Ai, não… hic!", "say": "Ai, não... hic!", "sub": false },
    { "id": "e4_luna", "ep": 4, "start": 8.9, "voice": "luna", "text": "Pipo, você consegue! Respira fundo!" },
    { "id": "e4_monstro", "ep": 4, "start": 17.3, "voice": "monstro", "text": "EI! EU TENHO MEDO DE ALTURA!", "say": "Ei! Eu tenho medo de altura!" },
    { "id": "e5_luna", "ep": 5, "start": 5.9, "voice": "luna", "text": "Ele só queria um lugar seguro para viver." },
    { "id": "e5_rei1", "ep": 5, "start": 9.0, "voice": "rei", "text": "Eu declaro Pipo herói oficial do reino!" },
    { "id": "e5_brasa", "ep": 5, "start": 11.55, "voice": "brasa", "text": "Desculpa por te chamar de máquina de lavar." },
    { "id": "e5_pipo", "ep": 5, "start": 14.0, "voice": "pipo", "text": "Tudo bem. Pelo menos eu deixo o reino limpinho!" },
    { "id": "e5_rei2", "ep": 5, "start": 18.35, "voice": "rei", "text": "DE NOVO NÃÃÃO!", "say": "De novo nãããão!" }
  ]
};
export const VOICES = SCRIPT.voices;
export const LINES = SCRIPT.lines;
