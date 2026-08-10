import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-5xl font-bold">403</p>
      <h1 className="mt-3 font-display text-2xl font-semibold">Unauthorized</h1>
      <p className="mt-2 text-ink-700/70 dark:text-sand-100/70">
        You do not have permission to access this page.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to Home
      </Link>
    </div>
  );
}
