// DOM Elements
const adminUsername = document.getElementById('adminUsername');
const logoutBtn = document.getElementById('logoutBtn');
const navLinks = document.querySelectorAll('.admin-sidebar a');
const adminSections = document.querySelectorAll('.admin-section');

// User Management Elements
const usersTableBody = document.getElementById('usersTableBody');
const refreshUsersBtn = document.getElementById('refreshUsersBtn');
const userSearchInput = document.getElementById('userSearchInput');
const userEditModal = document.getElementById('userEditModal');
const closeUserModalBtn = document.getElementById('closeUserModalBtn');
const userEditForm = document.getElementById('userEditForm');
const editUserId = document.getElementById('editUserId');
const editUsername = document.getElementById('editUsername');
const editEmail = document.getElementById('editEmail');
const editIsAdmin = document.getElementById('editIsAdmin');

// Chat Management Elements
const chatsTableBody = document.getElementById('chatsTableBody');
const refreshChatsBtn = document.getElementById('refreshChatsBtn');
const chatSearchInput = document.getElementById('chatSearchInput');
const chatDetailModal = document.getElementById('chatDetailModal');
const closeChatModalBtn = document.getElementById('closeChatModalBtn');
const chatDetailContent = document.getElementById('chatDetailContent');
const chatDetailUsername = document.getElementById('chatDetailUsername');
const chatDetailDate = document.getElementById('chatDetailDate');
const chatDetailUserMessage = document.getElementById('chatDetailUserMessage');
const chatDetailBotResponse = document.getElementById('chatDetailBotResponse');
const chatDetailFlag = document.getElementById('chatDetailFlag');
const saveChatDetailsBtn = document.getElementById('saveChatDetailsBtn');

// Dashboard Elements
const totalUsersElement = document.getElementById('totalUsers');
const totalChatsElement = document.getElementById('totalChats');
const newUsersElement = document.getElementById('newUsers');
const newChatsElement = document.getElementById('newChats');

// State
let currentSection = 'dashboard';
let currentPage = 1;
let totalPages = 1;
let currentChatId = null;
let users = [];
let chats = [];
let searchTimeout = null;

// Check auth status on load
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  
  // Add event listeners
  logoutBtn.addEventListener('click', handleLogout);
  navLinks.forEach(link => link.addEventListener('click', switchSection));
  refreshUsersBtn.addEventListener('click', loadUsers);
  refreshChatsBtn.addEventListener('click', () => loadChats(1));
  userSearchInput.addEventListener('input', debounce(filterUsers, 300));
  chatSearchInput.addEventListener('input', debounce(filterChats, 300));
  function closeUserModal() {
    userEditModal.classList.add('hidden');
  }
  
  closeUserModalBtn?.addEventListener('click', closeUserModal);
  
  // Add chat modal close button listener
  document.getElementById('closeChatModalBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('chatDetailModal').classList.add('hidden');
  });
  
  // Save chat changes listener
  document.getElementById('saveChatDetailsBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    const chatId = currentChatId;
    if (chatId) {
      const flag = document.getElementById('chatDetailFlag').value;
      saveChatChanges(chatId, flag);
    }
  });
  
  // Close modal when clicking outside
  document.getElementById('chatDetailModal')?.addEventListener('click', function(e) {
    if (e.target.id === 'chatDetailModal') {
      e.target.classList.add('hidden');
    }
  });
});

// Check auth status
async function checkAuthStatus() {
  try {
    showLoading('Checking authentication...');
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    const response = await fetch('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    if (!data.success || !data.data.isAdmin) {
      throw new Error('Admin access required');
    }

    adminUsername.textContent = data.data.username;
    hideLoading();
    loadDashboardStats();
    loadUsers();
  } catch (error) {
    showNotification(error.message, 'error');
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  }
}

// Handle logout
async function handleLogout() {
  try {
    localStorage.removeItem('token');
    window.location.href = '/';
  } catch (error) {
    showNotification('Logout failed', 'error');
  }
}

// Switch sections
function switchSection(e) {
  e.preventDefault();
  const targetSection = e.target.getAttribute('data-section');
  if (targetSection === currentSection) return;

  // Update active states
  navLinks.forEach(link => link.classList.remove('active'));
  e.target.classList.add('active');
  adminSections.forEach(section => section.classList.remove('active'));
  document.getElementById(targetSection).classList.add('active');

  currentSection = targetSection;

  // Load section data
  switch (targetSection) {
    case 'dashboard':
      loadDashboardStats();
      break;
    case 'users':
      loadUsers();
      break;
    case 'chats':
      loadChats(1);
      break;
  }
}

