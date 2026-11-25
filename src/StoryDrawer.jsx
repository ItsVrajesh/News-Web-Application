import { useEffect, useRef, useState } from "react";
import { motion as Motion } from "motion/react";
import { Bookmark, Check, ExternalLink, Headphones, Link2, Moon, Sun, X } from "lucide-react";

const dateText = (value) => {
  if (!value) return "Today";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Today" : new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(date);
};

export default function StoryDrawer({ article, onClose, saved, onSave, reduceMotion }) {
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const excerpt = article.content?.replace(/\[\+\d+ chars\].*$/, "").trim();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = [...panelRef.current.querySelectorAll("button:not(:disabled), a[href]")];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (canSpeak) window.speechSynthesis.cancel();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose, canSpeak]);

  function listen() {
    if (!canSpeak) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance([article.title, article.description, excerpt].filter(Boolean).join(". "));
    utterance.rate = .94;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  async function share() {
    if (article.preview) return;
    try {
      if (navigator.share) await navigator.share({ title: article.title, url: article.url });
      else await navigator.clipboard.writeText(article.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // The user may cancel the native share sheet.
    }
  }

  return <Motion.div className="story-overlay" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <Motion.section ref={panelRef} className={`story-drawer ${focusMode ? "drawer-focus" : ""}`} role="dialog" aria-modal="true" aria-labelledby="drawer-title" initial={reduceMotion ? false : { x: 56, opacity: .75 }} animate={{ x: 0, opacity: 1 }} exit={reduceMotion ? { opacity: 0 } : { x: 56, opacity: 0, transition: { duration: .24 } }} transition={{ type: "spring", stiffness: 290, damping: 34 }}>
      <div className="drawer-topbar"><span>NEWSVRUVA / STORY PREVIEW</span><button ref={closeRef} onClick={onClose} aria-label="Close story preview"><X size={21}/></button></div>
      <div className="drawer-scroll">
        <div className="drawer-cover">{article.urlToImage && <img src={article.urlToImage} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }}/>}<span>THE STORY, IN CONTEXT.</span></div>
        <div className="drawer-content">
          <div className="drawer-meta"><span>{article.source?.name || "News source"}</span><span>{dateText(article.publishedAt)}</span></div>
          <h2 id="drawer-title">{article.title}</h2>
          <div className="drawer-tools"><button onClick={onSave} disabled={article.preview} aria-label={saved ? "Remove saved story" : "Save story"}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/>{saved ? "Saved" : "Save"}</button><button onClick={listen} disabled={!canSpeak}><Headphones size={17}/>{speaking ? "Stop audio" : "Listen"}</button><button onClick={() => setFocusMode((value) => !value)}>{focusMode ? <Sun size={17}/> : <Moon size={17}/>} {focusMode ? "Day view" : "Focus view"}</button><button onClick={share} disabled={article.preview}>{copied ? <Check size={17}/> : <Link2 size={17}/>} {copied ? "Shared" : "Share"}</button></div>
          <div className="drawer-reading"><span className="drawer-drop">THE QUICK READ</span><p className="drawer-deck">{article.description || "A headline worth a closer look."}</p>{excerpt && excerpt !== article.description && <p>{excerpt}</p>}<div className="drawer-context"><span>FROM THE PUBLISHER</span><p>NewsVruva shows a short preview. The original publisher has the complete reporting, context, and updates.</p></div></div>
          {article.preview ? <div className="drawer-preview-note">This is an example story for design review. No full article is available.</div> : <a className="drawer-source-link" href={article.url} target="_blank" rel="noopener noreferrer">Continue at {article.source?.name || "the source"} <ExternalLink size={18}/></a>}
        </div>
      </div>
    </Motion.section>
  </Motion.div>;
}
