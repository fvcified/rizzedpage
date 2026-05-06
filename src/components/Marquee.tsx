'use client';

import { useEffect, useRef } from 'react';

const marqueeRows = [
  { direction: "left",  highlight: false, speed: 50,  items: ["SOFTWARE ENGINEER","GAME DEVELOPER","FRONTEND DEVELOPER","BACKEND DEVELOPER","MOBILE DEVELOPER","CRYPTOGRAPHER","REVERSE ENGINEER","PENETRATION TESTER","RED TEAM","DEVOPS ENGINEER","DATA SCIENTIST","ML ENGINEER","CLOUD ENGINEER","FULL STACK","BLOCKCHAIN DEV","SECURITY RESEARCHER"] },
  { direction: "right", highlight: false, speed: 110, items: ["VIDEO EDITING","SCRAPING","CLI","SIMULATION","SYSTEM DESIGN","MOOD ANALYSIS","OSINT","OPEN SOURCE","DEBUGGING","CODE REVIEW","DOCUMENTATION","AGILE","SCRUM","PROBLEM SOLVING","CLEAN CODE","DESIGN PATTERNS"] },
  { direction: "left",  highlight: false, speed: 110, items: ["TENSORFLOW","PYTORCH","KERAS","SKLEARN","NUMPY","PANDAS","MATPLOTLIB","OPENAI","DEEPSEEK","OLLAMA","LANGCHAIN","HUGGINGFACE","NLP","COMPUTER VISION","REINFORCEMENT LEARNING","MOOD ANALYSIS","SIMULATION","RAG","FINE TUNING","VECTOR DB"] },
  { direction: "right", highlight: false, speed: 50,  items: ["PENETRATION TESTING","METASPLOIT","WEB EXPLOITATION","CRYPTOGRAPHY","REVERSE ENGINEERING","PWN","FORENSICS","STEGANOGRAPHY","OSINT","HASHCAT","BURP SUITE","GHIDRA","WIRESHARK","KALI LINUX","ZERO DAY","FIREWALL","OWASP","NMAP","IDA PRO","BINARY EXPLOITATION","PRIVILEGE ESCALATION"] },
  { direction: "left",  highlight: false, speed: 110, items: ["POSTGRESQL","MYSQL","MONGODB","REDIS","ELASTICSEARCH","CASSANDRA","DYNAMODB","NEO4J","SQLITE","MARIADB","INFLUXDB","FIREBASE","FIRESTORE","SCHEMA DESIGN","SHARDING","REPLICATION","INDEXING","CACHE MANAGEMENT","TRANSACTIONS","MIGRATIONS"] },
  { direction: "right", highlight: false, speed: 110, items: ["PYTHON","JAVASCRIPT","TYPESCRIPT","RUST","GO","JAVA","KOTLIN","SWIFT","DART","C#","PHP","RUBY","PERL","SCALA","HASKELL","ELIXIR","LUA","ASSEMBLY","JULIA","PASCAL","BRAINFUCK","BASH","SOLIDITY","WASM"] },
  { direction: "left",  highlight: false, speed: 110, items: ["REACT","ANGULAR","VUE","SVELTE","NEXT.JS","NUXT.JS","ASTRO","SOLID.JS","HTMX","JQUERY","THREE.JS","WEBGL","GLSL","TAILWIND","BOOTSTRAP","MATERIAL UI","SASS","FRAMER MOTION","GSAP","CSS ANIMATION","WEB COMPONENTS"] },
  { direction: "right", highlight: false, speed: 110, items: ["NODE.JS","EXPRESS","FLASK","DJANGO","FASTAPI","SPRING BOOT","LARAVEL","RAILS","GRAPHQL","REST API","GRPC","WEBSOCKET","SOCKET.IO","KAFKA","RABBITMQ","MQTT","API GATEWAY","WEBHOOK","MICROSERVICES","SERVER SENT EVENTS"] },
  { direction: "left",  highlight: true,  speed: 50,  items: ["SOFTWARE ENGINEER","GAME DEVELOPER","FRONTEND DEVELOPER","BACKEND DEVELOPER","MOBILE DEVELOPER","CRYPTOGRAPHER","REVERSE ENGINEER","PENETRATION TESTER","RED TEAM","DEVOPS ENGINEER","DATA SCIENTIST","ML ENGINEER","CLOUD ENGINEER","FULL STACK","BLOCKCHAIN DEV","SECURITY RESEARCHER"] },
  { direction: "right", highlight: false, speed: 110, items: ["AWS","GCP","AZURE","DOCKER","KUBERNETES","SERVERLESS","HEROKU","ANSIBLE","JENKINS","CI/CD","TERRAFORM","NGINX","LINUX","VERCEL","NETLIFY","CLOUDFLARE","GITHUB ACTIONS","MLOPS","DATA PIPELINE","PROMETHEUS","GRAFANA"] },
  { direction: "left",  highlight: false, speed: 110, items: ["TENSORFLOW","PYTORCH","KERAS","SKLEARN","NUMPY","PANDAS","MATPLOTLIB","OPENAI","DEEPSEEK","OLLAMA","LANGCHAIN","HUGGINGFACE","NLP","COMPUTER VISION","REINFORCEMENT LEARNING","MOOD ANALYSIS","SIMULATION","RAG","FINE TUNING","VECTOR DB"] },
  { direction: "right", highlight: true,  speed: 60,  items: ["PENETRATION TESTING","MOOD ANALYSIS","WEB EXPLOITATION","CRYPTOGRAPHY","REVERSE ENGINEERING","PWN","FORENSICS","STEGANOGRAPHY","HASHCAT","METASPLOIT","OSINT","BURP SUITE","GHIDRA","WIRESHARK","KALI LINUX","ZERO DAY","FIREWALL","OWASP","NMAP","IDA PRO","BINARY EXPLOITATION","PRIVILEGE ESCALATION"] },
  { direction: "left",  highlight: false, speed: 110, items: ["FLUTTER","REACT NATIVE","ANDROID","IOS","SWIFT UI","UNITY","UNREAL ENGINE","GODOT","OPENCV","WEBGL","GAME PHYSICS","SHADER","PATHFINDING","PROCEDURAL GEN","ECS","MULTIPLAYER"] },
  { direction: "right", highlight: false, speed: 110, items: ["GIT","GITHUB","GITLAB","VITE","WEBPACK","ESBUILD","ROLLUP","BABEL","PNPM","YARN","NPM","BUN","ESLINT","PRETTIER","POSTCSS","STYLELINT","HUSKY","TURBOREPO","MONOREPO","LINTING"] },
  { direction: "left",  highlight: false, speed: 110, items: ["JEST","VITEST","MOCHA","CHAI","CYPRESS","PLAYWRIGHT","SELENIUM","PUPPETEER","STORYBOOK","TDD","BDD","MOCKING","SNAPSHOT","E2E TESTING","UNIT TESTING","INTEGRATION TEST","LOAD TESTING","K6"] },
  { direction: "right", highlight: false, speed: 110, items: ["PRISMA","TYPEORM","SEQUELIZE","MONGOOSE","DRIZZLE","MIKRO-ORM","SQLALCHEMY","HIBERNATE","QUERY BUILDER","MIGRATIONS","TRANSACTIONS","CONNECTION POOL","DATA MAPPER","ACTIVE RECORD"] },
  { direction: "left",  highlight: false, speed: 110, items: ["BLOCKCHAIN","SMART CONTRACT","SOLIDITY","WEB3.JS","ETHERS.JS","DEFI","NFT","TOKENOMICS","CRYPTOGRAPHY","FINANCE","TRADING ALGORITHM","QUANTITATIVE ANALYSIS","RISK MANAGEMENT","GRAPH DATABASE"] },
  { direction: "right", highlight: false, speed: 110, items: ["VIDEO EDITING","SCRAPING","CLI","SIMULATION","SYSTEM DESIGN","MOOD ANALYSIS","OSINT","OPEN SOURCE","DEBUGGING","CODE REVIEW","DOCUMENTATION","AGILE","SCRUM","PROBLEM SOLVING","CLEAN CODE","DESIGN PATTERNS"] },
  { direction: "left",  highlight: false, speed: 50,  items: ["SOFTWARE ENGINEER","GAME DEVELOPER","FRONTEND DEVELOPER","BACKEND DEVELOPER","MOBILE DEVELOPER","CRYPTOGRAPHER","REVERSE ENGINEER","PENETRATION TESTER","RED TEAM","DEVOPS ENGINEER","DATA SCIENTIST","ML ENGINEER","CLOUD ENGINEER","FULL STACK","BLOCKCHAIN DEV","SECURITY RESEARCHER"] },
];

