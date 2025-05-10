<?php
// filepath: d:\xampp\htdocs\PVI\server\add-student.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Database connection
$host = 'localhost';
$dbname = 'student_management';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get the JSON data from the request
    $data = json_decode(file_get_contents('php://input'), true);

    // Validate the data
    if (
        empty($data['group']) ||
        empty($data['name']) ||
        empty($data['surname']) ||
        empty($data['gender']) ||
        empty($data['birthday'])
    ) {
        echo json_encode(['error' => 'All fields are required.']);
        exit;
    }

    // Insert the student into the database
    $stmt = $pdo->prepare("INSERT INTO students (group_name, first_name, last_name, gender, birthday) VALUES (:group_name, :first_name, :last_name, :gender, :birthday)");
    $stmt->execute([
        ':group_name' => $data['group'],
        ':first_name' => $data['name'],
        ':last_name' => $data['surname'],
        ':gender' => $data['gender'],
        ':birthday' => $data['birthday'],
    ]);

    echo json_encode(['success' => 'Student added successfully.']);
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>