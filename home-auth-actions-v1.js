(function(){
  'use strict';
  const labels={
    it:{login:'Accedi',signup:'Crea account'},
    en:{login:'Log in',signup:'Create account'},
    ph:{login:'Mag-login',signup:'Gumawa ng account'}
  };

  function currentLanguage(){
    const saved=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    return labels[saved]?saved:'it';
  }

  function applyLabels(){
    const copy=labels[currentLanguage()];
    document.querySelectorAll('[data-home-auth-label="login"]').forEach(function(node){node.textContent=copy.login;});
    document.querySelectorAll('[data-home-auth-label="signup"]').forEach(function(node){node.textContent=copy.signup;});
    const login=document.querySelector('.home-auth-login');
    const signup=document.querySelector('.home-auth-create');
    if(login){login.setAttribute('aria-label',copy.login);login.setAttribute('title',copy.login);}
    if(signup){signup.setAttribute('aria-label',copy.signup);signup.setAttribute('title',copy.signup);}
  }

  document.addEventListener('click',function(event){
    if(event.target.closest('.language-switch button')) window.setTimeout(applyLabels,0);
  });
  window.addEventListener('storage',applyLabels);
  applyLabels();
})();
