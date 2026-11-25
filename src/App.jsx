import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion as Motion, useReducedMotion } from "motion/react";
import { Bookmark, Clock3, Globe2, Menu, RefreshCw, Search, Shuffle, X } from "lucide-react";
import { previewStories } from "./previewStories";
import StoryDrawer from "./StoryDrawer";
import "./App.css";
import "./upgrade.css";

const sections = [
  { slug: "general", label: "Top stories" },
  { slug: "business", label: "Business" },
  { slug: "technology", label: "Technology" },
  { slug: "science", label: "Science" },
  { slug: "health", label: "Health" },
  { slug: "sports", label: "Sports" },
  { slug: "entertainment", label: "Entertainment" },
];
const sectionNames = Object.fromEntries(sections.map(({ slug, label }) => [slug, label]));
const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem("newsvruva:saved") || "[]");
    return Array.isArray(value) ? value.filter((item) => isSafeArticleUrl(item?.url)) : [];
  } catch {
    return [];
  }
}

function isSafeArticleUrl(url) {
  try {
    const value = new URL(url);
    return value.protocol === "https:" || value.protocol === "http:";
  } catch {
    return false;
  }
}

function formatTime(value) {
  if (!value) return "Today";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Today" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function normalizeArticles(items) {
  return (Array.isArray(items) ? items : []).filter((item) => item?.title && item.title !== "[Removed]" && isSafeArticleUrl(item.url))
    .map((item) => ({
      title: item.title,
      description: item.description || "",
      content: item.content || "",
      url: item.url,
      urlToImage: item.urlToImage || null,
      publishedAt: item.publishedAt || null,
      source: { name: item.source?.name || "News source" },
    }));
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const path = location.pathname.slice(1).split("/")[0];
  const savedView = path === "saved";
  const category = sectionNames[path] ? path : "general";
  const designPreview = new URLSearchParams(location.search).get("preview") === "1";
  const suffix = designPreview ? "?preview=1" : "";
  const [articles, setArticles] = useState([]);
  const [saved, setSaved] = useState(readSaved);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const closeStory = useCallback(() => setSelected(null), []);

  useEffect(() => {
    document.title = `${savedView ? "Saved stories" : sectionNames[category]} | NewsVruva`;
  }, [savedView, category]);
  useEffect(() => {
    setQuery("");
    setMenuOpen(false);
    setSelected(null);
  }, [location.pathname]);
  useEffect(() => {
    if (savedView) { setLoading(false); setError(""); return; }
    if (designPreview) {
      setArticles(previewStories);
      setTotal(previewStories.length);
      setPage(1);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setArticles([]);
    setPage(1);
    const params = new URLSearchParams({ category, page: "1" });
    fetch(`/api/news?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "The newsroom is temporarily unavailable.");
        return data;
      })
      .then((data) => {
        setArticles(normalizeArticles(data.articles));
        setTotal(Number(data.totalResults) || 0);
      })
      .catch((cause) => {
        if (cause.name !== "AbortError") setError(cause.message || "The newsroom is temporarily unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, savedView, designPreview, refreshKey]);
  useEffect(() => {
    try { localStorage.setItem("newsvruva:saved", JSON.stringify(saved)); }
    catch { /* Saving may be unavailable in private browsing. */ }
  }, [saved]);

  const toggleSaved = useCallback((article) => {
    if (article.preview) return;
    setSaved((current) => {
      return current.some((item) => item.url === article.url)
        ? current.filter((item) => item.url !== article.url)
        : [article, ...current];
    });
  }, []);
  const sourceArticles = savedView ? saved : articles;
  const shown = useMemo(() => sourceArticles.filter((article) => {
    const term = query.trim().toLowerCase();
    return !term || [article.title, article.description, article.source?.name].some((value) => value?.toLowerCase().includes(term));
  }), [sourceArticles, query]);
  const featured = shown[0];
  const remaining = shown.slice(1);
  const moreStories = shown.slice(4);
  const hasMore = !savedView && !designPreview && !query && articles.length > 0 && articles.length < total;

  function surpriseMe() {
    if (!shown.length) return;
    setSelected(shown[Math.floor(Math.random() * shown.length)]);
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams({ category, page: String(nextPage) });
      const response = await fetch(`/api/news?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load more stories.");
      const incoming = normalizeArticles(data.articles);
      setArticles((current) => {
        const seen = new Set(current.map((item) => item.url));
        return [...current, ...incoming.filter((item) => !seen.has(item.url))];
      });
      setTotal(Number(data.totalResults) || total);
      setPage(nextPage);
      setError("");
    } catch (cause) {
      setError(cause.message || "Could not load more stories.");
    } finally {
      setLoadingMore(false);
    }
  }
  function chooseCategory(slug) {
    navigate(slug === "general" ? `/${suffix}` : `/${slug}${suffix}`);
  }

  return <div className="news-app">
    <div className="top-strip"><span><span className="live-mark"/> THE WORLD, IN FOCUS</span><span>{today}</span><span>YOUR DAILY PERSPECTIVE</span></div>
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to={`/${suffix}`} aria-label="NewsVruva home"><span className="brand-symbol"><span/></span><span>news<span className="brand-accent">vruva</span><i>.</i></span></Link>
        <span className="header-line">Stories worth your time.</span>
        <div className="header-actions">
          <button className="header-search" onClick={() => document.getElementById("story-search")?.focus()} aria-label="Search stories"><Search size={19}/><span>Search</span></button>
          <Link className={`saved-link ${savedView ? "is-active" : ""}`} to={`/saved${suffix}`}><Bookmark size={17}/><span>Saved</span><b>{saved.length}</b></Link>
          <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="category-nav" aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X size={23}/> : <Menu size={23}/>}</button>
        </div>
      </div>
    </header>
    <nav id="category-nav" className={`category-nav ${menuOpen ? "menu-open" : ""}`} aria-label="News sections"><div className="category-inner">
      {sections.map(({ slug, label }) => <button key={slug} className={!savedView && category === slug ? "active" : ""} onClick={() => chooseCategory(slug)}>{label}</button>)}
      <span className="nav-end"><Globe2 size={15}/> US EDITION</span>
    </div></nav>
    {shown.length > 0 && <div className="news-ticker"><span className="ticker-label">ON THE RADAR <span>✳</span></span><div className="ticker-window"><div className="ticker-track">{shown.slice(0, 5).map((article) => <button key={article.url} onClick={() => setSelected(article)}>{article.title}<span>✳</span></button>)}{shown.slice(0, 5).map((article) => <span key={`repeat-${article.url}`} aria-hidden="true">{article.title}<i>✳</i></span>)}</div></div></div>}

    <main className="page-shell">
      {designPreview && <div className="preview-banner">Design preview · Example headlines are shown. Live stories are not loaded in this mode.</div>}
      <div className="section-heading"><div><span className="eyebrow">{savedView ? "YOUR READING LIST" : "THE DAILY EDITION"}</span><h1>{savedView ? "Saved for later" : category === "general" ? "Today's stories" : sectionNames[category]}</h1><p>{savedView ? "The stories you wanted to return to." : "The headlines, with room to breathe."}</p></div><div className="edition-stamp"><span>NEWSVRUVA</span><strong>{new Date().getDate()}</strong><span>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date()).toUpperCase()} EDITION</span></div></div>

      <div className="toolbar"><div className="toolbar-label"><span className="pulse-dot"/> {savedView ? "YOUR COLLECTION" : "LATEST UPDATES"} <span className="toolbar-count">{loading ? "…" : shown.length} stories</span></div><div className="toolbar-actions"><label className="search-box"><Search size={17}/><input id="story-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search these stories…" aria-label="Search stories"/></label>{!savedView && <button className="refresh-button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} title="Refresh stories" aria-label="Refresh stories"><RefreshCw size={17}/></button>}</div></div>

      {loading ? <LoadingLayout/> : error && !articles.length && !savedView ? <ErrorState message={error} retry={() => setRefreshKey((value) => value + 1)}/> : shown.length ? <>
        <div className="feature-grid">
          <Motion.div className="lead-story" key={featured.url} initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
            <StoryImage article={featured} className="lead-image"/>
            <div className="lead-content"><span className="story-label">THE LEAD STORY <i/> {featured.source?.name}</span><h2>{featured.title}</h2><p>{featured.description || "Open the story for a quick read."}</p><div className="lead-bottom"><button className="read-story large" onClick={() => setSelected(featured)}>Explore story</button><button className={`save-button light ${saved.some((item) => item.url === featured.url) ? "saved" : ""}`} onClick={() => toggleSaved(featured)} disabled={featured.preview} aria-label={featured.preview ? "Saving unavailable in design preview" : saved.some((item) => item.url === featured.url) ? "Remove saved story" : "Save story"}><Bookmark size={18} fill={saved.some((item) => item.url === featured.url) ? "currentColor" : "none"}/></button></div></div>
          </Motion.div>
          <div className="briefing-panel"><div className="briefing-top"><span className="eyebrow">THE BRIEFING</span><span>IN A MINUTE</span></div><h2>In other<br/><em>headlines.</em></h2><div className="briefing-list">{remaining.length ? remaining.slice(0, 3).map((article, index) => <button key={article.url} onClick={() => setSelected(article)}><span className="briefing-number">0{index + 1}</span><span><small>{article.source?.name} · {formatTime(article.publishedAt)}</small><strong>{article.title}</strong></span></button>) : <p className="briefing-empty">Find another story you love and save it here.</p>}</div><div className="briefing-foot"><span><Clock3 size={16}/> A few minutes, well spent.</span><span className="briefing-sun">✳</span></div></div>
        </div>
        {moreStories.length > 0 && <><div className="stories-title" id="stories"><div><span className="eyebrow">BEYOND THE HEADLINE</span><h2>More to explore<span>.</span></h2></div><button className="surprise-button" onClick={surpriseMe}><Shuffle size={17}/> Surprise me</button></div>
        <AnimatePresence mode="popLayout"><div className="stories-grid">{moreStories.map((article, index) => <StoryCard key={article.url} article={article} index={index} saved={saved.some((item) => item.url === article.url)} onSave={() => toggleSaved(article)} onOpen={() => setSelected(article)} reduceMotion={reduceMotion}/>)}</div></AnimatePresence></>}
        {hasMore && <div className="load-more-wrap"><button className="load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading stories…" : "Load more stories"}</button></div>}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </> : <EmptyState savedView={savedView} query={query} onClear={() => setQuery("")} onBrowse={() => chooseCategory("general")}/>}
    </main>
    <footer className="site-footer"><div><Link className="footer-brand" to={`/${suffix}`}>newsvruva<span>.</span></Link><p>Make sense of what matters.</p></div><div><span>CURIOUS MINDS WELCOME.</span><span>© {new Date().getFullYear()} NEWSVRUVA</span></div></footer>
    <AnimatePresence>{selected && <StoryDrawer key={selected.url} article={selected} onClose={closeStory} saved={saved.some((item) => item.url === selected.url)} onSave={() => toggleSaved(selected)} reduceMotion={reduceMotion}/>}</AnimatePresence>
  </div>;
}

