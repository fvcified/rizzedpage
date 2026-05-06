'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/";
const SCRAMBLE_PLC = 2;
const SCRAMBLE_SPD = 65;

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export default function Intro() {
  const typedRef = useRef<HTMLSpanElement>(null);
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = typedRef.current;
    if (!el) return;
    const stableEl = el;

    const iniTxt    = "./HIT & COME... WHAT?";
    const keepText  = "./HIT & COME";
    const appendTxt = " HOP IN";

    function sSL(targetText: string, index: number, doneCallback: () => void) {
      let count = 0;
      function step() {
        if (count < SCRAMBLE_PLC) {
          stableEl.textContent = targetText.substring(0, index) + randomChar();
          count++;
          setTimeout(step, SCRAMBLE_SPD);
        } else {
          stableEl.textContent = targetText.substring(0, index + 1);
          doneCallback();
        }
      }
      step();
    }

    function typeScr(targetText: string, callback: () => void) {
      let idx = 0;
      function typeNext() {
        if (idx >= targetText.length) { callback(); return; }
        sSL(targetText, idx, () => { idx++; typeNext(); });
      }
      typeNext();
    }

    function rDFE(currentText: string, targetKeepText: string, callback: () => void) {
      function deleteStep() {
        if (currentText === targetKeepText) { callback(); return; }
        currentText = currentText.substring(0, currentText.length - 1);
        stableEl.textContent = currentText;
        setTimeout(deleteStep, SCRAMBLE_SPD);
      }
      deleteStep();
    }

    function rTE(currentText: string, callback: () => void) {
      function deleteStep() {
        if (currentText.length === 0) { callback(); return; }
        currentText = currentText.substring(0, currentText.length - 1);
        stableEl.textContent = currentText;
        setTimeout(deleteStep, SCRAMBLE_SPD);
      }
      deleteStep();
    }

    function runSequence() {
      typeScr(iniTxt, () => {
        setTimeout(() => {
          rDFE(iniTxt, keepText, () => {
            setTimeout(() => {
              let idx = 0;
              function typeAppend() {
                if (idx >= appendTxt.length) {
                  setTimeout(() => {
                    rTE(keepText + appendTxt, () => { setTimeout(runSequence, 3000); });
                  }, 3000);
                  return;
                }
                const target = keepText + appendTxt.substring(0, idx + 1);
                sSL(target, target.length - 1, () => { idx++; typeAppend(); });
              }
              typeAppend();
            }, 1500);
          });
        }, 1500);
      });
    }

    runSequence();

  const icons = ['/images/UK-FLAG.webp', '/images/CN-FLAG.webp'];
  let iconIndex = 0;
  let faviconTimer: ReturnType<typeof setTimeout>;
  function getFavicon() {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    return link;
  }

  function loopFavicon() {
    const favicon = getFavicon();
    if (stableEl.textContent && stableEl.textContent.length > 0) {
      iconIndex = (iconIndex + 1) % icons.length;
      favicon.href = icons[iconIndex];
    } else {
      favicon.href = icons[0];
    }
    faviconTimer = setTimeout(loopFavicon, 2000);
  }

  loopFavicon();

  return () => {
    clearTimeout(faviconTimer);
  };
}, []);

  function handleClick() {
    const intro = introRef.current;
    if (!intro) return;
    document.body.classList.remove('noscroll');
    intro.classList.add('fade-out');
    setTimeout(() => { intro.style.display = 'none'; }, 800);

    const volContainer = document.querySelector('.volume-container') as HTMLElement;
    if (volContainer) volContainer.style.display = 'flex';

    const audio = document.getElementById('site-audio') as HTMLAudioElement;
    if (audio) audio.play().catch(() => {});

    setTimeout(() => {
      const toggle = document.getElementById('terminal-toggle');
      if (toggle) toggle.classList.add('visible');
    }, 900);
  }

  return (
    <div className="intro-screen" id="intro-screen" ref={introRef} onClick={handleClick}>
      <Image src="/images/asciiartt.webp" className="intro-left" alt="character" width={650} height={650} />
      <Image src="/images/asciiarttt.webp" className="intro-right" alt="character" width={650} height={650} />
      <div className="intro-message">
        <span ref={typedRef} id="typedText"></span>
        <span className="cursor">_</span>
      </div>
    </div>
  );
}
