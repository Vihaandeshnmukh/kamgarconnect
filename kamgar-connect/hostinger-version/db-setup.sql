CREATE TABLE IF NOT EXISTS workers (
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
);