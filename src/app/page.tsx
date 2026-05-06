'use client';

import { useEffect } from 'react';
import Intro from '@/components/Intro';
import Navbar from '@/components/Navbar';
import VolumeControl from '@/components/VolumeControl';
import Terminal from '@/components/Terminal';
import DiscordPanel from '@/components/DiscordPanel';
import Marquee from '@/components/Marquee';
import AboutSection from '@/components/AboutSection';
import Footer from '@/components/Footer';
import TitleAnimator from '@/components/TitleAnimator';

export default function Home() {
  useEffect(() => {
    document.body.classList.add('noscroll');
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <TitleAnimator />
      <nav className="navbar">
        <Navbar />
      </nav>

      <main>
        <section id="home">
          <div className="main-content">
            <div className="background"></div>
            <Intro />
            <VolumeControl />
            <Terminal />
            <DiscordPanel />
          </div>
        </section>

        <div className="about-space"></div>
        <div className="page-wrapper">
          <AboutSection />
          <div className="underline"></div>
          <Footer />
        </div>
      </main>

      <Marquee />
    </>
  );
}