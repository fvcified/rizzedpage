'use client';

import { useEffect, useRef, useState } from 'react';

const SUPABASE_URL = 'https://hbhxeaoirncgdxeoavyw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiaHhlYW9pcm5jZ2R4ZW9hdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDAzNzUsImV4cCI6MjA5MTQ3NjM3NX0.tK3vhh7jeRBcFtxz_y-m9sWSg9o0tw2lFh9sJqkHeKg';
const ADM_HASH = "bace1e04d3bff93d2cc3e776efd375471f669f2086abde3ff26626229462b028";

async function sha256(str: string) {
  const utf8 = new Uint8Array(new TextEncoder().encode(str));
  const buf = await crypto.subtle.digest('SHA-256', utf8);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function escapeHTML(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function containsHTML(str: string) {
  return /<[^>]*>|<script|javascript:|on\w+\s*=/i.test(str);
}

function containsSQLI(str: string) {
  const p = [/(\bOR\b|\bAND\b).*?=.*?/i,/UNION\s+SELECT/i,/DROP\s+TABLE/i,/INSERT\s+INTO/i,/DELETE\s+FROM/i,/UPDATE\s+\w+\s+SET/i,/--/,/;/,/\/\*/,/\*\//,/xp_/i,/sp_/i];
  return p.some(r => r.test(str));
}

function validateInput(input: string, maxLength = 200) {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/\0/g, '').replace(/[\r\n]/g, '').replace(/<[^>]+>/g, '').replace(/[<>]/g, '').substring(0, maxLength).trim();
}

const rateLimiter = {
  attempts: {} as Record<string, number[]>,
  isLimited(key: string, max = 20, windowMs = 10000) {
    const now = Date.now();
    if (!this.attempts[key]) this.attempts[key] = [];
    this.attempts[key] = this.attempts[key].filter(t => now - t < windowMs);
    if (this.attempts[key].length >= max) return true;
    this.attempts[key].push(now);
    return false;
  }
};

async function reportIncident(type: string, payload: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/security_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ type, payload, origin: typeof window !== 'undefined' ? window.location.hostname : '' })
    });
  } catch {}
}

async function fetchRemoteLogs(): Promise<Array<{ created_at: string; type: string; payload: string }>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/security_logs?order=created_at.desc&limit=10`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

async function clearRemoteLogs() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/security_logs?id=neq.0`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) throw new Error('failed');
}

type Line = { html: string; type: string };

export default function Terminal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ html: '<span class="terminal-highlight">./helpme</span> for help you', type: '' }]);
  const [inputVal, setInputVal] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdminRef = useRef(false);
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
    const sanitized = validateInput(raw, 100);
    const trimmed = sanitized.trim().toLowerCase();
    const inputHash = await sha256(trimmed);

    if (awaitingAdminRef.current) {
      if (inputHash === ADM_HASH) {
        isAdminRef.current = true;
        awaitingAdminRef.current = false;
        addLine('Admin Session: Authorized. Welcome back, @ARizzedKid', 'success');
      } else {
        awaitingAdminRef.current = false;
        addLine('⚠️ Incorrect Administrative Key. Session Terminated.', 'muted');
        await reportIncident('FAILED_ADMIN_LOGIN', trimmed);
      }
      return;
    }

    if (!sanitized) { addLine('⚠️ Invalid input detected', 'muted'); return; }
    if (containsSQLI(sanitized)) { addLine('⚠️ Dangerous input blocked', 'muted'); await reportIncident('SQLI_ATTEMPT', raw); return; }
    if (containsHTML(sanitized)) { addLine('⚠️ HTML content blocked', 'muted'); await reportIncident('XSS_ATTEMPT', raw); return; }
    if (rateLimiter.isLimited('terminal-input')) { addLine('⚠️ Too many commands. Please wait.', 'muted'); return; }

    if (inputHash === ADM_HASH) {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      addLine('Remote DB: Supabase Connected', 'success');
      addLine('Admin Session: Authorized', 'success');
      return;
    }

    if (trimmed === './adm1n') {
      awaitingAdminRef.current = true;
      addLine('Enter Admin Password:', 'bright');
      return;
    }

    if (trimmed === './logs') {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      addLine('Connecting...', 'dim');
      try {
        const data = await fetchRemoteLogs();
        if (!data || data.length === 0) { addLine('No security incidents recorded.', 'success'); }
        else {
          addLine('--- RECENT ---', 'bright');
          data.forEach(log => {
            const time = new Date(log.created_at).toLocaleTimeString();
            addLine(`[${time}] ${log.type}: ${log.payload}`, 'dim');
          });
        }
      } catch { addLine('❌ Error reaching remote server.', 'muted'); }
      return;
    }

    if (trimmed === './clearlogs') {
      if (!isAdminRef.current) { addLine('⚠️ Access Denied: Admin session required.', 'muted'); return; }
      addLine('Wiping database logs...', 'dim');
      try { await clearRemoteLogs(); addLine('Database wiped successfully.', 'success'); }
      catch (e) { addLine(`❌ Failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'muted'); }
      return;
    }

    if (trimmed === './helpme') {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./browse</span> ; browse the file', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./play</span> ; play', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./pause</span> ; pause', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./stop</span> ; stop', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./volume</span> ; update volume {0-100}', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./reset</span> ; reset to default', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./clear</span> ; clear the terminal', 'dim');
      addLine('&nbsp;&nbsp;<span class="terminal-bright">./exit</span> ; close the terminal', 'dim');

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
        audio.play().then(() => addLine(`▶ Playing${loadedFileNameRef.current ? ': ' + escapeHTML(loadedFileNameRef.current) : ''}`, 'success'))
          .catch(() => addLine('Failed to play audio', 'muted'));
      } else { addLine('No audio loaded. Try to ./browse', 'muted'); }

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
      const parts = trimmed.split(' ');
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(sanitized)}`);
      if (parts.length === 1) {
        const audio = getAudio();
        addLine(`${Math.round((audio?.volume || 0) * 100)}% (Current)`, 'bright');
      } else {
        const val = parseInt(parts[1]);
        if (!isNaN(val) && val >= 0 && val <= 100) { updateVolume(val); addLine(`Volume set to ${val}%`, 'success'); }
        else { addLine('Usage: ./volume {0-100}', 'muted'); }
      }

    } else if (trimmed === './clear') {
      setLines([]);

    } else if (trimmed === './exit') {
      closeTerminal();

    } else {
      addLine(`<span class="terminal-prompt">rizzed@cook13:~# </span>${escapeHTML(trimmed)}`);
      addLine(`⚠️ Command not found: <span class="terminal-bright">${escapeHTML(trimmed)}</span><br>I will <span class="terminal-bright">help you</span>, <span class="terminal-bright">just</span> try <span class="terminal-bright">./helpme</span> then`, 'muted');
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
            <div key={i} className={`terminal-line${l.type ? ' ' + l.type : ''}`} dangerouslySetInnerHTML={{ __html: l.html }} />
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
            spellCheck={false}
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
            const audio = getAudio();
            if (!audio) return;
            const url = URL.createObjectURL(file);
            audio.src = url;
            audio.loop = true;
            loadedFileNameRef.current = file.name;
            audio.play().then(() => addLine(`▶ Playing: ${escapeHTML(file.name)}`, 'success'));
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
      </div>
    </>
  );
}