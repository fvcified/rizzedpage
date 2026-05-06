'use client';

import { useEffect, useState } from 'react';

export default function Navbar() {
  const [active, setActive] = useState('home');

  useEffect(() => {
    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
    }

    const links = document.querySelectorAll<HTMLAnchorElement>('.navbar-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href')?.replace('#', '') || '';
        const section = document.getElementById(targetId);
        if (!section) return;
        const start = window.scrollY;
        const end = section.getBoundingClientRect().top + window.scrollY;
        const distance = end - start;
        const duration = 200;
        let startTime: number | null = null;
        function step(ts: number) {
          if (!startTime) startTime = ts;
          const elapsed = ts - startTime;
          const progress = Math.min(elapsed / duration, 1);
          window.scrollTo(0, start + distance * easeInOutCubic(progress));
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    });

    const onScroll = () => {
      const scrollY = window.scrollY;
      links.forEach(link => {
        const targetId = link.getAttribute('href')?.replace('#', '') || '';
        const section = document.getElementById(targetId);
        if (!section) return;
        const top = section.offsetTop - 100;
        const bottom = top + section.offsetHeight;
        if (scrollY >= top && scrollY < bottom) {
          setActive(targetId);
        }
      });
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <ul className="navbar-menu" id="navbar-menu">
      <li className="navbar-item">
        <a href="#home" className={`navbar-link${active === 'home' ? ' active' : ''}`}>./Home</a>
      </li>
      <li className="navbar-item">
        <a href="#about-me" className={`navbar-link${active === 'about-me' ? ' active' : ''}`}>./About Me</a>
      </li>
    </ul>
  );
}
