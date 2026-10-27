# Applies the QA-report fixes to the Kamgar Connect page (the HTML part of the
# WordPress template twentytwentyfive//home).
# Usage: python apply-qa-fixes.py <input.html> <output.html>
# Each edit must match exactly once, otherwise nothing is written.
# New page code never uses "&&": WordPress can turn it into &#038;&#038; and break the page.
import re
import sys

src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8', newline='').read().replace('\r\n', '\n')


def rep(old, new):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'expected 1 match, found {n}: {old[:90]!r}')
    s = s.replace(old, new)


def rep_function(name, new):
    """Replaces the whole top-level function `name` (from its line to its closing '    }')."""
    global s
    starts = [m.start() for m in re.finditer(r'\n    (?:async )?function ' + re.escape(name) + r'\(', s)]
    if len(starts) != 1:
        raise SystemExit(f'function {name}: found {len(starts)}')
    start = starts[0] + 1
    end = s.index('\n    }\n', start) + len('\n    }\n')
    s = s[:start] + new.strip('\n') + '\n' + s[end:]


# ───────────── CSS: no sideways scrolling on a 360-375px phone (M3), rating stars ─────────────
rep("""      .st-dock .d2 { background: var(--navy); color: #FFFFFF; }
    }
  </style>""", """      .st-dock .d2 { background: var(--navy); color: #FFFFFF; }
    }

    /* ===== QA fixes: phone-width layout, rating stars ===== */
    #lookup-phone { min-width: 0; width: 100%; }
    .lookup-row { display: flex; gap: 15px; }
    #worker-grid, #city-jobs-list { grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)) !important; }
    .card-scene, .card-front, .card-back { max-width: 100%; }
    .card-front a[href^="tel:"] { color: var(--accent); font-weight: 800; }
    .rate-stars { display: flex; gap: 4px; }
    .rate-stars button { font-size: 2.4rem; line-height: 1; background: none; border: 0; color: #C8CBD0; cursor: pointer; padding: 0 4px; }
    .rate-stars button.on { color: #F5A400; }
    @media (max-width: 480px) {
      .lookup-row { flex-wrap: wrap; }
      .lookup-row .btn { width: 100%; }
      #pane-employer > div:first-child { padding: 18px !important; }
      #main-live-btn { padding: 20px 24px !important; font-size: 1.2rem !important; max-width: 100%; }
      .tab-btn { min-width: 0; }
      .modal-content { padding: 24px 18px; }
    }
  </style>""")

# ───────────── Markup ─────────────
rep("""<p>स्मार्टफोन नहीं है? फ़ोन करें और हिंदी में 6 सवालों के जवाब दें, आपका प्रोफ़ाइल बन जाएगा।</p>""",
    """<p>स्मार्टफोन नहीं है? फ़ोन करें और हिंदी, मराठी या English में 6 सवालों के जवाब दें, आपका प्रोफ़ाइल बन जाएगा।</p>""")
rep("""<span><i class="fas fa-microphone"></i> Hindi voice registration</span>""",
    """<span><i class="fas fa-microphone"></i> Voice registration: Hindi / मराठी / English</span>""")

# Worker dashboard: translatable button texts
rep("""<i class="fas fa-eye-slash"></i> Hide me from search</button>""",
    """<i class="fas fa-eye-slash"></i> <span data-i18n="hide_me">Hide me from search</span></button>""")
rep("""onclick="loadCityJobs()"><i class="fas fa-sync"></i> Refresh</button>""",
    """onclick="loadCityJobs()"><i class="fas fa-sync"></i> <span data-i18n="refresh">Refresh</span></button>""")

# Employer dashboard: translatable, phone search row that fits a phone, a work-type filter that works (M5)
rep("""            <label style="display:block; margin-bottom:10px; font-weight:800; opacity:0.5; font-size:0.8rem;">SEARCH BY PHONE</label>
            <div style="display:flex; gap:15px;">
               <input type="tel" id="lookup-phone" placeholder="9876543210" style="flex:1; background:var(--bg-base); border:1px solid var(--border); color:white; padding:15px; border-radius:12px; outline:none; font-size:1.2rem; font-weight:800;">
               <button class="btn btn-primary" onclick="lookupByPhone()"><i class="fas fa-search"></i> SEARCH</button>
            </div>""", """            <label style="display:block; margin-bottom:10px; font-weight:800; opacity:0.5; font-size:0.8rem;" data-i18n="search_phone">SEARCH BY PHONE</label>
            <div class="lookup-row">
               <input type="tel" id="lookup-phone" placeholder="9876543210" maxlength="10" style="flex:1; background:var(--bg-base); border:1px solid var(--border); color:white; padding:15px; border-radius:12px; outline:none; font-size:1.2rem; font-weight:800;">
               <button class="btn btn-primary" onclick="lookupByPhone()"><i class="fas fa-search"></i> <span data-i18n="search">SEARCH</span></button>
            </div>""")
rep("""            <button class="btn btn-primary" onclick="findNearbyWorkers()"><i class="fas fa-location-arrow"></i> FIND NEAREST WORKER</button>
            <select id="area-select" class="input-field" style="height:unset;" onchange="loadWorkersByArea()">
               <option value="">SELECT AREA</option>
               <option>Aurangabad Center</option><option>Cidco</option><option>Waluj</option><option>Nagpur Center</option><option>Pune Camp</option>
            </select>""", """            <button class="btn btn-primary" onclick="findNearbyWorkers()"><i class="fas fa-location-arrow"></i> <span data-i18n="find_nearest">FIND NEAREST WORKER</span></button>
            <select id="skill-filter" class="input-field" style="height:unset;" onchange="loadEmployerGrid()">
               <option value="" data-i18n="all_types">ALL WORK TYPES</option>
               <option value="Mason" data-skill>Mason</option><option value="Electrician" data-skill>Electrician</option><option value="Plumber" data-skill>Plumber</option><option value="Domestic Help" data-skill>Domestic Help</option>
               <option value="Factory Worker" data-skill>Factory Worker</option><option value="Carpenter" data-skill>Carpenter</option><option value="Painter" data-skill>Painter</option><option value="Driver" data-skill>Driver</option>
            </select>""")