// Load dashboard stats
async function loadDashboardStats() {
  try {
    showLoading('Loading dashboard stats...');
    const token = localStorage.getItem('token');
    const response = await fetch('/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load stats');

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    totalUsersElement.textContent = data.data.totalUsers;
    totalChatsElement.textContent = data.data.totalChats;
    newUsersElement.textContent = data.data.newUsers;
    newChatsElement.textContent = data.data.newChats;

    hideLoading();
  } catch (error) {
    showNotification(error.message, 'error');
    hideLoading();
  }
}

// Load users
async function loadUsers() {
  try {
    showLoading('Loading users...');
    const token = localStorage.getItem('token');
    const response = await fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load users');

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    users = Array.isArray(data.data) ? data.data : [];
    renderUsersTable(users);
    hideLoading();
  } catch (error) {
    console.error('Load users error:', error);
    showNotification(error.message, 'error');
    usersTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading users. Please try again.</td></tr>';
    hideLoading();
  }
}

// Render users table
function renderUsersTable(users) {
  if (!users || !Array.isArray(users) || users.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No users found</td></tr>';
    return;
  }

  usersTableBody.innerHTML = users.map(user => `
    <tr>
      <td>${user.username || 'N/A'}</td>
      <td>${user.email || 'N/A'}</td>
      <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
      <td>
        ${user.isAdmin ? '<i class="fa-solid fa-check admin-tick"></i>' : ''}
      </td>
      <td class="cell-actions">
        <button class="btn-icon edit" onclick="editUser('${user._id}')" title="Edit User">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon delete" onclick="deleteUser('${user._id}')" title="Delete User">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Edit user functionality
function editUser(userId) {
  const user = users.find(u => u._id === userId);
  if (!user) {
    showNotification('User not found', 'error');
    return;
  }
  editUserId.value = user._id;
  editUsername.value = user.username || '';
  editEmail.value = user.email || '';
  editIsAdmin.checked = !!user.isAdmin;
  userEditModal.classList.remove('hidden');
}

userEditForm.onsubmit = async function(e) {
  e.preventDefault();
  const userId = editUserId.value;
  const username = editUsername.value.trim();
  const email = editEmail.value.trim();
  const isAdmin = editIsAdmin.checked;

  if (!userId || !username || !email) {
    showNotification('All fields are required.', 'error');
    return;
  }

  try {
    showLoading('Updating user...');
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, isAdmin })
    });
    if (!response.ok) throw new Error('Failed to update user');
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    showNotification('User updated successfully', 'success');
    userEditModal.classList.add('hidden');
    await loadUsers();
  } catch (error) {
    showNotification(error.message, 'error');
  } finally {
    hideLoading();
  }
};


// Filter users
function filterUsers() {
  const searchTerm = userSearchInput.value.toLowerCase();
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm) ||
    user.email.toLowerCase().includes(searchTerm)
  );
  renderUsersTable(filteredUsers);
}

// Toggle admin status
async function toggleAdminStatus(userId, isAdmin) {
  try {
    showLoading('Updating user status...');
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/users/${userId}/admin`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isAdmin })
    });

    if (!response.ok) throw new Error('Failed to update user status');

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    showNotification('User status updated successfully', 'success');
    loadUsers();
  } catch (error) {
    showNotification(error.message, 'error');
    hideLoading();
  }
}

// Delete user
async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user?')) return;

  try {
    showLoading('Deleting user...');
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete user');

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    showNotification('User deleted successfully', 'success');
    loadUsers();
  } catch (error) {
    showNotification(error.message, 'error');
    hideLoading();
  }
}

// Load chats
async function loadChats(page = 1) {
  try {
    showLoading('Loading chats...');
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/chats?page=${page}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load chats');

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    // Use backend pagination metadata
    chats = Array.isArray(data.data) ? data.data : [];
    totalPages = data.pages || 1;
    currentPage = data.currentPage || 1;

    // Create pagination container if it doesn't exist
    let paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) {
      paginationContainer = document.createElement('div');
      paginationContainer.className = 'pagination';
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.insertAdjacentElement('afterend', paginationContainer);
      }
    }

    // No need to paginate on frontend, backend sends correct page
    renderChatsTable(chats);
    updatePagination();
    hideLoading();
  } catch (error) {
    console.error('Load chats error:', error);
    showNotification(error.message, 'error');
    chatsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading chats. Please try again.</td></tr>';
    hideLoading();
  }
}

