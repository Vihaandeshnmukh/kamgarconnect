<?php get_header(); ?>

  <div class="page-wipe" id="page-wipe"></div>
  
  <nav class="navbar scrolled">
    <div class="nav-inner">
      <a href="/" class="logo">
        <span class="logo-text">Kamgar<span class="logo-highlight">Connect</span></span>
      </a>
      <a href="/" class="btn-back" style="margin-left: auto; color: var(--text-secondary); font-size: 0.9rem;">← Back</a>
    </div>
  </nav>

  <section class="hero" style="min-height: 100vh; padding-top: 100px;">
    <div class="hero-bg-pattern"></div>
    <div class="hero-content reveal visible" style="max-width: 500px; text-align: left;">
      <h1 style="font-size: 2.2rem; margin-bottom: 10px;">Employer Registration</h1>
      <p style="color: var(--text-secondary); margin-bottom: 30px;">Find the best verified workers in your city.</p>

      <form id="employerForm" class="contact-form">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="name" placeholder="Enter your full name" required>
        </div>

        <div class="form-group">
          <label>Company / Home Name</label>
          <input type="text" id="company" placeholder="e.g. Patil Constructions or My Home" required>
        </div>

        <div class="form-group">
          <label>Mobile Number</label>
          <input type="tel" id="phone" placeholder="10-digit mobile number" pattern="[0-9]{10}" required>
        </div>

        <div class="form-group">
          <label>City</label>
          <select id="city" required>
            <option value="">Select City</option>
            <option value="Aurangabad">Aurangabad</option>
            <option value="Nagpur">Nagpur</option>
            <option value="Pune">Pune</option>
            <option value="Nashik">Nashik</option>
            <option value="Mumbai">Mumbai</option>
          </select>
        </div>

        <div class="form-group">
          <label>Type of Worker Needed</label>
          <select id="workerType" required>
            <option value="">Select Skill</option>
            <option value="Mason">Mason</option>
            <option value="Electrician">Electrician</option>
            <option value="Plumber">Plumber</option>
            <option value="Domestic Help">Domestic Help</option>
            <option value="Factory Worker">Factory Worker</option>
            <option value="Carpenter">Carpenter</option>
            <option value="Painter">Painter</option>
            <option value="Driver">Driver</option>
          </select>
        </div>

        <div class="form-group">
          <label>Number of Workers Needed</label>
          <input type="number" id="workerCount" min="1" value="1" required>
        </div>

        <button type="submit" class="btn btn-primary btn-full" id="submitBtn" style="margin-top: 20px;">
          Submit Registration
        </button>
      </form>

      <div id="successScreen" style="display: none; text-align: center; padding: 40px 0;">
        <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
        <h2 style="color: var(--green); margin-bottom: 10px;">Registration Successful!</h2>
        <p style="color: var(--text-secondary); line-height: 1.6;">We have saved your requirements. Our team will contact you shortly with available workers.</p>
        <a href="/" class="btn btn-outline" style="margin-top: 30px;">Back to Home</a>
      </div>
    </div>
  </section>

  <script src="/js/sync.js"></script>
  <script>
    document.getElementById('employerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.innerText = 'Processing...';

      const data = {
        name: document.getElementById('name').value,
        companyName: document.getElementById('company').value,
        phone: document.getElementById('phone').value,
        city: document.getElementById('city').value,
        workerType: document.getElementById('workerType').value,
        workerCount: document.getElementById('workerCount').value
      };

      const executeSubmit = async () => {
        try {
          const response = await fetch(`${CONFIG.BACKEND_URL}/api/register/employer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const result = await response.json();
          if (response.ok) {
            document.getElementById('employerForm').style.display = 'none';
            document.getElementById('successScreen').style.display = 'block';
          } else {
            alert('Error: ' + result.msg);
            submitBtn.disabled = false;
            submitBtn.innerText = 'Submit Registration';
          }
        } catch (err) {
          throw err;
        }
      };

      // Wrap in sync.js health checkpoint
      await checkHealthAndSubmit(executeSubmit, data, 'employer');
      if(document.getElementById('employerForm').style.display !== 'none') {
         submitBtn.disabled = false;
         submitBtn.innerText = 'Submit Registration';
      }
    });

    gsap.from('.hero-content', { opacity: 0, y: 30, duration: 1, ease: 'power3.out' });
  </script>

  <style>
    .bg-dark { background: var(--bg-base); }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .form-group input, .form-group select { 
      width: 100%; 
      background: var(--bg-surface); 
      border: 1px solid var(--border); 
      border-radius: var(--radius-sm); 
      padding: 12px 16px; 
      color: white; 
      font-size: 1rem;
      transition: border-color 0.3s;
    }
    .form-group input:focus, .form-group select:focus { border-color: var(--accent); outline: none; }
  </style>

<?php get_footer(); ?>