export default function Marquee() {
  const containerRef = useRef<HTMLDivElement>(null);
  const builtRef = useRef(false);

  useEffect(() => {
    if (builtRef.current || !containerRef.current) return;
    builtRef.current = true;

    const bg = document.createElement('div');
    bg.className = 'tech-marquee-background';
    const rowWrapper = document.createElement('div');
    rowWrapper.className = 'tech-marquee-row-wrapper';
    bg.appendChild(rowWrapper);

    marqueeRows.forEach(({ direction, highlight, speed, items }) => {
      const row = document.createElement('div');
      row.className = 'tech-marquee-row';
      if (highlight && direction === 'right') row.classList.add('tech-marquee-highlight');
      if (highlight && direction === 'left') row.classList.add('left-tech-marquee-highlight');
      row.dataset.direction = direction;

      [...items, ...items].forEach(text => {
        const span = document.createElement('span');
        span.textContent = text;
        span.addEventListener('mouseenter', () => { row.classList.add('paused'); span.classList.add('hovered'); });
        span.addEventListener('mouseleave', () => { row.classList.remove('paused'); span.classList.remove('hovered'); });
        row.appendChild(span);
      });

      const anim = direction === 'left' ? 'marqueeLeft' : 'marqueeRight';
      row.style.animation = `${anim} ${speed}s linear infinite`;
      rowWrapper.appendChild(row);
    });

    containerRef.current!.appendChild(bg);
  }, []);

  return <div id="tech-marquee-container" ref={containerRef}></div>;
}