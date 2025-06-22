import ApiService from '../services/api.min.js';

const apiService = new ApiService();
const usersTbody = document.getElementById('users-tbody');
const adminMessage = document.getElementById('admin-message');

async function fetchUsers() {
  try {
    const users = await apiService.get('/api/users', {}, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    renderUsers(users);
  } catch (err) {
    adminMessage.textContent = 'Failed to load users.';
    adminMessage.style.color = 'red';
  }
}

function renderUsers(users) {
  usersTbody.innerHTML = '';
  if (!Array.isArray(users) || users.length === 0) {
    usersTbody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
    return;
  }
  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.email}</td>
      <td>${user.username || ''}</td>
      <td>${user.role || ''}</td>
      <td><button class="admin-delete-btn" data-id="${user.id}">Delete</button></td>
    `;
    usersTbody.appendChild(tr);
  });
  document.querySelectorAll('.admin-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this user?')) {
        await deleteUser(userId);
      }
    });
  });
}

async function deleteUser(userId) {
  try {
    await apiService.delete(`/api/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    adminMessage.textContent = 'User deleted.';
    adminMessage.style.color = 'green';
    fetchUsers();
  } catch (err) {
    adminMessage.textContent = 'Failed to delete user.';
    adminMessage.style.color = 'red';
  }
}

document.addEventListener('DOMContentLoaded', fetchUsers);
