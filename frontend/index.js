import languageManager from './language.js';

function setupLanguageButtons() {
  const enButton = document.querySelector('[data-lang="en"]');
  const roButton = document.querySelector('[data-lang="ro"]');
  
  if (!enButton || !roButton) {
    console.error('Language buttons not found');
    return;
  }
  
  if (languageManager.currentLanguage === 'en') {
    enButton.classList.add('active');
  } else {
    roButton.classList.add('active');
  }
  
  enButton.addEventListener('click', () => {
    document.querySelectorAll('.language-btn').forEach(b => b.classList.remove('active'));
    enButton.classList.add('active');
    languageManager.changeLanguage('en');
  });
  
  roButton.addEventListener('click', () => {
    document.querySelectorAll('.language-btn').forEach(b => b.classList.remove('active'));
    roButton.classList.add('active');
    languageManager.changeLanguage('ro');
  });
}
document.addEventListener('DOMContentLoaded', setupLanguageButtons);