/* ═══════════════════════════════════════════════════════════
   KAMGAR CONNECT — Main JavaScript
   Drag-to-scrub video slider, animations, nav, smooth scroll
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initVideoScrubber('vid-chowk', 'track-chowk', 'progress-chowk', 'thumb-chowk', 'badge-before-chowk', 'badge-after-chowk');
  initVideoScrubber('vid-home', 'track-home', 'progress-home', 'thumb-home', 'badge-before-home', 'badge-after-home');
  initNavbar();
  initHamburger();
  initSmoothScroll();
  initHeroParallax();
  init3DTilt();
  initButtonRipple();
  initScrollUI();
  
  // Cinematic Igloo.inc style GSAP Initializations
  if (typeof gsap !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    initSplashAndHeroGSAP();
    initCustomCursor();
    initMagneticButtons();
    initGSAPScroll();
    initGSAPCounters();
    initPageTransitions();
  } else {
    // Fallback if GSAP is blocked by client
    initRevealAnimations();
    initCounters();
  }
  
  if (document.getElementById('worker-list')) {
    initTopWorkers();
  }
});

/* ═══════════════════════════════════════════
   DRAG-TO-SCRUB VIDEO SLIDER
   The user drags the thumb to scrub through
   the video at their own pace.
   ═══════════════════════════════════════════ */
function initVideoScrubber(videoId, trackId, fillId, thumbId, badgeBeforeId, badgeAfterId) {
  const video = document.getElementById(videoId);
  const track = document.getElementById(trackId);
  const fill  = document.getElementById(fillId);
  const thumb = document.getElementById(thumbId);
  const labelBefore = document.getElementById(badgeBeforeId);
  const labelAfter  = document.getElementById(badgeAfterId);

  let isDragging = false;
  let videoReady = false;

  // Set SRC from remote bucket if configs exist
  if (videoId === 'vid-chowk' && typeof CONFIG !== 'undefined' && CONFIG.CHOWK_VIDEO) {
    video.src = CONFIG.CHOWK_VIDEO;
  }
  if (videoId === 'vid-home' && typeof CONFIG !== 'undefined' && CONFIG.HOME_VIDEO) {
    video.src = CONFIG.HOME_VIDEO;
  }

  // Pause video — user controls via scrubbing
  video.pause();

  // When video metadata is loaded, set to start
  video.addEventListener('loadedmetadata', () => {
    videoReady = true;
    video.currentTime = 0;
    updateVisuals(0);
  });

  // Also handle if already loaded
  if (video.readyState >= 1) {
    videoReady = true;
    video.currentTime = 0;
    updateVisuals(0);
  }

  // ── Pointer events for drag ──
  function onPointerDown(e) {
    isDragging = true;
    thumb.classList.add('dragging');
    document.body.style.userSelect = 'none';
    video.play().catch(() => {}); // Play while dragging
    scrubTo(e);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    video.play().catch(() => {}); // Ensure continuous play while moving
    scrubTo(e);
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    thumb.classList.remove('dragging');
    document.body.style.userSelect = '';
    video.pause();
  }

  // Track click
  track.addEventListener('pointerdown', onPointerDown);
  thumb.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    onPointerDown(e);
  });

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);

  // Touch events for mobile
  track.addEventListener('touchstart', (e) => {
    isDragging = true;
    thumb.classList.add('dragging');
    scrubToTouch(e);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    scrubToTouch(e);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    thumb.classList.remove('dragging');
    video.pause();
  });

  // Keyboard support (arrow keys)
  thumb.addEventListener('keydown', (e) => {
    if (!videoReady || !video.duration) return;
    const step = video.duration * 0.02; // 2% per keypress
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + step);
      updateVisuals(video.currentTime / video.duration);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - step);
      updateVisuals(video.currentTime / video.duration);
    }
  });

  // ── Scrub to pointer position ──
  function scrubTo(e) {
    if (!videoReady || !video.duration) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));

    video.currentTime = pct * video.duration;
    video.play().catch(() => {});
    updateVisuals(pct);
  }

  // ── Scrub to touch position ──
  function scrubToTouch(e) {
    if (!videoReady || !video.duration || !e.touches.length) return;
    const rect = track.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));

    video.currentTime = pct * video.duration;
    video.play().catch(() => {});
    updateVisuals(pct);
  }

  // ── Update visuals ──
  function updateVisuals(pct) {
    const percent = pct * 100;
    fill.style.width = `${percent}%`;
    thumb.style.left = `${percent}%`;

    // Toggle before/after labels at midpoint
    if (labelBefore && labelAfter) {
      if (pct < 0.5) {
        labelBefore.classList.add('active');
        labelAfter.classList.remove('active');
      } else {
        labelBefore.classList.remove('active');
        labelAfter.classList.add('active');
      }
    }
  }
}

