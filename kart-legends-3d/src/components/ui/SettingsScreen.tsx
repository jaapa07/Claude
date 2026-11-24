import { useEffect, useState } from 'react';
import { useGameStore } from '@/app/gameStore';
import { DEFAULT_SELECTION } from '@/app/gameStore';
import {
  ACTION_IDS, ACTION_LABELS, BINDING_SLOTS, SENSITIVITY_MAX, SENSITIVITY_MIN, useSettingsStore,
} from '@/app/settingsStore';
import type { ActionId, Quality, Volumes } from '@/app/settingsStore';
import { CaptureCancelledError, PAD_HELP, inputManager } from '@/game/input/inputManager';
import { keyLabel } from '@/game/input/keyLabels';
import { useSaveStore } from '@/game/save/saveStore';
import { Btn, ScreenShell } from './common';
import { uiSfx } from './uiAudio';

const VOLUME_ROWS: ReadonlyArray<{ id: keyof Volumes; label: string }> = [
  { id: 'music', label: 'Música' },
  { id: 'sfx', label: 'Efeitos' },
  { id: 'ambient', label: 'Ambiente' },
];

const QUALITY_ROWS: ReadonlyArray<{ id: Quality; label: string; hint: string }> = [
  { id: 'low', label: 'Baixa', hint: 'Sem sombras nem pós-processamento: para máquinas modestas.' },
  { id: 'medium', label: 'Média', hint: 'Sombras simples e efeitos reduzidos.' },
  { id: 'high', label: 'Alta', hint: 'Sombras, brilho e todos os efeitos.' },
];

interface Capture { action: ActionId; slot: number }

interface SettingsScreenProps {
  /** Aberta por cima da pausa: não oferece "Apagar progresso" (há uma corrida em andamento). */
  inRace?: boolean;
  onBack: () => void;
}

