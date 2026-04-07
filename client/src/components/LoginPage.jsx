import { useState, useEffect } from 'react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    // Simulate network delay
    await new Promise(r => setTimeout(r, 600));
    const result = onLogin(username.trim(), password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #060d1f; min-height: 100vh; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gridPulse {
          0%,100% { opacity: 0.04; }
          50%      { opacity: 0.08; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-6px); }
          40%,80% { transform: translateX(6px); }
        }

        .login-input {
          width: 100%; padding: 13px 16px;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .login-input:focus {
          border-color: #60a5fa;
          background: rgba(96,165,250,0.08);
        }
        .login-input::placeholder { color: rgba(255,255,255,0.25); }

        .login-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #0057B8, #0ea5e9);
          border: none; border-radius: 10px;
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem; font-weight: 700;
          cursor: pointer; letter-spacing: 0.03em;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 4px 20px rgba(0,87,184,0.4);
        }
        .login-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#060d1f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          animation: 'gridPulse 4s ease infinite',
        }}/>

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,87,184,0.18) 0%, transparent 70%)', zIndex: 0, animation: 'float 7s ease infinite' }}/>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)', zIndex: 0, animation: 'float 9s ease infinite reverse' }}/>

        {/* Card */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: '420px',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          opacity: mounted ? 1 : 0,
          animation: mounted ? 'fadeUp 0.5s ease both' : 'none',
        }}>

          {/* Logo + brand */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #38bdf8, #0057B8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(0,87,184,0.4)',
            }}>👷</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '1.8rem', fontWeight: 900, color: '#fff',
              letterSpacing: '0.06em', lineHeight: 1,
            }}>3P SHIFT ASSIGN</div>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: '0.5rem',
              color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em',
              textTransform: 'uppercase', marginTop: '6px',
            }}>Unilever · HRTA Department</div>
          </div>

          {/* Welcome text */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
              Sign in to continue
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
              Enter your credentials to access the system
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: '16px', padding: '10px 14px',
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
              animation: 'shake 0.4s ease',
            }}>
              <span style={{ fontSize: '0.9rem' }}>⚠️</span>
              <span style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{error}</span>
            </div>
          )}

          {/* Username */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px' }}>
              Username
            </label>
            <input
              className="login-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="login-input"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <button
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)', fontSize: '1rem',
                  padding: '4px', lineHeight: 1,
                }}
                tabIndex={-1}
              >{showPw ? '🙈' : '👁️'}</button>
            </div>
          </div>

          {/* Submit */}
          <button className="login-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/>
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>

          {/* Role hint */}
          <div style={{
            marginTop: '24px', padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
          }}>
            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Access Levels
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[
                { role: 'Supervisor', access: 'Shift Assignment board', color: '#60a5fa' },
                { role: 'Admin',      access: 'Full access + Admin panel', color: '#f59e0b' },
              ].map(r => (
                <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.color, flexShrink: 0 }}/>
                  <span style={{ fontSize: '0.7rem', color: r.color, fontWeight: 600, minWidth: '80px' }}>{r.role}</span>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{r.access}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
