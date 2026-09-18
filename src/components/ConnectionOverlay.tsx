export type ConnectionStatus =
  | 'CONNECTING'
  | 'READY'
  | 'SAVING'
  | 'SAVED'
  | 'ERROR';

type ConnectionOverlayProps = {
  status: ConnectionStatus;
  errorMessage?: string;
};

const statusLabels: Record<ConnectionStatus, string> = {
  CONNECTING: '箱庭を読み込み中…',
  READY: 'オンライン保存に接続済み',
  SAVING: '保存中…',
  SAVED: '保存しました',
  ERROR: 'Supabaseへ接続できません',
};

export function ConnectionOverlay({
  status,
  errorMessage,
}: ConnectionOverlayProps) {
  return (
    <aside className={`connection-overlay connection-overlay--${status.toLowerCase()}`}>
      <span className="connection-overlay__indicator" aria-hidden="true" />
      <div>
        <div className="connection-overlay__label">{statusLabels[status]}</div>
        {errorMessage && (
          <div className="connection-overlay__error">{errorMessage}</div>
        )}
      </div>
    </aside>
  );
}
