<?php get_header(); ?>

  <div id="loginOverlay" class="login-overlay">
    <div class="login-box">
      <h2>Admin Login</h2>
      <input type="password" id="adminPass" placeholder="Enter Password">
      <button onclick="login()" class="btn btn-primary btn-full">Login</button>
    </div>
  </div>

  <div class="admin-container" id="adminContent" style="display: none;">
    <div class="header">
      <h1 style="font-size: 1.5rem;">Admin Dashboard <span class="text-gradient">Kamgar Connect</span></h1>
      <div>
        <button onclick="downloadWorkersCSV()" class="btn-download">Download Workers CSV</button>
        <button onclick="downloadEmployersCSV()" class="btn-download" style="margin-left: 10px;">Download Employers CSV</button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <h3>Total Workers</h3>
        <p id="totalWorkers">0</p>
      </div>
      <div class="stat-card">
        <h3>Total Employers</h3>
        <p id="totalEmployers">0</p>
      </div>
      <div class="stat-card">
        <h3>Active Assignments</h3>
        <p>0</p>
      </div>
    </div>

    <h2 style="margin-bottom: 20px;">Registered Workers</h2>
    <table id="workerTable">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>City</th>
          <th>Skill</th>
          <th>Experience</th>
          <th>Salary/Day</th>
          <th>Availability</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>

    <h2 style="margin-bottom: 20px; margin-top: 60px;">Registered Employers</h2>
    <table id="employerTable">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>City</th>
          <th>Company</th>
          <th>Worker Type</th>
          <th>Number Needed</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <!-- ASSIGN JOB MODAL -->
  <div id="assignModal" class="login-overlay" style="display:none; z-index:2000;">
    <div class="login-box" style="text-align:left;">
      <h2 style="margin-bottom: 20px;">Assign Job</h2>
      <input type="hidden" id="assignWorkerId">
      <div style="margin-bottom:10px;"><label>Location</label><input type="text" id="assignLocation" placeholder="MGM Hospital Road"></div>
      <div style="margin-bottom:10px;"><label>Date</label><input type="date" id="assignDate"></div>
      <div style="margin-bottom:10px;"><label>Time</label><input type="time" id="assignTime" value="09:00"></div>
      <div style="margin-bottom:20px;"><label>Employer Name</label><input type="text" id="assignEmployer" placeholder="Ramesh Patel"></div>
      <div style="display:flex; gap:10px;">
        <button onclick="submitAssignJob()" class="btn btn-primary" style="flex:1;">Confirm & Call</button>
        <button onclick="document.getElementById('assignModal').style.display='none'" class="btn btn-outline" style="flex:1;">Cancel</button>
      </div>
    </div>
  </div>

  <script>
    let adminToken = '';

    let workersData = [];
    let employersData = [];

    async function login() {
      const pass = document.getElementById('adminPass').value;
      adminToken = pass;
      loadData();
    }

    async function loadData() {
      try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/admin/data`, {
          headers: { 'Authorization': adminToken }
        });
        
        if (!res.ok) {
          alert('Invalid Password');
          return;
        }

        const data = await res.json();
        workersData = data.workers;
        employersData = data.employers;
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';

        renderTables(data);
      } catch (err) {
        alert('Error loading data');
      }
    }

    function renderTables(data) {
      document.getElementById('totalWorkers').innerText = data.workers.length;
      document.getElementById('totalEmployers').innerText = data.employers.length;

      const wBody = document.querySelector('#workerTable tbody');
      wBody.innerHTML = data.workers.map(w => `
        <tr>
          <td>${w.name}</td>
          <td>${w.phone}</td>
          <td>${w.city}</td>
          <td>${w.skill}</td>
          <td>${w.experience}y</td>
          <td>₹${w.expectedSalary || 0}</td>
          <td>${w.availabilityDays || 7} Days</td>
          <td>${new Date(w.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn-action btn-call" onclick="initiateCall('${w._id}')">CALL</button>
            <button class="btn-action btn-assign" onclick="openAssignModal('${w._id}')">ASSIGN</button>
          </td>
        </tr>
      `).join('');

      const eBody = document.querySelector('#employerTable tbody');
      eBody.innerHTML = data.employers.map(e => `
        <tr>
          <td>${e.name}</td>
          <td>${e.phone}</td>
          <td>${e.city}</td>
          <td>${e.companyName || '-'}</td>
          <td>${e.workerType || '-'}</td>
          <td>${e.workerCount || 1}</td>
          <td>${new Date(e.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join('');
    }

    async function initiateCall(workerId) {
      // Find the CALL button for this worker and show spinner
      const btn = document.querySelector(`button[onclick="initiateCall('${workerId}')"]`);
      const origText = btn ? btn.innerText : 'CALL';
      if (btn) { btn.innerText = '⏳'; btn.disabled = true; }

      try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/calls/notify/${workerId}`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          if (btn) { btn.innerText = '✅'; btn.style.background = '#22C55E'; }
        } else {
          if (btn) { btn.innerText = '❌'; btn.style.background = '#EF4444'; }
        }
      } catch(e) {
        if (btn) { btn.innerText = '❌'; btn.style.background = '#EF4444'; }
      }

      // Reset button after 4 seconds
      setTimeout(() => {
        if (btn) { btn.innerText = origText; btn.disabled = false; btn.style.background = ''; }
      }, 4000);
    }

    function openAssignModal(workerId) {
      document.getElementById('assignWorkerId').value = workerId;
      document.getElementById('assignModal').style.display = 'flex';
    }

    async function submitAssignJob() {
       const wId = document.getElementById('assignWorkerId').value;
       const loc = document.getElementById('assignLocation').value;
       const date = document.getElementById('assignDate').value;
       const time = document.getElementById('assignTime').value;
       const emp = document.getElementById('assignEmployer').value;
       
       if(!loc || !emp) {
         alert('Location and Employer Name are required.');
         return;
       }

       // Find the ASSIGN button and show progress
       const btn = document.querySelector(`button[onclick="openAssignModal('${wId}')"]`);
       document.getElementById('assignModal').style.display='none';
       if (btn) { btn.innerText = '⏳'; btn.disabled = true; }

       try {
         const res = await fetch(`${CONFIG.BACKEND_URL}/api/calls/assign-job`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             workerId: wId,
             location: loc,
             date: date,
             time: time,
             employerName: emp
           })
         });
         const data = await res.json();
         if (res.ok && data.success) {
           if (btn) { btn.innerText = '✅'; btn.style.background = '#22C55E'; }
         } else {
           if (btn) { btn.innerText = '❌'; btn.style.background = '#EF4444'; }
           alert('Assign failed: ' + (data.msg || 'Unknown error'));
         }
       } catch(e) {
         if (btn) { btn.innerText = '❌'; btn.style.background = '#EF4444'; }
         alert('Network error assigning job.');
       }

       // Reset after 4 seconds
       setTimeout(() => {
         if (btn) { btn.innerText = 'ASSIGN'; btn.disabled = false; btn.style.background = ''; }
       }, 4000);
    }

    function downloadWorkersCSV() {
      let csv = 'Name,Phone,City,Skill,Experience,Salary,Availability,Date\n';
      workersData.forEach(w => {
        csv += `${w.name},${w.phone},${w.city},${w.skill},${w.experience},${w.expectedSalary},${w.availabilityDays},${new Date(w.createdAt).toLocaleDateString()}\n`;
      });
      downloadBlob(csv, 'workers.csv');
    }

    function downloadEmployersCSV() {
      let csv = 'Name,Phone,City,Company,WorkerType,Count,Date\n';
      employersData.forEach(e => {
        csv += `${e.name},${e.phone},${e.city},${e.companyName},${e.workerType},${e.workerCount},${new Date(e.createdAt).toLocaleDateString()}\n`;
      });
      downloadBlob(csv, 'employers.csv');
    }

    function downloadBlob(content, filename) {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }
  </script>

<?php get_footer(); ?>