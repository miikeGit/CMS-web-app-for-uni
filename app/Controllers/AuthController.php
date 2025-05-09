<?php

namespace App\Controllers;

use App\Models\Student;
use PDOException;

class AuthController {
    private $studentModel;

    public function __construct() {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
        $this->studentModel = new Student();
    }

    private function sendJson($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    public function login() {
        $data = json_decode(file_get_contents('php://input'), true);

        if (json_last_error() !== JSON_ERROR_NONE || empty($data['username']) || empty($data['password'])) {
            $this->sendJson(['success' => false, 'error' => 'Invalid input.'], 400);
            return;
        }

        $fullNameFromInput = trim($data['username']); // Trim whitespace
        $password = $data['password']; // This is the birthday

        // Split the full name from input into first and last names
        // The '2' limit ensures that if there are more spaces, they become part of the last name
        $nameParts = explode(' ', $fullNameFromInput, 2);
        $inputFirstName = $nameParts[0];
        $inputLastName = isset($nameParts[1]) ? $nameParts[1] : '';

        try {
            $pdo = $this->studentModel->getPdoConnection();
            $stmt = $pdo->prepare("SELECT id, first_name, last_name FROM students WHERE first_name = :inputFirstName AND last_name = :inputLastName AND birthday = :password LIMIT 1");
            $stmt->execute([
                ':inputFirstName' => $inputFirstName,
                ':inputLastName' => $inputLastName,
                ':password' => $password
            ]);
            $user = $stmt->fetch();

            if ($user) {
                $_SESSION['user_id'] = $user['id'];
                // Use the names fetched from DB for consistency, as they are confirmed to be correct
                $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
                $this->sendJson(['success' => true, 'user' => ['id' => $user['id'], 'name' => $_SESSION['user_name']]]);
            } else {
                $this->sendJson(['success' => false, 'error' => 'Invalid username or password.'], 401);
            }
        } catch (PDOException $e) {
            error_log("Login DB Error: " . $e->getMessage());
            $this->sendJson(['success' => false, 'error' => 'Database error during login.'], 500);
        }
    }

    public function logout() {
        $_SESSION = array();
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        $this->sendJson(['success' => true]);
    }

    public function checkAuth() {
        if (isset($_SESSION['user_id']) && isset($_SESSION['user_name'])) {
            $this->sendJson([
                'loggedIn' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'name' => $_SESSION['user_name']
                ]
            ]);
        } else {
            $this->sendJson(['loggedIn' => false]);
        }
    }
}