function StoryImage({ article, className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [article.urlToImage]);
  return <div className={`story-image ${className} ${!article.urlToImage || failed ? "image-fallback" : ""}`}>{article.urlToImage && !failed && <img src={article.urlToImage} alt="" loading="lazy" onError={() => setFailed(true)}/>}<div className="fallback-art" aria-hidden="true"><Globe2 size={80} strokeWidth={.7}/><span>NV.</span></div></div>;
}

function StoryCard({ article, index, saved, onSave, onOpen, reduceMotion }) {
  return <Motion.article className="story-card" layout initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} transition={{ duration: .35, delay: Math.min(index, 6) * .045 }}>
    <button className="card-media-button" onClick={onOpen} aria-label={`Preview: ${article.title}`}><StoryImage article={article}/></button><div className="card-body"><div className="card-meta"><span>{article.source?.name}</span><span>{formatTime(article.publishedAt)}</span></div><button className="card-title-button" onClick={onOpen}><h3>{article.title}</h3></button><p>{article.description || "Open the story for more context."}</p><div className="card-bottom"><button className="read-story" onClick={onOpen}>Quick read</button><button className={`save-button ${saved ? "saved" : ""}`} onClick={onSave} disabled={article.preview} aria-label={article.preview ? "Saving unavailable in design preview" : saved ? "Remove saved story" : "Save story"}><Bookmark size={18} fill={saved ? "currentColor" : "none"}/></button></div></div>
  </Motion.article>;
}