# Sign-up form: translatable labels, all 8 work types for employers (M5), sane number ranges
rep("""          <div class="select-type select-type-worker active" onclick="selectType('Worker')">I AM A WORKER</div>
          <div class="select-type select-type-employer" onclick="selectType('Employer')">I NEED A WORKER</div>""",
    """          <div class="select-type select-type-worker active" onclick="selectType('Worker')" data-i18n="sel_worker">I AM A WORKER</div>
          <div class="select-type select-type-employer" onclick="selectType('Employer')" data-i18n="sel_employer">I NEED A WORKER</div>""")
rep("""                <label>Skill</label>
                <select id="reg-skill" class="input-field">
                   <option value="">SELECT SKILL</option>
                   <option>Mason</option><option>Electrician</option><option>Plumber</option><option>Domestic Help</option>
                   <option>Factory Worker</option><option>Carpenter</option><option>Painter</option><option>Driver</option>
                </select>""", """                <label data-i18n="label_skill">Skill</label>
                <select id="reg-skill" class="input-field">
                   <option value="" data-i18n="select_skill">SELECT SKILL</option>
                   <option value="Mason" data-skill>Mason</option><option value="Electrician" data-skill>Electrician</option><option value="Plumber" data-skill>Plumber</option><option value="Domestic Help" data-skill>Domestic Help</option>
                   <option value="Factory Worker" data-skill>Factory Worker</option><option value="Carpenter" data-skill>Carpenter</option><option value="Painter" data-skill>Painter</option><option value="Driver" data-skill>Driver</option>
                </select>""")
rep("""                   <label>Experience (Years)</label>
                   <input type="number" id="reg-exp" class="input-field" value="1">""",
    """                   <label data-i18n="label_exp">Experience (Years)</label>
                   <input type="number" id="reg-exp" class="input-field" value="1" min="0" max="60">""")
rep("""                   <label>Daily Salary (&#8377;)</label>
                   <input type="number" id="reg-salary" class="input-field" value="600">""",
    """                   <label data-i18n="label_salary">Daily Wage (&#8377;)</label>
                   <input type="number" id="reg-salary" class="input-field" value="600" min="100" max="5000">""")
rep("""font-size:0.9rem;">Availability</label>""", """font-size:0.9rem;" data-i18n="availability">Availability</label>""")
rep("""                <label>Worker Type Needed</label>
                <select id="reg-needed" class="input-field">
                   <option value="">SELECT TYPE</option>
                   <option>Mason</option><option>Electrician</option><option>Plumber</option><option>Domestic Help</option>
                </select>""", """                <label data-i18n="label_needed">Worker Type Needed</label>
                <select id="reg-needed" class="input-field">
                   <option value="" data-i18n="select_type">SELECT TYPE</option>
                   <option value="Mason" data-skill>Mason</option><option value="Electrician" data-skill>Electrician</option><option value="Plumber" data-skill>Plumber</option><option value="Domestic Help" data-skill>Domestic Help</option>
                   <option value="Factory Worker" data-skill>Factory Worker</option><option value="Carpenter" data-skill>Carpenter</option><option value="Painter" data-skill>Painter</option><option value="Driver" data-skill>Driver</option>
                </select>""")
rep("""                <label>Number of Workers Needed</label>
                <input type="number" id="reg-count" class="input-field" value="1">""",
    """                <label data-i18n="label_count">Number of Workers Needed</label>
                <input type="number" id="reg-count" class="input-field" value="1" min="1" max="500">""")
rep("""                <i class="fas fa-crosshairs"></i> USE MY CURRENT LOCATION""",
    """                <i class="fas fa-crosshairs"></i> <span data-i18n="use_location">USE MY CURRENT LOCATION</span>""")
rep("""<span id="reg-btn-text">JOIN PLATFORM</span>""", """<span id="reg-btn-text" data-i18n="join">JOIN PLATFORM</span>""")

# Hire form: translatable
rep("""<h2 style="margin-bottom:25px;">Hire <span id="hire-worker-name"></span></h2>""",
    """<h2 style="margin-bottom:25px;"><span data-i18n="hire_title">Hire</span> <span id="hire-worker-name"></span></h2>""")
rep("""           <label>Job Location</label>""", """           <label data-i18n="job_location">Job Location</label>""")
rep("""              <label>Date of Work</label>""", """              <label data-i18n="work_date">Date of Work</label>""")
rep("""              <label>Reporting Time</label>""", """              <label data-i18n="report_time">Reporting Time</label>""")
rep("""           <label>Employer Name</label>""", """           <label data-i18n="employer_name">Employer Name</label>""")
rep("""           <label>Special Instructions (Optional)</label>
           <textarea id="hire-inst" class="input-field" rows="3"></textarea>""",
    """           <label data-i18n="instructions">Special Instructions (Optional)</label>
           <textarea id="hire-inst" class="input-field" rows="3" maxlength="300"></textarea>""")
rep("""           <span>CONFIRM HIRE</span>""", """           <span data-i18n="confirm_hire">CONFIRM HIRE</span>""")

# Rating box, opened from the SMS link kamgar.de/?review=<jobId>&worker=<workerId> (M8)
rep("""  <div id="notif-box"></div>""", """  <div class="modal" id="review-modal">
     <div class="modal-content">
        <button class="btn" style="position:absolute; top:20px; right:20px; background:none; color:white; font-size:2rem;" onclick="closeModal()">&times;</button>
        <h2 style="margin-bottom:10px;" data-i18n="rate_title">Rate the worker</h2>
        <p id="review-worker-name" style="font-weight:800; margin-bottom:15px;"></p>
        <div class="rate-stars" id="rate-stars"></div>
        <div class="input-grp" style="margin-top:15px;">
           <label data-i18n="rate_comment">Comment (optional)</label>
           <textarea id="review-comment" class="input-field" rows="3" maxlength="500"></textarea>
        </div>
        <button class="btn btn-primary" style="width:100%; padding:18px;" onclick="submitReview()"><span data-i18n="rate_submit">SUBMIT RATING</span></button>
     </div>
  </div>

  <div id="notif-box"></div>""")

