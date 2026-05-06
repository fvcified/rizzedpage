'use client';

import { useEffect, useRef, useState } from 'react';

export default function VolumeControl() {
  const sliderRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const lastVolumeRef = useRef(1);
  const manualZeroRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editing, setEditing] = useState(false);

  function getAudio(): HTMLAudioElement | null {
    return document.getElementById('site-audio') as HTMLAudioElement | null;
  }

  function updateVolume(value: number, calledByUser = false) {
    const v = Math.min(Math.max(Math.round(Number(value) || 0), 0), 100);
    setVolume(v);
    const audio = getAudio();
    if (audio) audio.volume = v / 100;

    if (sliderRef.current) {
      sliderRef.current.value = String(v);
      if (v === 0) sliderRef.current.style.setProperty('background', '#676767', 'important');
      else if (v === 100) sliderRef.current.style.setProperty('background', '#ffffff', 'important');
      else sliderRef.current.style.setProperty('background', `linear-gradient(to right, #ffffff ${v}%, #676767 ${v}%)`, 'important');
    }
    if (inputRef.current) inputRef.current.value = String(v);
    if (labelRef.current) labelRef.current.textContent = `${v}%`;

    if (v === 0) {
      setIsMuted(true);
      if (calledByUser) manualZeroRef.current = true;
    } else {
      setIsMuted(false);
      lastVolumeRef.current = v / 100;
      manualZeroRef.current = false;
    }
  }

  function hideControls() {
    sliderRef.current?.classList.add('force-hide');
    displayRef.current?.classList.add('force-hide');
  }

  function stopEditing() {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (inputRef.current) updateVolume(Number(inputRef.current.value));
    setEditing(false);
    inputRef.current?.blur();
  }

  useEffect(() => {
    const audio = document.getElementById('site-audio') as HTMLAudioElement | null;
    if (audio) audio.volume = 1;
    if (sliderRef.current) {
      sliderRef.current.value = '100';
      sliderRef.current.style.setProperty('background', '#ffffff', 'important');
      sliderRef.current.classList.add('force-hide');
    }
    if (inputRef.current) inputRef.current.value = '100';
    if (labelRef.current) labelRef.current.textContent = '100%';
    displayRef.current?.classList.add('force-hide');
  }, []);

  return (
    <div className="volume-container" id="volume-container" ref={containerRef}
      onMouseEnter={() => {
        sliderRef.current?.classList.remove('force-hide');
        displayRef.current?.classList.remove('force-hide');
      }}
      onMouseLeave={() => {
        stopEditing();
        hideControls();
      }}
    >
      <audio id="site-audio" src="/audio/teeth_youu.mp3" preload="auto" loop />

      <button className="volume-btn" id="volume-btn" aria-label="Toggle mute"
        onClick={() => {
          stopEditing();
          if (isMuted) {
            updateVolume(manualZeroRef.current ? 100 : lastVolumeRef.current * 100, false);
            manualZeroRef.current = false;
            setIsMuted(false);
          } else {
            updateVolume(0, false);
            setIsMuted(true);
          }
        }}>
        <svg id="unmute-icon" className="volume-icon" style={{ opacity: isMuted ? 0 : 1 }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24">
          <g fill="none" stroke="#ffffff" strokeWidth="4">
            <path fill="none" strokeLinejoin="round" d="M24 6v36c-7 0-12.201-9.16-12.201-9.16H6a2 2 0 0 1-2-2V17.01a2 2 0 0 1 2-2h5.799S17 6 24 6Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M32 15a11.91 11.91 0 0 1 1.684 1.859A12.07 12.07 0 0 1 36 24c0 2.654-.846 5.107-2.278 7.09A11.936 11.936 0 0 1 32 33" />
            <path strokeLinecap="round" d="M34.236 41.186C40.084 37.696 44 31.305 44 24c0-7.192-3.796-13.496-9.493-17.02" />
          </g>
        </svg>
        <svg id="mute-icon" className="volume-icon" style={{ opacity: isMuted ? 1 : 0 }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24">
          <g fill="none" stroke="#ffffff" strokeLinejoin="round" strokeWidth="4">
            <g strokeLinecap="round">
              <path d="m40.735 20.286l-8.486 8.485m.001-8.485l8.485 8.485" />
            </g>
            <path fill="none" d="M24 6v36c-7 0-12.201-9.16-12.201-9.16H6a2 2 0 0 1-2-2V17.01a2 2 0 0 1 2-2h5.799S17 6 24 6Z" />
          </g>
        </svg>
      </button>

      <input type="range" className="volume-slider force-hide" id="volume-slider" ref={sliderRef}
        min="0" max="100" defaultValue="100" step="1" aria-label="Volume Control"
        onInput={() => {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          updateVolume(Number(sliderRef.current?.value), true);
          sliderRef.current?.classList.remove('force-hide');
          displayRef.current?.classList.remove('force-hide');
        }}
      />

      <div className="volume-display force-hide" ref={displayRef}>
        <span className={`volume-label${editing ? ' editing' : ''}`} id="volume-label" ref={labelRef}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
        >{volume}%</span>
        <input type="number" className={`volume-input${editing ? ' editing' : ''}`} id="volume-input" ref={inputRef}
          min="0" max="100" defaultValue="100" aria-label="Volume Control"
          style={{ display: editing ? 'block' : 'none' }}
          onInput={() => {
            updateVolume(Number(inputRef.current?.value), true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => { stopEditing(); }, 1500);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); stopEditing(); hideControls(); }
            if (e.key === 'Escape') { e.preventDefault(); stopEditing(); hideControls(); }
          }}
          onBlur={() => {
            if (!typingTimeoutRef.current && inputRef.current) updateVolume(Number(inputRef.current.value));
            setEditing(false);
          }}
        />
      </div>
    </div>
  );
}
