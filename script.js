if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
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

  const students = [];
  let editingStudentId = null;
  let studentToDelete = null;

  navLinks.forEach(link => {
    if (link.getAttribute("href") === currentPage) {
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

        checkboxes.forEach(checkbox => { checkbox.closest("tr").remove(); });
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

    function addStudentToTable(student) {
      const isOnline = student.name === "Mykhailo" && student.surname === "Malets";
      const statusText = isOnline ? "Online" : "Offline";
      const statusClass = isOnline ? "online" : "offline";
    
      const newRow = document.createElement("tr");
      newRow.setAttribute("data-id", student.id);
      newRow.innerHTML = `
        <td>
          <div class="checkbox-wrapper">
            <input type="checkbox" class="student-checkbox" aria-label="Select">
          </div>
        </td>
        <td class="group">${student.group}</td>
        <td class="name">${student.name} ${student.surname}</td>
        <td class="gender">${student.gender === "M" ? "Male" : "Female"}</td>
        <td class="birthday">${student.birthday}</td>
        <td>
          <div class="status-wrapper">
            <div class="dot-${statusClass}"></div>
            <span>${statusText}</span>
          </div>
        </td>
        <td>
          <button class="datatable-btn edit-btn">Edit</button>
          <span> | </span>
          <button class="datatable-btn delete-btn">Delete</button>
        </td>`;
    
      tableBody.appendChild(newRow);
    
      newRow.querySelector(".delete-btn").addEventListener("click", () => {
        const studentName = `${student.name} ${student.surname}`;
        studentToDelete = student.id;
        document.getElementById("confirm-question").textContent = `Are you sure you want to delete ${studentName}?`;
        confirmModal.classList.remove("hidden");
        confirmModal.classList.add("visible");
      });
    
      newRow.querySelector(".edit-btn").addEventListener("click", () => {
        document.getElementById("name").value = student.name;
        document.getElementById("surname").value = student.surname;
        document.getElementById("group").value = student.group;
        document.getElementById("gender").value = student.gender;
        document.getElementById("birthday").value = student.birthday;
    
        editingStudentId = student.id;

        document.getElementById("modal-title").textContent = "Edit Student";
        document.getElementById("confirm-add-btn").textContent = "Save";
    
        modal.classList.add("visible");
        modal.classList.remove("hidden");
      });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
    
      const studentData = {
        id: editingStudentId || Date.now(),
        group: document.getElementById("group").value,
        name: document.getElementById("name").value,
        surname: document.getElementById("surname").value,
        gender: document.getElementById("gender").value,
        birthday: document.getElementById("birthday").value,
      };
    
      if (editingStudentId) {
        const existingRow = document.querySelector(`tr[data-id="${editingStudentId}"]`);

        if (existingRow) {
          existingRow.querySelector(".group").textContent = studentData.group;
          existingRow.querySelector(".name").textContent = `${studentData.name} ${studentData.surname}`;
          existingRow.querySelector(".gender").textContent = studentData.gender === "M" ? "Male" : "Female";
          existingRow.querySelector(".birthday").textContent = studentData.birthday;
        }
        console.log("Edited student data:", JSON.stringify(studentData, null, 2));
        editingStudentId = null;
      } else {
        addStudentToTable(studentData);
      }
    
      closeModal();
    });

    confirmBtn.addEventListener("click", () => {
      if (studentToDelete) {
        removeStudent(studentToDelete);
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

    function removeStudent(id) {
      const index = students.findIndex(student => student.id === id);
      if (index !== -1) {
        students.splice(index, 1);
      }
      document.querySelector(`tr[data-id="${id}"]`).remove();
    }
  }

  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("open");
    navMenu.classList.toggle("active");
  });

});