document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('matching-test-form');
  const messageDiv = document.getElementById('matching-message');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    messageDiv.textContent = '';
    const selectedInputs = Array.from(form.querySelectorAll('input:checked'));
    const tags = new Map();
    selectedInputs.forEach(input => {
      const ids = (input.dataset.tagId || '').split(',').map(id => id.trim()).filter(Boolean);
      const names = (input.dataset.tagName || '').split(',').map(n => n.trim()).filter(Boolean);
      ids.forEach((id, idx) => {
        if (id) tags.set(id, names[idx] || '');
      });
    });
    if (!tags.size) {
      messageDiv.textContent = window.languageManager.translate('error.selectAtLeastOne', 'Please select at least one answer!');
      return;
    }
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      messageDiv.textContent = window.languageManager.translate('error.mustBeLoggedIn', 'You must be logged in to save preferences!');
      return;
    }
    try {
      const apiBase = window.APP_CONFIG?.api?.baseURL || 'http://localhost:8080';
      const tagArray = Array.from(tags.entries()).map(([id, name]) => ({ id: Number(id), name }));
      
      const res = await fetch(`${apiBase}/api/user/preferences/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ tags: tagArray })
      });
      if (res.ok) {
        messageDiv.innerHTML = '<div style="color: green;">' + window.languageManager.translate('success.preferencesSaved', 'Preferences saved successfully!') + '</div>';
        
        setTimeout(async () => {
          await showMatchingPets(tagArray, apiBase, authToken);
        }, 1000);
      } else {
        const data = await res.json().catch(() => ({}));
        messageDiv.textContent = data.message || window.languageManager.translate('error.saveFailed', 'Error saving preferences!');
      }
    } catch (err) {
      messageDiv.textContent = window.languageManager.translate('error.network', 'Network error!');
    }
  });
});
