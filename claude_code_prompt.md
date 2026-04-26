# Claude Code — Kamgar Connect Website Build Prompt

## Your Job
Read the file `kamgar_info.md` for full context about what Kamgar Connect is. Then build a complete, modern, mobile-first website using Node.js and vanilla HTML/CSS/JS (or React if preferred). The website must include a stunning before/after video slider section as described below.

---

## Project Structure to Create

```
kamgar-connect/
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── chowk.mp4        ← already exists, single video showing crowded to 2 people
│   └── home.mp4         ← already exists, single video showing messy to clean home
├── server.js
└── package.json
```

---

## Tech Stack
- **Backend:** Node.js with Express (just to serve static files)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **No heavy frameworks needed** — keep it fast and lightweight
- **Fonts:** Google Fonts — use something bold and Indian-feeling (e.g. Poppins + Tiro Devanagari)
- **Icons:** Use emoji or simple SVG icons inline

---

## MOST IMPORTANT FEATURE — Video Showcase Section

Build TWO video sections, each showing a single video that already contains the before→after transition:

### Video 1 — The Chowk
- Video file: `chowk.mp4` (located directly in public folder)
- This video already shows: crowded chowk → workers leaving → only 2 people remain
- Heading: "Workers used to wait hours at the chowk..."
- Label on left side of video: "Before Kamgar"
- Label on right side of video: "After Kamgar"
- Add a timeline/progress bar below so user can see the transition happening
- Autoplay, muted, loop, playsinline

### Video 2 — The Home
- Video file: `home.mp4` (located directly in public folder)
- This video already shows: stressed person messy home → maids working → clean home relaxed person
- Heading: "Finding home help used to be stressful..."
- Label on left side of video: "Before Kamgar"
- Label on right side of video: "After Kamgar"
- Same timeline/progress bar
- Autoplay, muted, loop, playsinline

### Video Section Behavior:
- Videos are full width, responsive
- Autoplay muted loop on load
- A sleek animated progress bar below each video showing playback
- "Before" label fades in at start, "After" label fades in at midpoint of video
- Smooth fade between label states
- Works perfectly on mobile and desktop

---

## Full Website Sections (in order)

### 1. Navigation Bar
- Logo: "Kamgar Connect" with a small worker icon
- Links: How It Works, Categories, Sign Up
- Two CTA buttons: "Find Workers" (employer) and "Find Work" (worker)
- Sticky on scroll, slightly transparent with blur backdrop
- Mobile hamburger menu

### 2. Hero Section
- Big bold headline: "Find Workers Instantly — No Chowk Waits!"
- Subheadline: "Connect with verified daily wage workers near you. Instant GPS matching, transparent payments."
- Two big buttons: "I Need a Worker" and "I Am a Worker"
- Background: warm gradient (saffron/orange tones) or a subtle Indian pattern overlay
- Animated entrance — elements fade in on load

### 3. Before/After Video Slider — Chowk Scene
- Full width section
- Dark background to make videos pop
- Slider 1 as described above
- Below slider: stat badge — "10,000+ workers found jobs"

### 4. How It Works Section
- 5 steps in a horizontal flow (or vertical on mobile):
  1. Sign Up (2 mins)
  2. Post or Browse Jobs
  3. GPS Matching
  4. Connect & Hire
  5. Pay & Rate
- Each step has a number, icon, title, short description
- Clean card design

### 5. Before/After Video Slider — Home Scene
- Same slider component, different videos
- Below slider: stat badge — "5,000+ homes cleaned"

### 6. Worker Categories Section
- Grid of category cards: Construction, Electrician, Plumber, Domestic Help, Factory, Carpenter, Painter, Driver
- Each card has an emoji icon, category name, short description
- Hover effect — card lifts with shadow

### 7. Testimonials Section
- 3 testimonial cards in a row (scrollable on mobile)
- Worker testimonial, Employer testimonial, another Employer testimonial
- Star ratings, name, city, profession
- Warm card design

### 8. Sign Up CTA Section
- Two side-by-side cards:
  - Left: "I Need Workers" — for employers — orange/saffron background
  - Right: "I Want Work" — for workers — deep blue background
- Each card has headline, 3 bullet benefits, and a Sign Up button
- Full width, bold, emotional

### 9. Footer
- Logo + tagline
- Links: About, Categories, How It Works, Contact, Privacy Policy
- "Available in Aurangabad — Coming Soon to More Cities"
- Copyright

---

## Design Guidelines

### Colors:
```css
--primary: #FF6B00;        /* Saffron orange — main CTA color */
--primary-dark: #E55A00;   /* Darker orange for hover */
--secondary: #1A3C6E;      /* Deep blue — trust, reliability */
--accent: #FFD700;         /* Gold — highlights */
--bg-light: #FFF8F0;       /* Warm off-white background */
--text-dark: #1A1A1A;      /* Near black for headings */
--text-mid: #555555;       /* Body text */
--success: #27AE60;        /* Green for positive stats */
```

### Typography:
- Headings: **Poppins Bold** — modern, clean, strong
- Body: **Poppins Regular**
- Hindi/Marathi text: **Tiro Devanagari** (Google Font)

### Feel:
- Premium but approachable
- Mobile-first — test every section on 375px width
- Fast — lazy load videos, no heavy libraries
- Warm and Indian — not generic Western SaaS look
- Generous whitespace
- Smooth scroll behaviour

---

## Video — Technical Implementation

```javascript
// Each video must:
// 1. Autoplay, muted, loop, playsinline
// 2. Be full width and responsive
// 3. Have a progress bar synced to video currentTime
// 4. Show "Before Kamgar" label for first half of video duration
// 5. Show "After Kamgar" label for second half of video duration
// 6. Labels fade smoothly between states

// Structure:
// <div class="video-section">
//   <div class="video-labels">
//     <span class="label-before">Before Kamgar</span>
//     <span class="label-after">After Kamgar</span>
//   </div>
//   <video autoplay muted loop playsinline src="chowk.mp4"></video>
//   <div class="video-progress">
//     <div class="progress-bar"></div>
//   </div>
// </div>

// JS: on timeupdate event, update progress bar width
// and toggle label visibility based on currentTime vs duration/2
```

---

## Server (server.js)
Simple Express server:
- Serve static files from `/public`
- Handle video streaming with proper headers (Accept-Ranges)
- Port: 3000
- Single route: serve index.html for all routes

---

## Final Checklist Before Done:
- [ ] Both videos autoplay muted and loop
- [ ] Progress bar synced to each video playback
- [ ] Before/After labels fade correctly at video midpoint
- [ ] Videos load from public folder correctly
- [ ] Site is fully responsive (375px to 1440px)
- [ ] Smooth scroll on nav links
- [ ] Hamburger menu works on mobile
- [ ] All sections present and styled
- [ ] Server runs with `node server.js` or `npm start`
- [ ] No console errors