# ───────────── Script ─────────────
HELPERS = r"""
    // ── Safe rendering (QA C2): text from the server is always inserted as text, never as HTML ──
    function esc(v) {
       return String(v === undefined || v === null ? '' : v).replace(/[&<>"'`]/g, c => '&#' + c.charCodeAt(0) + ';');
    }
    // Only real ids go into onclick handlers; everything else about a worker stays in workerCache
    function safeId(v) { return /^[a-f0-9]{24}$/i.test(String(v)) ? String(v) : ''; }
    let workerCache = {};
    let appReady = false;
    const LOADER = '<div class="loader-s" style="display:block; margin:20px auto;"></div>';

    // ── Dashboard texts in English, Hindi and Marathi (QA M4) ──
    const UI_TEXT = {
       en: {
          search_phone: "SEARCH BY PHONE", search: "SEARCH", find_nearest: "FIND NEAREST WORKER", all_types: "ALL WORK TYPES",
          hide_me: "Hide me from search", refresh: "Refresh", start_looking: "START LOOKING", stop_looking: "STOP LOOKING",
          workers_available: n => `${n} workers currently available`, no_workers: "No workers available right now. Please check again soon.",
          no_worker_phone: "No available worker with this phone number.", login_employer: "Log in as an employer to search by phone.",
          enter_phone: "Enter a 10-digit phone number", search_error: "Error searching. Try again later.", load_error: "Could not load workers. Please try again.",
          hire_now: "HIRE NOW", full_profile: "FULL PROFILE", exp: "Experience", years: "years", city: "City", availability: "Availability",
          not_specified: "Not specified", previous_jobs: "PREVIOUS JOBS", day: "day", rating: "Rating", new_worker: "New on Kamgar Connect", phone: "Phone",
          no_jobs: "No jobs right now. Stay live and we will call you!", jobs_error: "Failed to load jobs.", accept_job: "Accept Job", workers_word: "workers",
          going_live: "Going live...", going_offline: "Going offline...", status_failed: "Failed to update status. Check your connection.",
          hidden_msg: "You are hidden from search. Tap START LOOKING to appear again.", update_failed: "Could not update. Check your connection.",
          hire_title: "Hire", job_location: "Job Location", work_date: "Date of Work", report_time: "Reporting Time", employer_name: "Employer Name",
          instructions: "Special Instructions (Optional)", confirm_hire: "CONFIRM HIRE", hire_failed: "Hiring failed. Please try again.",
          calling: n => `Calling ${n} now with the job details.`, worker_phone: "Worker's phone", login_to_hire: "Log in as an employer to hire.",
          sel_worker: "I AM A WORKER", sel_employer: "I NEED A WORKER", label_skill: "Work type", select_skill: "SELECT WORK TYPE",
          label_exp: "Experience (Years)", label_salary: "Daily Wage (₹)", label_needed: "Worker Type Needed", select_type: "SELECT TYPE",
          label_count: "Number of Workers Needed", use_location: "USE MY CURRENT LOCATION", join: "JOIN PLATFORM",
          welcome_worker: "You are registered! Employers can see you for the next 24 hours.", welcome_employer: "Welcome! Find the right worker below.",
          network_problem: "Network problem: please check your connection and try again.",
          rate_title: "Rate the worker", rate_comment: "Comment (optional)", rate_submit: "SUBMIT RATING", rate_pick: "Please choose 1 to 5 stars.",
          rate_thanks: "Thank you! Your rating helps other employers.", rate_failed: "Could not save the rating.", rate_login: "Log in as the employer to rate this worker."
       },
       hi: {
          search_phone: "फ़ोन नंबर से खोजें", search: "खोजें", find_nearest: "सबसे पास का कामगार", all_types: "सभी काम",
          hide_me: "मुझे खोज से छिपाएं", refresh: "रीफ़्रेश", start_looking: "काम ढूंढना शुरू करें", stop_looking: "काम ढूंढना बंद करें",
          workers_available: n => `${n} कामगार अभी उपलब्ध हैं`, no_workers: "अभी कोई कामगार उपलब्ध नहीं है। थोड़ी देर बाद देखें।",
          no_worker_phone: "इस नंबर का कोई उपलब्ध कामगार नहीं मिला।", login_employer: "फ़ोन से खोजने के लिए नियोक्ता के रूप में लॉगिन करें।",
          enter_phone: "10 अंकों का फ़ोन नंबर डालें", search_error: "खोज में समस्या। बाद में कोशिश करें।", load_error: "कामगार लोड नहीं हो सके। फिर कोशिश करें।",
          hire_now: "काम पर रखें", full_profile: "पूरी जानकारी", exp: "अनुभव", years: "साल", city: "शहर", availability: "उपलब्धता",
          not_specified: "नहीं बताया", previous_jobs: "पिछले काम", day: "दिन", rating: "रेटिंग", new_worker: "कामगार कनेक्ट पर नया", phone: "फ़ोन",
          no_jobs: "अभी कोई काम नहीं। लाइव रहें, हम कॉल करेंगे!", jobs_error: "काम लोड नहीं हो सके।", accept_job: "काम स्वीकारें", workers_word: "कामगार",
          going_live: "लाइव हो रहे हैं...", going_offline: "ऑफ़लाइन हो रहे हैं...", status_failed: "स्थिति नहीं बदली। इंटरनेट जांचें।",
          hidden_msg: "आप खोज से छिपे हैं। फिर से दिखने के लिए काम ढूंढना शुरू करें दबाएं।", update_failed: "बदलाव नहीं हुआ। इंटरनेट जांचें।",
          hire_title: "काम पर रखें:", job_location: "काम की जगह", work_date: "काम की तारीख", report_time: "पहुंचने का समय", employer_name: "नियोक्ता का नाम",
          instructions: "खास निर्देश (ज़रूरी नहीं)", confirm_hire: "पक्का करें", hire_failed: "काम पर रखना नहीं हुआ। फिर कोशिश करें।",
          calling: n => `${n} को काम की जानकारी के साथ कॉल किया जा रहा है।`, worker_phone: "कामगार का फ़ोन", login_to_hire: "काम पर रखने के लिए नियोक्ता के रूप में लॉगिन करें।",
          sel_worker: "मैं कामगार हूँ", sel_employer: "मुझे कामगार चाहिए", label_skill: "काम", select_skill: "काम चुनें",
          label_exp: "अनुभव (साल)", label_salary: "एक दिन की मज़दूरी (₹)", label_needed: "किस काम के लिए कामगार", select_type: "काम चुनें",
          label_count: "कितने कामगार चाहिए", use_location: "मेरी लोकेशन लें", join: "जुड़ें",
          welcome_worker: "आपका रजिस्ट्रेशन हो गया! अगले 24 घंटे आप काम देने वालों को दिखेंगे।", welcome_employer: "स्वागत है! नीचे सही कामगार चुनें।",
          network_problem: "इंटरनेट की समस्या: कनेक्शन जांचें और फिर कोशिश करें।",
          rate_title: "कामगार को रेटिंग दें", rate_comment: "टिप्पणी (ज़रूरी नहीं)", rate_submit: "रेटिंग भेजें", rate_pick: "कृपया 1 से 5 स्टार चुनें।",
          rate_thanks: "धन्यवाद! आपकी रेटिंग दूसरों की मदद करती है।", rate_failed: "रेटिंग सेव नहीं हुई।", rate_login: "रेटिंग देने के लिए नियोक्ता के रूप में लॉगिन करें।"
       },
       mr: {
          search_phone: "फोन नंबरने शोधा", search: "शोधा", find_nearest: "जवळचा कामगार शोधा", all_types: "सर्व कामे",
          hide_me: "मला शोधातून लपवा", refresh: "रिफ्रेश", start_looking: "काम शोधणे सुरू करा", stop_looking: "काम शोधणे थांबवा",
          workers_available: n => `${n} कामगार आता उपलब्ध आहेत`, no_workers: "आता कोणी कामगार उपलब्ध नाही. थोड्या वेळाने पहा.",
          no_worker_phone: "या नंबरचा उपलब्ध कामगार सापडला नाही.", login_employer: "फोनने शोधण्यासाठी एम्प्लॉयर म्हणून लॉगिन करा.",
          enter_phone: "10 अंकी फोन नंबर टाका", search_error: "शोधताना अडचण. नंतर प्रयत्न करा.", load_error: "कामगार लोड झाले नाहीत. पुन्हा प्रयत्न करा.",
          hire_now: "कामावर घ्या", full_profile: "पूर्ण माहिती", exp: "अनुभव", years: "वर्षे", city: "शहर", availability: "उपलब्धता",
          not_specified: "सांगितले नाही", previous_jobs: "मागील कामे", day: "दिवस", rating: "रेटिंग", new_worker: "कामगार कनेक्टवर नवीन", phone: "फोन",
          no_jobs: "आता काम नाही. लाइव्ह रहा, आम्ही कॉल करू!", jobs_error: "कामे लोड झाली नाहीत.", accept_job: "काम स्वीकारा", workers_word: "कामगार",
          going_live: "लाइव्ह होत आहे...", going_offline: "ऑफलाइन होत आहे...", status_failed: "स्थिती बदलली नाही. इंटरनेट तपासा.",
          hidden_msg: "तुम्ही शोधातून लपलेले आहात. पुन्हा दिसण्यासाठी काम शोधणे सुरू करा दाबा.", update_failed: "बदल झाला नाही. इंटरनेट तपासा.",
          hire_title: "कामावर घ्या:", job_location: "कामाची जागा", work_date: "कामाची तारीख", report_time: "पोहोचण्याची वेळ", employer_name: "एम्प्लॉयरचे नाव",
          instructions: "विशेष सूचना (आवश्यक नाही)", confirm_hire: "पक्के करा", hire_failed: "कामावर घेता आले नाही. पुन्हा प्रयत्न करा.",
          calling: n => `${n} यांना कामाच्या माहितीसह कॉल केला जात आहे.`, worker_phone: "कामगाराचा फोन", login_to_hire: "कामावर घेण्यासाठी एम्प्लॉयर म्हणून लॉगिन करा.",
          sel_worker: "मी कामगार आहे", sel_employer: "मला कामगार हवा", label_skill: "काम", select_skill: "काम निवडा",
          label_exp: "अनुभव (वर्षे)", label_salary: "एका दिवसाची मजुरी (₹)", label_needed: "कोणत्या कामासाठी कामगार", select_type: "काम निवडा",
          label_count: "किती कामगार हवे", use_location: "माझे लोकेशन वापरा", join: "सामील व्हा",
          welcome_worker: "तुमची नोंदणी झाली! पुढचे 24 तास तुम्ही काम देणाऱ्यांना दिसाल.", welcome_employer: "स्वागत आहे! खाली योग्य कामगार निवडा.",
          network_problem: "इंटरनेट अडचण: कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.",
          rate_title: "कामगाराला रेटिंग द्या", rate_comment: "टिप्पणी (आवश्यक नाही)", rate_submit: "रेटिंग पाठवा", rate_pick: "कृपया 1 ते 5 स्टार निवडा.",
          rate_thanks: "धन्यवाद! तुमचे रेटिंग इतरांना मदत करते.", rate_failed: "रेटिंग सेव्ह झाले नाही.", rate_login: "रेटिंग देण्यासाठी एम्प्लॉयर म्हणून लॉगिन करा."
       }
    };
    const SKILL_NAMES = {
       hi: { 'Mason': 'मिस्त्री', 'Electrician': 'इलेक्ट्रीशियन', 'Plumber': 'प्लम्बर', 'Domestic Help': 'घरेलू काम', 'Factory Worker': 'फैक्ट्री वर्कर', 'Carpenter': 'बढ़ई', 'Painter': 'पेंटर', 'Driver': 'ड्राइवर', 'Other': 'अन्य' },
       mr: { 'Mason': 'गवंडी', 'Electrician': 'इलेक्ट्रिशियन', 'Plumber': 'प्लंबर', 'Domestic Help': 'घरकाम', 'Factory Worker': 'फॅक्टरी कामगार', 'Carpenter': 'सुतार', 'Painter': 'पेंटर', 'Driver': 'ड्रायव्हर', 'Other': 'इतर' }
    };
    // Text for this key in the chosen language (English if missing)
    function t(key, arg) {
       const table = UI_TEXT[currentLang] || UI_TEXT.en;
       const v = table[key] === undefined ? UI_TEXT.en[key] : table[key];
       return typeof v === 'function' ? v(arg) : v;
    }
    function skillName(s) {
       const names = SKILL_NAMES[currentLang];
       return names ? (names[s] || s) : s;
    }

    // ── Rating box, opened from the SMS link kamgar.de/?review=<jobId>&worker=<workerId> ──
    let reviewTarget = null, reviewRating = 0;
    async function openReviewFromLink() {
       const p = new URLSearchParams(location.search);
       const jobId = safeId(p.get('review')), workerId = safeId(p.get('worker'));
       if (!jobId) return;
       if (!workerId) return;
       if (localStorage.getItem('user_type') !== 'Employer') { showNotif(t('rate_login'), 'red'); selectType('Employer'); openModal(); return; }
       reviewTarget = { jobId, workerId }; reviewRating = 0;
       document.getElementById('review-worker-name').innerText = '';
       try {
          const r = await fetch(`${CONFIG.BACKEND_URL}/api/workers/${workerId}`);
          if (r.ok) { const w = await r.json(); document.getElementById('review-worker-name').innerText = w.name + ' (' + skillName(w.skill) + ')'; }
       } catch (e) {}
       drawStars();
       document.getElementById('review-modal').style.display = 'flex';
    }
    function drawStars() {
       document.getElementById('rate-stars').innerHTML = [1, 2, 3, 4, 5].map(n => `<button type="button" class="${n <= reviewRating ? 'on' : ''}" onclick="setRating(${n})" aria-label="${n}">&#9733;</button>`).join('');
    }
    function setRating(n) { reviewRating = n; drawStars(); }
    async function submitReview() {
       if (!reviewRating) { showNotif(t('rate_pick'), 'red'); return; }
       try {
          const res = await fetch(`${CONFIG.BACKEND_URL}/api/reviews`, { method: 'POST', headers: authHeaders({'Content-Type':'application/json'}),
             body: JSON.stringify({ workerId: reviewTarget.workerId, jobId: reviewTarget.jobId, rating: reviewRating, comment: document.getElementById('review-comment').value }) });
          if (sessionExpired(res)) return;
          const data = await res.json();
          if (!res.ok) { showNotif(data.msg || t('rate_failed'), 'red'); return; }
          closeModal();
          history.replaceState(null, '', location.pathname);
          showNotif(t('rate_thanks'), 'green');
       } catch (e) { showNotif(t('rate_failed'), 'red'); }
    }

    async function initApp() {"""
