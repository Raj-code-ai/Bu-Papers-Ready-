export function EmptyState({ title, message }) {
  return (
    <div className="panel text-center">
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-2 text-sm text-ink-700/70 dark:text-sand-100/70">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="panel border-red-300/50 bg-red-50/80 text-red-900 dark:bg-red-950/40 dark:text-red-100">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1 text-sm">{message || 'Please try again.'}</p>
      {onRetry ? (
        <button type="button" className="btn-secondary mt-3 !py-1.5" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-16 w-full" />
      ))}
    </div>
  );
}
