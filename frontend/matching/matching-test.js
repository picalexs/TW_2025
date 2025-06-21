document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('matching-test-form');
  const messageDiv = document.getElementById('matching-message');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    messageDiv.textContent = '';
    const selectedInputs = Array.from(form.querySelectorAll('input:checked'));
    const tags = new Set();
    selectedInputs.forEach(input => {
      (input.dataset.tags || '').split(',').forEach(tag => {
        if (tag.trim()) tags.add(tag.trim());
      });
    });
    if (!tags.size) {
      messageDiv.textContent = 'Selectează cel puțin un răspuns!';
      return;
    }
    // Check login
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      messageDiv.textContent = 'Trebuie să fii autentificat pentru a salva preferințele!';
      return;
    }
    try {
      const res = await fetch('/api/user/preferences/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ tags: Array.from(tags) })
      });
      if (res.ok) {
        messageDiv.textContent = 'Preferințele au fost salvate cu succes!';
      } else {
        const data = await res.json().catch(() => ({}));
        messageDiv.textContent = data.message || 'Eroare la salvare!';
      }
    } catch (err) {
      messageDiv.textContent = 'Eroare de rețea!';
    }
  });
});
