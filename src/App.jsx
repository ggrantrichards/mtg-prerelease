import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, ExternalLink, Flame, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const SCRYFALL_SETS_API = "https://api.scryfall.com/sets";
const SCRYFALL_SEARCH_API = "https://api.scryfall.com/cards/search";

export default function App() {
  // Default to system preference or dark mode
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  const [loading, setLoading] = useState(true);
  const [currentSet, setCurrentSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  // --- Theme Logic ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(SCRYFALL_SETS_API);
        const { data } = await res.json();

        const now = new Date();
        const upcoming = data
          .filter(s => ['expansion', 'core', 'masters', 'commander'].includes(s.set_type) && new Date(s.released_at) > now)
          .sort((a, b) => new Date(a.released_at) - new Date(b.released_at))[0];

        if (upcoming) {
          setCurrentSet(upcoming);
          // Fetch cards
          const cardRes = await fetch(`${SCRYFALL_SEARCH_API}?q=set:${upcoming.code}&order=spoiled`);
          const cardData = await cardRes.json();
          setCards(cardData.data || []);
        }
      } catch (err) {
        console.error("Fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Countdown Logic ---
  useEffect(() => {
    if (!currentSet) return;
    const release = new Date(currentSet.released_at);
    release.setDate(release.getDate() - 7); // Prerelease estimation

    const timer = setInterval(() => {
      const now = new Date();
      const diff = release - now;

      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
      } else {
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff / (1000 * 60 * 60)) % 24),
          m: Math.floor((diff / 1000 / 60) % 60),
          s: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentSet]);

  const filteredCards = cards.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <LoadingScreen isDark={isDark} />;

  return (
    <div className="min-h-screen w-full transition-colors duration-300 overflow-x-hidden">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-border-main bg-page-bg/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Flame size={20} fill="currentColor" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">
              Spoiler<span className="text-indigo-600">Track</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search cards..."
                className="bg-slate-100 dark:bg-white/10 border-none rounded-full py-2 pl-10 pr-4 text-sm w-40 sm:w-64 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-black transition-all outline-none placeholder:text-slate-500"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative pt-20 pb-16 px-6 overflow-hidden">
        {/* Modern Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-[120px] -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-xs font-bold uppercase tracking-widest mb-6 border border-brand-500/20">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                Live Tracker
              </span>

              {/* REFINED TITLE: Uses gradient text to stay visible in both modes */}
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 text-hero-text dark:bg-gradient-to-b dark:from-white dark:to-slate-400 dark:bg-clip-text dark:text-transparent leading-tight">
                {currentSet?.name}
              </h1>

              <p className="text-lg text-text-muted max-w-xl leading-relaxed">
                Tracking live spoilers for <span className="text-brand-500 font-bold">{currentSet?.code?.toUpperCase()}</span>. The prerelease event begins in:
              </p>
            </div>

            {/* REFINED COUNTDOWN */}
            <div className="flex gap-4 p-2 bg-slate-200/50 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-border-main">
              <CountdownUnit val={timeLeft.d} label="Days" />
              <CountdownUnit val={timeLeft.h} label="Hrs" />
              <CountdownUnit val={timeLeft.m} label="Mins" />
              <CountdownUnit val={timeLeft.s} label="Secs" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <section className="px-4 sm:px-6 pb-24 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold">Latest Drops</h2>
          </div>
          <span className="text-sm font-medium px-3 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {filteredCards.length} Cards
          </span>
        </div>

        <motion.div
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"
        >
          <AnimatePresence>
            {filteredCards.map((card, idx) => (
              <CardItem key={card.id} card={card} index={idx} />
            ))}
          </AnimatePresence>
        </motion.div>
      </section>
    </div>
  );
}

// --- Components ---

function CountdownUnit({ val, label }) {
  return (
    <div className="flex flex-col items-center bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 p-3 sm:p-4 rounded-xl shadow-sm min-w-[70px] sm:min-w-[85px]">
      <span className="text-2xl sm:text-3xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
        {String(val).padStart(2, '0')}
      </span>
      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
        {label}
      </span>
    </div>
  );
}

function CardItem({ card, index }) {
  const img = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;

  return (
    <motion.div
      layout
      className="group bg-card-bg border border-border-main rounded-2xl p-2 transition-all hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1"
    >
      <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-inner bg-slate-200 dark:bg-slate-800">
        <img src={img} alt={card.name} className="w-full h-full object-cover" />

        {/* Scryfall Button Hover */}
        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <a href={card.scryfall_uri} target="_blank" className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs scale-90 group-hover:scale-100 transition-transform">
            Details
          </a>
        </div>
      </div>

      <div className="mt-4 px-1 pb-2">
        <h3 className="font-bold text-text-main truncate">{card.name}</h3>
        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-1">{card.rarity}</p>
      </div>
    </motion.div>
  );
}

function LoadingScreen({ isDark }) {
  return (
    <div className={cn("min-h-screen w-full flex flex-col items-center justify-center gap-4", isDark ? "bg-[#050505]" : "bg-white")}>
      <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      <div className="text-sm font-medium text-slate-400 animate-pulse uppercase tracking-widest">
        Calibrating Oracles...
      </div>
    </div>
  );
}