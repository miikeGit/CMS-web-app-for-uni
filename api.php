<?php
// filepath: d:\xampp\htdocs\PVI\api.php

// Basic Autoloader
spl_autoload_register(function ($class) {
    // Adjust the path according to your structure
    // Converts App\Controllers\StudentController to app/Controllers/StudentController.php
    $prefix = 'App\\';
    $base_dir = __DIR__ . '/app/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return; // Not a class from our App namespace
    }
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

// CORS Headers (Consider making origin more specific in production)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight OPTIONS request (important for CORS)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204); // No Content
    exit;
}

use App\Controllers\StudentController;

// Simple Routing based on URL path and HTTP method
// Example URLs: /api.php/students, /api.php/students/123
$request_uri = $_SERVER['REQUEST_URI'];
$script_name = $_SERVER['SCRIPT_NAME']; // e.g., /PVI/api.php
$base_path = dirname($script_name); // e.g., /PVI
if ($base_path === '/' || $base_path === '\\') {
    $base_path = '';
}

// Remove base path and script name from URI to get the route path
$route_path = str_replace($script_name, '', $request_uri);
// Also remove the base directory if nested
if (strpos($route_path, $base_path) === 0 && $base_path !== '') {
     $route_path = substr($route_path, strlen($base_path));
}

// Remove leading/trailing slashes and query string
$route_path = trim(parse_url($route_path, PHP_URL_PATH), '/');
$path_parts = explode('/', $route_path);
$resource = $path_parts[0] ?? null;
$resource_id = $path_parts[1] ?? null;

$method = $_SERVER['REQUEST_METHOD'];

// --- Routing Logic ---
if ($resource === 'students') {
    $controller = new StudentController();

    if ($method === 'GET' && $resource_id === null) {
        $controller->index(); // Get all students
    } elseif ($method === 'POST' && $resource_id === null) {
        $controller->store(); // Add a new student
    } elseif ($method === 'PUT' && $resource_id !== null) {
        $controller->update($resource_id); // Update student by ID
    } elseif ($method === 'DELETE' && $resource_id !== null) {
        $controller->destroy($resource_id); // Delete student by ID
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found or method not allowed for /students']);
    }
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Resource not found']);
}

exit; // Ensure no further output