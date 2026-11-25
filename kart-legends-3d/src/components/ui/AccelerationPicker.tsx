import { useSettingsStore } from '@/app/settingsStore';
import { uiSfx } from './uiAudio';

/**
 * Celular: escolha entre aceleração automática (o kart acelera sozinho) e manual (botão Acelerar na tela).
 * Aparece nas Configurações e no menu de pausa.
 */
export function AccelerationPicker(): JSX.Element {
  const auto = useSettingsStore((s) => s.autoAccelerate);
  const setAuto = useSettingsStore((s) => s.setAutoAccelerate);
  const options = [
    { id: 'auto', label: 'Automática', on: true },
    { id: 'manual', label: 'Manual', on: false },
  ] as const;
  return (
    <div className="accel-picker" data-testid="accel-picker">
      <span className="accel-picker__label">Aceleração no toque</span>
      <div className="segmented" role="radiogroup" aria-label="Aceleração no toque">
        {options.map((o) => (
          <button
            key={o.id} type="button" role="radio" aria-checked={auto === o.on} className="segmented__item"
            data-selected={auto === o.on} data-testid={`accel-${o.id}`}
            onClick={() => { uiSfx('ui_select'); setAuto(o.on); }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span className="accel-picker__hint">
        {auto ? 'O kart acelera sozinho: use Freio para frear e dar ré.' : 'Segure Acelerar com o polegar direito; com o esquerdo, vire pelas setas ◀ ▶ (ou arrastando) e puxe o Drift para o lado da curva.'}
      </span>
    </div>
  );
}