function LoadingLayout() {
  return <div className="loading-layout" aria-label="Loading stories" role="status"><div className="loading-feature shimmer"/><div className="loading-side shimmer"/><div className="loading-card shimmer"/><div className="loading-card shimmer"/><div className="loading-card shimmer"/></div>;
}

function ErrorState({ message, retry }) {
  return <div className="message-state"><span className="message-icon"><Globe2 size={31}/></span><span className="eyebrow">CONNECTION INTERRUPTED</span><h2>The world is still turning.<br/>We just lost the feed.</h2><p>{message}</p><button className="primary-action" onClick={retry}><RefreshCw size={17}/> Try again</button></div>;
}

function EmptyState({ savedView, query, onClear, onBrowse }) {
  return <div className="message-state"><span className="message-icon"><Bookmark size={31}/></span><span className="eyebrow">{savedView ? "YOUR READING LIST" : "NO STORIES FOUND"}</span><h2>{query ? "Nothing matches that search." : savedView ? "Good stories are worth keeping." : "No headlines in this section yet."}</h2><p>{query ? "Try another phrase to find what you need." : savedView ? "Tap the bookmark on any story to collect it here." : "Try another section or refresh the feed."}</p><button className="primary-action" onClick={query ? onClear : onBrowse}>{query ? "Clear search" : "Browse headlines"}</button></div>;
}

export default function App() {
  return <BrowserRouter><AppContent/></BrowserRouter>;
}
