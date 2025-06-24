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
      window.location.href = '/home/home.html';
      break;
      
    case 'login':
      window.location.href = '/login/login.html';
      break;

    case 'signup':
      window.location.href = '/signup/signup.html';
      break;
      
    case 'pet-details':
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get('id');
      
      if (petId) {
        window.location.href = '/pets/pet-details/pet-details.html?id=' + petId;
      } else {
        window.location.href = '/pets/pets-page/pets-page.html';
      }
      break;
    
    default:
      contentArea.innerHTML = '<h1>Page Not Found</h1><p>The requested page does not exist.</p>';
  }
}