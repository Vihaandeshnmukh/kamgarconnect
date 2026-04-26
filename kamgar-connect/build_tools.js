const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const themeDir = path.join(__dirname, 'kamgar-theme');
const hostingerDir = path.join(__dirname, 'hostinger-version');

if (!fs.existsSync(themeDir)) fs.mkdirSync(themeDir, { recursive: true });
if (!fs.existsSync(hostingerDir)) fs.mkdirSync(hostingerDir, { recursive: true });

// 1. Theme files
fs.writeFileSync(path.join(themeDir, 'style.css'), `/*
Theme Name: Kamgar Connect
Template: twentytwentyfour
Version: 1.0
*/\n`);

fs.writeFileSync(path.join(themeDir, 'functions.php'), `<?php
function kamgar_enqueue_scripts() {
    wp_enqueue_script('kamgar-config', get_stylesheet_directory_uri() . '/config.js', array(), '1.0', false);
    wp_enqueue_style('kamgar-style', get_stylesheet_directory_uri() . '/style.css');
    wp_enqueue_style('kamgar-voice', get_stylesheet_directory_uri() . '/voice.css');
    wp_enqueue_script('gsap', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js', array(), null, true);
    wp_enqueue_script('scrolltrigger', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js', array('gsap'), null, true);
    wp_enqueue_script('socketio', 'https://cdn.socket.io/4.7.2/socket.io.min.js', array(), null, true);
    wp_enqueue_script('kamgar-main', get_stylesheet_directory_uri() . '/main.js', array('kamgar-config', 'gsap', 'scrolltrigger'), '1.0', true);
    wp_enqueue_script('kamgar-voice-js', get_stylesheet_directory_uri() . '/voice.js', array(), '1.0', true);
    wp_enqueue_script('kamgar-i18n', get_stylesheet_directory_uri() . '/i18n.js', array(), '1.0', true);
    wp_enqueue_script('kamgar-sync', get_stylesheet_directory_uri() . '/sync.js', array(), '1.0', true);
}
add_action('wp_enqueue_scripts', 'kamgar_enqueue_scripts');
?>\n`);

// function extract body
function extractBody(html) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch ? bodyMatch[1] : html;
}

const configJs = fs.readFileSync(path.join(publicDir, 'config.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(publicDir, 'css', 'style.css'), 'utf8');
let voiceCss = '';
if (fs.existsSync(path.join(publicDir, 'css', 'voice.css'))) {
    voiceCss = fs.readFileSync(path.join(publicDir, 'css', 'voice.css'), 'utf8');
}
const mainJs = fs.readFileSync(path.join(publicDir, 'js', 'main.js'), 'utf8');
const syncJs = fs.readFileSync(path.join(publicDir, 'js', 'sync.js'), 'utf8');
let voiceJs = '';
if (fs.existsSync(path.join(publicDir, 'js', 'voice.js'))) {
    voiceJs = fs.readFileSync(path.join(publicDir, 'js', 'voice.js'), 'utf8');
}
let i18nJs = '';
if (fs.existsSync(path.join(publicDir, 'js', 'i18n.js'))) {
    i18nJs = fs.readFileSync(path.join(publicDir, 'js', 'i18n.js'), 'utf8');
}

function processFile(filename, wpFilename) {
    const html = fs.readFileSync(path.join(publicDir, filename), 'utf8');
    
    // WordPress version
    const bodyContent = extractBody(html);
    const wpContent = `<?php get_header(); ?>\n` + bodyContent + `\n<?php get_footer(); ?>`;
    fs.writeFileSync(path.join(themeDir, wpFilename), wpContent);

    // Hostinger Version (Inline everything)
    let inlineHtml = html;
    
    // Remove all external CSS links
    inlineHtml = inlineHtml.replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, '');
    
    // Remove local script tags completely
    inlineHtml = inlineHtml.replace(/<script[^>]*src="[^"]*config\.js"[^>]*><\/script>/gi, '');
    inlineHtml = inlineHtml.replace(/<script[^>]*src="[^"]*main\.js"[^>]*><\/script>/gi, '');
    inlineHtml = inlineHtml.replace(/<script[^>]*src="[^"]*sync\.js"[^>]*><\/script>/gi, '');
    inlineHtml = inlineHtml.replace(/<script[^>]*src="[^"]*voice\.js"[^>]*><\/script>/gi, '');
    inlineHtml = inlineHtml.replace(/<script[^>]*src="[^"]*i18n\.js"[^>]*><\/script>/gi, '');

    // Inject styles in head
    const styles = `\n<style>\n` + styleCss + `\n` + voiceCss + `\n</style>\n`;
    inlineHtml = inlineHtml.replace('</head>', styles + '</head>');

    // Inject scripts at the end of body
    const scripts = `\n<script>\n` + configJs + `\n` + i18nJs + `\n` + syncJs + `\n` + voiceJs + `\n` + mainJs + `\n</script>\n`;
    inlineHtml = inlineHtml.replace('</body>', scripts + '</body>');
    
    fs.writeFileSync(path.join(hostingerDir, filename), inlineHtml);
}

processFile('index.html', 'page-home.php');
processFile('register-worker.html', 'page-register-worker.php');
processFile('register-employer.html', 'page-register-employer.php');
processFile('admin.html', 'page-admin.php');

// Create fallback-register.php
fs.writeFileSync(path.join(hostingerDir, 'fallback-register.php'), `<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://kamgar.de');

$host = 'localhost';
$db = 'kamgar';
$user = 'your_db_user';
$pass = 'your_db_password';

try {
  $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
  $data = json_decode(file_get_contents('php://input'), true);
  $type = $_GET['type'] ?? 'worker';

  if ($type === 'worker') {
    $stmt = $pdo->prepare("INSERT INTO workers (name,phone,city,skill,experience,salary_per_day,availability_days,aadhaar) VALUES (?,?,?,?,?,?,?,?)");
    $stmt->execute([
      $data['name'] ?? '',
      $data['phone'] ?? '',
      $data['city'] ?? '',
      $data['skill'] ?? '',
      $data['experience'] ?? 0,
      $data['salary'] ?? 0,
      $data['availability'] ?? 7,
      $data['aadhaar'] ?? ''
    ]);
  } else {
    $stmt = $pdo->prepare("INSERT INTO employers (name,phone,city,company_name,worker_type,num_workers) VALUES (?,?,?,?,?,?)");
    $stmt->execute([
      $data['name'] ?? '',
      $data['phone'] ?? '',
      $data['city'] ?? '',
      $data['companyName'] ?? '',
      $data['workerType'] ?? '',
      $data['workerCount'] ?? 1
    ]);
  }
  echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch(Exception $e) {
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>`);

// Create db-setup.sql
fs.writeFileSync(path.join(hostingerDir, 'db-setup.sql'), `CREATE TABLE IF NOT EXISTS workers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(20),
  city VARCHAR(100),
  skill VARCHAR(100),
  experience INT,
  salary_per_day INT,
  availability_days INT,
  aadhaar VARCHAR(20),
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS employers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(20),
  city VARCHAR(100),
  company_name VARCHAR(255),
  worker_type VARCHAR(100),
  num_workers INT,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

console.log('Build completed successfully.');