export function SettingsScreen({ inRace = false, onBack }: SettingsScreenProps): JSX.Element {
  const settings = useSettingsStore();
  const resetProgress = useSaveStore((s) => s.resetProgress);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [padConnected, setPadConnected] = useState(() => inputManager.isGamepadConnected());

  useEffect(() => {
    const timer = window.setInterval(() => setPadConnected(inputManager.isGamepadConnected()), 1000);
    return () => {
      window.clearInterval(timer);
      inputManager.cancelCapture();
    };
  }, []);

  const startCapture = (action: ActionId, slot: number): void => {
    setCapture({ action, slot });
    setMessage(null);
    inputManager.captureNextKey().then(
      (code) => {
        const before = useSettingsStore.getState().bindings;
        useSettingsStore.getState().setBinding(action, slot, code);
        const after = useSettingsStore.getState().bindings;
        if (before === after) {
          uiSfx('ui_error');
          setMessage(`${keyLabel(code)} é a única tecla de pausa e não pode ser reaproveitada.`);
        } else {
          uiSfx('ui_select');
          const stolen = ACTION_IDS.find((a) => a !== action && before[a].includes(code));
          setMessage(stolen
            ? `${keyLabel(code)} agora é "${ACTION_LABELS[action]}" (saiu de "${ACTION_LABELS[stolen]}").`
            : `${keyLabel(code)} agora é "${ACTION_LABELS[action]}".`);
        }
        setCapture(null);
      },
      (err: unknown) => {
        if (!(err instanceof CaptureCancelledError)) setMessage(err instanceof Error ? err.message : String(err));
        setCapture(null);
      },
    );
  };

  const erase = (): void => {
    resetProgress();
    useGameStore.getState().setSelection({ ...DEFAULT_SELECTION });
    setConfirmErase(false);
    setMessage('Progresso apagado: troféus, tempos, estatísticas e desbloqueios voltaram ao início.');
  };

  return (
    <ScreenShell id="settings" title="Configurações" layout="full" onBack={onBack}>
      <div className="settings">
        <div className="settings__col">
          <section className="panel settings__group" aria-labelledby="set-audio">
            <h2 id="set-audio" className="group-title">Áudio</h2>
            {VOLUME_ROWS.map((row, i) => {
              const value = Math.round(settings.volumes[row.id] * 100);
              return (
                <label className="slider" key={row.id}>
                  <span className="slider__label">{row.label}</span>
                  <input
                    type="range" min={0} max={100} step={5} value={value} data-testid={`slider-volume-${row.id}`}
                    data-autofocus={i === 0 ? 'true' : undefined}
                    onChange={(e) => settings.setVolume(row.id, Number(e.target.value) / 100)}
                    onPointerUp={() => row.id === 'sfx' && uiSfx('ui_move')}
                    onKeyUp={() => row.id === 'sfx' && uiSfx('ui_move')}
                  />
                  <output className="slider__value">{value}%</output>
                </label>
              );
            })}
          </section>

          <section className="panel settings__group" aria-labelledby="set-video">
            <h2 id="set-video" className="group-title">Qualidade gráfica</h2>
            <div className="segmented" role="radiogroup" aria-label="Qualidade gráfica">
              {QUALITY_ROWS.map((q) => (
                <button
                  key={q.id} type="button" role="radio" aria-checked={settings.quality === q.id} className="segmented__item"
                  data-testid={`btn-quality-${q.id}`} data-selected={settings.quality === q.id}
                  onClick={() => {
                    uiSfx('ui_select');
                    settings.setQuality(q.id);
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <p className="settings__hint">{QUALITY_ROWS.find((q) => q.id === settings.quality)?.hint}</p>
          </section>

          <section className="panel settings__group" aria-labelledby="set-data">
            <h2 id="set-data" className="group-title">Dados</h2>
            <div className="settings__actions">
              <Btn
                testId="btn-restore-defaults"
                onClick={() => {
                  settings.resetDefaults();
                  setMessage('Configurações restauradas para o padrão.');
                }}
              >
                Restaurar padrões
              </Btn>
              {!inRace && !confirmErase && (
                <Btn testId="btn-erase-progress" variant="danger" onClick={() => setConfirmErase(true)}>Apagar progresso</Btn>
              )}
            </div>
            {!inRace && confirmErase && (
              <div className="confirm" role="alertdialog" aria-label="Confirmar exclusão do progresso" data-testid="confirm-erase">
                <p>Apagar todos os troféus, tempos, estatísticas e desbloqueios? Isso não pode ser desfeito.</p>
                <div className="settings__actions">
                  <Btn testId="btn-erase-cancel" sound="ui_back" onClick={() => setConfirmErase(false)}>Cancelar</Btn>
                  <Btn testId="btn-erase-confirm" variant="danger" onClick={erase}>Sim, apagar tudo</Btn>
                </div>
              </div>
            )}
            {inRace && <p className="settings__hint">Para apagar o progresso, abra as Configurações pelo menu principal.</p>}
          </section>
          <p className="settings__message" data-testid="settings-message" aria-live="polite">{message}</p>
        </div>

        <div className="settings__col">
          <section className="panel settings__group" aria-labelledby="set-controls">
            <h2 id="set-controls" className="group-title">Controles</h2>
            <label className="slider">
              <span className="slider__label">Sensibilidade da direção</span>
              <input
                type="range" min={SENSITIVITY_MIN * 100} max={SENSITIVITY_MAX * 100} step={5} value={Math.round(settings.sensitivity * 100)}
                data-testid="slider-sensitivity" onChange={(e) => settings.setSensitivity(Number(e.target.value) / 100)}
              />
              <output className="slider__value">{settings.sensitivity.toFixed(2)}×</output>
            </label>
            <div className="toggle-row">
              <button
                type="button" role="switch" aria-checked={settings.gamepadEnabled} className="toggle" data-testid="btn-toggle-gamepad"
                data-selected={settings.gamepadEnabled}
                onClick={() => {
                  uiSfx('ui_select');
                  settings.setGamepadEnabled(!settings.gamepadEnabled);
                }}
              >
                <span className="toggle__knob" />
                <span className="toggle__label">Gamepad {settings.gamepadEnabled ? 'ligado' : 'desligado'}</span>
              </button>
              <span className="settings__hint" data-testid="gamepad-status">
                {padConnected ? 'Controle detectado.' : 'Nenhum controle detectado (aperte um botão nele).'}
              </span>
            </div>
            <div className="toggle-row">
              <button
                type="button" role="switch" aria-checked={settings.autoAccelerate} className="toggle" data-testid="btn-toggle-auto-accelerate"
                data-selected={settings.autoAccelerate}
                onClick={() => {
                  uiSfx('ui_select');
                  settings.setAutoAccelerate(!settings.autoAccelerate);
                }}
              >
                <span className="toggle__knob" />
                <span className="toggle__label">Aceleração automática {settings.autoAccelerate ? 'ligada' : 'desligada'}</span>
              </button>
              <span className="settings__hint">Celular: desligada, aparece o botão Acelerar.</span>
            </div>
            <details className="pad-help">
              <summary tabIndex={0}>Botões do gamepad</summary>
              <ul>
                {PAD_HELP.map((p) => <li key={p.action}><span>{p.action}</span><span>{p.buttons}</span></li>)}
              </ul>
            </details>

            <table className="bindings" data-testid="bindings">
              <thead>
                <tr><th scope="col">Ação</th><th scope="col">Tecla 1</th><th scope="col">Tecla 2</th></tr>
              </thead>
              <tbody>
                {ACTION_IDS.map((action) => (
                  <tr key={action}>
                    <th scope="row">{ACTION_LABELS[action]}</th>
                    {Array.from({ length: BINDING_SLOTS }, (_, slot) => {
                      const code = settings.bindings[action][slot];
                      const capturing = capture?.action === action && capture.slot === slot;
                      const available = slot <= settings.bindings[action].length;
                      return (
                        <td key={slot}>
                          <button
                            type="button" className="keycap" data-testid={`btn-remap-${action}-${slot}`} data-capturing={capturing}
                            disabled={!available || (capture !== null && !capturing)}
                            aria-label={`${ACTION_LABELS[action]}, tecla ${slot + 1}: ${code ? keyLabel(code) : 'vazia'}. Remapear`}
                            onClick={() => (capturing ? inputManager.cancelCapture() : startCapture(action, slot))}
                          >
                            {capturing ? 'Pressione…' : code ? keyLabel(code) : '—'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="settings__actions">
              <Btn
                testId="btn-reset-bindings"
                onClick={() => {
                  settings.resetBindings();
                  setMessage('Teclas restauradas para o padrão.');
                }}
              >
                Restaurar teclas
              </Btn>
              <span className="settings__hint">Clique numa tecla e pressione a nova. Esc cancela.</span>
            </div>
          </section>
        </div>
      </div>
    </ScreenShell>
  );
}