/* ═══════════════════════════════════════════
   NAVBAR — Scroll effect
   ═══════════════════════════════════════════ */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const check = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };

  window.addEventListener('scroll', check, { passive: true });
  check();
}

/* ═══════════════════════════════════════════
   HAMBURGER — Mobile menu toggle
   ═══════════════════════════════════════════ */
function initHamburger() {
  const burger = document.getElementById('hamburger');
  const links  = document.getElementById('nav-links');
  const ctas   = document.getElementById('nav-ctas');
  if (!burger || !links) return;

  burger.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    burger.classList.toggle('active');
    if (ctas) ctas.classList.toggle('open');
    document.body.style.overflow = isOpen ? 'hidden' : '';

    // Mobile GSAP Stagger effect for links
    if (isOpen && typeof gsap !== 'undefined') {
      const menuItems = links.querySelectorAll('a');
      gsap.fromTo(menuItems, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }
      );
      if (ctas) {
        gsap.fromTo(ctas.querySelectorAll('a'),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, delay: 0.3, ease: 'power2.out' }
        );
      }
    }
  });

  // Close on link click
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      burger.classList.remove('active');
      if (ctas) ctas.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ═══════════════════════════════════════════
   SMOOTH SCROLL
   ═══════════════════════════════════════════ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();

      const offset = document.querySelector('.navbar')?.offsetHeight || 64;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ═══════════════════════════════════════════
   SCROLL REVEAL — IntersectionObserver
   ═══════════════════════════════════════════ */
function initRevealAnimations() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
  );

  els.forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════
   3D TILT EFFECT
   ═══════════════════════════════════════════ */
function init3DTilt() {
  const cards = document.querySelectorAll('.cat-card, .story-card');
  cards.forEach(card => {
    // Add transition for smooth return
    card.style.transition = 'transform 0.1s, box-shadow 0.1s';
    
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.4s ease-out, box-shadow 0.4s ease-out';
      card.style.transform = '';
      setTimeout(() => {
        card.style.transition = 'transform 0.1s, box-shadow 0.1s';
      }, 400);
    });
  });
}

/* ═══════════════════════════════════════════
   HERO PARALLAX & PARTICLES
   ═══════════════════════════════════════════ */
function initHeroParallax() {
  const hero = document.getElementById('hero');
  const bg = document.querySelector('.hero-bg-pattern');
  const glowL = document.querySelector('.hero-glow--left');
  const glowR = document.querySelector('.hero-glow--right');
  const ctaBtns = document.querySelector('.hero-cta-row');
  
  if (!hero) return;
  
  // Parallax Effect
  hero.addEventListener('mousemove', e => {
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 20;
    const y = (clientY / window.innerHeight - 0.5) * 20;
    
    if (bg) bg.style.transform = `translate(${x}px, ${y}px)`;
    if (glowL) glowL.style.transform = `translate(${x * 1.5}px, ${y * 1.5}px)`;
    if (glowR) glowR.style.transform = `translate(${-x * 1.5}px, ${-y * 1.5}px)`;
    if (ctaBtns) ctaBtns.style.transform = `translate(${-x * 0.5}px, ${-y * 0.5}px)`;
  });

  // Inject CSS Particles
  const particleContainer = document.createElement('div');
  particleContainer.className = 'particles-container';
  hero.insertBefore(particleContainer, hero.firstChild);

  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.width = Math.random() * 4 + 1 + 'px';
    p.style.height = p.style.width;
    p.style.left = Math.random() * 100 + 'vw';
    p.style.top = Math.random() * 100 + 'vh';
    p.style.animationDuration = Math.random() * 20 + 10 + 's';
    p.style.animationDelay = Math.random() * -20 + 's';
    particleContainer.appendChild(p);
  }
}

