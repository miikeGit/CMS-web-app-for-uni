<?php

namespace App\Models;

use App\Core\Database;
use PDO;
use InvalidArgumentException;

class Student {
    private $pdo;

    public function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    private function checkDuplicate(string $firstName, string $lastName, string $birthday, ?int $excludeId = null): bool {
        $sql = "SELECT COUNT(*) FROM students
                WHERE first_name = :first_name
                  AND last_name = :last_name
                  AND birthday = :birthday";
        if ($excludeId !== null) {
            $sql .= " AND id != :exclude_id";
        }

        $stmt = $this->pdo->prepare($sql);
        $params = [
            ':first_name' => $firstName,
            ':last_name' => $lastName,
            ':birthday' => $birthday,
        ];
        if ($excludeId !== null) {
            $params[':exclude_id'] = $excludeId;
        }

        $stmt->execute($params);
        return $stmt->fetchColumn() > 0;
    }

    public function getAll($page = 1, $limit = 6) {
        $page = max(1, (int)$page);
        $limit = max(1, (int)$limit);
        $offset = ($page - 1) * $limit;

        $totalStmt = $this->pdo->query("SELECT COUNT(*) FROM students");
        $totalItems = $totalStmt->fetchColumn();

        $sql = "SELECT * FROM students ORDER BY id DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $students = $stmt->fetchAll();

        return [
            'totalItems' => (int)$totalItems,
            'students' => $students,
            'totalPages' => ceil($totalItems / $limit),
            'currentPage' => $page,
            'limit' => $limit
        ];
    }

    public function getPdoConnection() {
        return $this->pdo;
    }

    public function add($data) {
        if (
            empty($data['group']) ||
            empty($data['name']) ||
            empty($data['surname']) ||
            empty($data['gender']) ||
            empty($data['birthday'])
        ) {
            throw new InvalidArgumentException('All fields are required.');
        }

        if ($this->checkDuplicate($data['name'], $data['surname'], $data['birthday'])) {
            throw new InvalidArgumentException('Student with this name, surname, and birthday already exists.');
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
         if (empty($id)) {
             throw new InvalidArgumentException('Student ID is required for update.');
         }

         if (
            !isset($data['group']) || !isset($data['name']) || !isset($data['surname']) ||
            !isset($data['gender']) || !isset($data['birthday'])
         ) {
             throw new InvalidArgumentException('All fields (group, name, surname, gender, birthday) are required for update.');
         }

         if ($this->checkDuplicate($data['name'], $data['surname'], $data['birthday'], (int)$id)) {
             throw new InvalidArgumentException('Another student with this name, surname, and birthday already exists.');
         }

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
         return $stmt->rowCount();
    }

    public function delete($id) {
        if (empty($id)) {
            throw new InvalidArgumentException('Student ID is required for deletion.');
        }
        $sql = 'DELETE FROM students WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount();
    }
}