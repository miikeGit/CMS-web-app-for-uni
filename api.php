<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $base_dir = __DIR__ . '/app/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit;
}

use App\Controllers\StudentController;
use App\Controllers\AuthController;

$request_uri = $_SERVER['REQUEST_URI'];
$script_name = $_SERVER['SCRIPT_NAME']; 
$base_path = dirname($script_name);
if ($base_path === '/' || $base_path === '\\') {
    $base_path = '';
}

$route_path = str_replace($script_name, '', $request_uri);
if (strpos($route_path, $base_path) === 0 && $base_path !== '') {
     $route_path = substr($route_path, strlen($base_path));
}

$route_path = trim(parse_url($route_path, PHP_URL_PATH), '/');
$path_parts = explode('/', $route_path);
$resource = $path_parts[0] ?? null;
$resource_id = $path_parts[1] ?? null;

$method = $_SERVER['REQUEST_METHOD'];

if ($resource === 'students') {

    if ($method !== 'GET' && !isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required.']);
        exit;
   }

    $controller = new StudentController();

    if ($method === 'GET' && $resource_id === null) {
        $controller->index();
    } elseif ($method === 'POST' && $resource_id === null) {
        $controller->store();
    } elseif ($method === 'PUT' && $resource_id !== null) {
        $controller->update($resource_id);
    } elseif ($method === 'DELETE' && $resource_id !== null) {
        $controller->destroy($resource_id);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found or method not allowed for /students']);
    }
} elseif ($resource === 'auth') {
    $controller = new AuthController();
    $action = $path_parts[1] ?? null;

    if ($method === 'POST' && $action === 'login') {
        $controller->login();
    } elseif ($method === 'POST' && $action === 'logout') {
        $controller->logout();
    } elseif ($method === 'GET' && $action === 'check') {
        $controller->checkAuth();
    } else {
         http_response_code(404);
         echo json_encode(['error' => 'Auth endpoint not found or method not allowed.']);
    }
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Resource not found']);
}

exit;