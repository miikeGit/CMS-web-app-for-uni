if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => console.log("Service Worker registered"))
      .catch((err) => console.log("Service Worker registration failed:", err));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginBtn = document.getElementById("cancel-login-btn");
  const loginErrorDiv = document.getElementById("login-error");
  const logoutLink = document.getElementById("logout-link");
  const elementsRequiringAuth = document.querySelectorAll(".requires-auth");

  const modal = document.getElementById("add-student-modal");
  const openBtn = document.getElementById("add-student-btn");
  const closeBtn = document.getElementById("close-modal-btn");
  const form = document.getElementById("add-student-form");
  const tableBody = document.getElementById("students-table-body");
  const paginationControls = document.getElementById("pagination-controls");
  const confirmModal = document.getElementById("confirm-deletion");
  const confirmBtn = document.getElementById("confirm-deletion-btn");
  const cancelBtn = document.getElementById("cancel-deletion-btn");
  const currentNavPage = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".nav a");
  const isMainPage = currentNavPage === "" || currentNavPage === "index.html";
  const selectAllCheckbox = document.getElementById("select-all");
  const deleteBtn = document.getElementById("delete-selected-btn");
  const bellIcon = document.querySelector(".bell-icon");
  const badge = document.getElementById("badge");
  const menuToggle = document.getElementById("nav-icon1");
  const navMenu = document.getElementById("nav-menu");

  let editingStudentId = null;
  let studentToDelete = null;
  let currentUser = null;

  let currentPage = 1;
  const itemsPerPage = 6;

  function updateUI(isLoggedIn) {
    currentUser = isLoggedIn ? (currentUser || {}) : null; 

    if (isLoggedIn) {
      loginBtn.style.display = "none";
      elementsRequiringAuth.forEach(el => el.style.display = ""); 
    } else {
      loginBtn.style.display = "";
      elementsRequiringAuth.forEach(el => el.style.display = "none");
      if (paginationControls) paginationControls.innerHTML = ''; 
      document.querySelectorAll('#students-table th.requires-auth, #students-table td.requires-auth').forEach(el => el.style.display = 'none');
      if (modal && modal.classList.contains('visible')) closeModal();
      if (confirmModal && confirmModal.classList.contains('visible')) {
          confirmModal.classList.add("hidden");
          confirmModal.classList.remove("visible");
      }
    }
    if (isMainPage) {
        fetchStudents(currentPage); 
    }
  }

  function checkAuthentication() {
    fetch('api.php/auth/check', { credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        currentUser = data.loggedIn ? data.user : null;
        updateUI(data.loggedIn); 
      })
      .catch(error => {
        console.error("Error checking auth:", error);
        currentUser = null;
        updateUI(false);
      });
  }

  if (loginBtn) {
      loginBtn.addEventListener("click", () => {
          loginErrorDiv.style.display = 'none';
          loginModal.classList.remove("hidden");
          loginModal.classList.add("visible");
      });
  }
  if (cancelLoginBtn) {
      cancelLoginBtn.addEventListener("click", () => {
          loginModal.classList.add("hidden");
          loginModal.classList.remove("visible");
          loginForm.reset();
      });
  }
  if (loginForm) {
      loginForm.addEventListener("submit", (event) => {
          event.preventDefault();
          loginErrorDiv.style.display = 'none';
          const username = document.getElementById("login-username").value;
          const password = document.getElementById("login-password").value;

          fetch('api.php/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password }),
              credentials: 'include'
          })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  loginModal.classList.add("hidden");
                  loginModal.classList.remove("visible");
                  loginForm.reset();
                  checkAuthentication();
              } else {
                  loginErrorDiv.textContent = data.error || 'Login failed.';
                  loginErrorDiv.style.display = 'block';
              }
          })
          .catch(error => {
              console.error("Login error:", error);
              loginErrorDiv.textContent = 'An error occurred during login.';
              loginErrorDiv.style.display = 'block';
          });
      });
  }

  if (logoutLink) {
      logoutLink.addEventListener("click", (event) => {
          event.preventDefault();
          fetch('api.php/auth/logout', {
              method: 'POST',
              credentials: 'include'
          })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  checkAuthentication();
              } else {
                  alert('Logout failed.');
              }
          })
          .catch(error => console.error("Logout error:", error));
      });
  }

  navLinks.forEach(link => {
    const linkHref = link.getAttribute("href");
    if ((currentNavPage === "" || currentNavPage === "index.html") && linkHref === "index.html") {
        link.classList.add("active");
    } else if (linkHref === currentNavPage) {
        link.classList.add("active");
    }
  });

  if (badge) badge.classList.add("hidden");
  if (bellIcon) {
    bellIcon.addEventListener("dblclick", () => {
      bellIcon.classList.add("shake-animation");
      if (badge) {
        badge.classList.remove("hidden");
        badge.classList.add("visible");
      }
      setTimeout(() => {
        bellIcon.classList.remove("shake-animation");
      }, 800);
    });
  }

  if (isMainPage) {
    function fetchStudents(page) {
        currentPage = page;
        const url = `api.php/students?page=${page}&limit=${itemsPerPage}`;

        fetch(url, { credentials: 'include' })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                         console.warn("Not authorized to fetch students.");
                         tableBody.innerHTML = '<tr><td colspan="7">Please log in to view students.</td></tr>';
                         if (paginationControls) paginationControls.innerHTML = '';
                         return null;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data === null) return;

                if (!data || typeof data !== 'object' || !Array.isArray(data.students) || data.totalItems === undefined) {
                    console.error('Error fetching students: Invalid data structure received', data);
                    tableBody.innerHTML = '<tr><td colspan="7">Error loading students data format.</td></tr>';
                     if (paginationControls) paginationControls.innerHTML = '';
                    return;
                }

                tableBody.innerHTML = '';

                if (data.students.length === 0 && data.currentPage > 1) {
                    fetchStudents(data.currentPage - 1);
                    return;
                } else if (data.students.length === 0) {
                     tableBody.innerHTML = '<tr><td colspan="7">No students found.</td></tr>';
                }

                data.students.forEach(student => {
                    const row = document.createElement('tr');
                    row.setAttribute("data-id", student.id);

                    let rowHTML = '';
                    if (currentUser) {
                        rowHTML += `
                        <td class="requires-auth">
                          <div class="checkbox-wrapper">
                            <input type="checkbox" class="student-checkbox" aria-label="Select">
                          </div>
                        </td>`;
                    } else {
                         rowHTML += `<td></td>`;
                    }

                    rowHTML += `
                        <td>${student.group_name || 'N/A'}</td>
                        <td>${student.first_name || ''} ${student.last_name || ''}</td>
                        <td class="gender">${student.gender === "M" ? "Male" : (student.gender === "F" ? "Female" : 'N/A')}</td>
                        <td>${student.birthday || 'N/A'}</td>
                        <td>${student.status || '<span class="dot-offline"></span> Offline'}</td>`;

                    if (currentUser) {
                        rowHTML += `
                        <td class="requires-auth">
                          <button class="datatable-btn edit-btn">Edit</button>
                            <span> | </span>
                          <button class="datatable-btn delete-btn">Delete</button>
                        </td>`;
                    } else {
                         rowHTML += `<td></td>`;
                    }

                    row.innerHTML = rowHTML;
                    tableBody.appendChild(row);

                    if (currentUser) {
                        const deleteBtnSingle = row.querySelector(".delete-btn");
                        const editBtnSingle = row.querySelector(".edit-btn");

                        if (deleteBtnSingle) {
                            deleteBtnSingle.addEventListener("click", () => {
                                const studentName = `${student.first_name} ${student.last_name}`;
                                studentToDelete = student.id;
                                document.getElementById("confirm-question").textContent = `Are you sure you want to delete ${studentName}?`;
                                confirmModal.classList.remove("hidden");
                                confirmModal.classList.add("visible");
                            });
                        }
                        if (editBtnSingle) {
                            editBtnSingle.addEventListener("click", () => {
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
                        }
                    }
                });

                renderPagination(data);

                document.querySelectorAll('#students-table th.requires-auth').forEach(th => th.style.display = currentUser ? '' : 'none');

            })
            .catch(error => {
                console.error('Error fetching students:', error);
                tableBody.innerHTML = '<tr><td colspan="7">Error loading students data.</td></tr>';
                if (paginationControls) paginationControls.innerHTML = '';
            });
    }

    function renderPagination(paginationData) {
        if (!paginationControls || !paginationData || paginationData.totalPages <= 1) {
            if (paginationControls) paginationControls.innerHTML = '';
            return;
        }

        const { totalPages, currentPage } = paginationData;
        paginationControls.innerHTML = '';

        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage <= 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) fetchStudents(currentPage - 1);
        });
        paginationControls.appendChild(prevButton);

        const maxPagesToShow = 5;
        let startPage, endPage;

        if (totalPages <= maxPagesToShow) {
            startPage = 1; endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor((maxPagesToShow - 1) / 2);
            const maxPagesAfterCurrent = Math.ceil((maxPagesToShow - 1) / 2);
            if (currentPage <= maxPagesBeforeCurrent + 1) {
                startPage = 1; endPage = maxPagesToShow - 1;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - maxPagesToShow + 2; endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent; endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        if (startPage > 1) {
            const firstPageButton = document.createElement('button');
            firstPageButton.textContent = '1';
            firstPageButton.addEventListener('click', () => fetchStudents(1));
            paginationControls.appendChild(firstPageButton);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.classList.add('ellipsis');
                paginationControls.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
                pageButton.disabled = true;
            }
            pageButton.addEventListener('click', () => fetchStudents(i));
            paginationControls.appendChild(pageButton);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.classList.add('ellipsis');
                paginationControls.appendChild(ellipsis);
            }
            const lastPageButton = document.createElement('button');
            lastPageButton.textContent = totalPages;
            lastPageButton.addEventListener('click', () => fetchStudents(totalPages));
            paginationControls.appendChild(lastPageButton);
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage >= totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) fetchStudents(currentPage + 1);
        });
        paginationControls.appendChild(nextButton);
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
          if (!currentUser) return;
          const checkboxes = document.querySelectorAll(".student-checkbox:checked");
          if (checkboxes.length === 0) {
              alert("No students selected!"); return;
          }
          if (!confirm(`Are you sure you want to delete ${checkboxes.length} selected student(s)?`)) return;

          const deletePromises = [];
          checkboxes.forEach(checkbox => {
              const row = checkbox.closest("tr");
              const studentId = row.getAttribute("data-id");
              deletePromises.push(
                  fetch(`api.php/students/${studentId}`, { method: 'DELETE', credentials: 'include' })
                      .then(response => response.json())
                      .then(data => {
                          if (!data.success) console.error(`Failed to delete student ${studentId}:`, data.error);
                          return data.success;
                      })
                      .catch(error => {
                          console.error(`Network error deleting student ${studentId}:`, error);
                          return false;
                      })
              );
          });

          Promise.all(deletePromises).then(() => {
              if (selectAllCheckbox) selectAllCheckbox.checked = false;
              fetchStudents(currentPage);
          });
      });
    }

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", () => {
        if (!currentUser) return; // Check login
        const checkboxes = tableBody.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach(checkbox => {
          checkbox.checked = selectAllCheckbox.checked;
        });
      });
    }

    if (openBtn) {
      openBtn.addEventListener("click", () => {
        if (!currentUser) return;
        document.getElementById("modal-title").textContent = "Add Student";
        document.getElementById("confirm-add-btn").textContent = "Add";
        editingStudentId = null;
        form.reset();
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        modal.classList.add("visible");
        modal.classList.remove("hidden");
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        closeModal();
      });
    }
    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
      });
    }
    function closeModal() {
      modal.classList.remove("visible");
      modal.classList.add("hidden");
      form.reset();
      editingStudentId = null;
      document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
      document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!currentUser) return;

        const nameInput = document.getElementById("name");
        const surnameInput = document.getElementById("surname");
        const birthdayInput = document.getElementById("birthday");
        const nameError = document.getElementById("name-error");
        const surnameError = document.getElementById("surname-error");
        const birthdayError = document.getElementById("birthday-error");

        const name = nameInput.value.trim();
        const surname = surnameInput.value.trim();
        const birthday = birthdayInput.value.trim();

        const nameRegex = /^[A-Za-zА-Яа-яЁёІіЇїЄє'’ -]+$/;
        const today = new Date().toISOString().split("T")[0];

        let isValid = true;

        nameError.textContent = ""; nameInput.classList.remove("input-error");
        surnameError.textContent = ""; surnameInput.classList.remove("input-error");
        birthdayError.textContent = ""; birthdayInput.classList.remove("input-error");

        if (!nameRegex.test(name)) {
          nameError.textContent = "Name contains invalid characters!";
          nameInput.classList.add("input-error");
          isValid = false;
        }
        if (!nameRegex.test(surname)) {
          surnameError.textContent = "Surname contains invalid characters!";
          surnameInput.classList.add("input-error");
          isValid = false;
        }
        if (!birthday) {
            birthdayError.textContent = "Birthday is required!";
            birthdayInput.classList.add("input-error");
            isValid = false;
        } else if (birthday > today) {
            birthdayError.textContent = "Date of birth cannot be in the future!";
            birthdayInput.classList.add("input-error");
            isValid = false;
        }

        if (!isValid) return;

        const studentData = {
          group: document.getElementById("group").value,
          name: name,
          surname: surname,
          gender: document.getElementById("gender").value,
          birthday: birthday,
        };

        const isEditing = !!editingStudentId;
        const fetchUrl = isEditing ? `api.php/students/${editingStudentId}` : 'api.php/students';
        const fetchMethod = isEditing ? 'PUT' : 'POST';

        fetch(fetchUrl, {
            method: fetchMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData),
            credentials: 'include'
        })
        .then(async response => {
          if (!response.ok) {
              if (response.status === 400) {
                  const errData = await response.json();
                throw new Error(errData.error || 'Validation failed.');
              }
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
      })
      .then(data => {
          if (data.success) {
              closeModal();
              fetchStudents(currentPage);
          } else {
              alert(`Operation failed: ` + (data.error || 'Unknown reason'));
          }
      })
      .catch(error => {
          console.error(`${isEditing ? 'Edit' : 'Add'} error:`, error);
          alert(`Error ${isEditing ? 'editing' : 'adding'} student: ${error.message}`);
      });
        if (isEditing) editingStudentId = null;
      });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          if (studentToDelete && currentUser) {
            removeStudentFromServer(studentToDelete);
            studentToDelete = null;
          }
          confirmModal.classList.add("hidden");
          confirmModal.classList.remove("visible");
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          studentToDelete = null;
          confirmModal.classList.add("hidden");
          confirmModal.classList.remove("visible");
        });
    }

    function removeStudentFromServer(id) {
      if (!currentUser) return;
      fetch(`api.php/students/${id}`, { method: 'DELETE', credentials: 'include' })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  fetchStudents(currentPage);
              } else {
                  alert('Error deleting student: ' + (data.error || 'Unknown error'));
              }
          })
          .catch(error => console.error('Delete error:', error));
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("open");
      if (navMenu) navMenu.classList.toggle("active");
    });
  }

  checkAuthentication();

});