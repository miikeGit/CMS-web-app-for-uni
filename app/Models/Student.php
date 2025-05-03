<?php
// filepath: d:\xampp\htdocs\PVI\app\Models\Student.php

namespace App\Models;

use App\Core\Database;
use PDO;
use PDOException;

class Student {
    private $pdo;

    public function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public function getAll() {
        $stmt = $this->pdo->query("SELECT * FROM students ORDER BY id DESC");
        return $stmt->fetchAll();
    }

    public function add($data) {
        // Basic validation (can be expanded)
        if (
            empty($data['group']) ||
            empty($data['name']) ||
            empty($data['surname']) ||
            empty($data['gender']) ||
            empty($data['birthday'])
        ) {
            throw new \InvalidArgumentException('All fields are required.');
        }

        $sql = "INSERT INTO students (group_name, first_name, last_name, gender, birthday)
                VALUES (:group_name, :first_name, :last_name, :gender, :birthday)";
        $stmt = $this->pdo->prepare($sql);

        return $stmt->execute([
            ':group_name' => $data['group'],
            ':first_name' => $data['name'],
            ':last_name' => $data['surname'],
            ':gender' => $data['gender'],
            ':birthday' => $data['birthday'],
        ]);
    }

    public function update($id, $data) {
         // Basic validation (can be expanded)
         if (empty($id)) {
             throw new \InvalidArgumentException('Student ID is required for update.');
         }
         // Add validation for other fields if necessary

         $sql = 'UPDATE students
                 SET group_name = :group_name,
                     first_name = :first_name,
                     last_name = :last_name,
                     gender = :gender,
                     birthday = :birthday
                 WHERE id = :id';
         $stmt = $this->pdo->prepare($sql);

         $stmt->execute([
             ':group_name' => $data['group'] ?? null,
             ':first_name' => $data['name'] ?? null,
             ':last_name' => $data['surname'] ?? null,
             ':gender' => $data['gender'] ?? null,
             ':birthday' => $data['birthday'] ?? null,
             ':id' => $id
         ]);
         return $stmt->rowCount(); // Returns the number of affected rows
    }

    public function delete($id) {
        if (empty($id)) {
            throw new \InvalidArgumentException('Student ID is required for deletion.');
        }
        $sql = 'DELETE FROM students WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount(); // Returns the number of affected rows
    }
}