/* ═══════════════════════════════════════════
   ANIMATED COUNTERS
   ═══════════════════════════════════════════ */
function initCounters() {
  // Select .stat-number and also numbers with 3D flip class
  const counters = document.querySelectorAll('.stat-number');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible'); // Trigger flip reveal if applied
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));

  function animateCounter(el) {
    const targetText = el.getAttribute('data-count');
    if (!targetText) return;
    const target = parseInt(targetText, 10);
    if (isNaN(target)) return;
    
    const duration = 2000;
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;

    const easeOutQuad = t => t * (2 - t);
    
    const counterInterval = setInterval(() => {
      frame++;
      const progress = easeOutQuad(frame / totalFrames);
      const current = Math.round(target * progress);
      
      let suffix = '';
      if (target >= 1000) {
        if (target % 1000 === 0) {
          suffix = 'K+';
          el.innerText = (current / 1000).toFixed(1).replace('.0', '') + suffix;
        } else {
          el.innerText = current.toLocaleString('en-IN') + '+';
        }
      } else {
         el.innerText = current.toLocaleString('en-IN') + '+';
      }
      
      if (frame === totalFrames) {
        clearInterval(counterInterval);
        // Set final exact text
        if (targetText === '5000') el.innerText = '5K+';
        else if (targetText === '10000') el.innerText = '10,000+';
        else el.innerText = target.toLocaleString('en-IN') + '+';
      }
    }, frameRate);
  }
}

/* ═══════════════════════════════════════════
   BUTTON RIPPLE EFFECT
   ═══════════════════════════════════════════ */
function initButtonRipple() {
  const buttons = document.querySelectorAll('.btn, .nav-btn-fill, .nav-btn-outline');
  buttons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

/* ═══════════════════════════════════════════
   SCROLL PROGRESS & STICKY JOIN BAR
   ═══════════════════════════════════════════ */
function initScrollUI() {
  const progress = document.getElementById('scroll-progress');
  const stickyBar = document.getElementById('sticky-join-bar');
  const hero = document.getElementById('hero');
  
  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    
    // Progress Bar
    if (progress) {
      const scrollPercent = (scrollPos / docHeight) * 100;
      progress.style.width = scrollPercent + '%';
    }
    
    // Sticky Bar
    if (stickyBar && hero) {
      const heroHeight = hero.offsetHeight;
      if (scrollPos > heroHeight) {
        stickyBar.classList.add('visible');
      } else {
        stickyBar.classList.remove('visible');
      }
    }
  }, { passive: true });
}

/* ═══════════════════════════════════════════
   GSAP CUSTOM CURSOR
   ═══════════════════════════════════════════ */
function initCustomCursor() {
  const cursor = document.getElementById('custom-cursor');
  if (!cursor) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;

  // Track mouse
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Smooth follow via GSAP ticker
  gsap.ticker.add(() => {
    // Lerp (easing) factor 0.2
    cursorX += (mouseX - cursorX) * 0.2;
    cursorY += (mouseY - cursorY) * 0.2;
    gsap.set(cursor, { x: cursorX, y: cursorY });
  });

  // Hover states
  const hoverTargets = document.querySelectorAll('a, button, .btn, .nav-btn-fill, .nav-btn-outline, .vs-thumb');
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
  });
}

/* ═══════════════════════════════════════════
   MAGNETIC BUTTONS
   ═══════════════════════════════════════════ */
function initMagneticButtons() {
  const magnets = document.querySelectorAll('.btn, .nav-btn-fill, .nav-btn-outline');
  magnets.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(btn, {
        duration: 0.3,
        x: x * 0.3,
        y: y * 0.3,
        ease: 'power2.out'
      });
    });
    
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        duration: 0.7,
        x: 0,
        y: 0,
        ease: 'elastic.out(1, 0.3)'
      });
    });
  });
}

/* ═══════════════════════════════════════════
   SPLASH SCREEN & HERO GSAP
   ═══════════════════════════════════════════ */
