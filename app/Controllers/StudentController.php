<?php

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
        echo json_encode($data);
        exit;
    }

    public function index() {

        $page = $_GET['page'] ?? 1;
        $limit = $_GET['limit'] ?? 6;

        try {
            $students = $this->studentModel->getAll($page, $limit);
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
                $this->sendJson(['success' => 'Student added successfully.'], 201);
            } else {
                $this->sendJson(['error' => 'Failed to add student.'], 500);
            }
        } catch (InvalidArgumentException $e) {
            $this->sendJson(['error' => $e->getMessage()], 400);
        } catch (PDOException $e) {
            $this->sendJson(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    public function update($id) {
         $data = json_decode(file_get_contents('php://input'), true);

         if (json_last_error() !== JSON_ERROR_NONE) {
             $this->sendJson(['error' => 'Invalid JSON input.'], 400);
             return;
         }
         $data['id'] = $id;

         try {
             $affectedRows = $this->studentModel->update($id, $data);
             if ($affectedRows > 0) {
                 $this->sendJson(['success' => true, 'message' => 'Student updated successfully.']);
             } else {
                 $this->sendJson(['success' => false, 'error' => 'No changes made or student not found.'], 404);
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
                $this->sendJson(['success' => false, 'error' => 'Student not found.'], 404);
            }
        } catch (InvalidArgumentException $e) {
            $this->sendJson(['success' => false, 'error' => $e->getMessage()], 400);
        } catch (PDOException $e) {
            $this->sendJson(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }
}