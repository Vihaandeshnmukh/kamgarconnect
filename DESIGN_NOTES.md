# Design notes (kamgar-wordpress.v2.html)

## Source
- Screens designed in the Stitch connector, project "Kamgar Connect Worker Platform" (13650179259141449417), reviewed by a separate design-review agent in 3 rounds before building. Final screens: landing desktop 701c14f8…, landing phone db378ae9…, join desktop 0944cda6…, join phone 1ebb0d57…, worker home desktop 8c79a677…, employer home dark 6cc967da…, worker home phone (Marathi) ef47c94e…, employer home iPad (Hindi) 3a4180da….
- Rules from the review that the build follows: one chevron per dropdown, the same user-pen Profile icon everywhere, and none of the features Stitch invented (helpline, Aadhaar badges, OTP, wage ranges, payment promises, job counts).

## Layout per device
- Phone (≤760 px) and iPad (761–1023 px): app bar fixed at the bottom (Home / History / Stats / Profile), icon over label, 56–60 px tall, room for the iPhone home bar.
- Laptop (≥1024 px): left sidebar with the user's name, role, nav and Logout; content to the right, max 1040 px.
- Logged out: a full website - hero with an example job card, facts strip, How it works for workers and employers, work types, trust, languages, mission, team, closing Join band. Desktop has section links and Join / Log in in the top bar.

## Brand and theme
- Brand orange #FF5C00; on dark, buttons use #C2410C so white text keeps AA contrast; navy #1E2A4A for second actions.
- Dark theme is the default for first-time visitors (owner brief, 8 Nov): page #0E1116, surfaces #171B22 / #20252E. The sun/moon button switches to light and is remembered.
- Manrope for headings, Plus Jakarta Sans for text; no functional text below 14 px.

## Low literacy
- Tap targets 44–56 px; every action has an icon and a short label; English with Hindi/Marathi lines on the landing page; Listen buttons read screens aloud; a microphone for typing names and places.

## Speed and low-end phones
- Lite mode turns on automatically with Data Saver, 2G/3G, ≤2 GB memory, ≤2 CPU cores or "reduce motion", and can be switched in the footer or Profile. It skips the Three.js background and turns off animations, blur and large shadows. GSAP scrolling and the video scrubber keep working.

## Installable app
- The page adds a web-app manifest (made in the browser because WordPress serves only this page) with an orange "K" icon drawn on a canvas, plus theme colour and iPhone home-screen tags. Android Chrome offers "Add to Home screen"; a full offline app needs a service-worker file on kamgar.de (see BLOCKED.md / Recommended next).

## Investor demo
- Footer button or `?demo=1`: a 9-step tour of the worker and employer journeys with a yellow "Demo data" badge; it never calls the server.
