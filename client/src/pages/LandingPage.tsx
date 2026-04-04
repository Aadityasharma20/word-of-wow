import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../landing.css';

/* ═══════════════════════════════════════════════════════════
   Word of Wow — Premium Interactive Landing Page
   ═══════════════════════════════════════════════════════════ */

// ── Intersection Observer Hook ────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Animated Counter ──────────────────────────────────
function AnimatedCounter({ end, prefix = '', suffix = '', duration = 2500 }: { end: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); return; }
      setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, end, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ── Typewriter Effect ─────────────────────────────────
function Typewriter({ text, delay = 40, startDelay = 0 }: { text: string; delay?: number; startDelay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const { ref, visible } = useInView(0.3);
  useEffect(() => {
    if (!visible) return;
    let i = 0;
    const timeout = setTimeout(() => {
      const timer = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(timer);
      }, delay);
      return () => clearInterval(timer);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [visible, text, delay, startDelay]);
  return <span ref={ref}>{displayed}<span className="lp-cursor-blink">|</span></span>;
}

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 });
  const [activeStep, setActiveStep] = useState(0);
  const [showSticky, setShowSticky] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const stepsRef = useRef<HTMLDivElement>(null);

  // Slideshow auto-advance
  const SLIDES = [
    { src: '/WOW_SCORE.png', label: 'WOW Score' },
    { src: '/WOW_SENTIMENT_ANALYSIS.png', label: 'Sentiment Analysis' },
    { src: '/WOW_TOP_MENTIONS.png', label: 'Filter & Compare Top Mentions' },
    { src: '/WOW_INSIGHT.png', label: 'WOW Insights' },
    { src: '/WOW_COMPARE_WITH_COMPETITORS.png', label: 'Compare with Competitors' },
  ];
  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % 5), 6000);
    return () => clearInterval(timer);
  }, []);

  // Scroll progress bar + sticky visibility
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const progress = h.scrollTop / (h.scrollHeight - h.clientHeight);
      setScrollProgress(Math.min(progress * 100, 100));
      setShowSticky(h.scrollTop > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cursor glow
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  }, []);

  // Steps scroll observer
  useEffect(() => {
    const items = stepsRef.current?.querySelectorAll('.lp-step-item');
    if (!items) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = parseInt((e.target as HTMLElement).dataset.step || '0');
          setActiveStep(idx);
        }
      });
    }, { threshold: 0.6 });
    items.forEach(item => obs.observe(item));
    return () => obs.disconnect();
  }, []);

  // Section refs for scroll animation
  const hero = useInView(0.1);
  const conversations = useInView(0.1);
  const painPoints = useInView(0.15);
  const problemSection = useInView(0.1);
  const beforeAfter = useInView(0.1);
  const brandMentions = useInView(0.1);
  const comparison = useInView(0.1);
  const builtFor = useInView(0.1);
  const faqSection = useInView(0.1);
  const finalCta = useInView(0.2);

  return (
    <div className="landing" onMouseMove={onMouseMove}>
      {/* Scroll Progress Bar */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      {/* Cursor Glow */}
      <div className="cursor-glow" style={{ left: cursorPos.x, top: cursorPos.y }} />

      {/* ═══ NAV ═══ */}
      <nav className="lp-nav">
        <Link to="/" className="lp-nav-logo">
          <img src="/logo.png" alt="Word of Wow Logo" id="wow-logo" width={76} height={76} fetchPriority="high" style={{ height: '76px', width: 'auto', borderRadius: '12px' }} />
        </Link>
        <div className="lp-nav-links">
          <Link to="/auth/login" className="lp-nav-link">Sign In</Link>
          <Link to="/auth/signup" className="lp-nav-link lp-nav-link-primary">Get Started</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="lp-hero" ref={hero.ref}>
        {/* Noise texture */}
        <div className="lp-noise" />

        {/* Particles */}
        <div className="lp-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="lp-particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 8}s`,
              width: `${3 + Math.random() * 4}px`,
              height: `${3 + Math.random() * 4}px`,
            }} />
          ))}
        </div>

        {/* Watermark logo behind hero */}
        <div style={{
          position: 'absolute', fontSize: '20rem', fontWeight: 900,
          opacity: 0.03, color: 'var(--lp-accent)',
          userSelect: 'none', pointerEvents: 'none', zIndex: 0,
          transform: 'scale(2)',
        }}>W</div>

        {/* Headline */}
        <div style={{ position: 'relative', zIndex: 5 }}>
          <div className="lp-hero-badge" style={{ opacity: 0, animation: 'wordReveal 0.6s var(--lp-ease) 0.1s forwards' }}>
            <img src="/favicon.png" alt="WOW" width={22} height={22} style={{ borderRadius: '50%' }} /> Built for the next generation of customer advocacy
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.25rem' }}>
            {['95%', 'of', 'Your', 'Customers', 'Will', 'Never', 'Talk', 'About', 'Your', 'Brand'].map((word, i) => (
              <span key={i} className="lp-word" style={{ animationDelay: `${0.3 + i * 0.1}s`, marginRight: '0.3em' }}>
                {word}
              </span>
            ))}
          </h1>

          <p style={{
            fontSize: '1.2rem', color: 'var(--lp-text-secondary)',
            maxWidth: 620, margin: '0 auto 2.5rem', lineHeight: 1.6,
            opacity: 0, animation: 'wordReveal 0.8s var(--lp-ease) 1.6s forwards',
          }}>
            Turn that silence into a Scalable Word-of-Mouth engine: Making your <span style={{ color: 'var(--lp-accent)', fontWeight: 700 }}>USERS</span> your <span style={{ color: '#E879F9', fontWeight: 700 }}>#1 MARKETERS</span>.
          </p>

          {/* CTA */}
          <div style={{ opacity: 0, animation: 'wordReveal 0.6s var(--lp-ease) 2s forwards' }}>
            <Link to="/auth/signup" className="lp-cta">
              Start Your WOW Engine →
            </Link>
          </div>
        </div>

        {/* Floating Dashboard Preview */}
        <div className="lp-dashboard-float lp-glass" style={{
          marginTop: '4rem', padding: '1.5rem', maxWidth: 520, width: '100%',
          position: 'relative', zIndex: 5,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--lp-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Mentions Generated</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--lp-accent)' }}>2,847</p>
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--lp-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Eyeballs</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#E879F9' }}>124K</p>
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--lp-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Authenticity Score</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34D399' }}>84</p>
            </div>
          </div>
          {/* Mini chart bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
            {[35, 55, 42, 68, 52, 78, 62, 85, 70, 90, 75, 95].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${h}%`, borderRadius: 3,
                background: `linear-gradient(180deg, var(--lp-accent), rgba(167,139,250,0.3))`,
                opacity: 0, animation: `wordReveal 0.4s var(--lp-ease) ${1.8 + i * 0.05}s forwards`,
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 1: THE FUTURE OF GROWTH ═══ */}
      <section className="lp-conversations" ref={conversations.ref}>
        <div className="lp-noise" style={{ opacity: 0.015 }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <div className={`lp-anim ${conversations.visible ? 'visible' : ''}`}>
            <h2 className="lp-section-headline">
              The future of growth is <span style={{ color: 'var(--lp-accent)' }}>NOT</span> ads.<br />
              It's <span className="lp-gradient-text">conversations</span>.
            </h2>
          </div>

          {/* Stats Grid */}
          <div className="lp-stats-grid" style={{ marginTop: '3rem' }}>
            {/* Stat 1 */}
            <div className={`lp-stat-card lp-glass lp-anim ${conversations.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.15s' }}>
              <div className="lp-stat-number"><AnimatedCounter end={92} suffix="%" /></div>
              <p className="lp-stat-label">of consumers <strong>trust recommendations</strong> over ads</p>
              <div className="lp-stat-bar">
                <div className="lp-stat-bar-fill" style={{ width: conversations.visible ? '92%' : '0%', background: 'linear-gradient(90deg, var(--lp-accent), #E879F9)' }} />
              </div>
            </div>

            {/* Stat 2 */}
            <div className={`lp-stat-card lp-glass lp-anim ${conversations.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
              <div className="lp-stat-number" style={{ fontSize: '2rem' }}>
                <AnimatedCounter end={61} suffix=".1%" /> & <AnimatedCounter end={97} suffix=".5%" />
              </div>
              <p className="lp-stat-label">
                LLM citations and product queries rely on <strong>Reddit & Yelp</strong>.
              </p>
              <div className="lp-stat-sources">
                <span className="lp-source-tag lp-source-reddit">Reddit</span>
                <span className="lp-source-tag lp-source-yelp">Yelp</span>
                <span style={{ color: 'var(--lp-muted)', fontSize: '0.72rem', margin: '0 0.3rem' }}>{'>'}</span>
                <span className="lp-source-tag lp-source-dim">Google</span>
                <span className="lp-source-tag lp-source-dim">YouTube</span>
                <span className="lp-source-tag lp-source-dim">Facebook</span>
                <span className="lp-source-tag" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700, fontSize: '0.72rem' }}>COMBINED</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--lp-accent)', fontWeight: 600, marginTop: '0.5rem' }}>
                AI is ranking conversations while you're still stuck with OUTDATED SEO.
              </p>
            </div>

            {/* Stat 3 */}
            <div className={`lp-stat-card lp-glass lp-anim ${conversations.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.45s' }}>
              <div className="lp-stat-icon-row">
                <div className="lp-dominate-icon">👑</div>
              </div>
              <p className="lp-stat-label" style={{ fontSize: '1rem', fontWeight: 600 }}>
                Brands that <strong style={{ color: 'var(--lp-accent)' }}>dominate conversations</strong> → dominate <strong style={{ color: '#E879F9' }}>discovery</strong>
              </p>
            </div>
          </div>

          {/* Highlight Quote */}
          <div className={`lp-highlight-box lp-anim ${conversations.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.6s' }}>
            <div className="lp-highlight-glow" />
            <p className="lp-highlight-text">
              If people aren't talking about you… <br />
              <span className="lp-highlight-strong">you simply DON'T EXIST.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══ COMBINED: PAIN POINTS + PROBLEM ═══ */}
      <section className="lp-pain-problem" ref={painPoints.ref}>
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2, padding: '0 1rem' }}>
          <div className={`lp-anim ${painPoints.visible ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="lp-section-headline">
              Built a Great Product but <span style={{ color: '#EF4444' }}>Still No Growth?</span>
            </h2>
          </div>

          {/* Side by side: Pain Points LEFT, Problem RIGHT */}
          <div className="lp-combined-grid">
            {/* LEFT: Pain Points */}
            <div className="lp-pain-side">
              <div className="lp-pain-grid">
                {[
                  { icon: '❌', text: 'Customers love you but don\'t talk', subtext: 'Not because they don\'t want to\n→ because they get nothing in return', highlight: true },
                  { icon: '❌', text: 'Ads are expensive and ignored', subtext: 'Burning money on clicks that don\'t convert', highlight: false },
                  { icon: '❌', text: 'Influencers feel fake', subtext: 'Paid opinions from influencers who barely used your product → people can easily sense → low trust', highlight: false },
                  { icon: '❌', text: 'You can\'t track word-of-mouth & what the internet thinks about you', subtext: 'Flying blind with no visibility into organic conversations', highlight: false },
                ].map((item, i) => (
                  <div key={i} className={`lp-pain-card lp-glass lp-anim ${painPoints.visible ? 'visible' : ''} ${item.highlight ? 'lp-pain-featured' : ''}`}
                    style={{ transitionDelay: `${0.15 + i * 0.1}s` }}>
                    <div className="lp-pain-icon">{item.icon}</div>
                    <div>
                      <p className="lp-pain-title">{item.text}</p>
                      {item.highlight ? (
                        <p className="lp-pain-sub">
                          Not because they don't want to<br />
                          <span className="lp-pain-arrow">→</span> <strong style={{ color: 'var(--lp-accent)' }}>because they get nothing in return</strong>
                        </p>
                      ) : (
                        <p className="lp-pain-sub">{item.subtext}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: The Problem / Solution */}
            <div className={`lp-problem-side lp-anim ${painPoints.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
              <h3 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.15 }}>
                What if you could <span className="lp-gradient-text">unlock that silent 95%?</span>
              </h3>

              <p className="lp-problem-question">What if your users didn't just use your product...</p>
              <div className="lp-problem-points">
                <p><span className="lp-pain-arrow">→</span> but actively <strong>talked about it</strong></p>
                <p><span className="lp-pain-arrow">→</span> <strong>recommended</strong> it</p>
                <p><span className="lp-pain-arrow">→</span> drove <strong>new customers</strong> & <strong>massive brand visibility</strong> to you</p>
              </div>
              <div className="lp-problem-method">
                <p style={{ color: 'var(--lp-muted)', fontSize: '1.1rem' }}>Not randomly.</p>
                <p style={{ color: 'var(--lp-accent)', fontSize: '1.5rem', fontWeight: 700 }}>Systematically.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Before / After Mock Demos (full width below both) */}
        <div className="lp-before-after" ref={beforeAfter.ref}>
          {/* BEFORE */}
          <div className={`lp-ba-panel lp-ba-before lp-anim ${beforeAfter.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
            <div className="lp-ba-label lp-ba-label-before">BEFORE</div>
            <div className="lp-ba-mock">
              {/* Empty website reviews */}
              <div className="lp-mock-site">
                <div className="lp-mock-topbar">
                  <div className="lp-mock-dots"><span /><span /><span /></div>
                  <div className="lp-mock-url">yourproduct.com/reviews</div>
                </div>
                <div className="lp-mock-content">
                  <p className="lp-mock-heading">Customer Reviews</p>
                  <div className="lp-mock-stars-row">
                    <span>★★★★★</span>
                    <span className="lp-mock-dim">0 reviews</span>
                  </div>
                  <div className="lp-mock-empty">
                    <div className="lp-mock-empty-icon">📭</div>
                    <p>No reviews yet</p>
                    <p className="lp-mock-dim-small">Be the first to share your experience</p>
                  </div>
                </div>
              </div>

              {/* Empty Reddit */}
              <div className="lp-mock-reddit">
                <div className="lp-mock-topbar lp-mock-topbar-reddit">
                  <div className="lp-mock-dots"><span /><span /><span /></div>
                  <div className="lp-mock-url">reddit.com / Search: "YourBrand"</div>
                </div>
                <div className="lp-mock-content">
                  <div className="lp-mock-empty" style={{ padding: '1rem' }}>
                    <p style={{ color: '#6B7280', fontSize: '0.8rem' }}>No results found for "YourBrand"</p>
                    <p className="lp-mock-dim-small">🦗 crickets...</p>
                  </div>
                </div>
              </div>

              {/* No social mentions */}
              <div className="lp-mock-social-empty">
                <div className="lp-mock-social-item">
                  <span className="lp-mock-social-icon">𝕏</span>
                  <span className="lp-mock-dim">0 mentions</span>
                </div>
                <div className="lp-mock-social-item">
                  <span className="lp-mock-social-icon" style={{ color: '#E17055' }}>r/</span>
                  <span className="lp-mock-dim">0 posts</span>
                </div>
                <div className="lp-mock-social-item">
                  <span className="lp-mock-social-icon" style={{ color: '#0A66C2' }}>in</span>
                  <span className="lp-mock-dim">0 discussions</span>
                </div>
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div className={`lp-ba-panel lp-ba-after lp-anim ${beforeAfter.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.5s' }}>
            <div className="lp-ba-label lp-ba-label-after">AFTER</div>
            <div className="lp-ba-mock">
              {/* Filled website reviews */}
              <div className="lp-mock-site lp-mock-site-active">
                <div className="lp-mock-topbar">
                  <div className="lp-mock-dots"><span /><span /><span /></div>
                  <div className="lp-mock-url">yourproduct.com/reviews</div>
                </div>
                <div className="lp-mock-content">
                  <p className="lp-mock-heading">Customer Reviews</p>
                  <div className="lp-mock-stars-row">
                    <span style={{ color: '#FBBF24' }}>★★★★★</span>
                    <span style={{ color: '#34D399', fontWeight: 600 }}>1,247 reviews</span>
                  </div>
                  {/* Review items */}
                  <div className="lp-mock-review">
                    <div className="lp-mock-review-header">
                      <span className="lp-mock-avatar" style={{ background: '#A78BFA' }}>S</span>
                      <span className="lp-mock-reviewer">Sarah K.</span>
                      <span style={{ color: '#FBBF24', fontSize: '0.65rem' }}>★★★★★</span>
                    </div>
                    <p className="lp-mock-review-text">"Game-changer for our workflow! Saved us 20+ hours per week."</p>
                  </div>
                  {/* Video Review with loading graphic */}
                  <div className="lp-mock-review lp-mock-review-video" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px', height: '56px', borderRadius: '4px',
                      background: 'linear-gradient(135deg, rgba(232,121,249,0.2), rgba(167,139,250,0.2))',
                      border: '1px solid rgba(232,121,249,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '0', height: '0',
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderLeft: '8px solid var(--lp-accent)'
                      }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="lp-mock-review-header" style={{ marginBottom: '0.2rem' }}>
                        <span className="lp-mock-avatar" style={{ background: '#E879F9', width: '20px', height: '20px', fontSize: '0.6rem' }}>M</span>
                        <span className="lp-mock-reviewer">Mike R.</span>
                        <span className="lp-mock-video-badge" style={{ fontSize: '0.6rem' }}>🎥 Video Review</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', width: '60%', marginBottom: '4px' }} />
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', width: '40%' }} />
                    </div>
                  </div>
                  <div className="lp-mock-review">
                    <div className="lp-mock-review-header">
                      <span className="lp-mock-avatar" style={{ background: '#34D399' }}>A</span>
                      <span className="lp-mock-reviewer">Alex T.</span>
                      <span style={{ color: '#FBBF24', fontSize: '0.65rem' }}>★★★★★</span>
                    </div>
                    <p className="lp-mock-review-text">"Best investment for our startup this year."</p>
                  </div>
                </div>
              </div>

              {/* Buzzing Reddit */}
              <div className="lp-mock-reddit lp-mock-reddit-active">
                <div className="lp-mock-topbar lp-mock-topbar-reddit">
                  <div className="lp-mock-dots"><span /><span /><span /></div>
                  <div className="lp-mock-url">reddit.com / "YourBrand" 🔥 Trending</div>
                </div>
                <div className="lp-mock-content" style={{ padding: '0.5rem' }}>
                  <div className="lp-mock-reddit-post">
                    <div className="lp-mock-reddit-votes">
                      <span style={{ color: '#E17055', fontWeight: 700 }}>▲</span>
                      <span style={{ fontWeight: 700, fontSize: '0.7rem' }}>847</span>
                    </div>
                    <div>
                      <p className="lp-mock-reddit-title">YourBrand just saved my startup $10k/month</p>
                      <p className="lp-mock-dim-small">r/startups · 234 comments</p>
                    </div>
                  </div>
                  <div className="lp-mock-reddit-post">
                    <div className="lp-mock-reddit-votes">
                      <span style={{ color: '#E17055', fontWeight: 700 }}>▲</span>
                      <span style={{ fontWeight: 700, fontSize: '0.7rem' }}>512</span>
                    </div>
                    <div>
                      <p className="lp-mock-reddit-title">Honest review after 6 months with YourBrand</p>
                      <p className="lp-mock-dim-small">r/SaaS · 178 comments</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social buzz */}
              <div className="lp-mock-social-buzz">
                <div className="lp-mock-buzz-item">
                  <span className="lp-mock-social-icon">𝕏</span>
                  <span style={{ color: '#34D399', fontWeight: 700, fontSize: '0.8rem' }}>2.4K mentions</span>
                  <span className="lp-mock-trend-up">↗ 340%</span>
                </div>
                <div className="lp-mock-buzz-item">
                  <span className="lp-mock-social-icon" style={{ color: '#E17055' }}>r/</span>
                  <span style={{ color: '#34D399', fontWeight: 700, fontSize: '0.8rem' }}>89 threads</span>
                  <span className="lp-mock-trend-up">↗ 520%</span>
                </div>
                <div className="lp-mock-buzz-item">
                  <span className="lp-mock-social-icon" style={{ color: '#0A66C2' }}>in</span>
                  <span style={{ color: '#34D399', fontWeight: 700, fontSize: '0.8rem' }}>156 posts</span>
                  <span className="lp-mock-trend-up">↗ 280%</span>
                </div>
                <div className="lp-buzz-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: HOW IT WORKS ═══ */}
      <section className="lp-steps" ref={stepsRef}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="lp-anim visible" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="lp-section-headline">
              Word of Wow: How It <span style={{ color: 'var(--lp-accent)' }}>Works</span>?
            </h2>
          </div>

          {/* Top row: Steps 1-2 left, animated flow right */}
          <div className="lp-hiw-layout">
            {/* Left: Steps 1-2 */}
            <div className="lp-hiw-steps">
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div className="lp-progress-line" style={{ minHeight: 240 }}>
                  <div className="lp-progress-fill" style={{ height: `${Math.min(((activeStep + 1) / 2) * 100, 100)}%` }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {[
                    { icon: '💬', title: 'Users post about your brand', desc: 'On Reddit, LinkedIn, Instagram, or review sites — wherever they already hang out.', step: 0 },
                    { icon: '✓', title: 'AI scores & you approve', desc: 'Our AI evaluates content quality, authenticity, and relevance. You choose: auto-approve, manual review, or let our team handle it.', step: 1 },
                  ].map((s) => (
                    <div key={s.step} data-step={s.step}
                      className={`lp-step-item lp-glass ${activeStep >= s.step ? 'active' : ''}`}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div className="lp-step-icon">{s.icon}</div>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>{s.title}</h3>
                          <p style={{ color: 'var(--lp-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{s.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Animated Flow */}
            <div className="lp-hiw-image-container lp-glass">
              <div className="lp-hiw-image-placeholder">
                <div className="lp-hiw-image-label">How Word of Wow Works</div>
                <div className="lp-hiw-visual">
                  <div className="lp-hiw-flow">
                    <div className="lp-hiw-node lp-hiw-node-1"><span>👤</span><span className="lp-hiw-node-text">User Posts</span></div>
                    <div className="lp-hiw-arrow">→</div>
                    <div className="lp-hiw-node lp-hiw-node-2"><span>🤖</span><span className="lp-hiw-node-text">AI Scores</span></div>
                    <div className="lp-hiw-arrow">→</div>
                    <div className="lp-hiw-node lp-hiw-node-3"><span>🎁</span><span className="lp-hiw-node-text">Rewards</span></div>
                    <div className="lp-hiw-arrow">→</div>
                    <div className="lp-hiw-node lp-hiw-node-4"><span>🚀</span><span className="lp-hiw-node-text">10x Growth</span></div>
                  </div>
                  <div className="lp-hiw-orbit">
                    <div className="lp-hiw-orbit-dot" style={{ animationDelay: '0s' }} />
                    <div className="lp-hiw-orbit-dot" style={{ animationDelay: '1.5s' }} />
                    <div className="lp-hiw-orbit-dot" style={{ animationDelay: '3s' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row: Steps 3-4 left, Embed image right */}
          <div className="lp-hiw-layout" style={{ marginTop: '2rem' }}>
            <div className="lp-hiw-steps">
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div className="lp-progress-line" style={{ minHeight: 200 }}>
                  <div className="lp-progress-fill" style={{ height: `${Math.max(0, Math.min(((activeStep - 1) / 2) * 100, 100))}%` }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {[
                    { icon: '💰', title: 'They earn rewards', desc: 'Top-scoring advocates get exclusive discount coupons. Higher quality = bigger rewards.', step: 2 },
                    { icon: '🚀', title: 'Your brand gets 10x visibility', desc: 'Every authentic post compounds — more conversations, more trust, more organic discovery. Your brand dominates search results, AI recommendations, and social feeds.', step: 3 },
                  ].map((s) => (
                    <div key={s.step} data-step={s.step}
                      className={`lp-step-item lp-glass ${activeStep >= s.step ? 'active' : ''}`}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div className="lp-step-icon">{s.icon}</div>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>{s.title}</h3>
                          <p style={{ color: 'var(--lp-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{s.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Share & Embed Image */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src="/word_of_wow_share_embed.png"
                alt="Word of Wow Share & Embed Widget"
                loading="lazy"
                width={500}
                height={400}
                style={{ maxWidth: '100%', display: 'block', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: BRAND MENTIONS TRACKER ═══ */}
      <section className="lp-mentions" ref={brandMentions.ref}>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="lp-mentions-layout">
            {/* Left: Content */}
            <div className={`lp-mentions-content lp-anim ${brandMentions.visible ? 'visible' : ''}`}>
              <h2 className="lp-section-headline" style={{ textAlign: 'left', fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)' }}>
                See Everything That People Are Already Saying About Your Brand
              </h2>

              <div className="lp-mentions-features">
                <div className="lp-mention-feature">
                  <div className="lp-mention-feature-icon">🔍</div>
                  <div>
                    <p className="lp-mention-feature-title">Track Organic Brand Mentions Everywhere</p>
                    <p className="lp-mention-feature-desc">Reddit, Twitter, LinkedIn, review sites - we find every conversation about you.</p>
                  </div>
                </div>
                <div className="lp-mention-feature">
                  <div className="lp-mention-feature-icon">📊</div>
                  <div>
                    <p className="lp-mention-feature-title">Sentiment Analysis</p>
                    <p className="lp-mention-feature-desc">Understand how people really feel about your brand. Positive, negative, neutral - at a glance.</p>
                  </div>
                </div>
                <div className="lp-mention-feature">
                  <div className="lp-mention-feature-icon">🏹</div>
                  <div>
                    <p className="lp-mention-feature-title">Monitor Competitors</p>
                    <p className="lp-mention-feature-desc">See how your brand stacks up against competitors in real conversations.</p>
                  </div>
                </div>
                <div className="lp-mention-feature">
                  <div className="lp-mention-feature-icon">💎</div>
                  <div>
                    <p className="lp-mention-feature-title">Discover Hidden Conversations</p>
                    <p className="lp-mention-feature-desc">Find mentions you never knew existed - in forums, threads, and niche communities.</p>
                  </div>
                </div>
              </div>

              {/* WOW Insights has been moved out of here */}
            </div>

            {/* Right: Futuristic Image Slider */}
            <div className={`lp-mentions-visual lp-anim ${brandMentions.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.2s' }}>
              <div className="lp-slider-container">
                {/* Slides */}
                <div className="lp-slider-viewport">
                  {SLIDES.map((slide, i) => (
                    <div
                      key={i}
                      className={`lp-slider-slide ${i === currentSlide ? 'lp-slide-active' : ''}`}
                      style={{
                        opacity: i === currentSlide ? 1 : 0,
                        transform: i === currentSlide ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(12px)',
                        transition: 'all 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                        zIndex: i === currentSlide ? 2 : 1,
                      }}
                    >
                      <img
                        src={slide.src}
                        alt={slide.label}
                        loading="lazy"
                        width={800}
                        height={500}
                        style={{
                          borderRadius: 12,
                          boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
                          border: '1px solid rgba(167,139,250,0.12)',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Label */}
                <div className="lp-slider-label">
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                    borderRadius: 999, padding: '6px 16px', fontSize: '0.78rem', fontWeight: 600,
                    color: '#A78BFA', letterSpacing: '0.02em',
                  }}>
                    {SLIDES[currentSlide].label}
                  </span>
                </div>

                {/* Dot navigation */}
                <div className="lp-slider-dots">
                  {SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      style={{
                        width: i === currentSlide ? 24 : 8,
                        height: 8, borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: i === currentSlide
                          ? 'linear-gradient(90deg, #A78BFA, #6C5CE7)'
                          : 'rgba(255,255,255,0.15)',
                        transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BELOW SLIDER: WOW Insights Highlight */}
          <div className={`lp-wow-insights lp-anim ${brandMentions.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s', maxWidth: 900, margin: '2.5rem auto 0', textAlign: 'center' }}>
            <div className="lp-wow-insights-header" style={{ display: 'flex', justifyContent: 'center' }}>
              <span className="lp-wow-badge">✨ WOW Insights</span>
            </div>
            <p className="lp-wow-insights-text" style={{ margin: '0 auto 1.5rem', maxWidth: 700 }}>
              Understand your brand's <strong style={{ color: '#A78BFA' }}>perception</strong> in the market. See what customers are <strong style={{ color: '#34D399' }}>loving</strong>, what they're <strong style={{ color: '#EF4444' }}>complaining about</strong>, and how your brand sentiment shifts over time - powered by AI analysis across millions of data points.
            </p>
            <div className="lp-wow-insights-tags" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="lp-insight-tag lp-insight-positive">🟢 "Great UI"</span>
              <span className="lp-insight-tag lp-insight-positive">🟢 "Fast support"</span>
              <span className="lp-insight-tag lp-insight-positive">🟢 "Worth the price"</span>
              <span className="lp-insight-tag lp-insight-negative">🔴 "Slow onboarding"</span>
              <span className="lp-insight-tag lp-insight-negative">🔴 "Needs mobile app"</span>
            </div>
          </div>

        </div>
      </section>

      {/* ═══ SECTION: COMPARISON ═══ */}
      <section className="lp-compare" ref={comparison.ref}>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className={`lp-anim ${comparison.visible ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="lp-section-headline">
              Why <span className="lp-gradient-text">Word of Wow</span> Wins
            </h2>
            <p style={{ color: 'var(--lp-text-secondary)', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto' }}>
              Not all marketing is created equal.
            </p>
          </div>

          <div className="lp-compare-grid">
            {/* Ads */}
            <div className={`lp-compare-card lp-compare-ads lp-glass lp-anim ${comparison.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.15s' }}>
              <div className="lp-compare-header lp-compare-header-ads">
                <span className="lp-compare-emoji">📢</span>
                <h3>Ads</h3>
              </div>
              <div className="lp-compare-body">
                <p className="lp-compare-desc">Interrupt people → get ignored</p>
                <div className="lp-compare-tags">
                  <span className="lp-compare-tag lp-tag-bad">❌ Short-term</span>
                  <span className="lp-compare-tag lp-tag-bad">❌ Expensive</span>
                  <span className="lp-compare-tag lp-tag-bad">❌ Declining ROI</span>
                  <span className="lp-compare-tag lp-tag-bad">❌ Ad blindness</span>
                </div>
                <div className="lp-compare-verdict lp-verdict-bad">
                  <div className="lp-compare-meter">
                    <div className="lp-meter-fill" style={{ width: comparison.visible ? '25%' : '0%', background: '#EF4444' }} />
                  </div>
                  <span>Low Impact</span>
                </div>
              </div>
            </div>

            {/* Influencers */}
            <div className={`lp-compare-card lp-compare-influencers lp-glass lp-anim ${comparison.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
              <div className="lp-compare-header lp-compare-header-influencers">
                <span className="lp-compare-emoji">🎭</span>
                <h3>Influencers</h3>
              </div>
              <div className="lp-compare-body">
                <p className="lp-compare-desc">Paid opinions people can easily sense → low trust</p>
                <div className="lp-compare-tags">
                  <span className="lp-compare-tag lp-tag-bad">❌ High cost</span>
                  <span className="lp-compare-tag lp-tag-bad">❌ Temporary effects</span>
                  <span className="lp-compare-tag lp-tag-bad">❌ Feels inauthentic</span>
                  <span className="lp-compare-tag lp-tag-bad">❌ No compounding</span>
                </div>
                <div className="lp-compare-verdict lp-verdict-bad">
                  <div className="lp-compare-meter">
                    <div className="lp-meter-fill" style={{ width: comparison.visible ? '40%' : '0%', background: '#F59E0B' }} />
                  </div>
                  <span>Medium Impact</span>
                </div>
              </div>
            </div>

            {/* Word of Wow */}
            <div className={`lp-compare-card lp-compare-wow lp-glass lp-anim ${comparison.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.45s' }}>
              <div className="lp-compare-crown">👑 RECOMMENDED</div>
              <div className="lp-compare-header lp-compare-header-wow">
                <span className="lp-compare-emoji">⚡</span>
                <h3>Word of Wow</h3>
              </div>
              <div className="lp-compare-body">
                <p className="lp-compare-desc" style={{ color: 'var(--lp-text)' }}>Real conversations, real trust, real results</p>
                <div className="lp-compare-tags">
                  <span className="lp-compare-tag lp-tag-good">✅ Real people</span>
                  <span className="lp-compare-tag lp-tag-good">✅ Real conversations</span>
                  <span className="lp-compare-tag lp-tag-good">✅ Real trust</span>
                  <span className="lp-compare-tag lp-tag-good">✅ Compounding results</span>
                </div>
                <div className="lp-compare-verdict lp-verdict-good">
                  <div className="lp-compare-meter">
                    <div className="lp-meter-fill lp-meter-wow" style={{ width: comparison.visible ? '95%' : '0%' }} />
                  </div>
                  <span>Maximum Impact</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: BUILT FOR ═══ */}
      <section className="lp-built-for" ref={builtFor.ref}>
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className={`lp-anim ${builtFor.visible ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="lp-section-headline">
              Built <span style={{ color: 'var(--lp-accent)' }}>For</span>
            </h2>
          </div>

          <div className="lp-built-grid">
            <div className={`lp-built-card lp-glass lp-anim ${builtFor.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.15s' }}>
              <div className="lp-built-icon">🚀</div>
              <h3 className="lp-built-title">Founders Who Want Organic Dominance</h3>
              <p className="lp-built-desc">Build a growth engine that runs on genuine customer love, not ad spend.</p>
            </div>
            <div className={`lp-built-card lp-glass lp-anim ${builtFor.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
              <div className="lp-built-icon">🔥</div>
              <h3 className="lp-built-title">Brands Tired of Burning Money on Ads</h3>
              <p className="lp-built-desc">Stop watching your CAC skyrocket. Start investing in sustainable, authentic growth.</p>
            </div>
            <div className={`lp-built-card lp-glass lp-anim ${builtFor.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.45s' }}>
              <div className="lp-built-icon">🤖</div>
              <h3 className="lp-built-title">Brands Ready for the AI Era</h3>
              <p className="lp-built-desc">Don't fall behind — improve your AI SEO and ensure LLMs recommend you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: FINAL CTA ═══ */}
      <section className="lp-final-cta" ref={finalCta.ref}>
        {/* Ripple effects */}
        <div className="lp-ripple" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', animationDelay: '0s' }} />
        <div className="lp-ripple" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', animationDelay: '1s' }} />
        <div className="lp-ripple" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', animationDelay: '2s' }} />

        <div style={{ position: 'relative', zIndex: 5 }}>
          <div className={`lp-anim ${finalCta.visible ? 'visible' : ''}`}>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.15 }}>
              You don't need more <span className="lp-shake">ads</span>.<br />
              <span style={{ color: 'var(--lp-text-secondary)', fontSize: '0.85em' }}>You need more people <span className="lp-gradient-text">talking about you</span>.</span>
            </h2>
          </div>

          <div className={`lp-final-cta-buttons lp-anim ${finalCta.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
            <Link to="/auth/signup" className="lp-cta-big">
              → Start Your WOW Engine
            </Link>
            <a href="mailto:hello@wordofwow.com" className="lp-cta-secondary">
              → Book a Demo
            </a>
          </div>

          <div className={`lp-anim ${finalCta.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.5s' }}>
            <p className="lp-micro-copy">
              No spam. No fake growth. Just real momentum.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FAQ SECTION ═══ */}
      <section className="lp-faq" ref={faqSection.ref}>
        <div style={{ maxWidth: 850, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className={`lp-anim ${faqSection.visible ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="lp-section-headline">
              Frequently Asked <span style={{ color: 'var(--lp-accent)' }}>Questions</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { q: 'What is Word of WOW?', a: 'Word of WOW is a B2B SaaS platform that helps brands turn real customers and advocates into powerful marketing channels by rewarding authentic word-of-mouth content on platforms like Reddit, LinkedIn, Review sites, etc.' },
              { q: 'How does Word of WOW work?', a: 'Word of WOW connects brands with their customers and advocates through a structured system:\n\n• Brands set campaigns and reward rules\n• Users share genuine experiences via posts or comments\n• Content is reviewed and approved\n• Rewards are distributed based on the performance, authenticity and engagement\n\nThis ensures authenticity while driving measurable brand visibility.' },
              { q: 'Who can use Word of WOW?', a: 'Word of WOW is designed for:\n\n• Brands & startups looking to increase organic reach\n• Marketers aiming to leverage authentic user-generated content\n• Professionals & creators who want to monetize their voice and influence' },
              { q: 'Is Word of WOW an influencer marketing platform?', a: 'Not exactly. Unlike traditional influencer platforms, Word of WOW focuses on everyday advocates and people who have actually been using your product, not just random influencers. It enables micro-advocacy at scale, authentic peer-to-peer recommendations, and performance-based rewards instead of fixed sponsorships.' },
              { q: 'How do users earn rewards on Word of WOW?', a: 'Users earn rewards by sharing genuine experiences about a brand, writing posts or engaging in meaningful comments on the supported platforms, and following campaign guidelines.\n\nRewards can include discounts, exclusive perks, and cash (coming soon).' },
              { q: 'What makes Word of WOW different from affiliate marketing?', a: 'Word of WOW is trust-first, not just transaction-driven.\n\n• WOW rewards authenticity — affiliates reward sales\n• WOW focuses on conversations — affiliates focus on conversions\n• WOW uses manual/quality approval — affiliates use mostly automated links\n• WOW is community-driven — affiliate is individual-driven' },
              { q: 'Is the content on Word of WOW authentic?', a: 'Yes. Authenticity is at the core of Word of WOW.\n\n• Content is manually or rule-based reviewed\n• Spam and forced promotion are discouraged\n• Users are rewarded for genuine opinions, not scripted promotions' },
              { q: 'Which platforms does Word of WOW support?', a: 'Currently, Word of WOW focuses on Reddit, LinkedIn, Instagram, and Reviews/Ratings on the brand\'s own site. Future expansions may include other social platforms based on demand.' },
              { q: 'Is Word of WOW suitable for early-stage startups?', a: 'Yes, especially for startups. It helps build trust quickly, generate organic buzz, and acquire early adopters through real voices instead of ads.' },
              { q: 'How is Word of WOW different from paid ads?', a: 'Word of WOW focuses on earned trust, while ads focus on paid visibility.\n\n• Ads → Scalable but less trusted and results are temporary\n• Word of WOW → Slower but highly credible with compounded results\n\nThis makes it ideal for long-term brand building.' },
              { q: 'Can brands control what users say?', a: 'No — but that\'s the strength. Brands can set guidelines and approve content, but users are encouraged to share honest experiences, which builds credibility and trust.' },
              { q: 'How do payouts work on Word of WOW?', a: 'Payouts are based on predefined rules (engagement, quality, actions), approved before distribution, and processed via secure payment systems.' },
              { q: 'Why is word-of-mouth marketing so powerful?', a: 'Word-of-mouth works because people trust people more than ads, recommendations feel natural and unbiased, and social proof drives decisions faster. Word of WOW amplifies this effect at scale.' },
              { q: 'Is Word of WOW safe and compliant?', a: 'Yes. The platform is designed to encourage transparent disclosures, prevent spam or misleading content, and maintain ethical marketing standards.' },
            ].map((faq, i) => (
              <div
                key={i}
                className={`lp-faq-item lp-glass lp-anim ${faqSection.visible ? 'visible' : ''}`}
                style={{ transitionDelay: `${0.05 + i * 0.03}s` }}
              >
                <button
                  className="lp-faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'none', border: 'none', padding: '1.1rem 1.25rem', cursor: 'pointer',
                    color: 'var(--lp-text)', fontSize: '1rem', fontWeight: 600, textAlign: 'left',
                    fontFamily: 'inherit', gap: '1rem', lineHeight: 1.4,
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{
                    fontSize: '1.3rem', color: 'var(--lp-accent)', flexShrink: 0,
                    transition: 'transform 0.3s ease',
                    transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}>+</span>
                </button>
                <div style={{
                  maxHeight: openFaq === i ? '600px' : '0px',
                  overflow: 'hidden',
                  transition: 'max-height 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                }}>
                  <div style={{
                    padding: '0 1.25rem 1.1rem',
                    color: 'var(--lp-text-secondary)', fontSize: '0.9rem', lineHeight: 1.7,
                    whiteSpace: 'pre-line',
                  }}>
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        © {new Date().getFullYear()} Word of Wow. Authenticity is the ultimate growth hack.
      </footer>

      {/* ═══ STICKY BAR ═══ */}
      <div className={`lp-sticky-bar ${showSticky ? 'lp-sticky-visible' : ''}`}>
        <p className="lp-sticky-text">
          95% of your customers are silent. <strong>Activate them NOW.</strong>
        </p>
        <Link to="/auth/signup" className="lp-sticky-cta">
          Start Now →
        </Link>
      </div>
    </div>
  );
}
