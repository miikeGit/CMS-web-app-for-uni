// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", () => {
//     navigator.serviceWorker
//       .register("./service-worker.js")
//       .then(() => console.log("Service Worker registered"))
//       .catch((err) => console.log("Service Worker registration failed:", err));
//   });
// }

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
  let chatSocket = null;
  let currentMongoUserId = null; // Зберігатиме ID користувача з MongoDB
  let activeChatRoomId = null; // ID активної відкритої чат-кімнати

    function initializeChatSocket() {
        chatSocket = io("http://localhost:3000", {
            withCredentials: true
        });

        chatSocket.on('connect', () => {
            console.log('Connected to chat server with ID:', chatSocket.id);
            // Після підключення, якщо користувач залогінений, автентифікуємо його на чат-сервері
            if (currentUser && currentUser.id && currentUser.name) { // currentUser з вашої PHP автентифікації
                const nameParts = currentUser.name.split(' ');
                chatSocket.emit('authenticate', {
                    phpStudentId: currentUser.id, // ID з PHP бази
                    firstName: nameParts[0] || 'Unknown',
                    lastName: nameParts.slice(1).join(' ') || 'User'
                });
            }
        });

        chatSocket.on('authenticated', (data) => {
            console.log(data.message);
            currentMongoUserId = data.mongoUserId; // Зберігаємо ID з MongoDB
            // Завантажити список чатів користувача
            if (isMessagesPage()) { // Перевірка, чи ми на сторінці messages.html
                 chatSocket.emit('loadChatRooms', { userPhpStudentId: currentUser.id });
            }
        });

        chatSocket.on('authError', (data) => {
            console.error('Chat authentication error:', data.message);
            // Можна показати помилку користувачу
        });

        chatSocket.on('chatError', (data) => {
            console.error('Chat Error:', data.message);
            alert(`Chat Error: ${data.message}`); // Простий alert для помилок
        });

        // Обробка отримання списку чатів
        chatSocket.on('chatRoomsList', (chatRooms) => {
            console.log('Received chat rooms:', chatRooms);
            if (isMessagesPage()) {
                renderChatList(chatRooms); // Функція для відображення списку чатів
            }
        });

        // Обробка створення нової кімнати
        chatSocket.on('newChatRoomCreated', (newChatRoom) => {
            console.log('New chat room created:', newChatRoom);
            if (isMessagesPage()) chatSocket.emit('loadChatRooms', { userPhpStudentId: currentUser.id });
        });

        chatSocket.on('chatRoomExists', (existingChatRoom) => {
            console.log('Chat room already exists:', existingChatRoom);
            if (isMessagesPage()) {
                // Можливо, підсвітити існуючий чат або перейти до нього
                const chatItem = document.querySelector(`.chat-item[data-room-id="${existingChatRoom._id}"]`);
                if (chatItem) {
                    chatItem.click(); // Активувати існуючий чат
                } else {
                    // Якщо чату немає в списку, перезавантажити список
                    chatSocket.emit('loadChatRooms', { userPhpStudentId: currentUser.id });
                }
            }
        });


        // Обробка додавання користувачів до чату
        chatSocket.on('usersAddedToChat', ({ chatRoomId, updatedRoom }) => {
            console.log(`Users added to chat ${chatRoomId}`, updatedRoom);
            chatSocket.emit('loadChatRooms', { userPhpStudentId: currentUser.id });
            renderChatMembers(updatedRoom.participants);
        });


        // Обробка нового повідомлення
        chatSocket.on('newMessage', (message) => {
            console.log('New message received:', message);
            if (isMessagesPage() && message.chatRoomId === activeChatRoomId) {
                appendMessageToChat(message); // Функція для додавання повідомлення в активний чат
            }
            // Оновити lastMessage в списку чатів
            updateChatListItemWithLastMessage(message.chatRoomId, message);
        });

        // Обробка завантаження історії чату
        chatSocket.on('chatHistory', ({ chatRoomId, messages }) => {
            console.log(`History for chat ${chatRoomId}:`, messages);
            if (isMessagesPage() && chatRoomId === activeChatRoomId) {
                renderChatMessages(messages); // Функція для відображення історії повідомлень
            }
        });

        // Обробка зміни статусу користувача
        chatSocket.on('userStatusChanged', ({ phpStudentId, status, userId }) => {
            console.log(`User ${phpStudentId} (mongoId: ${userId}) is now ${status}`);
            if (isMessagesPage()) {
                updateUserStatusInUI(status, userId); // Функція для оновлення статусу в UI
            }
        });

        // Обробка сповіщень (дзвіночок)
        chatSocket.on('notification', ({ message, chatRoomId, chatRoomName, isGroup }) => {
            console.log('Received notification:', message);
            // Перевірка, чи користувач НЕ в цьому чаті і НЕ на сторінці messages з цим активним чатом
            const onMessagesPage = isMessagesPage();
            const isChatActive = activeChatRoomId === chatRoomId;

            if (!onMessagesPage || (onMessagesPage && !isChatActive)) {
                if (bellIcon && badge) {
                    bellIcon.classList.add("shake-animation");
                    badge.classList.remove("hidden");
                    badge.textContent = parseInt(badge.textContent || "0") + 1;
                    setTimeout(() => {
                        bellIcon.classList.remove("shake-animation");
                    }, 800);
                }
                // Додати повідомлення до випадаючого списку сповіщень
                addNotificationToList(message, chatRoomId, chatRoomName, isGroup);
            }
        });


        chatSocket.on('disconnect', () => {
            console.log('Disconnected from chat server');
        });
    }

    // --- Допоміжні функції для UI чату ---
    function isMessagesPage() {
        return window.location.pathname.endsWith('messages.html');
    }

    function showChatArea(show) {
        const placeholder = document.querySelector('.placeholder-text');
        const header = document.querySelector('.chat-main .chat-header-main');
        const membersContainer = document.querySelector('.chat-main .chat-members');
        const messagesArea = document.querySelector('.chat-main .chat-messages-area');
        const inputForm = document.querySelector('.chat-main .message-input-form');

        if (placeholder) {
            placeholder.style.display = show ? 'none' : 'inline';
        }
        // Ensure these elements exist before trying to set display
        if (header) {
            header.style.display = show ? 'flex' : 'none'; // .chat-header-main is display: flex
        }
        if (membersContainer) {
            membersContainer.style.display = show ? 'flex' : 'none'; // .chat-members is display: flex
        }
        if (messagesArea) {
            messagesArea.style.display = show ? 'flex' : 'none'; // .chat-messages-area is display: flex; flex-direction: column
        }
        if (inputForm) {
            inputForm.style.display = show ? 'flex' : 'none'; // .message-input-form is display: flex
        }
    }

    function renderChatList(chatRooms) {
        const chatListUl = document.querySelector('.chat-sidebar .chat-list');
        if (!chatListUl) return;
        chatListUl.innerHTML = ''; // Очистити список

        chatRooms.forEach(room => {
            const li = document.createElement('li');
            li.classList.add('chat-item');
            li.setAttribute('data-room-id', room._id);

            let displayName = room.name;

            if (room.participants.length === 2) {
                const otherParticipant = room.participants.find(p => p.phpStudentId !== currentUser.id);
                if (otherParticipant) {
                    displayName = `${otherParticipant.firstName} ${otherParticipant.lastName}`;
                    otherUserPhpId = otherParticipant.phpStudentId;
                } else {
                     const self = room.participants.find(p => p.phpStudentId === currentUser.id);
                     if(self) displayName = self.firstName + " (Self)";
                     else displayName = room.name; // Fallback
                }
            }

            li.innerHTML = `
                <span class="material-icons user-avatar-icon">account_circle</span>
                <div class="chat-item-details">
                    <span class="chat-name">${escapeHTML(displayName)}</span>
                    ${room.lastMessage ? `<small class="last-message-preview">${escapeHTML(room.lastMessage.senderId.firstName)}:
                    ${truncateText(escapeHTML(room.lastMessage.content), 20)}</small>` : '<small class="last-message-preview">No messages yet.</small>'}
                </div>
            `;
            if (activeChatRoomId === room._id) {
                li.classList.add('active');
            }

            li.addEventListener('click', () => {
                if (activeChatRoomId === room._id && document.querySelector('.chat-main .chat-header-main h3').textContent === displayName) return;

                if (activeChatRoomId === room._id && document.querySelector('.chat-main .chat-header-main h3')?.textContent === displayName) {
                    // If the content is already loaded and header matches, maybe just ensure it's visible
                    showChatArea(true);
                    return;
                }

                const currentActive = chatListUl.querySelector('.chat-item.active');
                if (currentActive) currentActive.classList.remove('active');
                li.classList.add('active');

                activeChatRoomId = room._id;
                const chatHeaderMainH3 = document.querySelector('.chat-main .chat-header-main h3');
                
                // Update header text
                const headerDiv = document.querySelector('.chat-main .chat-header-main');
                if(headerDiv) { // Ensure headerDiv itself exists
                    headerDiv.innerHTML = `<h3>${escapeHTML(displayName)}</h3>`; // Set or replace h3 content
                }

                chatSocket.emit('loadChatHistory', { chatRoomId: room._id });
                renderChatMembers(room.participants);
                clearMessageInput();
                showChatArea(true);
            });
            chatListUl.appendChild(li);
        });
         if (chatRooms.length === 0) {
            showChatArea(false);
            chatListUl.innerHTML = '<p class="placeholder-text">No chats available</p>';
        }
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }


    function renderChatMembers(participants) {
        const membersDiv = document.querySelector('.chat-main .member-avatars');
        if (!membersDiv) return;
        membersDiv.innerHTML = '';

        participants.forEach(p => {
            const avatarSpan = document.createElement('span');
            avatarSpan.classList.add('material-icons', 'user-avatar-icon', 'small');
            avatarSpan.textContent = 'account_circle';
            avatarSpan.title = `${p.firstName} ${p.lastName} (${p.status})`;
            avatarSpan.setAttribute('data-user-mongo-id', p._id); // Для оновлення статусу
            if (p.phpStudentId === currentUser.id) {
                avatarSpan.style.border = `3px solid var(--color-accent-primary)`; // Виділення поточного користувача
                avatarSpan.style.borderRadius = "100px";
                avatarSpan.title += " (You)";
            }
            if (p.status === 'online') {
                avatarSpan.classList.add('online');
            } else {
                avatarSpan.classList.add('offline');
            }
            membersDiv.appendChild(avatarSpan);
        });

        const addBtn = document.createElement('button');
        addBtn.classList.add('add-member-btn');
        addBtn.innerHTML = `<i class="material-icons">add_circle_outline</i>`;
        addBtn.title = "Add members to chat";
        addBtn.addEventListener('click', () => {
            console.log('Open add member modal for chat:', activeChatRoomId);
            openAddUsersToChatModal(activeChatRoomId, participants.map(p => p.phpStudentId));
        });
        membersDiv.appendChild(addBtn);
    }

    function renderChatMessages(messages) {
        const messagesUl = document.querySelector('.chat-main .message-list-main');
        const scrollContainer = document.querySelector('.chat-main .chat-messages-area'); // Get the scrollable container
        if (!messagesUl) return;
        messagesUl.innerHTML = '';

        if (messages && messages.length > 0) {
            messages.forEach(msg => {
                appendMessageToChat(msg, false);
            });
        } else {
            messagesUl.innerHTML = '<li class="no-messages">No messages in this chat yet.</li>';
        }
        scrollToBottom(scrollContainer);
    }

    function appendMessageToChat(message, shouldScroll = true) {
        const messagesUl = document.querySelector('.chat-main .message-list-main');
        const scrollContainer = document.querySelector('.chat-main .chat-messages-area'); // Get the scrollable container
        if (!messagesUl) return;

        // Видалити "No messages yet" якщо воно є
        const noMessagesLi = messagesUl.querySelector('.no-messages');
        if (noMessagesLi) noMessagesLi.remove();

        const li = document.createElement('li');
        li.classList.add('message');
        // Перевіряємо чи існує message.senderId перед тим як доступатись до його властивостей
        const senderIsCurrentUser = message.senderId && message.senderId.phpStudentId === currentUser.id;
        li.classList.add(senderIsCurrentUser ? 'sent' : 'received');

        li.innerHTML = `
            <div class="message-content">
                <p>${escapeHTML(message.content)}</p>
                <span class="message-timestamp">${new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        `;
        messagesUl.appendChild(li);
        if (shouldScroll) {
            scrollToBottom(scrollContainer);
        }
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, function (match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    function scrollToBottom(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }

    function clearMessageInput() {
        const inputField = document.querySelector('.message-input-form input[type="text"]');
        if (inputField) inputField.value = '';
    }

    function updateUserStatusInUI(status, userId) {
        if (activeChatRoomId) {
            const memberAvatar = document.querySelector(`.chat-main .member-avatars .user-avatar-icon[data-user-mongo-id="${userId}"]`);
            if (memberAvatar) {
                memberAvatar.classList.remove('online', 'offline');
                memberAvatar.classList.add(status); // 'online' or 'offline'
                // Оновити title, якщо потрібно
                const currentTitle = memberAvatar.title;
                const namePart = currentTitle.substring(0, currentTitle.lastIndexOf('(')).trim();
                memberAvatar.title = `${namePart} (${status})`;
            }
        }
    }

    function updateChatListItemWithLastMessage(chatRoomId, message) {
        const chatItem = document.querySelector(`.chat-sidebar .chat-list .chat-item[data-room-id="${chatRoomId}"]`);
        if (chatItem) {
            let previewElement = chatItem.querySelector('.last-message-preview');
            if (!previewElement) {
                previewElement = document.createElement('small');
                previewElement.classList.add('last-message-preview');
                const detailsDiv = chatItem.querySelector('.chat-item-details');
                if (detailsDiv) {
                    detailsDiv.appendChild(previewElement);
                } else {
                    chatItem.appendChild(previewElement);
                }
            }
            previewElement.textContent = `You: ${truncateText(escapeHTML(message.content), 20)}`;

            const chatListUl = chatItem.parentNode;
            if (chatListUl && chatListUl.firstChild !== chatItem) {
                chatListUl.insertBefore(chatItem, chatListUl.firstChild);
            }
        }
    }


    function addNotificationToList(message, chatRoomId, chatRoomName, isGroup) {
        const notificationsListUl = document.querySelector('.notifications-content .messages-list');
        if (!notificationsListUl) return;

        const li = document.createElement('li');
        li.setAttribute('data-chatroom-id', chatRoomId);
        const senderName = message.senderId.firstName;
        li.innerHTML = `
            <span class="material-icons">account_circle</span>
            <div class="message-text">
                <strong>${escapeHTML(senderName)} ${isGroup ? `in ${truncateText(chatRoomName, 10)}` : ""}</strong>
                <p>${truncateText(escapeHTML(message.content), 30)}</p>
            </div>
            <span class="time">${new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        `;
        li.addEventListener('click', () => {
            window.location.href = `messages.html?chatId=${chatRoomId}`;
        });

        if (notificationsListUl.firstChild) {
            notificationsListUl.insertBefore(li, notificationsListUl.firstChild);
        } else {
            notificationsListUl.appendChild(li);
        }
        while (notificationsListUl.children.length > 5) {
            notificationsListUl.removeChild(notificationsListUl.lastChild);
        }

        const notificationsDropdownContent = document.querySelector('.notifications-content');
        const placeholderTextElement = notificationsDropdownContent.querySelector('.placeholder-text');
        if (notificationsListUl.children.length > 0) {
            placeholderTextElement.style.display = 'none';
        } else {
            placeholderTextElement.style.display = 'flex'; // Or 'inline', 'flex' depending on its default
        }
    }

    // Обробник для форми відправки повідомлення
    const messageForm = document.querySelector('.message-input-form');
    if (messageForm && isMessagesPage()) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = messageForm.querySelector('input[type="text"]');
            const content = input.value.trim();
            if (content && activeChatRoomId && currentUser && currentUser.id) {
                chatSocket.emit('sendMessage', {
                    chatRoomId: activeChatRoomId,
                    senderPhpStudentId: currentUser.id,
                    content: content
                });
                input.value = '';
            }
        });
    }

    // Обробник для кнопки "New chat room"
    const newChatBtn = document.querySelector('.new-chat-btn');
    if (newChatBtn && isMessagesPage()) {
        newChatBtn.addEventListener('click', () => {
            console.log('Open new chat room modal');
            openCreateChatModal();
        });
    }

    let allStudentsCache = []; // Кеш для списку студентів

    async function fetchAllStudentsForChatModal() {
        if (allStudentsCache.length > 0) return allStudentsCache;
        
        try {
            // Припускаємо, що ваш PHP API може повернути всіх студентів без пагінації
            // Або ви можете додати спеціальний ендпоінт /api.php/students/all
            const response = await fetch('api.php/students?limit=1000', { credentials: 'include' }); // Запит на велику кількість
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allStudentsCache = data.students || [];
            return allStudentsCache;
        } catch (error) {
            console.error("Failed to fetch students for chat modal:", error);
            return [];
        }
    }

