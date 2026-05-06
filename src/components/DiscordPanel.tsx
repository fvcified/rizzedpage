'use client';
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, useCallback } from 'react';

interface DiscordUser {
  id: string;
  username: string;
  display_name?: string;
  avatar?: string;
  avatar_decoration_data?: { asset: string };
}

interface Activity {
  type: number;
  name: string;
  application_id?: string;
  details?: string;
  state?: string;
  timestamps?: { start?: number; end?: number };
  assets?: { large_image?: string; small_image?: string };
}

interface SpotifyData {
  track_id: string;
  song: string;
  artist: string;
  album_art_url: string;
  timestamps: { start: number; end: number };
}

function fmTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function sanitizeText(text: string) {
  if (!text) return '';
  if (/<script|javascript:|on\w+\s*=/i.test(text)) return '';
  return text.replace(/\0/g, '').substring(0, 200).trim();
}

function isValidSpotifyUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const allowed = ['i.scdn.co', 'scdn.co', 'googleusercontent.com', 'spotifycdn.com', 'spotify.com'];
    return allowed.some(d => u.hostname.includes(d));
  } catch { return false; }
}

const appIconCache: Record<string, string | null> = {};

async function getAppIcon(appId: string): Promise<string | null> {
  if (appIconCache[appId] !== undefined) return appIconCache[appId];
  try {
    const res = await fetch(`https://discord.com/api/v10/applications/${appId}/rpc`);
    if (!res.ok) throw new Error('no icon');
    const data = await res.json();
    const url = data.icon ? `https://cdn.discordapp.com/app-icons/${appId}/${data.icon}.png` : null;
    appIconCache[appId] = url;
    return url;
  } catch { appIconCache[appId] = null; return null; }
}

