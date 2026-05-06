'use client';

import { useEffect, useRef } from 'react';

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/";
const SCRAMBLE_PLC = 2;
const SCRAMBLE_SPD = 65;

const txts = [
  "Hopped", "Greetings outta me", "I'ma Nyc Xiao", "fvnLey Kids",
  "Fvkid's Wills", "#On Fvncy", "#On Life of Riley", "#On FireW", "Cheers"
];

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export default function Footer() {
  const titleRef = useRef<HTMLSpanElement>(null);
  const maskRef = useRef<HTMLSpanElement>(null);
  const githubRef = useRef<HTMLAnchorElement>(null);
  const spotifyRef = useRef<HTMLAnchorElement>(null);
  const gitlabRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
  
    const element = titleRef.current;
    const mask = maskRef.current;
    if (!element || !mask) return;

    const el = element;
    const msk = mask;
   
    let textIndex = 0;
    const pauseAfterReveal = 2600;
    const wipeDuration = 300;

    function scrambleTPL(el: HTMLSpanElement, target: string, callback: () => void) {
      let currentIndex = 0, scrambleCount = 0;
      const displayArr = new Array(target.length).fill(' ');
      function scrambleStep() {
        if (currentIndex >= target.length) {
          el.textContent = target;
          setTimeout(callback, pauseAfterReveal);
          return;
        }
        if (scrambleCount < SCRAMBLE_PLC) {
          displayArr[currentIndex] = randomChar();
          el.textContent = displayArr.join('');
          scrambleCount++;
          setTimeout(scrambleStep, SCRAMBLE_SPD);
        } else {
          displayArr[currentIndex] = target[currentIndex];
          currentIndex++;
          scrambleCount = 0;
          el.textContent = displayArr.join('');
          setTimeout(scrambleStep, SCRAMBLE_SPD);
        }
      }
      scrambleStep();
    }

    function playWipe(el: HTMLSpanElement, msk: HTMLSpanElement, callback: () => void) {
      msk.style.transition = 'none';
      msk.style.width = '0';
      requestAnimationFrame(() => {
        msk.style.transition = `width ${wipeDuration}ms ease`;
        msk.style.width = '100%';
        setTimeout(() => {
          el.textContent = '';
          msk.style.transition = 'none';
          msk.style.width = '0';
          callback();
        }, wipeDuration);
      });
    }

    function loopScramble() {
      playWipe(el, msk, () => {
        scrambleTPL(el, txts[textIndex], () => {
          textIndex = (textIndex + 1) % txts.length;
          loopScramble();
        });
      });
    }

    loopScramble();

    const icons = [githubRef.current, spotifyRef.current, gitlabRef.current];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const action = entry.isIntersecting ? 'add' : 'remove';
        element.classList[action]('animate' as string);
        icons.forEach(icon => icon?.classList[action]('animate'));
      });
    }, { threshold: 0.5 });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        <h2 className="footer-title-wrapper">
          <span id="animatedText" className="footer-title" ref={titleRef}></span>
          <span className="wipe-mask" ref={maskRef}></span>
        </h2>
        <div className="footer-icons">
          <a href="https://github.com/fvcified" target="_blank" rel="noopener" aria-label="GitHub" className="footer-icon" ref={githubRef}>
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          <a href="https://open.spotify.com/user/31gupde4ngfbbksvy5q6pb6b2474" target="_blank" rel="noopener" aria-label="Spotify" className="footer-iconn" ref={spotifyRef}>
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </a>
          <a href="https://gitlab.com/fvcified" target="_blank" rel="noopener" aria-label="Gitlab" className="footer-iconnn" ref={gitlabRef}>
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="m23.6 9.8l-.023-.067L20.25.749a.858.858 0 0 0-.33-.399a.838.838 0 0 0-.99.042a.838.838 0 0 0-.29.4l-2.2 6.729H7.576L5.376.79a.858.858 0 0 0-.29-.399A.838.838 0 0 0 4.096.35a.85.85 0 0 0-.33.4L.44 9.73L.418 9.8a6.037 6.037 0 0 0 2.009 6.97l.011.009l.03.022l4.965 3.722l2.456 1.861l1.494 1.13a.985.985 0 0 0 1.19 0l1.494-1.13l2.456-1.861l5.003-3.752l.012-.009A6.038 6.038 0 0 0 23.6 9.8"/>
            </svg>
          </a>
        </div>
      </div>
      <div className="footer-copyright">
        2025@<a href="https://fvkid.xyz/" target="_blank" rel="noopener noreferrer" className="copyright-link">
          <span className="underline-text">{'{fvkid.site}'}</span>
          <span className="tooltip-bubble">site owned by Nyc Xiao</span>
        </a>
      </div>
    </footer>
  );
}