async function openCreateChatModal() {
        const students = await fetchAllStudentsForChatModal();
        if (students.length === 0) {
            alert("No students available to create a chat or failed to load students.");
            return;
        }

        // Створення HTML для модального вікна
        const modalId = 'createChatModal';
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove(); // Видалити старе модальне, якщо є

        const modalWrapper = document.createElement('div');
        modalWrapper.classList.add('modal-wrapper', 'visible');
        modalWrapper.id = modalId;

        let studentOptionsHtml = students
            .filter(student => student.id !== currentUser.id) // Не показувати поточного користувача
            .map(student => `
                <div>
                    <input type="checkbox" id="student-${student.id}" name="chatParticipants" value="${student.id}">
                    <label for="student-${student.id}">${escapeHTML(student.first_name)} ${escapeHTML(student.last_name)}</label>
                </div>
            `).join('');

        if (!studentOptionsHtml) {
             studentOptionsHtml = "<p>No other students available to start a chat with.</p>";
        }

        modalWrapper.innerHTML = `
            <div class="modal">
                <h3>Create New Chat</h3>
                <h4>Select Participants:</h4>
                <div id="chatParticipantList" style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                    ${studentOptionsHtml}
                </div>
                <div class="modal-buttons">
                    <button id="confirmCreateChatBtn" class="confirm-btn">Create</button>
                    <button id="cancelCreateChatBtn" class="confirm-btn cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalWrapper);

        document.getElementById('cancelCreateChatBtn').addEventListener('click', () => {
            modalWrapper.remove();
        });

        document.getElementById('confirmCreateChatBtn').addEventListener('click', () => {
            const selectedInputs = document.querySelectorAll('#chatParticipantList input[name="chatParticipants"]:checked');
            const participantPhpStudentIds = Array.from(selectedInputs).map(input => parseInt(input.value));

            if (participantPhpStudentIds.length === 0) {
                alert("Please select at least one participant.");
                return;
            }

            chatSocket.emit('createChatRoom', {
                participantPhpStudentIds: participantPhpStudentIds,
                createdByPhpStudentId: currentUser.id
            });
            modalWrapper.remove();
        });
    }

    async function openAddUsersToChatModal(chatRoomId, existingParticipantPhpIds) {
        const students = await fetchAllStudentsForChatModal();
        if (students.length === 0) {
            alert("No students available to add or failed to load students.");
            return;
        }

        const modalId = 'addUsersToChatModal';
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const modalWrapper = document.createElement('div');
        modalWrapper.classList.add('modal-wrapper', 'visible');
        modalWrapper.id = modalId;

        const studentOptionsHtml = students
            .filter(student => !existingParticipantPhpIds.includes(student.id) && student.id !== currentUser.id)
            .map(student => `
                <div>
                    <input type="checkbox" id="addUser-${student.id}" name="usersToAdd" value="${student.id}">
                    <label for="addUser-${student.id}">${escapeHTML(student.first_name)} ${escapeHTML(student.last_name)}</label>
                </div>
            `).join('');

        modalWrapper.innerHTML = `
            <div class="modal">
                <h3>Add Users to Chat</h3>
                <div id="addUserList" style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                    ${studentOptionsHtml || "<p>No new users to add.</p>"}
                </div>
                <div class="modal-buttons">
                    <button id="confirmAddUsersBtn" class="confirm-btn" ${!studentOptionsHtml ? 'disabled' : ''}>Add</button>
                    <button id="cancelAddUsersBtn" class="confirm-btn cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalWrapper);

        document.getElementById('cancelAddUsersBtn').addEventListener('click', () => {
            modalWrapper.remove();
        });

        document.getElementById('confirmAddUsersBtn').addEventListener('click', () => {
            const selectedInputs = document.querySelectorAll('#addUserList input[name="usersToAdd"]:checked');
            const usersToAddPhpStudentIds = Array.from(selectedInputs).map(input => parseInt(input.value));

            if (usersToAddPhpStudentIds.length === 0) {
                alert("Please select users to add.");
                return;
            }

            chatSocket.emit('addUsersToChat', {
                chatRoomId,
                usersToAddPhpStudentIds
            });
            modalWrapper.remove();
        });
    }


    function setupChatIfLoggedIn() {
        if (currentUser && currentUser.id && !chatSocket) {
            initializeChatSocket();
        } else if (!currentUser && chatSocket) {
            chatSocket.disconnect();
            chatSocket = null;
            console.log('User logged out, chat socket disconnected.');
        }
    }

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

      function checkUrlForChatIdAndActivate() {
        if (isMessagesPage() && currentUser && currentUser.id) { // Ensure user is logged in
            const urlParams = new URLSearchParams(window.location.search);
            const chatIdFromUrl = urlParams.get('chatId');

            if (chatIdFromUrl) {
                console.log(`Chat ID from URL: ${chatIdFromUrl}. Attempting to activate.`);
                // We need to wait for chatRoomsList to ensure the chat item exists in the DOM
                // A robust way is to store chatIdFromUrl and check in chatRoomsList callback
                // For simplicity here, we'll assume loadChatRooms will be called and
                // if the chat exists, its 'active' class will be set, and then we can show the area.
                // The click simulation in 'chatRoomExists' or direct activation in 'chatRoomsList'
                // should handle calling showChatArea(true).

                // If chatSocket is ready, ensure rooms are loaded.
                if (chatSocket && chatSocket.connected) {
                    chatSocket.emit('loadChatRooms', { userPhpStudentId: currentUser.id });
                    // The 'chatRoomsList' handler or 'chatRoomExists' (if it's a new one being auto-opened)
                    // will need to ensure showChatArea(true) is called if chatIdFromUrl matches an active chat.
                }
            } else {
                // No chatId in URL, ensure placeholder is shown (it should be by default)
                showChatArea(false);
            }
        } else if (isMessagesPage()) {
            // Not logged in or currentUser not ready, show placeholder
            showChatArea(false);
        }
    }

  function checkAuthentication() {
    fetch('api.php/auth/check', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            const previousLoginStatus = !!currentUser;
            currentUser = data.loggedIn ? data.user : null;
            updateUI(data.loggedIn); // Оновлює UI синхронно

            // Ініціалізувати або закрити сокет залежно від статусу логіну
            setupChatIfLoggedIn();

            // Якщо користувач щойно залогінився і ми на сторінці повідомлень,
            // а сокет вже підключений, завантажуємо чати
            if (data.loggedIn && !previousLoginStatus && isMessagesPage() && chatSocket && chatSocket.connected) {
                 chatSocket.emit('loadChatRooms', { userPhpStudentId: currentUser.id });
            }

            // Перевірка URL на chatId при завантаженні сторінки messages
            checkUrlForChatIdAndActivate();


        })
        .catch(error => {
            console.error("Error checking auth:", error);
            currentUser = null;
            updateUI(false);
            setupChatIfLoggedIn(); // Закрити сокет, якщо помилка автентифікації
            if (isMainPage()) {
                showChatArea(false);
            }
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