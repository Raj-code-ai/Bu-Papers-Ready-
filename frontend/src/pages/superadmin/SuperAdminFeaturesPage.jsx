import { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function SuperAdminFeaturesPage() {
  const [features, setFeatures] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState('');

  async function load() {
    const res = await superAdminApi.getFeatures();
    setFeatures(res.data.data || []);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onToggle(feature) {
    const key = feature.key;
    const next = !feature.enabled;
    setToggling(key);
    setMessage('');
    setError('');
    try {
      await superAdminApi.updateFeature(key, next);
      setMessage(`Feature "${feature.name}" ${next ? 'enabled' : 'disabled'}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setToggling('');
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Feature toggles</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Enable or disable platform features without redeploying.
        </p>
      </div>
      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      {features.length === 0 ? (
        <EmptyState title="No features" message="Feature toggles will appear once seeded." />
      ) : (
        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature.key} className="panel flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{feature.name}</p>
                <p className="text-sm text-ink-700/70 dark:text-sand-100/70">
                  {feature.key}
                  {feature.description ? ` · ${feature.description}` : ''}
                </p>
              </div>
              <button
                type="button"
                className={feature.enabled ? 'btn-secondary !py-1.5' : 'btn-primary !py-1.5'}
                disabled={toggling === feature.key}
                onClick={() => onToggle(feature)}
              >
                {toggling === feature.key ? 'Updating...' : feature.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
