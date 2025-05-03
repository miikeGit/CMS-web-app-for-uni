<?php
// filepath: d:\xampp\htdocs\PVI\app\Controllers\StudentController.php

namespace App\Controllers;

use App\Models\Student;
use PDOException;
use InvalidArgumentException;

class StudentController {
    private $studentModel;

    public function __construct() {
        $this->studentModel = new Student();
    }

    private function sendJson($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        // Consider adding CORS headers here if needed globally,
        // or manage them in a central router/middleware later.
        // header('Access-Control-Allow-Origin: *'); // Be cautious with '*' in production
        echo json_encode($data);
        exit;
    }

    public function index() {
        try {
            $students = $this->studentModel->getAll();
            $this->sendJson($students);
        } catch (PDOException $e) {
            $this->sendJson(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendJson(['error' => 'Invalid JSON input.'], 400);
            return;
        }

        try {
            $result = $this->studentModel->add($data);
            if ($result) {
                $this->sendJson(['success' => 'Student added successfully.'], 201); // 201 Created
            } else {
                // This case might not be reached if execute throws an exception on failure
                $this->sendJson(['error' => 'Failed to add student.'], 500);
            }
        } catch (InvalidArgumentException $e) {
            $this->sendJson(['error' => $e->getMessage()], 400); // Bad Request
        } catch (PDOException $e) {
            // Check for specific SQL errors like duplicates if needed
            $this->sendJson(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    public function update($id) {
         $data = json_decode(file_get_contents('php://input'), true);

         if (json_last_error() !== JSON_ERROR_NONE) {
             $this->sendJson(['error' => 'Invalid JSON input.'], 400);
             return;
         }
         // Add the id from the URL path to the data array
         $data['id'] = $id;

         try {
             $affectedRows = $this->studentModel->update($id, $data);
             if ($affectedRows > 0) {
                 $this->sendJson(['success' => true, 'message' => 'Student updated successfully.']);
             } else {
                 // Could be no changes were made or student not found
                 $this->sendJson(['success' => false, 'error' => 'No changes made or student not found.'], 404); // Or 200 OK if no change is not an error
             }
         } catch (InvalidArgumentException $e) {
             $this->sendJson(['success' => false, 'error' => $e->getMessage()], 400);
         } catch (PDOException $e) {
             $this->sendJson(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
         }
    }

    public function destroy($id) {
        try {
            $affectedRows = $this->studentModel->delete($id);
            if ($affectedRows > 0) {
                $this->sendJson(['success' => true, 'message' => 'Student deleted successfully.']);
            } else {
                $this->sendJson(['success' => false, 'error' => 'Student not found.'], 404); // Not Found
            }
        } catch (InvalidArgumentException $e) {
            $this->sendJson(['success' => false, 'error' => $e->getMessage()], 400);
        } catch (PDOException $e) {
            // Handle potential foreign key constraints if necessary
            $this->sendJson(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }
}