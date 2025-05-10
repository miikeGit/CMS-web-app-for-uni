<?php
// filepath: d:\xampp\htdocs\PVI\server\edit-student.php

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['id'])) {
  echo json_encode(['success' => false, 'error' => 'Invalid request data.']);
  exit;
}

$id = $input['id'];
$group_name = $input['group'] ?? '';
$first_name = $input['name'] ?? '';
$last_name = $input['surname'] ?? '';
$gender = $input['gender'] ?? '';
$birthday = $input['birthday'] ?? '';

// Database connection
$host = 'localhost';
$dbname = 'student_management'; // Or student_management
$username = 'root';
$password = '';

try {
  $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // Update the student in the DB
  $stmt = $pdo->prepare(
    'UPDATE students
     SET group_name = :group_name,
         first_name = :first_name,
         last_name = :last_name,
         gender = :gender,
         birthday = :birthday
     WHERE id = :id'
  );
  $stmt->execute([
    ':group_name' => $group_name,
    ':first_name' => $first_name,
    ':last_name' => $last_name,
    ':gender' => $gender,
    ':birthday' => $birthday,
    ':id' => $id
  ]);

  if ($stmt->rowCount() > 0) {
    echo json_encode(['success' => true]);
  } else {
    echo json_encode(['success' => false, 'error' => 'No rows updated.']);
  }
} catch (PDOException $e) {
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}