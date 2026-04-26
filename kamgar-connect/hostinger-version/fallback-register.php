<?php
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
?>