// Pista sobre el mapa: una sola línea que dice cuál es el paso siguiente en la vista actual.
// Se puede cerrar para siempre; vuelve a encenderse desde «Cómo usar Compás».
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';

interface Props {
  text: string;
  /** Mención de teclas, que no tiene sentido en pantallas táctiles estrechas. */
  keys?: string;
  onDismiss: () => void;
}

export function MapHint({ text, keys, onDismiss }: Props) {
  const { t } = useI18n();
  return (
    <div className="pista-zona">
      <p className="pista" role="note">
        <span>
          {text}
          {keys && <span className="pista-teclas"> {keys}</span>}
        </span>
        <button type="button" className="pista-cerrar" onClick={onDismiss} aria-label={t('hint.dismiss')} title={t('hint.dismiss')}>
          <X size={16} aria-hidden="true" />
        </button>
      </p>
    </div>
  );
}
