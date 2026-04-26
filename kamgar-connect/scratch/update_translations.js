const fs = require('fs');
const path = 'd:/kamgar website/kamgar-connect/public/js/translations.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('    hero_stat_jobs: "पूरे हुए काम",', '    hero_stat_jobs: "पूरे हुए काम",\n    stat_employers: "नियोक्ता",\n    stat_cities: "कवर किए गए शहर",');
content = content.replace('    hero_stat_jobs: "पूर्ण झालेली कामे",', '    hero_stat_jobs: "पूर्ण झालेली कामे",\n    stat_employers: "मालक",\n    stat_cities: "कव्हर केलेली शहरे",');
fs.writeFileSync(path, content);
console.log('Update successful');
