const SPECIAL: Record<string, string> = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espaço', Escape: 'Esc', Enter: 'Enter',
  ShiftLeft: 'Shift esq.', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl esq.', ControlRight: 'Ctrl dir.',
  AltLeft: 'Alt esq.', AltRight: 'Alt dir.', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'Caps Lock',
  Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']',
  Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', NumpadEnter: 'Enter (num.)',
};

/** Nome legível de um `KeyboardEvent.code`. */
export function keyLabel(code: string): string {
  if (SPECIAL[code]) return SPECIAL[code];
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}
