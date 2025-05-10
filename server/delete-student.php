<?php
// filepath: d:\xampp\htdocs\PVI\server\delete-student.php

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['id'])) {
  echo json_encode(['success' => false, 'error' => 'Invalid request data.']);
  exit;
}

$id = $input['id'];

// Database connection
$host = 'localhost';
$dbname = 'student_management';
$username = 'root';
$password = '';

try {
  $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // Delete the student from DB
  $stmt = $pdo->prepare('DELETE FROM students WHERE id = :id');
  $stmt->execute([ ':id' => $id ]);

  if ($stmt->rowCount() > 0) {
    echo json_encode(['success' => true]);
  } else {
    echo json_encode(['success' => false, 'error' => 'No rows deleted.']);
  }
} catch (PDOException $e) {
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}