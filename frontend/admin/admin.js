import ApiService from '../services/api.min.js';
import '../utils/exportUtility.js';

const apiService = new ApiService();
const usersTbody = document.getElementById('users-tbody');
const adminMessage = document.getElementById('admin-message');
const tableSelect = document.getElementById('table-select');
const formatSelect = document.getElementById('format-select');
const limitInput = document.getElementById('limit-input');
const exportBtn = document.getElementById('export-btn');
const previewBtn = document.getElementById('preview-btn');
const exportStatus = document.getElementById('export-status');
const tableInfo = document.getElementById('table-info');
const exportPreview = document.getElementById('export-preview');
const exportUtility = new ExportUtility();

async function fetchUsers() {
  try {
    const response = await apiService.get('/api/users', {}, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
  
    renderUsers(response && Array.isArray(response.users) ? response.users : []);
  } catch (err) {
    adminMessage.textContent = 'Failed to load users.';
    adminMessage.style.color = 'red';
  }
}

function renderUsers(users) {
  console.log('users array:', users); 
  usersTbody.innerHTML = '';
  if (!Array.isArray(users) || users.length === 0) {
    usersTbody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
    return;
  }
  users.forEach(user => {
   
    const id = user[0] || '';
    const email = user[1] || '';
    const username = user[2] || '';
    const role = user[3] || '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${id}</td>
      <td>${email}</td>
      <td>${username}</td>
      <td>${role}</td>
      <td><button class="admin-delete-btn" data-id="${id}">Delete</button></td>
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
   
    const backendMsg = err?.data?.message || err?.message || 'Failed to delete user.';
    adminMessage.textContent = backendMsg;
    adminMessage.style.color = 'red';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchUsers();
  loadAvailableTables();
  setupExportEventListeners();
});

async function loadAvailableTables() {
  try {
    showExportStatus('Loading tables...', 'info');
    
    const response = await apiService.get('/api/admin/tables', {}, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });

    if (response.success && response.tables) {
      populateTableSelect(response.tables);
      showExportStatus('Tables loaded successfully', 'success');
    } else {
      throw new Error(response.message || 'Failed to load tables');
    }
  } catch (error) {
    console.error('Error loading tables:', error);
    showExportStatus(`Error loading tables: ${error.message}`, 'error');
    tableSelect.innerHTML = '<option value="">Failed to load tables</option>';
  }
}

function populateTableSelect(tables) {
  tableSelect.innerHTML = '<option value="">Select a table...</option>';
  
  tables.forEach(table => {
    const option = document.createElement('option');
    option.value = table.name;
    option.textContent = `${table.displayName} (${table.rowCount} rows)`;
    option.dataset.rowCount = table.rowCount;
    option.dataset.columns = JSON.stringify(table.columns);
    tableSelect.appendChild(option);
  });
}

function setupExportEventListeners() {
  tableSelect.addEventListener('change', async (e) => {
    const selectedOption = e.target.selectedOptions[0];
    if (selectedOption && selectedOption.value) {
      await showTableInfo(selectedOption);
    } else {
      tableInfo.innerHTML = '';
    }
  });

  exportBtn.addEventListener('click', async () => {
    await performExport();
  });

  previewBtn.addEventListener('click', async () => {
    await showPreview();
  });
}

async function showTableInfo(selectedOption) {
  const tableName = selectedOption.value;
  const rowCount = selectedOption.dataset.rowCount;
  const columns = JSON.parse(selectedOption.dataset.columns);

  tableInfo.innerHTML = `
    <div class="table-info-content">
      <h3>Table Information: ${tableName}</h3>
      <div class="info-grid">
        <div class="info-item">
          <strong>Total Rows:</strong> ${rowCount}
        </div>
        <div class="info-item">
          <strong>Columns:</strong> ${columns.length}
        </div>
        <div class="info-item">
          <strong>Column Names:</strong> ${columns.join(', ')}
        </div>
      </div>
    </div>
  `;
}

async function performExport() {
  const tableName = tableSelect.value;
  const format = formatSelect.value;
  const limit = limitInput.value ? parseInt(limitInput.value) : null;

  if (!tableName) {
    showExportStatus('Please select a table to export', 'error');
    return;
  }

  if (!format) {
    showExportStatus('Please select an export format', 'error');
    return;
  }

  try {
    showExportStatus('Exporting data...', 'info');
    exportBtn.disabled = true;    
    const params = { format };
    if (limit) {
      params.limit = limit;
    }

    const url = apiService._buildUrl(`/api/admin/tables/${tableName}/export`, params);
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });

    if (response.ok) {
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${tableName}_export.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
        showExportStatus(`Successfully exported data as ${filename}`, 'success');
    } else {
      let errorMessage = 'Export failed';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          const errorText = await response.text();
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
      } catch (parseError) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Export error:', error);
    showExportStatus(`Export failed: ${error.message}`, 'error');
  } finally {
    exportBtn.disabled = false;
  }
}

async function showPreview() {
  const tableName = tableSelect.value;
  const format = formatSelect.value;

  if (!tableName) {
    showExportStatus('Please select a table to preview', 'error');
    return;
  }

  if (!format) {
    showExportStatus('Please select a format for preview', 'error');
    return;
  }

  try {
    showExportStatus('Loading preview...', 'info');

    const response = await apiService.get(`/api/admin/tables/${tableName}/preview`, 
      { limit: 5 }, 
      {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      }
    );

    if (response.success && response.preview) {
      const { columns, rows } = response.preview;
      const data = rows.map(row => {
        const obj = {};
        columns.forEach((column, index) => {
          obj[column] = row[index];
        });
        return obj;
      });

      const preview = exportUtility.previewExport(data, format, 5);
      
      exportPreview.innerHTML = `
        <div class="preview-content">
          <h4>Preview (${format.toUpperCase()} format) - ${rows.length} of ${response.preview.totalRows} total rows</h4>
          <pre class="preview-data">${escapeHtml(preview)}</pre>
        </div>
      `;
      
      showExportStatus('Preview loaded', 'success');
    } else {
      throw new Error(response.message || 'Preview failed');
    }
  } catch (error) {
    console.error('Preview error:', error);
    showExportStatus(`Preview failed: ${error.message}`, 'error');
    exportPreview.innerHTML = '';
  }
}

function showExportStatus(message, type) {
  exportStatus.textContent = message;
  exportStatus.className = `export-status ${type}`;
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      exportStatus.textContent = '';
      exportStatus.className = 'export-status';
    }, 5000);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
