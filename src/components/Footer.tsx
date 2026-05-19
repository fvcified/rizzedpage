'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/";
const SCRAMBLE_PLC = 2;
const SCRAMBLE_SPD = 65;

const txts = [
  "Hopped", "Greetings outta me", "I'ma Nyc Xiao", "fvn & Ley",
  "#FireW", "#Fvncy", "#TheLifeofRiley", "Ma Will's", "Cheers"
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
          <span ref={titleRef} className="footer-title"></span>
          <span ref={maskRef} className="wipe-mask"></span>
        </h2>

        <div className="footer-icons">
          <a
            href="https://github.com/fvcified"
            target="_blank"
            rel="noopener"
            ref={githubRef}
            className="footer-icon"
          >
            <Image src="/images/github.svg" alt="GitHub" width={32} height={32} />
          </a>
          <a
            href="https://open.spotify.com/user/31gupde4ngfbbksvy5q6pb6b2474"
            target="_blank"
            rel="noopener"
            ref={spotifyRef}
            className="footer-icon"
          >
            <Image src="/images/spotify.svg" alt="Spotify" width={32} height={32} />
          </a>
          <a
            href="https://gitlab.com/fvcified"
            target="_blank"
            rel="noopener"
            ref={gitlabRef}
            className="footer-icon"
          >
            <Image src="/images/gitlab.svg" alt="GitLab" width={32} height={32} />
          </a>
        </div>
      </div>
      <div className="footer-copyright">
        2025@<a href="https://fvkid.xyz/" target="_blank" rel="noopener noreferrer" className="copyright-link">
          <span className="underline-text">{'{ fvkid }'}</span>
          <span className="tooltip-bubble">site owned by Nyc Xiao</span>
        </a>
      </div>
    </footer>
  );
}