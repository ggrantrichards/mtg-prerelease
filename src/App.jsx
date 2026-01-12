import React, { useState, useEffect, useMemo } from 'react';
import { Search, Moon, Sun, Flame, CalendarClock, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- ASSET IMPORTS ---
// IMPORTANT: Ensure these files exist in your src/assets/ folder!
// If you don't have images, comment these out and use text labels in the UI.
import mtgWhite from './assets/mtg_plains.jpg'
import mtgBlue from './assets/mtg_island.png';
import mtgBlack from './assets/mtg_swamp.jpg';
import mtgRed from './assets/mtg_mountain.png';
import mtgGreen from './assets/mtg_forest.png';
import mtgColorless from './assets/mtg_colorless.png';
import mtgMulti from './assets/mtg_multicolored.webp';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const SCRYFALL_SETS_API = "https://api.scryfall.com/sets";
const SCRYFALL_SEARCH_API = "https://api.scryfall.com/cards/search";

const MANA_ICONS = {
  W: mtgWhite,
  U: mtgBlue,
  B: mtgBlack,
  R: mtgRed,
  G: mtgGreen,
  C: mtgColorless,
  M: mtgMulti,
};

const COLOR_ORDER = {
  'W': 0, 'U': 1, 'B': 2, 'R': 3, 'G': 4,
  'M': 5, // Multicolored
  'C': 6  // Colorless
};

// Mana Symbol Data for the UI
const MANA_FILTERS = [
  { id: 'W', label: 'White' },
  { id: 'U', label: 'Blue' },
  { id: 'B', label: 'Black' },
  { id: 'R', label: 'Red' },
  { id: 'G', label: 'Green' },
  { id: 'C', label: 'Colorless' },
  { id: 'M', label: 'Multi' },
];

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  const [loading, setLoading] = useState(true);
  const [currentSet, setCurrentSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState(null);

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
        setLoading(true);
        const res = await fetch(SCRYFALL_SETS_API);
        const { data } = await res.json();
        const now = new Date();

        // 1. Filter for relevant sets (Expansion/Core/Masters)
        let candidates = data
          .filter(s => ['expansion', 'core', 'masters'].includes(s.set_type))
          .filter(s => new Date(s.released_at) > new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60));

        // 2. Sort by date
        candidates.sort((a, b) => new Date(a.released_at) - new Date(b.released_at));

        // 3. Get the next upcoming set
        const futureSets = candidates.filter(s => new Date(s.released_at) >= now);
        const targetSet = futureSets.length > 0 ? futureSets[0] : candidates[candidates.length - 1];

        if (targetSet) {
          setCurrentSet(targetSet);

          // 4. Fetch Cards (With Pagination for >175 cards)
          let allFetchedCards = [];
          let nextUri = `${SCRYFALL_SEARCH_API}?q=set:${targetSet.code}&unique=prints`;

          while (nextUri) {
            const cardRes = await fetch(nextUri);
            const cardData = await cardRes.json();

            if (cardData.data) {
              allFetchedCards = [...allFetchedCards, ...cardData.data];
            }

            // Check for next page
            if (cardData.has_more && cardData.next_page) {
              nextUri = cardData.next_page;
              await new Promise(r => setTimeout(r, 50)); // Tiny delay to be nice to API
            } else {
              nextUri = null;
            }
          }

          // 5. Sort: Color then CMC
          const sortedCards = allFetchedCards.sort((a, b) => {
            const getColorIndex = (c) => {
              if (!c.colors || c.colors.length === 0) return COLOR_ORDER['C'];
              if (c.colors.length > 1) return COLOR_ORDER['M'];
              return COLOR_ORDER[c.colors[0]] ?? 7;
            };

            const colorA = getColorIndex(a);
            const colorB = getColorIndex(b);
            if (colorA !== colorB) return colorA - colorB;
            return a.cmc - b.cmc;
          });

          setCards(sortedCards);
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
    const prereleaseDate = new Date(release);
    prereleaseDate.setDate(release.getDate() - 7);

    const timer = setInterval(() => {
      const now = new Date();
      const diff = prereleaseDate - now;

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

  const toggleSelection = (id) => {
    const newSet = new Set(selectedCards);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCards(newSet);
  };

  const filteredCards = useMemo(() => {
    return cards.filter(c => {
      // Search
      if (!c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      // Filter
      if (activeFilter) {
        const cardColors = c.colors || c.card_faces?.[0]?.colors || [];
        if (activeFilter === 'C') return cardColors.length === 0;
        if (activeFilter === 'M') return cardColors.length > 1;
        return cardColors.length === 1 && cardColors[0] === activeFilter;
      }
      return true;
    });
  }, [cards, searchTerm, activeFilter]);

  if (loading) return <LoadingScreen isDark={isDark} />;

  return (
    <div className="min-h-screen w-full transition-colors duration-300 overflow-x-hidden bg-page-bg text-text-main">
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
                placeholder="Search..."
                className="bg-slate-100 dark:bg-white/10 border-none rounded-full py-2 pl-10 pr-4 text-sm w-32 sm:w-64 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative pt-12 pb-12 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-[120px] -z-10" />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-xs font-bold uppercase tracking-widest mb-4 border border-brand-500/20">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                Next Prerelease
              </span>
              <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-4 text-hero-text dark:bg-gradient-to-b dark:from-white dark:to-slate-400 dark:bg-clip-text dark:text-transparent leading-tight">
                {currentSet?.name}
              </h1>
              <p className="text-lg text-text-muted max-w-xl leading-relaxed">
                Tracking live spoilers for <span className="text-brand-500 font-bold">{currentSet?.code?.toUpperCase()}</span>.
              </p>
            </div>
            <div className="flex gap-4 p-2 bg-slate-200/50 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-border-main self-start lg:self-center">
              <CountdownUnit val={timeLeft.d} label="Days" />
              <CountdownUnit val={timeLeft.h} label="Hrs" />
              <CountdownUnit val={timeLeft.m} label="Mins" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <section className="px-4 sm:px-6 pb-24 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-slate-200 dark:border-white/10 pb-4 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold">Spoilers</h2>
            </div>

            {/* Mana Filters */}
            <div className="flex gap-2">
              {MANA_FILTERS.map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(isActive ? null : f.id)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-transform border border-transparent",
                      isActive ? "scale-110 ring-2 ring-indigo-500 ring-offset-2 ring-offset-page-bg" : "opacity-60 hover:opacity-100 hover:scale-105"
                    )}
                    title={f.label}
                  >
                    {/* Ensure MANA_ICONS[f.id] exists or this will break */}
                    <img src={MANA_ICONS[f.id]} alt={f.label} className="w-full h-full object-cover rounded-full" />
                  </button>
                )
              })}
              <AnimatePresence>
                {activeFilter && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={() => setActiveFilter(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 hover:bg-red-100 hover:text-red-500 transition-colors ml-1"
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex gap-4 items-center self-end md:self-auto">
            {selectedCards.size > 0 && (
              <span className="text-indigo-600 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">
                {selectedCards.size} Selected
              </span>
            )}
            <span className="text-sm font-medium px-3 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              {filteredCards.length} Cards
            </span>
          </div>
        </div>

        <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredCards.map((card, idx) => (
              <CardItem
                key={card.id}
                card={card}
                isSelected={selectedCards.has(card.id)}
                onToggle={() => toggleSelection(card.id)}
              />
            ))}
          </AnimatePresence>
          {filteredCards.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-50">
              <p className="text-xl font-medium">No cards match your filter.</p>
              <button onClick={() => setActiveFilter(null)} className="text-indigo-500 text-sm mt-2 hover:underline">Clear Filters</button>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}

// Optimized CardItem (No jank)
function CardItem({ card, isSelected, onToggle }) {
  const img = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;
  const colors = card.colors || card.card_faces?.[0]?.colors || [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={onToggle}
      className={cn(
        "group relative bg-card-bg border rounded-2xl p-2 transition-all hover:shadow-xl cursor-pointer select-none",
        isSelected
          ? "border-indigo-500 ring-2 ring-indigo-500/50 shadow-indigo-500/20 scale-[1.02] z-10"
          : "border-border-main hover:-translate-y-1 hover:shadow-brand-500/10"
      )}
    >
      <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-inner bg-slate-200 dark:bg-slate-800">
        {img ? (
          <img src={img} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-center p-2 opacity-50">No Image</div>
        )}
        {isSelected && (
          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[1px]">
            <CheckCircle2 className="w-12 h-12 text-white drop-shadow-md" />
          </div>
        )}
        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <span className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs">Details</span>
        </div>
      </div>
      <div className="mt-3 px-1 pb-1">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-text-main truncate text-sm leading-snug">{card.name}</h3>
          {card.mana_cost && <span className="text-[10px] font-mono text-text-muted whitespace-nowrap">{card.mana_cost}</span>}
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">{card.rarity}</p>
          {colors.length > 0 && (
            <div className="flex -space-x-1">
              {colors.map(c => (
                <span key={c} className={cn(
                  "w-2.5 h-2.5 rounded-full border border-card-bg shadow-sm",
                  c === 'W' && "bg-[#f8e7b9]", c === 'U' && "bg-[#b3ceea]",
                  c === 'B' && "bg-[#a69f9d]", c === 'R' && "bg-[#eb9f82]",
                  c === 'G' && "bg-[#c4d3ca]"
                )} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CountdownUnit({ val, label }) {
  return (
    <div className="flex flex-col items-center bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-sm min-w-[70px]">
      <span className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
        {String(val).padStart(2, '0')}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
        {label}
      </span>
    </div>
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