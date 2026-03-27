import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: '2rem',
            background: '#060a0f',
            color: '#e2e8f0',
            fontFamily: 'Inter, system-ui, sans-serif',
            maxWidth: '40rem',
          }}
        >
          <h1 style={{ color: '#22d3ee', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
            The app hit an error while rendering. Try refreshing the page. If you opened this site from a
            file on disk, run <code style={{ color: '#94a3b8' }}>npm run dev</code> in the project folder
            and open the URL Vite prints (usually http://localhost:5173).
          </p>
          <pre
            style={{
              fontSize: '12px',
              overflow: 'auto',
              padding: '1rem',
              background: '#111',
              borderRadius: '8px',
              color: '#f87171',
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.25rem',
              background: '#0891b2',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