rep("""
    async function initApp() {""", HELPERS)

rep_function('initApp', r"""
    async function initApp() {
       initThree();
       setLang(currentLang);
       if (sessionStorage.getItem('bannerDismissed')) dismissBanner();
       initGoogleSignIn();
       // Logins saved before tokens existed must sign in again
       if (localStorage.getItem('user_id')) {
          if (!localStorage.getItem('auth_token')) {
             ['user_id','user_name','user_phone','user_type','user_city','user_skill','isLooking','availableUntil','liveStartTime'].forEach(k => localStorage.removeItem(k));
          }
       }
       if (localStorage.getItem('user_id')) {
          document.getElementById('dashboard-tabs').style.display = 'block';
          updateProfileUI();
          updateAvailabilityUI();
          switchTab(localStorage.getItem('user_type').toLowerCase());
       }
       appReady = true;
       openReviewFromLink();
       try {
         const h = await fetch(CONFIG.BACKEND_URL + '/api/health');
         const d = await h.json();
         console.log('Backend connected:', d);
       } catch (e) {
         document.body.insertAdjacentHTML('afterbegin',
           '<div style="background:red;color:white;text-align:center;padding:8px;position:fixed;top:44px;width:100%;z-index:999999;font-size:0.8rem;">&#9888;&#65039; Server is waking up, please wait a minute and refresh</div>'
         );
       }
    }
""")

