import { useState, type SubmitEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button, Card, Field, Input } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('supervisor');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Quality Inspection Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to log and resolve defects.</p>
        </div>

        <Card className="p-5">
          <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
            <Field label="Username" htmlFor="username" required>
              <Input
                id="username"
                value={username}
                autoCapitalize="none"
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
              />
            </Field>

            <Field label="Password" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            {error && (
              <p role="alert" className="text-sm font-medium text-rose-700">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-500">
          Demo credentials — <span className="font-semibold">supervisor</span> /{' '}
          <span className="font-semibold">arvind123</span>
        </p>
      </div>
    </div>
  );
}
