import { loadPage } from '/router.js';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const route = e.target.getAttribute('data-route');
      loadPage(route);
    });
  });
  loadPage('home');
});