rep_function('setLang', r"""
    function setLang(l) {
       currentLang = TRANSLATIONS[l] ? l : 'en'; localStorage.setItem('lang', currentLang);
       document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          const text = TRANSLATIONS[currentLang][key] || t(key);
          if (text) el.innerText = text;
       });
       document.querySelectorAll('option[data-skill]').forEach(o => { o.innerText = skillName(o.value); });
       // Logged in: redraw the dashboard in the new language
       if (appReady) {
          if (localStorage.getItem('user_id')) {
             updateAvailabilityUI();
             switchTab(localStorage.getItem('active_tab') || localStorage.getItem('user_type').toLowerCase());
          }
       }
    }
""")

rep_function('handleRegistration', r"""
    async function handleRegistration(e) {
       e.preventDefault();
       resetErrors();
       const name = document.getElementById('reg-name').value.trim();
       const phone = document.getElementById('reg-phone').value.replace(/\D/g, '');
       const city = document.getElementById('reg-city').value;
       let valid = true;
       if (!name) { document.getElementById('err-name').style.display='block'; valid=false; }
       if (!/^\d{10}$/.test(phone)) { document.getElementById('err-phone').style.display='block'; valid=false; }
       if (!city) { document.getElementById('err-city').style.display='block'; valid=false; }
       if (selectedType === 'Worker') {
          if (!document.getElementById('reg-skill').value) { document.getElementById('err-skill').style.display='block'; valid=false; }
          const avail = getAvail();
          if (avail.length === 0) { document.getElementById('err-avail').style.display='block'; valid=false; }
       }
       if (!valid) return;
       const btn = document.getElementById('reg-btn-text');
       const ldr = document.getElementById('reg-loader');
       const showError = (msg) => {
          document.getElementById('reg-backend-err').innerText = msg;
          document.getElementById('reg-backend-err').style.display = 'block';
       };
       btn.style.display='none'; ldr.style.display='block';
       try {
          // Existing user: log in with the phone number (404 means not registered yet)
          const loginRes = await fetch(`${CONFIG.BACKEND_URL}/api/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone }) });
          if (loginRes.ok) {
             const loginData = await loginRes.json();
             loginUser(loginData.user, loginData.user.role === 'employer' ? 'Employer' : 'Worker', loginData.token);
             return;
          }
          if (loginRes.status === 400) { const d = await loginRes.json(); showError(d.msg || (d.errors ? d.errors[0].msg : '') || "Please check your phone number."); return; }
          if (loginRes.status === 429) { const d = await loginRes.json(); showError(d.error || "Too many attempts. Please wait a few minutes."); return; }
          if (loginRes.status !== 404) throw new Error("Could not reach server");
          const regUrl = `${CONFIG.BACKEND_URL}/api/auth/register-${selectedType.toLowerCase()}`;
          const body = { name, phone, city };
          if (pendingGoogleCredential) body.googleCredential = pendingGoogleCredential;
          if (selectedType === 'Worker') {
             body.skill = document.getElementById('reg-skill').value;
             body.experience = document.getElementById('reg-exp').value;
             body.salary = document.getElementById('reg-salary').value;
             body.availability = getAvail();
          } else {
             body.workerTypeNeeded = document.getElementById('reg-needed').value;
             body.workerCountNeeded = document.getElementById('reg-count').value;
             body.location = gpsCoords;
          }
          const regRes = await fetch(regUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
          const regData = await regRes.json();
          if (regRes.ok) {
             loginUser(regData.user, selectedType, regData.token);
          } else {
             showError(regData.msg || (regData.errors ? regData.errors[0].msg : '') || "Registration failed. Please try again.");
          }
       } catch (err) {
          showNotif(t('network_problem'), "red");
       } finally {
          btn.style.display='block'; ldr.style.display='none';
       }
    }
""")

