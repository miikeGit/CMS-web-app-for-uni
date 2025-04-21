if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("https://miikegit.github.io/CMS-web-app-for-uni/service-worker.js")
      .then(() => console.log("Service Worker registered"))
      .catch((err) => console.log("Service Worker registration failed:", err));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("add-student-modal");
  const openBtn = document.getElementById("add-student-btn");
  const closeBtn = document.getElementById("close-modal-btn");
  const form = document.getElementById("add-student-form");
  const tableBody = document.getElementById("students-table-body");
  const confirmModal = document.getElementById("confirm-deletion");
  const confirmBtn = document.getElementById("confirm-deletion-btn");
  const cancelBtn = document.getElementById("cancel-deletion-btn");
  const currentPage = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".nav a");
  const isMainPage = currentPage === "" || currentPage === "index.html";
  const selectAllCheckbox = document.getElementById("select-all");
  const deleteBtn = document.getElementById("delete-selected-btn");
  const bellIcon = document.querySelector(".bell-icon");
  const badge = document.getElementById("badge");
  const menuToggle = document.getElementById("nav-icon1");
  const navMenu = document.getElementById("nav-menu");

  let editingStudentId = null;
  let studentToDelete = null;

  navLinks.forEach(link => {
    if (currentPage === "" && link.getAttribute("href") === "index.html") {
        link.classList.add("active");
    } else if (link.getAttribute("href") === currentPage) {
        link.classList.add("active");
    }
});
  
  if (badge) badge.classList.add("hidden");

  bellIcon.addEventListener("dblclick", () => {
    bellIcon.classList.add("shake-animation");
    badge.classList.remove("hidden");
    badge.classList.add("visible");

    setTimeout(() => {
      bellIcon.classList.remove("shake-animation");
    }, 800);
  });

  if (isMainPage) {
    deleteBtn.addEventListener("click", () => {
        const checkboxes = document.querySelectorAll(".student-checkbox:checked");

        if (checkboxes.length === 0) {
            alert("No students selected!");
            return;
        }

        if (!confirm("Are you sure you want to delete selected students?")) return;

        checkboxes.forEach(checkbox => {
          const row = checkbox.closest("tr");
          const studentId = row.getAttribute("data-id");
      
          fetch('server/delete-student.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: studentId })
          })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                row.remove();
              } else {
                alert('Error deleting student: ' + data.error);
              }
            })
            .catch(error => console.error('Delete error:', error));
        });
    });

    selectAllCheckbox.addEventListener("change", () => {
      const checkboxes = tableBody.querySelectorAll("input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
      });
    });

    openBtn.addEventListener("click", () => {
      document.getElementById("modal-title").textContent = "Add Student";
      document.getElementById("confirm-add-btn").textContent = "Add";
    
      editingStudentId = null;
      form.reset();
      
      modal.classList.add("visible");
      modal.classList.remove("hidden");
    });

    closeBtn.addEventListener("click", () => {
      closeModal();
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    function closeModal() {
      modal.classList.remove("visible");
      modal.classList.add("hidden");
      form.reset();
      editingStudentId = null;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();

  const nameInput = document.getElementById("name");
  const surnameInput = document.getElementById("surname");
  const birthdayInput = document.getElementById("birthday");

  const nameError = document.getElementById("name-error");
  const surnameError = document.getElementById("surname-error");
  const birthdayError = document.getElementById("birthday-error");

  const name = nameInput.value.trim();
  const surname = surnameInput.value.trim();
  const birthday = birthdayInput.value.trim();

  // const nameRegex = /^[A-Za-zА-Яа-яЁёІіЇїЄє'’ -]+$/;
  const today = new Date().toISOString().split("T")[0];

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!(nameRegex.test(name) || emailRegex.test(name))) {
    nameError.textContent = "Name must be valid or a valid email address!";
    nameInput.classList.add("input-error");
    isValid = false;
  } else {
    nameError.textContent = "";
    nameInput.classList.remove("input-error");
}


  let isValid = true;

  if (!nameRegex.test(name)) {
    nameError.textContent = "Name contains invalid characters!";
    nameInput.classList.add("input-error");
    isValid = false;
  } else {
    nameError.textContent = "";
    nameInput.classList.remove("input-error");
  }

  if (!nameRegex.test(surname)) {
    surnameError.textContent = "Surname contains invalid characters!";
    surnameInput.classList.add("input-error");
    isValid = false;
  } else {
    surnameError.textContent = "";
    surnameInput.classList.remove("input-error");
  }

  if (birthday && birthday > today) {
    birthdayError.textContent = "Date of birth cannot be in the future!";
    birthdayInput.classList.add("input-error");
    isValid = false;
  } else {
    birthdayError.textContent = "";
    birthdayInput.classList.remove("input-error");
  }

  if (!isValid) return;
    
      const studentData = {
        id: editingStudentId,
        group: document.getElementById("group").value,
        name: document.getElementById("name").value,
        surname: document.getElementById("surname").value,
        gender: document.getElementById("gender").value,
        birthday: document.getElementById("birthday").value,
      };
    
      if (editingStudentId) {
        fetch('server/edit-student.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentData)
        })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Update the row in the table
              const existingRow = document.querySelector(`tr[data-id="${editingStudentId}"]`);
              if (existingRow) {
                existingRow.querySelector(".group").textContent = studentData.group;
                existingRow.querySelector(".name").textContent = `${studentData.name} ${studentData.surname}`;
                existingRow.querySelector(".gender").textContent = studentData.gender === "M" ? "Male" : "Female";
                existingRow.querySelector(".birthday").textContent = studentData.birthday;
              }
              location.reload();
            } else {
              alert('Error editing student: ' + data.error);
            }
          })
          .catch(error => console.error('Edit error:', error));
    
        editingStudentId = null;
      } else {
        fetch('server/add-student.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(studentData),
        })
          .then(response => response.json())
          .then(data => {
            if (data.error) {
              console.error('Error adding student:', data.error);
              alert(data.error);
              return;
            }
      
            location.reload();
          })
          .catch(error => console.error('Error:', error));

      }
    
      closeModal();
    });

    confirmBtn.addEventListener("click", () => {
      if (studentToDelete) {
        removeStudentFromServer(studentToDelete);
        studentToDelete = null;
      }
      confirmModal.classList.add("hidden");
      confirmModal.classList.remove("visible");
    });

    cancelBtn.addEventListener("click", () => {
      studentToDelete = null;
      confirmModal.classList.add("hidden");
      confirmModal.classList.remove("visible");
    });

    function removeStudentFromServer(id) {
      fetch('server/delete-student.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Remove the row from the table
            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (row) row.remove();
          } else {
            alert('Error deleting student: ' + data.error);
          }
        })
        .catch(error => console.error('Delete error:', error));
    }

    fetch('server/students.php')
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          console.error('Error fetching students:', data.error);
          return;
        }
  
        data.forEach(student => {
          const row = document.createElement('tr');
          row.setAttribute("data-id", student.id);
          row.innerHTML = `
            <td>
              <div class="checkbox-wrapper">
                <input type="checkbox" class="student-checkbox" aria-label="Select">
              </div>
            </td>
            <td>${student.group_name}</td>
            <td>${student.first_name} ${student.last_name}</td>
            <td class="gender">${student.gender === "M" ? "Male" : "Female"}</td>
            <td>${student.birthday}</td>
            <td>${student.status}</td>
  
            <td>
              <button class="datatable-btn edit-btn">Edit</button>
                <span> | </span>
              <button class="datatable-btn delete-btn">Delete</button>
            </td>`;
  
          tableBody.appendChild(row);

          row.querySelector(".delete-btn").addEventListener("click", () => {
            const studentName = `${student.first_name} ${student.last_name}`;
            studentToDelete = student.id;
            document.getElementById("confirm-question").textContent = `Are you sure you want to delete ${studentName}?`;
            confirmModal.classList.remove("hidden");
            confirmModal.classList.add("visible");
          });

          row.querySelector(".edit-btn").addEventListener("click", () => {
            document.getElementById("name").value = student.first_name;
            document.getElementById("surname").value = student.last_name;
            document.getElementById("group").value = student.group_name;
            document.getElementById("gender").value = student.gender;
            document.getElementById("birthday").value = student.birthday;
        
            editingStudentId = student.id;
    
            document.getElementById("modal-title").textContent = "Edit Student";
            document.getElementById("confirm-add-btn").textContent = "Save";
        
            modal.classList.add("visible");
            modal.classList.remove("hidden");
          });

        });
      })
      .catch(error => console.error('Error:', error));
  }

  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("open");
    navMenu.classList.toggle("active");
  });
});