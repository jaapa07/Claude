import { useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, MouseEvent, ReactNode } from 'react';
import { uiSfx } from './uiAudio';

interface ScreenProps {
  /** Nome da tela: gera `data-testid="screen-<id>"`. */
  id: string;
  title?: string;
  kicker?: string;
  /** 'side' = painel à esquerda (deixa o modelo 3D livre à direita); 'full' = largura toda; 'center' = centralizado. */
  layout?: 'side' | 'full' | 'center' | 'bare';
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function ScreenShell({ id, title, kicker, layout = 'side', onBack, children, footer, className }: ScreenProps): JSX.Element {
  return (
    <section className={`screen screen--${layout} ${className ?? ''}`} data-testid={`screen-${id}`} data-nav-scope aria-label={title ?? id}>
      <div className="screen__inner">
        {(title || onBack) && (
          <header className="screen__header">
            {onBack && (
              <Btn variant="ghost" testId="btn-back" sound="ui_back" onClick={onBack} aria-label="Voltar">
                ‹ Voltar
              </Btn>
            )}
            <div>
              {kicker && <p className="screen__kicker">{kicker}</p>}
              {title && <h1 className="display-title">{title}</h1>}
            </div>
          </header>
        )}
        <div className="screen__body">{children}</div>
        {footer && <footer className="screen__footer">{footer}</footer>}
      </div>
    </section>
  );
}

interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  testId: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  sound?: 'ui_select' | 'ui_back' | 'none';
  autoFocusNav?: boolean;
  onClick: () => void;
}

export function Btn({ testId, variant = 'secondary', sound = 'ui_select', autoFocusNav, onClick, className, children, ...rest }: BtnProps): JSX.Element {
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${className ?? ''}`}
      data-testid={testId}
      data-autofocus={autoFocusNav ? 'true' : undefined}
      onClick={() => {
        if (sound !== 'none') uiSfx(sound);
        onClick();
      }}
      {...rest}
    >
      <span className="btn__label">{children}</span>
    </button>
  );
}

interface AssetImgProps { src: string; alt: string; color: string; className?: string; label?: string }

/** Imagem com fundo na cor do item: se o arquivo ainda não existir, sobra um bloco colorido com a inicial. */
export function AssetImg({ src, alt, color, className, label }: AssetImgProps): JSX.Element {
  const [failed, setFailed] = useState(false);
  const style = { '--img-color': color } as CSSProperties;
  return (
    <span className={`asset-img ${className ?? ''}`} style={style}>
      {failed
        ? <span className="asset-img__fallback" role="img" aria-label={alt}>{(label ?? alt).slice(0, 1).toUpperCase()}</span>
        : <img src={src} alt={alt} draggable={false} onError={() => setFailed(true)} />}
    </span>
  );
}

export interface CardHandlers {
  onFocus: () => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
  'data-selected': boolean;
  'data-locked': boolean;
  'data-autofocus': 'true' | undefined;
  'aria-pressed': boolean;
}

/**
 * Lógica comum das telas de escolha:
 * - focar um cartão (setas/gamepad) já o seleciona, e Enter / botão A confirma e avança;
 * - com o mouse, um clique apenas seleciona; avança-se pelo botão Confirmar ou com duplo clique;
 * - cartões bloqueados podem ser focados para ler a condição, mas não selecionados.
 */
export function useCardPick<T extends string>(opts: {
  selected: T;
  isLocked?: (id: T) => boolean;
  onSelect: (id: T) => void;
  onConfirm: () => void;
}): { focusId: T; cardProps: (id: T) => CardHandlers; confirm: () => void } {
  const { selected, isLocked, onSelect, onConfirm } = opts;
  const [focusId, setFocusId] = useState<T>(selected);
  const locked = (id: T): boolean => (isLocked ? isLocked(id) : false);

  const confirm = (): void => {
    if (locked(selected)) {
      uiSfx('ui_error');
      return;
    }
    uiSfx('ui_select');
    onConfirm();
  };

  const cardProps = (id: T): CardHandlers => ({
    onFocus: () => {
      if (focusId !== id) {
        setFocusId(id);
        uiSfx('ui_move');
      }
      if (!locked(id) && selected !== id) onSelect(id);
    },
    onClick: (event) => {
      setFocusId(id);
      if (locked(id)) {
        uiSfx('ui_error');
        return;
      }
      if (selected !== id) onSelect(id);
      // `detail === 0`: clique vindo do teclado (Enter/Espaço) ou do gamepad → confirma direto.
      if (event.detail === 0) {
        uiSfx('ui_select');
        onConfirm();
      }
    },
    onDoubleClick: () => {
      if (locked(id)) return;
      uiSfx('ui_select');
      onConfirm();
    },
    'data-selected': selected === id,
    'data-locked': locked(id),
    'data-autofocus': selected === id ? 'true' : undefined,
    'aria-pressed': selected === id,
  });

  return { focusId, cardProps, confirm };
}

export function LockBadge(): JSX.Element {
  return (
    <span className="lock-badge" aria-label="Bloqueado">
      <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
        <path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
      </svg>
    </span>
  );
}

/** Etiqueta do jogador humano: "Você" (1 jogador) ou "Jogador 1/2" (tela dividida). */
export function PlayerTag({ slot, two }: { slot?: number; two: boolean }): JSX.Element {
  if (!two) return <span className="tag">Você</span>;
  const s = (slot ?? 0) + 1;
  return <span className={`tag tag--p${s}`} data-testid={`tag-p${s}`}>Jogador {s}</span>;
}