rep_function('loginUser', r"""
    function loginUser(u, type, token) {
       localStorage.setItem('auth_token', token);
       localStorage.setItem('user_id', u.id || u._id);
       localStorage.setItem('user_name', u.name);
       localStorage.setItem('user_phone', u.phone);
       localStorage.setItem('user_type', type);
       localStorage.setItem('user_city', u.city);
       localStorage.setItem('user_skill', u.skill || u.workerTypeNeeded || "");
       // A worker who just registered (or is still live) is already shown to employers
       const live = u.isLooking ? new Date(u.availableUntil) > new Date() : false;
       localStorage.setItem('isLooking', live ? 'true' : 'false');
       if (live) {
          localStorage.setItem('availableUntil', u.availableUntil);
          localStorage.setItem('liveStartTime', String(Date.now()));
       }
       closeModal();
       loadDashboard();
       showNotif(type === 'Worker' ? t('welcome_worker') : t('welcome_employer'), "green");
       openReviewFromLink();
    }
""")

rep_function('loadCityJobs', r"""
    async function loadCityJobs() {
       const city = localStorage.getItem('user_city');
       const list = document.getElementById('city-jobs-list');
       list.innerHTML = LOADER;
       try {
          const res = await fetch(`${CONFIG.BACKEND_URL}/api/jobs/available/${encodeURIComponent(city)}`);
          if (!res.ok) throw new Error();
          const jobs = await res.json();
          if (jobs.length === 0) { list.innerHTML = `<p style="grid-column:1/-1; text-align:center; opacity:0.5;">${esc(t('no_jobs'))}</p>`; return; }
          list.innerHTML = jobs.map(j => `
             <div class="card-front" style="height:auto;">
                <h4 style="color:var(--accent);">${esc(skillName(j.jobType))}</h4>
                <div style="font-size:0.8rem; margin:10px 0; opacity:0.6;"><i class="fas fa-map-marker-alt"></i> ${esc(j.city)} &middot; ${esc(Number(j.workerCount) || 1)} ${esc(t('workers_word'))}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                   <span style="font-weight:900;">${j.amount ? '&#8377;' + esc(Number(j.amount)) : ''}</span>
                   <button class="btn btn-primary" style="padding:6px 12px; font-size:0.75rem;" onclick="acceptJob('${safeId(j._id)}')">${esc(t('accept_job'))}</button>
                </div>
             </div>
          `).join('');
       } catch (e) { list.innerHTML = `<p style="color:var(--red);">${esc(t('jobs_error'))}</p>`; }
    }
""")

