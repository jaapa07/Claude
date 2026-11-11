// Narration & dialogue for the 5 episodes (PT-BR). `start` is seconds inside the
// episode's own 20 s timeline. tools/voice.py turns each line into
// assets/voice/<id>.wav and writes the measured word timings to manifest.json.
export const VOICES = {
  narrador: { kokoro: 'pm_alex', speed: 0.95, fx: 'narrator', color: [255, 255, 255] },
  guardiao: { kokoro: 'pm_santa', speed: 0.82, fx: 'giant', color: [255, 214, 130], speaker: 'O GUARDIÃO', tag: '255,200,110' },
  nucleo: { kokoro: 'pf_dora', speed: 0.88, fx: 'machine', color: [170, 225, 255], speaker: 'A VOZ DO NÚCLEO', tag: '120,200,255' },
};

export const LINES = [
  { id: 'e1a', ep: 1, start: 4.4, voice: 'narrador', text: 'Ele acreditava ser o último sobrevivente…' },
  { id: 'e1b', ep: 1, start: 15.2, voice: 'narrador', text: '…até descobrir que alguém estava observando.' },
  { id: 'e2a', ep: 2, start: 5.6, voice: 'narrador', text: 'Quando o mundo começou a desaparecer,' },
  { id: 'e2b', ep: 2, start: 15.4, voice: 'narrador', text: 'fugir deixou de ser uma escolha.' },
  { id: 'e3a', ep: 3, start: 5.4, voice: 'narrador', text: 'Do outro lado da queda, nada obedecia às regras.' },
  { id: 'e3b', ep: 3, start: 15.6, voice: 'guardiao', text: 'Você não deveria ter acordado.' },
  { id: 'e4a', ep: 4, start: 5.4, voice: 'narrador', text: 'Cada tela guardava um fim diferente. Todos eram ele.' },
  { id: 'e4b', ep: 4, start: 15.0, voice: 'nucleo', text: 'Você não é o sobrevivente. Você é quem criou este mundo.' },
  { id: 'e5a', ep: 5, start: 0.8, voice: 'narrador', text: 'Para trazer o mundo de volta, ele teria que deixar de existir.' },
  { id: 'e5b', ep: 5, start: 14.6, voice: 'narrador', text: 'Toda luz que se apaga… acende outra.' },
];