// Render chats table
function renderChatsTable(chats) {
  if (!chats || !Array.isArray(chats) || chats.length === 0) {
    chatsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No chats found</td></tr>';
    return;
  }

  chatsTableBody.innerHTML = chats.map(chat => `
    <tr>
      <td>${chat?.user?.username || 'Anonymous'}</td>
      <td>${chat?.createdAt ? new Date(chat.createdAt).toLocaleString() : 'N/A'}</td>
      <td class="cell-truncate">${chat?.message || 'No message'}</td>
      <td>
        ${chat?.flag ? `<span class="cell-flagged flag-label flag-${chat.flag}">${chat.flag.charAt(0).toUpperCase() + chat.flag.slice(1)}</span>` : '<span class="cell-flagged">-</span>'}
      </td>
      <td class="cell-actions">
        <button class="btn-icon view" onclick="viewChatDetails('${chat?._id}')" title="View Details">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-icon delete" onclick="deleteChat('${chat?._id}')" title="Delete Chat">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Filter chats
function filterChats() {
  const searchTerm = chatSearchInput.value.toLowerCase();
  const filteredChats = chats.filter(chat => 
    chat?.user?.username.toLowerCase().includes(searchTerm) ||
    chat.message.toLowerCase().includes(searchTerm)
  );
  renderChatsTable(filteredChats);
}

// View chat details
async function viewChatDetails(chatId) {
  try {
    showLoading('Loading chat details...');
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/chats/${chatId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load chat details');

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    const chat = data.data;
    currentChatId = chat._id;

    // Update modal content
    document.getElementById('chatDetailUsername').textContent = chat?.user?.username || 'Anonymous';
    document.getElementById('chatDetailDate').textContent = new Date(chat.createdAt).toLocaleString();
    document.getElementById('chatDetailUserMessage').textContent = chat.message;
    document.getElementById('chatDetailBotResponse').textContent = chat.response || '';
    document.getElementById('chatDetailSentiment').value = chat.sentiment || '';
    // Show confidence as percent with two decimals, e.g., 80.89%
    document.getElementById('chatDetailConfidence').value =
      typeof chat.confidence === 'number' ? (chat.confidence * 100).toFixed(2) + '%' : '';
    document.getElementById('chatDetailFlag').value = chat.flag == null ? '' : chat.flag;

    document.getElementById('chatDetailModal').classList.remove('hidden');
    hideLoading();
  } catch (error) {
    console.error('View chat details error:', error);
    showNotification(error.message, 'error');
    hideLoading();
  }
}

// Save chat changes
async function saveChatChanges(chatId, flag) {
  if (!chatId) {
    showNotification('Invalid chat ID', 'error');
    return;
  }

  try {
    showLoading('Updating chat...');
    
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/chats/${chatId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ flag: flag === '' ? null : flag })
    });

    if (!response.ok) throw new Error('Failed to update chat');
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    showNotification('Chat updated successfully', 'success');
    document.getElementById('chatDetailModal').classList.add('hidden');
    await loadChats(currentPage);
  } catch (error) {
    console.error('Update chat error:', error);
    showNotification(error.message, 'error');
  } finally {
    hideLoading();
  }
}

// Delete chat
async function deleteChat(chatId) {
  if (!confirm('Are you sure you want to delete this chat?')) return;

  try {
    showLoading('Deleting chat...');
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/chats/${chatId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete chat');

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    showNotification('Chat deleted successfully', 'success');
    loadChats(currentPage);
  } catch (error) {
    showNotification(error.message, 'error');
    hideLoading();
  }
}

// Update pagination
function updatePagination() {
  const paginationContainer = document.querySelector('.pagination');
  if (!paginationContainer) return;

  paginationContainer.innerHTML = `
    <button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      Previous
    </button>
    <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
    <button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      Next
    </button>
  `;
}

function changePage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadChats(currentPage);

}

// Utility functions
function showLoading(message = 'Loading...') {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loadingOverlay';
  loadingDiv.className = 'loading-overlay';
  loadingDiv.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-message">${message}</div>
  `;
  document.body.appendChild(loadingDiv);
}

function hideLoading() {
  const loadingDiv = document.getElementById('loadingOverlay');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}