function initSplashAndHeroGSAP() {
  const tl = gsap.timeline();
  
  // Setup Splash Logo
  gsap.set('.splash-logo', { opacity: 0, scale: 0.8 });
  
  // Custom manual Text Splitter for the Hero H1
  const h1 = document.querySelector('.hero-content h1');
  if (h1) {
    // We split lines initially to retain breaks, then split words
    const htmlObj = h1.innerHTML.split('<br>').map(line => {
      return line.split(' ').map(word => {
        if (!word.trim()) return word;
        return `<span class="word" style="display:inline-block; opacity:0;">${word}</span>`;
      }).join(' ');
    }).join('<br>');
    h1.innerHTML = htmlObj;
  }
  
  // Splash sequence
  const splash = document.getElementById('splash-screen');
  if (splash) {
    tl.to('.splash-logo', { 
      opacity: 1, scale: 1.1, duration: 0.6, ease: 'power3.out' 
    })
    .to('.splash-logo', {
      filter: 'blur(3px) drop-shadow(4px 0px 0px rgba(255,0,0,0.8)) drop-shadow(-4px 0px 0px rgba(0,0,255,0.8))',
      duration: 0.1, yoyo: true, repeat: 7, ease: "none"
    })
    .to('.splash-logo', {
      filter: 'blur(0px) drop-shadow(0px 0px 0px transparent)',
      duration: 0.2
    })
    .to('.splash-logo', {
      scale: 0.5, opacity: 0, duration: 0.3, ease: 'power2.in'
    })
    .to('#splash-screen', {
      opacity: 0, duration: 0.4, onComplete: () => {
        splash.style.display = 'none';
      }
    }, '-=0.1');
  }
  
  // Hero stagger reveal
  tl.to('.hero-content .word', {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    duration: 0.8,
    stagger: 0.05,
    ease: 'power3.out',
    startAt: { y: 20, filter: 'blur(10px)' }
  }, '-=0.2')
  .from('.hero-subtitle', { opacity: 0, y: 20, duration: 0.6 }, '-=0.4')
  .from('.hero-cta-row', { opacity: 0, y: 20, duration: 0.6 }, '-=0.4');
}

/* ═══════════════════════════════════════════
   GSAP SCROLL REVEALS
   ═══════════════════════════════════════════ */
function initGSAPScroll() {
  const reveals = gsap.utils.toArray('.reveal');
  reveals.forEach(rev => {
    gsap.set(rev, { visibility: 'visible', opacity: 0, y: 40 });
    
    ScrollTrigger.create({
      trigger: rev,
      start: 'top 85%',
      animation: gsap.to(rev, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out'
      }),
      toggleActions: 'play none none none'
    });
  });
}

/* ═══════════════════════════════════════════
   GSAP COUNTERS
   ═══════════════════════════════════════════ */
function initGSAPCounters() {
  const counters = document.querySelectorAll('.stat-number');
  
  counters.forEach(el => {
    const targetText = el.getAttribute('data-count');
    if (!targetText) return;
    const target = parseInt(targetText, 10);
    if (isNaN(target)) return;
    
    gsap.set(el, { visibility: 'visible' });

    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      onEnter: () => {
        el.classList.add('visible'); // Let CSS flip 3D happen
        
        let obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 2,
          ease: 'power2.out',
          onUpdate: () => {
            const current = Math.round(obj.val);
            if (target >= 1000) {
              if (target % 1000 === 0) {
                el.innerText = (current / 1000).toFixed(1).replace('.0', '') + 'K+';
              } else {
                el.innerText = current.toLocaleString('en-IN') + '+';
              }
            } else {
              el.innerText = current.toLocaleString('en-IN') + '+';
            }
          },
          onComplete: () => {
            if (targetText === '5000') el.innerText = '5K+';
            else if (targetText === '10000') el.innerText = '10,000+';
            else el.innerText = target.toLocaleString('en-IN') + '+';
          }
        });
      },
      once: true
    });
  });
}

/* ═══════════════════════════════════════════
   PAGE TRANSITIONS (WIPE)
   ═══════════════════════════════════════════ */
function initPageTransitions() {
  const links = document.querySelectorAll('a[href="/register-employer"], a[href="/register-worker"], a.btn-back');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      
      e.preventDefault();
      const href = link.getAttribute('href');
      
      const wipe = document.getElementById('page-wipe');
      if (!wipe) { window.location.href = href; return; }
      
      gsap.to(wipe, {
        height: '100%',
        duration: 0.5,
        ease: 'power3.inOut',
        onComplete: () => {
          window.location.href = href;
        }
      });
    });
  });
}