rep_function('loadEmployerGrid', r"""
    async function loadEmployerGrid() {
       const grid = document.getElementById('worker-grid');
       const filter = document.getElementById('skill-filter');
       const skill = filter ? filter.value : '';
       grid.innerHTML = LOADER;
       try {
          // With an employer login the server includes each worker's phone number
          const res = await fetch(`${CONFIG.BACKEND_URL}/api/workers${skill ? '?skill=' + encodeURIComponent(skill) : ''}`, { headers: authHeaders() });
          if (!res.ok) throw new Error();
          let workers = await res.json();
          const now = new Date();
          workers = workers.filter(w => !w.hiredUntil || new Date(w.hiredUntil) < now);
          document.getElementById('employer-stats').innerText = t('workers_available', workers.length);
          grid.innerHTML = workers.length ? workers.map(w => renderWorkerCard(w)).join('') : `<p style="grid-column:1/-1; opacity:0.6;">${esc(t('no_workers'))}</p>`;
       } catch (e) { grid.innerHTML = `<p>${esc(t('load_error'))}</p>`; }
    }
""")

rep_function('renderWorkerCard', r"""
    function renderWorkerCard(w) {
       const id = safeId(w._id);
       workerCache[id] = w;
       const rating = w.totalRatings > 0 ? esc(t('rating')) + ': ' + esc(Number(w.rating).toFixed(1)) + ' &#9733; (' + esc(Number(w.totalRatings)) + ')' : esc(t('new_worker'));
       const phone = w.phone ? `<div style="font-size:0.9rem; margin-top:6px;"><i class="fas fa-phone"></i> <a href="tel:${esc(w.phone)}" onclick="event.stopPropagation()">${esc(w.phone)}</a></div>` : '';
       const avail = esc((w.availability || []).join(', ')) || esc(t('not_specified'));
       return `
          <div class="card-scene" id="scene-${id}">
             <div class="card-inner" onclick="this.classList.toggle('flipped')">
                <div class="card-front">
                   <h3>${esc(w.name)}</h3>
                   <span class="vid-label" style="background:#222; font-size:0.6rem; align-self:flex-start; margin-top:5px;">${esc(skillName(w.skill))}</span>
                   <div style="margin-top:20px; font-weight:800; color:var(--green);">&#8377;${esc(Number(w.expectedSalary) || 600)} / ${esc(t('day'))}</div>
                   <div style="font-size:0.8rem; margin-top:8px;">${rating}</div>
                   ${phone}
                   <button class="btn btn-primary" style="margin-top:auto; height:45px;" onclick="openHireModal('${id}', event)">${esc(t('hire_now'))}</button>
                </div>
                <div class="card-back">
                   <h4 style="color:var(--accent);">${esc(t('full_profile'))}</h4>
                   <p style="margin-top:10px;">${esc(t('exp'))}: ${esc(Number(w.experience) || 0)} ${esc(t('years'))}</p>
                   <p>${esc(t('city'))}: ${esc(w.city)}</p>
                   <p>${esc(t('availability'))}: ${avail}</p>
                   <button class="btn btn-outline" style="margin-top:auto; width:100%;" onclick="openRoots('${id}', event)">${esc(t('previous_jobs'))}</button>
                </div>
             </div>
          </div>
       `;
    }
""")

rep_function('openHireModal', r"""
    function openHireModal(id, e) {
       if (e) e.stopPropagation();
       const w = workerCache[id];
       if (!w) return;
       if (localStorage.getItem('user_type') !== 'Employer') { showNotif(t('login_to_hire'), "red"); return; }
       currentWorkerToHire = { id, name: w.name };
       document.getElementById('hire-worker-name').innerText = w.name;
       document.getElementById('hire-emp-name').value = localStorage.getItem('user_name');
       document.getElementById('hire-date').min = new Date().toISOString().split("T")[0];
       document.getElementById('hire-modal').style.display = 'flex';
    }
""")

rep_function('confirmHire', r"""
    async function confirmHire() {
       resetErrors();
       const loc = document.getElementById('hire-loc').value;
       const date = document.getElementById('hire-date').value;
       const time = document.getElementById('hire-time').value;
       const name = document.getElementById('hire-emp-name').value;
       let v = true;
       if (!loc) { document.getElementById('err-hire-loc').style.display='block'; v=false; }
       if (!date) { document.getElementById('err-hire-date').style.display='block'; v=false; }
       if (!time) { document.getElementById('err-hire-time').style.display='block'; v=false; }
       if (!name) { document.getElementById('err-hire-name').style.display='block'; v=false; }
       if (!v) return;
       const ldr = document.getElementById('hire-loader');
       ldr.style.display='block';
       const body = {
          workerId: currentWorkerToHire.id, employerName: name, location: loc, date: date, time: time,
          instructions: document.getElementById('hire-inst').value
       };
       try {
          const res = await fetch(`${CONFIG.BACKEND_URL}/api/calls/assign-job`, { method: 'POST', headers: authHeaders({'Content-Type':'application/json'}), body: JSON.stringify(body) });
          if (sessionExpired(res)) return;
          const data = await res.json();
          if (!res.ok) { showNotif(data.msg || t('hire_failed'), "red"); return; }
          confetti({ particleCount: 150, colors: ['#FF5C00', '#3b82f6'] });
          closeModal();
          const who = currentWorkerToHire.name;
          const phoneNote = data.phone ? ' ' + t('worker_phone') + ': ' + data.phone : '';
          gsap.to(`#scene-${currentWorkerToHire.id}`, {y: -1000, opacity:0, rotate:15, duration:1.5, ease:'power2.in', onComplete: () => {
             showNotif(t('calling', who) + phoneNote, "green");
             loadEmployerGrid();
          }});
       } catch (e) { showNotif(t('hire_failed'), "red"); }
       finally { ldr.style.display='none'; }
    }
""")

