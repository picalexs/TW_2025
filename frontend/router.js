export function loadPage(pageId) {
  const contentArea = document.getElementById('app');
  contentArea.innerHTML = '<div class="loading">Loading...</div>';
  
  switch(pageId) {
    case 'home':
      window.location.href = './home/home.html';
      break;
      
    case 'login':
      contentArea.innerHTML = '<h1>Login Page</h1><p>Login form will go here.</p>';
      break;
    
    default:
      contentArea.innerHTML = '<h1>Page Not Found</h1><p>The requested page does not exist.</p>';
  }
}