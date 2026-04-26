const fs = require('fs');
const path = 'd:/kamgar website/kamgar-connect/public/index.html';
let content = fs.readFileSync(path, 'utf8');

const html = `  <!-- ═══════════ LIVE STATS BAR ═══════════ -->
  <section class="live-stats-bar reveal">
    <div class="stats-container">
      <div class="stat-box">
        <div class="stat-val-wrap"><span id="stat-workers">0</span><span class="stat-plus">+</span></div>
        <span class="stat-txt" data-t="hero_stat_workers">Workers Registered</span>
      </div>
      <div class="stat-box">
        <div class="stat-val-wrap"><span id="stat-employers">0</span><span class="stat-plus">+</span></div>
        <span class="stat-txt" data-t="stat_employers">Employers</span>
      </div>
      <div class="stat-box">
        <div class="stat-val-wrap"><span id="stat-jobs">0</span><span class="stat-plus">+</span></div>
        <span class="stat-txt" data-t="hero_stat_jobs">Jobs Completed</span>
      </div>
      <div class="stat-box">
        <div class="stat-val-wrap"><span id="stat-cities">0</span><span class="stat-plus">+</span></div>
        <span class="stat-txt" data-t="stat_cities">Cities Covered</span>
      </div>
    </div>
  </section>\n\n`;

content = content.replace('  <!-- ═══════════ TRUST BAR ═══════════ -->', html + '  <!-- ═══════════ TRUST BAR ═══════════ -->');

fs.writeFileSync(path, content);
console.log('Update successful');
