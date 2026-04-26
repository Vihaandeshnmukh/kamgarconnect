/**
 * Kamgar Connect — Live Public Stats
 * Real-time data from /api/stats/public
 */

const STATS_API = '/api/stats/public';
const STATS_CACHE_KEY = 'kamgar_public_stats';
const POLL_INTERVAL = 60000; // 60 seconds

async function fetchStats() {
    try {
        const response = await fetch(STATS_API);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        
        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        
        return data;
    } catch (error) {
        console.warn('Stats API failed, using cache:', error);
        const cached = localStorage.getItem(STATS_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached).data;
        }
        return null;
    }
}

function animateValue(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Get current value from text, remove commas
    const currentVal = parseInt(el.innerText.replace(/,/g, '')) || 0;
    
    const obj = { val: currentVal };
    gsap.to(obj, {
        val: target,
        duration: 2,
        ease: "power2.out",
        onUpdate: () => {
            el.innerText = Math.ceil(obj.val).toLocaleString('en-IN');
        }
    });
}

async function updateStatsUI() {
    const data = await fetchStats();
    if (!data) return;

    animateValue('stat-workers', data.total_workers);
    animateValue('stat-employers', data.total_employers);
    animateValue('stat-jobs', data.total_jobs_completed);
    animateValue('stat-cities', data.cities_covered.length);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // We wait a bit for initial hero animations to finish
    setTimeout(() => {
        updateStatsUI();
        
        // Trigger reveal if hidden
        const section = document.querySelector('.live-stats-bar');
        if (section && window.gsap) {
          gsap.to(section, { 
            opacity: 1, 
            visibility: 'visible', 
            duration: 1, 
            scrollTrigger: {
              trigger: section,
              start: 'top 80%'
            }
          });
        }
    }, 1000);
    
    // Set up polling
    setInterval(updateStatsUI, POLL_INTERVAL);
});
