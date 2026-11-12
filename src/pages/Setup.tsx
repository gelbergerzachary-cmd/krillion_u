export default function Setup() {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>Almost there</h1>
        <p className="muted">
          The app isn't connected to Supabase yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> to a <code>.env.local</code> file (or to your Vercel project's
          environment variables), then restart / redeploy.
        </p>
      </div>
    </div>
  );
}
