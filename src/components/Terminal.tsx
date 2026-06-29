'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Line {
  html?: string;
  text?: string;
  type?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sha256(str: string) {
  const utf8 = new Uint8Array(new TextEncoder().encode(str));
  const buf = await crypto.subtle.digest('SHA-256', utf8);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function escapeHTML(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function containsHTML(str: string) {
  return /<[^>]*>|<script|javascript:|on\w+\s*=/i.test(str);
}

function containsSQLI(str: string) {
  const p = [
    /UNION\s+SELECT/i,
    /DROP\s+TABLE/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /UPDATE\s+\w+\s+SET/i,
    /SELECT\s+.*\s+FROM/i,
    /EXEC(\s|\()/i,
    /CAST\s*\(/i,
    /CONVERT\s*\(/i,
    /\/\*[\s\S]*?\*\//,
    /xp_\w+/i,
    /sp_\w+/i,
    /;\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)/i,
  ];
  return p.some(r => r.test(str));
}

function containsPathTraversal(str: string) {
  return /(\.\.[\/\\]|%2e%2e[\/\\%]|\.\.%2f|%2e%2e%2f)/i.test(str);
}

function containsCommandInjection(str: string) {
  return /(\||&|;|`|\$\(|>\s|<\s|>>|<<|\beval\b|\bexec\b|\bsystem\b|\bpassthru\b|\bshell_exec\b)/i.test(str);
}

function containsProtoPoison(str: string) {
  return /(__proto__|constructor\s*\[|prototype\s*\[)/i.test(str);
}

function validateInput(input: string, maxLength = 100) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')
    .replace(/[\r\n]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[<>]/g, '')
    .substring(0, maxLength)
    .trim();
}

const rateLimiter = {
  attempts: {} as Record<string, number[]>,
  isLimited(key: string, max = 15, windowMs = 10000) {
    const now = Date.now();
    if (!this.attempts[key]) this.attempts[key] = [];
    this.attempts[key] = this.attempts[key].filter(t => now - t < windowMs);
    if (this.attempts[key].length >= max) return true;
    this.attempts[key].push(now);
    return false;
  }
};

const adminBruteGuard = {
  failures: 0,
  lockedUntil: 0,
  isLocked() { return Date.now() < this.lockedUntil; },
  fail() {
    this.failures++;
    if (this.failures >= 3) {
      this.lockedUntil = Date.now() + 60_000;
      this.failures = 0;
    }
  },
  reset() { this.failures = 0; this.lockedUntil = 0; }
};

async function reportIncident(type: string, payload: string) {
  try {
    const safe = payload.substring(0, 500);
    await supabase.from('security_logs').insert({
      type,
      payload: safe,
      origin: typeof window !== 'undefined' ? window.location.hostname : '',
    });
  } catch {}
}

async function fetchRemoteLogs(): Promise<Array<{ created_at: string; type: string; payload: string }>> {
  const res = await fetch('/api/getLogs');
  if (!res.ok) throw new Error('Failed to fetch');
  const { data } = await res.json();
  return data;
}

function runSecurityChecks(raw: string, sanitized: string): string | null {
  if (!sanitized) return '⚠️ Invalid input detected';
  if (containsPathTraversal(raw)) return '⚠️ Path traversal attempt blocked';
  if (containsCommandInjection(raw)) return '⚠️ Command injection attempt blocked';
  if (containsProtoPoison(raw)) return '⚠️ Prototype pollution attempt blocked';
  if (containsSQLI(sanitized)) return '⚠️ Dangerous input blocked';
  if (containsHTML(sanitized)) return '⚠️ HTML content blocked';
  return null;
}

export default function Terminal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { html: '<span class="terminal-highlight">./helpme</span> for help you', type: '' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdminRef = useRef<boolean>(false);
  const adminHashRef = useRef<string>('');
  const awaitingAdminRef = useRef(false);
  const loadedFileNameRef = useRef<string | null>(null);

  function addLine(html: string, type = '') {
    setLines(prev => [...prev, { html, type }]);
  }

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  function getAudio() { return document.getElementById('site-audio') as HTMLAudioElement | null; }

  function updateVolume(val: number) {
    const audio = getAudio();
    if (!audio) return;
    const v = Math.min(Math.max(val, 0), 100);
    audio.volume = v / 100;
    const slider = document.getElementById('volume-slider') as HTMLInputElement;
    const label = document.getElementById('volume-label');
    const vinput = document.getElementById('volume-input') as HTMLInputElement;
    if (slider) {
      slider.value = String(v);
      if (v === 0) slider.style.setProperty('background', '#676767', 'important');
      else if (v === 100) slider.style.setProperty('background', '#ffffff', 'important');
      else slider.style.setProperty('background', `linear-gradient(to right, #ffffff ${v}%, #676767 ${v}%)`, 'important');
    }
    if (label) label.textContent = `${v}%`;
    if (vinput) vinput.value = String(v);
  }

  function openTerminal() {
    setIsOpen(true);
    setIsClosing(false);
    setTimeout(() => inputRef.current?.focus(), 350);
  }

  function closeTerminal() {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  }

  async function handleCmd(raw: string) {
    if (raw.length > 200) {
      addLine('⚠️ Input too long', 'muted');
      await reportIncident('OVERSIZED_INPUT', raw.substring(0, 100));
      return;
    }

    const sanitized = validateInput(raw, 100);
    const trimmed = sanitized.trim().toLowerCase();

    if (awaitingAdminRef.current) {
      if (adminBruteGuard.isLocked()) {
        awaitingAdminRef.current = false;
        addLine('⚠️ Too many failed attempts. Locked for 60s.', 'muted');
        return;
      }

      const inputHash = await sha256(raw.trim());

      const res = await fetch('/api/verifyAdm1n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: inputHash }),
      });

      if (res.ok) {
        const { valid } = await res.json();
      if (valid) {
        isAdminRef.current = true;
        adminHashRef.current = inputHash;
        awaitingAdminRef.current = false;
        adminBruteGuard.reset();
        addLine('Admin Session: Authorized. Welcome back, @ARizzedKid', 'success');
        } else {
          awaitingAdminRef.current = false;
          adminBruteGuard.fail();
          addLine('⚠️ Incorrect Administrative Password. Session Terminated.', 'muted');
          await reportIncident('FAILED_ADMIN_LOGIN', '[redacted]');
        }
      } else {
        awaitingAdminRef.current = false;
        addLine('❌ Auth server error.', 'muted');
      }
      return;
    }

    const secError = runSecurityChecks(raw, sanitized);
    if (secError) {
      addLine(secError, 'muted');

      if (containsPathTraversal(raw)) await reportIncident('PATH_TRAVERSAL', raw);
      else if (containsCommandInjection(raw)) await reportIncident('CMD_INJECTION', raw);
      else if (containsProtoPoison(raw)) await reportIncident('PROTO_POISON', raw);
      else if (containsSQLI(sanitized)) await reportIncident('SQLI_ATTEMPT', raw);
      else if (containsHTML(sanitized)) await reportIncident('XSS_ATTEMPT', raw);
      return;
    }

    if (rateLimiter.isLimited('terminal-input')) {
      addLine('⚠️ Too many commands. Please wait.', 'muted');
      return;
    }

    if (trimmed === './adm1n') {
      if (adminBruteGuard.isLocked()) {
        addLine('⚠️ Admin login locked. Try again later.', 'muted');
        return;
      }
      awaitingAdminRef.current = true;
      addLine('Enter Admin Password:', 'bright');
      return;
    }

    if (trimmed === './logs') {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      addLine('Connecting...', 'dim');
      try {
        const data = await fetchRemoteLogs();
        if (!data || data.length === 0) {
          addLine('No security incidents recorded.', 'success');
        } else {
          addLine('--- RECENT INCIDENTS ---', 'bright');
          data.forEach(log => {
            const time = new Date(log.created_at).toLocaleTimeString();
            addLine(`[${time}] ${escapeHTML(log.type)}: ${escapeHTML(log.payload)}`, 'dim');
          });
        }
      } catch { addLine('❌ Error reaching remote server.', 'muted'); }
      return;
    }

    if (trimmed === './clearlogs') {
      if (!isAdminRef.current) { addLine('⚠️ Access Denied: Admin session required.', 'muted'); return; }
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      addLine('Wiping database logs...', 'dim');
      try {
        const res = await fetch('/api/clearLogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash: adminHashRef.current }),
        });
        const { ok } = await res.json();
        if (ok) addLine('Database wiped successfully.', 'success');
        else addLine('❌ Access denied by server.', 'muted');
      } catch (e) {
        addLine(`❌ Failed: ${e instanceof Error ? escapeHTML(e.message) : 'Unknown error'}`, 'muted');
      }
      return;
    }

    if (trimmed === './helpme') {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./browse</span> &nbsp;; browse audio file', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./play</span> &nbsp;&nbsp;; play audio', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./pause</span> &nbsp;; pause audio', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./stop</span> &nbsp;&nbsp;; stop audio', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./volume</span> &nbsp;; update volume {0-100}', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./reset</span> &nbsp;; reset to default', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./clear</span> &nbsp;; clear terminal', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./exit</span> &nbsp;&nbsp;; close terminal', 'dim');

    } else if (trimmed === './browse') {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      addLine('Browsing...', 'dim');

      let browseTriggered = true;
      if (fileInputRef.current) fileInputRef.current.value = '';

      const escHandler = (e: KeyboardEvent) => {
        if (!browseTriggered) return;
        if (e.key === 'Escape') {
          browseTriggered = false;
          addLine('Browse cancelled', 'muted');
          window.removeEventListener('keydown', escHandler);
        }
      };

      const focusHandler = () => {
        if (!browseTriggered) return;
        setTimeout(() => {
          if (!fileInputRef.current?.files?.[0] && browseTriggered) {
            browseTriggered = false;
            addLine('Browse cancelled', 'muted');
          }
          window.removeEventListener('focus', focusHandler);
        }, 100);
      };

      window.addEventListener('keydown', escHandler);
      window.addEventListener('focus', focusHandler);
      fileInputRef.current?.click();

    } else if (trimmed === './play') {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      const audio = getAudio();
      if (audio?.src) {
        audio.play()
          .then(() => addLine(`▶ Playing${loadedFileNameRef.current ? ': ' + escapeHTML(loadedFileNameRef.current) : ''}`, 'success'))
          .catch(() => addLine('Failed to play audio', 'muted'));
      } else {
        addLine('No audio loaded. Try ./browse', 'muted');
      }

    } else if (trimmed === './pause') {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      getAudio()?.pause();
      addLine('⏸ Paused', 'bright');

    } else if (trimmed === './stop') {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      const audio = getAudio();
      if (audio) { audio.pause(); audio.currentTime = 0; }
      addLine('⏹ Stopped', 'bright');

    } else if (trimmed === './reset') {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      const audio = getAudio();
      if (audio) {
        audio.src = '/audio/biteurtongue.mp3';
        audio.loop = true;
        loadedFileNameRef.current = null;
        updateVolume(100);
        audio.play().then(() => addLine('Successfully reset to default', 'success'));
      }

    } else if (trimmed.startsWith('./volume')) {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      const parts = trimmed.split(/\s+/);
      if (parts.length === 1) {
        const audio = getAudio();
        addLine(`${Math.round((audio?.volume || 0) * 100)}% (Current)`, 'bright');
      } else {
        const val = parseInt(parts[1], 10);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          updateVolume(val);
          addLine(`Volume set to ${val}%`, 'success');
        } else {
          addLine('Usage: ./volume {0-100}', 'muted');
        }
      }

    } else if (trimmed === './clear') {
      setLines([]);

    } else if (trimmed === './exit') {
      closeTerminal();

    } else {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(trimmed)}`);
      addLine(
        `⚠️ Command not found: <span class="terminal-bright">${escapeHTML(trimmed)}</span><br>Try <span class="terminal-bright">./helpme</span> for available commands`,
        'muted'
      );
    }
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  return (
    <>
      <button
        className={`terminal-toggle${isOpen ? '' : ' visible'}`}
        id="terminal-toggle"
        aria-label="Toggle Terminal"
        style={{ display: 'flex' }}
        onClick={openTerminal}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      </button>

      <div
        className={`terminal-container${isOpen ? ' visible' : ''}${isClosing ? ' closing' : ''}`}
        id="terminal-container"
        style={{ display: isOpen ? 'flex' : 'none' }}
      >
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
          </div>
          <div className="terminal-title">../../found@me</div>
          <button className="terminal-close" onClick={closeTerminal} aria-label="Close terminal">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="terminal-output" id="terminal-output" ref={outputRef}>
          {lines.map((l, i) => (
            l.html
              ? <div key={i} className={`terminal-line${l.type ? ' ' + l.type : ''}`} dangerouslySetInnerHTML={{ __html: l.html }} />
              : <div key={i} className={`terminal-line${l.type ? ' ' + l.type : ''}`}>{l.text}</div>
          ))}
        </div>

        <div className="terminal-input-row">
          <span className="terminal-prompt">rizzed@cook13:~#</span>
          <input
            type="text"
            className="terminal-input"
            id="terminal-input"
            ref={inputRef}
            placeholder="./helpme"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={200}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const cmd = inputVal.trim();
                if (cmd) await handleCmd(cmd);
                setInputVal('');
              }
              if (e.key === 'Escape') closeTerminal();
            }}
          />
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="audio/*"
          style={{ display: 'none' }}
          aria-label="Load audio file"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (!file) return;

            if (!file.type.startsWith('audio/')) {
              addLine(`⚠️ Not an audio file: ${escapeHTML(file.name)}`, 'muted');
              if (fileInputRef.current) fileInputRef.current.value = '';
              return;
            }

            if (file.size > 50 * 1024 * 1024) {
              addLine('⚠️ File too large. Max 50MB.', 'muted');
              if (fileInputRef.current) fileInputRef.current.value = '';
              return;
            }

            const safeName = file.name.replace(/[^a-zA-Z0-9._\- ]/g, '_').substring(0, 100);

            const audio = getAudio();
            if (!audio) return;
            const url = URL.createObjectURL(file);
            audio.src = url;
            audio.loop = true;
            loadedFileNameRef.current = safeName;
            audio.play().then(() => addLine(`▶ Playing: ${escapeHTML(safeName)}`, 'success'));
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
      </div>
    </>
  );
}