(function(){
  "use strict";
  function bind(id,inputName){
    const button=document.getElementById(id);
    const input=document.querySelector('#newPasswordForm input[name="'+inputName+'"]');
    if(!button||!input)return;
    button.addEventListener('click',function(){
      const show=input.type==='password';
      input.type=show?'text':'password';
      button.textContent=show?'Nascondi':'Mostra';
      button.setAttribute('aria-pressed',show?'true':'false');
      input.focus({preventScroll:true});
    });
  }
  function init(){bind('resetPasswordToggle','password');bind('resetPasswordConfirmToggle','passwordConfirm')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
