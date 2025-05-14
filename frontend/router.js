export function loadPage(pageId) {
  const contentArea = document.getElementById('app');
  contentArea.innerHTML = '<div class="loading">Loading...</div>';
  

  // Nu e ok sa facem redirectionare (momentan o sa fac asta, dar am sa schim)
  /*
     
| Injectare (cu fetch):
|   - incarci doar o parte din pagina in #app 
|   - avantaje: seamless, rapid, ca un SPA (Single Page App)    
|   - dezanvantaje: link direct catre pagina nu functioneaza fara JS 
| Redirectionare:
|   - browserul face navigare completa          
|   - avantaje: linkuri directe merg, mai simplu pentru inceput 
|   - dezanvantaje: reincarca toata pagina, mai lent                 |

  */
  switch(pageId) {
    case 'home':
      window.location.href = './home/home.html';
      break;
      
    case 'login':
      //contentArea.innerHTML = '<h1>Login Page</h1><p>Login form will go here.</p>';
      window.location.href = './login/login.html';
      break;
    case 'signin':
      //contentArea.innerHTML = '<h1>Sign In</h1><form>...</form>';
      window.location.href = './signin/signin.html';
      break;
    
    default:
      contentArea.innerHTML = '<h1>Page Not Found</h1><p>The requested page does not exist.</p>';
  }
}