rep('btnText.innerText = "STOP LOOKING"; startTimerLoop();', "btnText.innerText = t('stop_looking'); startTimerLoop();")
rep('btnText.innerText = "START LOOKING";', "btnText.innerText = t('start_looking');")
rep('showNotif(isLive ? "Going offline..." : "Going live...", "green");', 'showNotif(isLive ? t(\'going_offline\') : t(\'going_live\'), "green");')
rep('} catch (e) { showNotif("Failed to update status. Check your connection.", "red"); }', '} catch (e) { showNotif(t(\'status_failed\'), "red"); }')
rep('showNotif("You are hidden from search. Tap START LOOKING to appear again.", "green");', 'showNotif(t(\'hidden_msg\'), "green");')
rep('} catch (e) { showNotif("Could not update. Check your connection.", "red"); }', '} catch (e) { showNotif(t(\'update_failed\'), "red"); }')

rep_function('updateProfileUI', r"""
    function updateProfileUI() {
       const name = localStorage.getItem('user_name');
       const type = localStorage.getItem('user_type');
       const initial = name ? name[0].toUpperCase() : "?";
       const trigger = document.getElementById('profile-trigger');
       trigger.innerText = initial;
       trigger.style.background = type === 'Worker' ? 'var(--accent)' : 'var(--accent-blue)';
       document.getElementById('prof-details').innerHTML = `
          <div style="font-weight:900;">${esc(name)}</div>
          <div style="font-size:0.7rem; opacity:0.5;">${esc(type)} | ${esc(localStorage.getItem('user_phone'))}</div>
          <div style="font-size:0.75rem; margin-top:5px; color:var(--accent);">${esc(skillName(localStorage.getItem('user_skill')))}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">${esc(localStorage.getItem('user_city'))}</div>
       `;
    }
""")

rep_function('renderTimeline', r"""
    async function renderTimeline() {
       const container = document.getElementById('secret-content');
       container.innerHTML = `<h2 style="color:var(--accent); margin-bottom:20px;">PROJECT ROADMAP</h2><div class="timeline-container"><div class="timeline-line"></div><div id="timeline-list"></div></div><button class="btn btn-primary" onclick="showTimelineForm()">+ ADD NEW ENTRY</button>`;
       const list = document.getElementById('timeline-list');
       try {
          const res = await fetch(CONFIG.BACKEND_URL + '/api/timeline');
          const data = await res.json();
          list.innerHTML = data.map((item) => `
             <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-card">
                   <div style="font-weight:900; font-size:0.8rem; color:var(--accent);">${esc(item.date)}</div>
                   <h4 style="margin:5px 0;">${esc(item.title)}</h4>
                   <p style="font-size:0.8rem; opacity:0.7;">${esc(item.description)}</p>
                   <span class="badge badge-${esc(String(item.status || '').toLowerCase().replace(/[^a-z]+/g, '-'))}">${esc(item.status)}</span>
                </div>
             </div>
          `).join('');
       } catch (e) { list.innerHTML = '<p>Offline Mode: Failed to fetch timeline.</p>'; }
    }
""")

rep_function('showTimelineForm', r"""
    async function showTimelineForm() {
       const f = prompt("Enter Entry: Date|Title|Desc|Status(Done/In Progress/Planned)");
       if (!f) return;
       const parts = f.split('|');
       if (parts.length < 4) { alert("Invalid format. Use: Date|Title|Desc|Status"); return; }
       const [date, title, description, status] = parts.map(p => p.trim());
       // Adding roadmap entries needs the admin password
       const pass = prompt("Admin password");
       if (!pass) return;
       showNotif("Saving entry...", "green");
       try {
          const res = await fetch(CONFIG.BACKEND_URL + '/api/timeline', {
             method:'POST', headers:{'Content-Type':'application/json', 'Authorization': pass},
             body: JSON.stringify({date, title, description, status})
          });
          if (!res.ok) throw new Error();
          renderTimeline();
       } catch (e) { showNotif("Failed to save timeline entry.", "red"); }
    }
""")

rep_function('lookupByPhone', r"""
    async function lookupByPhone() {
       const phone = document.getElementById('lookup-phone').value.replace(/\D/g, '');
       if (phone.length !== 10) { showNotif(t('enter_phone'), "red"); return; }
       const result = document.getElementById('phone-search-result');
       result.innerHTML = LOADER;
       const message = (key) => `<p style="color:var(--red);">${esc(t(key))}</p>`;
       try {
          const res = await fetch(`${CONFIG.BACKEND_URL}/api/workers/phone/${phone}`, { headers: authHeaders() });
          if (res.status === 401 || res.status === 403) { result.innerHTML = message('login_employer'); return; }
          if (res.status === 404) { result.innerHTML = message('no_worker_phone'); return; }
          if (!res.ok) throw new Error();
          const data = await res.json();
          result.innerHTML = renderWorkerCard(data.worker);
       } catch (e) { result.innerHTML = message('search_error'); }
    }
""")

rep_function('findNearbyWorkers', r"""
    async function findNearbyWorkers() {
       navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const grid = document.getElementById('worker-grid');
          grid.innerHTML = LOADER;
          try {
             const res = await fetch(`${CONFIG.BACKEND_URL}/api/workers/nearby?lat=${Number(lat)}&lng=${Number(lng)}`, { headers: authHeaders() });
             if (!res.ok) throw new Error();
             const workers = await res.json();
             grid.innerHTML = workers.length ? workers.map(w => renderWorkerCard(w)).join('') : `<p style="grid-column:1/-1; opacity:0.6;">${esc(t('no_workers'))}</p>`;
          } catch (e) { grid.innerHTML = `<p>${esc(t('load_error'))}</p>`; }
       }, () => showNotif("Could not get your location.", "red"));
    }
""")

# The old area filter is replaced by the work-type filter (loadEmployerGrid)
rep_function('loadWorkersByArea', '')
s = s.replace('\n\n\n  </script>', '\n\n  </script>')

if '&&' in s.split('<script>')[-1].split('</script>')[0]:
    raise SystemExit('the page script still contains "&&" (WordPress breaks it)')

open(out, 'w', encoding='utf-8', newline='').write(s)
print('written', out, len(s))
