import { useState, useEffect } from 'react';

// ── Must match install.sh and install.cmd ─────────────────────────
const SECRET  = 'TLL_SECRET_2026';
const PASSKEY = 'ztakora-demo-2026';
const LS_KEY  = 'tll_enc_key';

// ── Helpers ───────────────────────────────────────────────────────
function hexToBytes(hex) {
  const clean = hex.replace(/\s/g, '');
  const arr   = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++)
    arr[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

// Derive key: SHA-256("TLL_SECRET_2026salt") — matches install.sh and install.cmd
async function deriveKey() {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.digest('SHA-256', enc.encode('TLL_SECRET_2026salt'));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-CBC' }, false, ['decrypt']);
}

async function decryptToken(token) {
  try {
    const [ivHex, ctHex] = token.trim().split(':');
    if (!ivHex || !ctHex) return null;

    const iv  = hexToBytes(ivHex);
    const ct  = hexToBytes(ctHex);
    const key = await deriveKey();

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, ct);
    const payload   = JSON.parse(new TextDecoder().decode(decrypted));
    return payload; // { passkey, exp }
  } catch {
    return null;
  }
}

async function validateToken(token) {
  if (!token) return false;

  // Accept plain passkey typed directly into the input box
  if (token.trim() === PASSKEY) return true;

  // Accept encrypted token (from ?key= URL or paste)
  const payload = await decryptToken(token);
  if (!payload)                    return false;
  if (payload.passkey !== PASSKEY) return false;
  if (Date.now() > payload.exp)    return false;
  return true;
}

// ── Styles ────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 99999,
    background: '#020309',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Rajdhani','Orbitron',sans-serif",
  },
  box: {
    background: '#060B14',
    border: '1px solid rgba(0,212,255,0.18)',
    borderRadius: 4, padding: '2.5rem 2rem',
    width: '100%', maxWidth: 420, textAlign: 'center',
  },
  title: {
    fontFamily: "'Orbitron',monospace", fontSize: '1.05rem',
    fontWeight: 700, letterSpacing: '0.22em',
    color: '#00D4FF', marginBottom: '0.4rem',
  },
  sub: {
    fontSize: '0.68rem', letterSpacing: '0.14em',
    color: 'rgba(0,212,255,0.4)', textTransform: 'uppercase', marginBottom: '2rem',
  },
  divider: { height: 1, background: 'rgba(0,212,255,0.08)', marginBottom: '2rem' },
  input: {
    width: '100%', padding: '0.8rem 1rem',
    background: '#020309', border: '1px solid rgba(0,212,255,0.22)',
    borderRadius: 2, color: '#E8F4FF',
    fontFamily: "'Orbitron',monospace",
    fontSize: '0.72rem', letterSpacing: '0.08em',
    outline: 'none', marginBottom: '0.85rem',
    boxSizing: 'border-box', textAlign: 'center',
  },
  error: {
    marginBottom: '0.85rem', padding: '0.55rem 1rem',
    background: 'rgba(255,68,68,0.07)',
    border: '1px solid rgba(255,68,68,0.28)',
    borderRadius: 2, color: '#FF4444',
    fontSize: '0.72rem', letterSpacing: '0.05em',
  },
  btn: (loading) => ({
    width: '100%', padding: '0.75rem',
    background: loading ? 'transparent' : '#00D4FF',
    border: '1px solid #00D4FF', borderRadius: 2,
    color: loading ? '#00D4FF' : '#020309',
    fontFamily: "'Orbitron',monospace",
    fontWeight: 700, fontSize: '0.72rem',
    letterSpacing: '0.18em', textTransform: 'uppercase',
    cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .2s',
  }),
  footer: {
    marginTop: '1.5rem', fontSize: '0.6rem',
    letterSpacing: '0.1em', color: 'rgba(0,212,255,0.2)', textTransform: 'uppercase',
  },
};

// ── Component ─────────────────────────────────────────────────────
export default function PasskeyGate({ children }) {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function verify(token) {
    if (!token?.trim()) { setError('Please paste your access key.'); return; }
    setLoading(true);
    setError('');
    try {
      const ok = await validateToken(token.trim());
      if (ok) {
        localStorage.setItem(LS_KEY, token.trim());
        setVerified(true);
      } else {
        localStorage.removeItem(LS_KEY);
        setError('Invalid or expired key.');
      }
    } catch {
      setError('Verification error — try again.');
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  useEffect(() => {
    async function init() {
      // 1. ?key= in URL → just fill input box, do NOT auto-verify
      const params = new URLSearchParams(window.location.search);
      const urlKey = params.get('key');
      if (urlKey) {
        setInput(urlKey);
        setChecking(false);
        return;
      }

      // 2. localStorage exists → auto-verify silently, no input needed
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        await verify(stored);
        return;
      }

      setChecking(false);
    }
    init();
  }, []);

  if (checking) return null;
  if (verified) return children;

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        <div style={S.title}>ztakoraLABS</div>
        <div style={S.sub}>Enter Encrypted Access Key</div>
        <div style={S.divider} />
        <input
          type="text"
          placeholder="Paste your encrypted key..."
          value={input}
          onChange={e => { setInput(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && verify(input)}
          style={S.input}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        {error && <div style={S.error}>{error}</div>}
        <button onClick={() => verify(input)} disabled={loading} style={S.btn(loading)}>
          {loading ? 'Verifying...' : 'Confirm Access'}
        </button>
        <div style={S.footer}>Keys verified by timestamp · ztakoraLabs</div>
      </div>
    </div>
  );
}