export default function DiscordPanel() {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [status, setStatus] = useState('offline');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityIcon, setActivityIcon] = useState('');
  const [activitySmallIcon, setActivitySmallIcon] = useState('');
  const [activityFallback, setActivityFallback] = useState(false);
  const [elapsed, setElapsed] = useState('');
  const [spotify, setSpotify] = useState<SpotifyData | null>(null);
  const [spotifyState, setSpotifyState] = useState<'inactive' | 'active' | 'reconnecting'>('inactive');
  const progressBarRef = useRef<HTMLDivElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number>(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const lastTrackIdRef = useRef<string | null>(null);
  const lastStartRef = useRef<number | null>(null);
  const spotifyTimestampsRef = useRef<{ start: number; end: number } | null>(null);
  const userIdRef = useRef<string>('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/userAPI');
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      const u = data.data.discord_user;
      const s = data.data.discord_status;
      const activities = data.data.activities;
      setUser(u);
      setStatus(s);
      userIdRef.current = u.id;
      renderActivity(activities);
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        loadSpotify(u.id);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProfile();
    const interval = setInterval(fetchProfile, 5000);
    return () => clearInterval(interval);
  }, [fetchProfile]);

  async function renderActivity(activities: Activity[]) {
    const act = activities?.find(a => a.type === 0 && a.application_id) || null;
    setActivity(act);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (!act) { setElapsed(''); return; }

    if (act.assets?.large_image) {
      const li = act.assets.large_image;
      const url = li.startsWith('mp:external/')
        ? `https://media.discordapp.net/${li.replace('mp:', '')}`
        : `https://cdn.discordapp.com/app-assets/${act.application_id}/${li}.png`;
      setActivityIcon(url);
      setActivityFallback(false);
    } else if (act.application_id) {
      const icon = await getAppIcon(act.application_id);
      if (icon) { setActivityIcon(icon); setActivityFallback(false); }
      else { setActivityIcon(''); setActivityFallback(true); }
    }

    if (act.assets?.small_image && act.application_id) {
      const si = act.assets.small_image;
      const url = si.startsWith('mp:external/')
        ? `https://media.discordapp.net/${si.replace('mp:', '')}`
        : `https://cdn.discordapp.com/app-assets/${act.application_id}/${si}.png`;
      setActivitySmallIcon(url);
    } else { setActivitySmallIcon(''); }

    if (act.timestamps?.start) {
      const tick = () => setElapsed(fmElapsed(Date.now() - act.timestamps!.start!));
      tick();
      elapsedRef.current = setInterval(tick, 1000);
    }
  }

  function loadSpotify(userId: string) {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      try { wsRef.current.close(); } catch {}
    }

    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    wsRef.current = ws;

    function startHeartbeat(ms: number) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
      }, ms);
    }

    function scheduleReconnect() {
      if (reconnectRef.current || isConnectingRef.current) return;
      reconnectAttemptsRef.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      setSpotifyState('reconnecting');
      isConnectingRef.current = true;
      reconnectRef.current = setTimeout(() => {
        reconnectRef.current = null;
        isConnectingRef.current = false;
        loadSpotify(userId);
      }, delay);
    }

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      isConnectingRef.current = false;
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
    };

    ws.onerror = () => { try { ws.close(); } catch {} };
    ws.onclose = () => {
      isConnectingRef.current = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      scheduleReconnect();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data || typeof data.op === 'undefined') return;
        if (data.op === 1) {
          const interval = (data.d?.heartbeat_interval >= 5000 && data.d?.heartbeat_interval <= 60000)
            ? data.d.heartbeat_interval : 30000;
          startHeartbeat(interval);
          return;
        }
        const validEvents = ['INIT_STATE', 'PRESENCE_UPDATE'];
        if (!validEvents.includes(data.t)) return;
        const sp: SpotifyData | null = data.d?.spotify || null;

        if (sp) {
          if (!sp.track_id || !sp.song || !sp.artist || !sp.album_art_url || !sp.timestamps) {
            setSpotifyState('inactive'); return;
          }
          if (!isValidSpotifyUrl(sp.album_art_url)) { setSpotifyState('inactive'); return; }
          const trackChanged = sp.track_id !== lastTrackIdRef.current;
          const timeChanged = sp.timestamps.start !== lastStartRef.current;
          if (!trackChanged && !timeChanged) return;
          lastTrackIdRef.current = sp.track_id;
          lastStartRef.current = sp.timestamps.start;
          spotifyTimestampsRef.current = sp.timestamps;
          setSpotify(sp);
          setSpotifyState('active');
          if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
          cancelAnimationFrame(animFrameRef.current);
          const duration = sp.timestamps.end - sp.timestamps.start;
          fallbackTimerRef.current = setTimeout(() => {
            setSpotifyState('inactive');
            lastTrackIdRef.current = null;
            lastStartRef.current = null;
          }, duration + 3000);
          updProgress(sp.timestamps);
        } else {
          if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
          cancelAnimationFrame(animFrameRef.current);
          if (lastTrackIdRef.current !== null) {
            fallbackTimerRef.current = setTimeout(() => {
              setSpotifyState('inactive');
              lastTrackIdRef.current = null;
              lastStartRef.current = null;
            }, 3000);
          } else {
            setSpotifyState('inactive');
          }
        }
      } catch {}
    };
  }

  function updProgress(ts: { start: number; end: number }) {
    cancelAnimationFrame(animFrameRef.current);

    const tick = () => {
      const now = Date.now();
      const dur = ts.end - ts.start;

      if (now >= ts.end) {
        if (progressBarRef.current) progressBarRef.current.style.width = '100%';
        if (timeDisplayRef.current) timeDisplayRef.current.textContent = `${fmTime(dur)} / ${fmTime(dur)}`;
        return;
      }

      const elapsedMs = now - ts.start;
      const pct = Math.min((elapsedMs / dur) * 100, 100);

      if (progressBarRef.current) progressBarRef.current.style.width = `${pct}%`;
      if (timeDisplayRef.current) timeDisplayRef.current.textContent = `${fmTime(elapsedMs)} / ${fmTime(dur)}`;

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }

  const avatarURL = user?.avatar
    ? user.avatar.startsWith('a_')
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.gif`
      : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`
    : 'https://cdn.discordapp.com/embed/avatars/1.png';

  const statusIcons: Record<string, string> = {
    online: '/images/status/online.webp',
    idle: '/images/status/idle.webp',
    dnd: '/images/status/dnd.webp',
    invisible: '/images/status/invisible.webp',
    offline: '/images/status/offline.webp',
  };

  const hasActivity = !!activity;

  return (
    <>
      <div className="glass-container">
        <div className={`glass-panel status-${status}`}>
          <div className="avatar-wrapper">
            <img className="avatar" src={avatarURL} alt="Discord Avatar" draggable={false} />
            {user?.avatar_decoration_data?.asset && (
              <img
                className="avatar-decoration"
                src={`https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png`}
                alt="Decoration"
                draggable={false}
                style={{ display: 'block' }}
              />
            )}
            <img
              key={status}
              className="discord-status-dot"
              id="status-dot"
              src={statusIcons[status] || statusIcons.offline}
              alt={`Status: ${status}`}
              draggable={false}
            />
          </div>
          <div className="username-badge-wrapper">
            <span className="discord-username" id="display-name" data-user-id={user?.id}>
              {user?.display_name || user?.username || 'Error 404'}
            </span>
            <div className="badge-bubble">
              <div className="badge-icons">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="4.39 2 15.22 20.97" fill="currentColor"><path d="M12 8.5L14.116 13.588l5.492.44-4.184 3.585 1.278 5.36L12 20.1l-4.702 2.872 1.278-5.36-4.184-3.584 5.492-.44L12 8.5ZM8 2v9H6V2h2Zm10 0v9h-2V2h2Zm-5 0v5h-2V2h2Z" /></svg>
                <div className="textBubble">OG</div>
              </div>
              <div className="badge-icons">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M2.25 6a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V6Zm3.97.97a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 0 1-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 0 1 0-1.06Zm4.28 4.28a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clipRule="evenodd" /></svg>
                <div id="textBubble">fvnLey Kids</div>
              </div>
              <div className="badge-icons">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="2.3 2 19.39 20" fill="currentColor"><path d="m16.06 13.09l5.63 5.59l-3.32 3.28l-5.59-5.59v-.92l2.36-2.36h.92m.91-2.53L16 9.6l-4.79 4.8v1.97L5.58 22L2.3 18.68l5.59-5.59h1.97l.78-.78L6.8 8.46H5.5L2.69 5.62L5.31 3l2.8 2.8v1.31L12 10.95l2.66-2.66l-.96-1.01L15 5.97h-2.66l-.65-.65L15 2l.66.66v2.66L16.97 4l3.28 3.28c1.09 1.1 1.09 2.89 0 3.98l-1.97-2.01l-1.31 1.31Z" /></svg>
                <div className="textBubble">Developer</div>
              </div>
              <div className="badge-icons">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1.5 22 21" fill="currentColor"><path d="m8.6 22.5l-1.9-3.2l-3.6-.8l.35-3.7L1 12l2.45-2.8l-.35-3.7l3.6-.8l1.9-3.2L12 2.95l3.4-1.45l1.9 3.2l3.6.8l-.35 3.7L23 12l-2.45 2.8l.35 3.7l-3.6.8l-1.9 3.2l-3.4-1.45l-3.4 1.45Zm2.35-6.95L16.6 9.9l-1.4-1.45l-4.25 4.25l-2.15-2.1L7.4 12l3.55 3.55Z" /></svg>
                <div className="textBubble">Verified Good Boy</div>
              </div>
              <div className="badge-icons">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="4.99 3 14 18" fill="currentColor"><path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82c-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32c-2.59 2.08-3.61 5.75-2.39 8.9c.04.1.08.2.08.33c0 .22-.15.42-.35.5c-.23.1-.47.04-.66-.12a.58.58 0 0 1-.14-.17c-1.13-1.43-1.31-3.48-.55-5.12C5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5c.14.6.41 1.2.71 1.73c1.08 1.73 2.95 2.97 4.96 3.22c2.14.27 4.43-.12 6.07-1.6c1.83-1.66 2.47-4.32 1.53-6.6l-.13-.26c-.21-.46-.77-1.26-.77-1.26m-3.16 6.3c-.28.24-.74.5-1.1.6c-1.12.4-2.24-.16-2.9-.82c1.19-.28 1.9-1.16 2.11-2.05c.17-.8-.15-1.46-.28-2.23c-.12-.74-.1-1.37.17-2.06c.19.38.39.76.63 1.06c.77 1 1.98 1.44 2.24 2.8c.04.14.06.28.06.43c.03.82-.33 1.72-.93 2.27Z" /></svg>
                <div className="textBubble">On FireW</div>
              </div>
              <div className="badge-icons">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 20 20" fill="currentColor"><path d="M4.5 3.75a3 3 0 0 0-3 3v.75h21v-.75a3 3 0 0 0-3-3h-15Z" /><path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3v-7.5Zm-18 3.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clipRule="evenodd" /></svg>
                <div className="textBubble">Fvncy</div>
              </div>
              <div className="badge-icons">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="23 32 465 448" fill="currentColor"><path d="M396.31 32H264l84.19 112.26L396.31 32zm-280.62 0l48.12 112.26L248 32H115.69zM256 74.67L192 160h128l-64-85.33zm166.95-23.61L376.26 160H488L422.95 51.06zm-333.9 0L23 160h112.74L89.05 51.06zM146.68 192H24l222.8 288h.53L146.68 192zm218.64 0L264.67 480h.53L488 192H365.32zm-35.93 0H182.61L256 400l73.39-208z" /></svg>
                <div className="textBubble">The Life of Riley</div>
              </div>
              <div className="badge-icons">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 20 20" fill="currentColor"><path d="M9.153 5.408C10.42 3.136 11.053 2 12 2c.947 0 1.58 1.136 2.847 3.408l.328.588c.36.646.54.969.82 1.182c.28.213.63.292 1.33.45l.636.144c2.46.557 3.689.835 3.982 1.776c.292.94-.546 1.921-2.223 3.882l-.434.507c-.476.557-.715.836-.822 1.18c-.107.345-.071.717.001 1.46l.066.677c.253 2.617.38 3.925-.386 4.506c-.766.582-1.918.051-4.22-1.009l-.597-.274c-.654-.302-.981-.452-1.328-.452c-.347 0-.674.15-1.329.452l-.595.274c-2.303 1.06-3.455 1.59-4.22 1.01c-.767-.582-.64-1.89-.387-4.507l.066-.676c.072-.744.108-1.116 0-1.46c-.106-.345-.345-.624-.821-1.18l-.434-.508c-1.677-1.96-2.515-2.941-2.223-3.882c.293-.941 1.523-1.22 3.983-1.776l.636-.144c.699-.158 1.048-.237 1.329-.45c.28-.213.46-.536.82-1.182l.328-.588Z" /></svg>
                <div className="textBubble">Star Up High</div>
              </div>
              <div className="badge-icons">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 0 1-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004ZM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 0 1-.921.42Z" /><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v.816a3.836 3.836 0 0 0-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 0 1-.921-.421l-.879-.66a.75.75 0 0 0-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 0 0 1.5 0v-.81a4.124 4.124 0 0 0 1.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 0 0-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 0 0 .933-1.175l-.415-.33a3.836 3.836 0 0 0-1.719-.755V6Z" clipRule="evenodd" /></svg>
                <div className="textBubble">Money Talks</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="widget-stack-container">
        <div className="widget-stack">

          <div id="activity-widget" className={`${hasActivity ? 'activity-active' : 'activity-inactive'} visible`}>
            {hasActivity ? (
              <>
                <div className="activity-icon-wrapper" style={{ display: 'flex' }}>
                  {activityFallback || !activityIcon ? (
                    <div className="activity-icon-fallback" style={{ display: 'flex' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.5 7.5h-3a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h3a3 3 0 0 0 2.974-2.612L12 14.25l1.526 2.638A3 3 0 0 0 16.5 19.5h3a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3h-3a3 3 0 0 0-2.974 2.612L12 15.75l-1.526-2.638A3 3 0 0 0 7.5 7.5ZM6 10.5a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5H3.75a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 6 10.5Zm10.5 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm3 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                      </svg>
                    </div>
                  ) : (
                    <img
                      id="activity-icon"
                      src={activityIcon}
                      alt="Activity Icon"
                      loading="lazy"
                      onError={() => setActivityFallback(true)}
                    />
                  )}
                  {activitySmallIcon && (
                    <img
                      className="activity-small-icon"
                      src={activitySmallIcon}
                      alt=""
                      loading="lazy"
                      style={{ display: 'block' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>
                <div className="activity-info" style={{ display: 'flex' }}>
                  <span className="activity-label">Playing</span>
                  <div id="activity-name">{sanitizeText(activity.name || 'Unknown')}</div>
                  {activity.details && (
                    <div id="activity-details" style={{ display: 'block' }}>{sanitizeText(activity.details)}</div>
                  )}
                  {activity.state && (
                    <div id="activity-state" style={{ display: 'block' }}>{sanitizeText(activity.state)}</div>
                  )}
                  {elapsed && (
                    <div id="activity-elapsed" style={{ display: 'block' }}>{elapsed}</div>
                  )}
                </div>
              </>
            ) : (
              <div
                id="activity-off-status"
                style={{
                  display: 'flex',
                  width: '38%',
                  textAlign: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.39)',
                  fontStyle: 'italic',
                }}
              >
                Currently not doin&apos; anythin&apos;
              </div>
            )}
          </div>

          <hr className={`widget-divider${hasActivity || true ? ' visible' : ''}`} id="widget-divider" />
          <div
            id="spotify-widget"
            className={`${spotifyState} has-activity`}
          >
            {spotifyState === 'reconnecting' ? (
              <>
                <div className="reconnecting-spinner" id="reconnecting-spinner"></div>
                <div className="reconnecting-text" style={{ display: 'block' }}>
                  Hop in, loading tunes. Please hold and give me a sec...
                </div>
              </>
            ) : spotifyState === 'inactive' || !spotify ? (
              <div id="off-status" style={{ display: 'block' }}>
                Currently not listenin&apos; anythin&apos;
              </div>
            ) : (
              <>
                <img
                  id="album-art"
                  src={spotify.album_art_url}
                  alt="Album Art"
                  loading="lazy"
                  draggable={false}
                  style={{ display: 'block' }}
                />
                <div className="song-info" style={{ display: 'flex' }}>
                  <div id="song-name">{sanitizeText(spotify.song)}</div>
                  <div id="artist-name">{sanitizeText(spotify.artist)}</div>
                  <div className="progress-container">
                    <div id="progress-bar" ref={progressBarRef} style={{ width: '0%' }}></div>
                  </div>
                  <div className="time-wrapper">
                    <span id="time-display" ref={timeDisplayRef}>-:-- / -:--</span>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}