/* ═══════════════════════════════════════════
   AJAX AUTHENTICATION FORMS
   ═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const workerForm = document.getElementById('workerSignupForm');
  const employerForm = document.getElementById('employerSignupForm');

  if (workerForm) {
    workerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        name: workerForm.querySelector('input[placeholder="Full Name"]').value,
        phone: workerForm.querySelector('input[placeholder="Phone Number"]').value,
        city: workerForm.querySelector('#city').value,
        skill: workerForm.querySelector('#skill').value,
        aadhaar: workerForm.querySelector('input[placeholder="Aadhaar Number (12 digits)"]').value,
        experience: workerForm.querySelector('input[type="number"]').value
      };

      const btn = workerForm.querySelector('button[type="submit"]');
      const originalText = btn.innerText;
      btn.innerText = "Registering...";
      btn.disabled = true;

      try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/auth/register-worker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
          localStorage.setItem('kamgar-token', data.token);
          workerForm.innerHTML = `<h3 style="color:var(--orange-primary); text-align:center;">Signup Successful!</h3><p style="text-align:center;">Welcome to Kamgar Connect, ${data.user.name}</p>`;
        } else {
          alert('Signup failed: ' + (data.msg || (data.errors ? data.errors[0].msg : 'Unknown error')));
          btn.innerText = originalText;
          btn.disabled = false;
        }
      } catch (err) {
        alert("Network Error");
        btn.innerText = originalText;
        btn.disabled = false;
      }
    });
  }

  if (employerForm) {
    employerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        name: employerForm.querySelector('input[placeholder="Full Name"]').value,
        phone: employerForm.querySelector('input[placeholder="Phone Number"]').value,
        city: employerForm.querySelector('#city').value,
        companyName: employerForm.querySelector('input[placeholder="Company Name (Optional)"]').value
      };

      const btn = employerForm.querySelector('button[type="submit"]');
      const originalText = btn.innerText;
      btn.innerText = "Registering...";
      btn.disabled = true;

      try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/auth/register-employer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
          localStorage.setItem('kamgar-token', data.token);
          employerForm.innerHTML = `<h3 style="color:var(--orange-primary); text-align:center;">Signup Successful!</h3><p style="text-align:center;">Welcome to Kamgar Connect, ${data.user.name}</p>`;
        } else {
          alert('Signup failed: ' + (data.msg || (data.errors ? data.errors[0].msg : 'Unknown error')));
          btn.innerText = originalText;
          btn.disabled = false;
        }
      } catch (err) {
        alert("Network Error");
        btn.innerText = originalText;
        btn.disabled = false;
      }
    });
  }
});

/* ═══════════════════════════════════════════
   TOP RATED WORKERS FETCHER
   ═══════════════════════════════════════════ */
async function initTopWorkers() {
  const list = document.getElementById('worker-list');
  if (!list) return;

  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/workers`);
    const workers = await res.json();
    
    if (!res.ok || !workers || workers.length === 0) {
      list.innerHTML = '<div class="loading-state">No workers available for hire currently. Check again soon!</div>';
      return;
    }

    list.innerHTML = workers.slice(0, 8).map(w => {
      const avg = Number(w.rating) || 0;
      const count = w.totalRatings || 0;
      const rounded = Math.round(avg);
      const stars = '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
      
      return `
        <div class="worker-card">
          <div class="worker-avatar-wrap">
            <div class="worker-avatar">👷</div>
            <span class="availability-pill">Available</span>
          </div>
          <h3>${w.name}</h3>
          <div class="worker-skill-tag">${w.skill}</div>
          <div class="worker-rating">
            <span class="star-fill">${stars}</span>
            <span class="rating-num">${avg > 0 ? avg.toFixed(1) : 'New'}</span>
            <span class="review-count">(${count})</span>
          </div>
          <div class="worker-details">
            <div class="detail-item">
              <span class="detail-label">Experience</span>
              <span class="detail-val">${w.experience}y</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Verified</span>
              <span class="detail-val">✓ ISO</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  } catch (err) {
    console.error('Failed to load workers:', err);
    list.innerHTML = '<div class="loading-state">Failed to connect to marketplace.</div>';
  }
}
