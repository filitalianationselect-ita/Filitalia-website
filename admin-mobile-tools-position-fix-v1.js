(function(){
  "use strict";
  if(document.getElementById("filMobileToolsPositionFix"))return;
  const style=document.createElement("style");
  style.id="filMobileToolsPositionFix";
  style.textContent=`
    @media (max-width:900px){
      .mobile-bar#mobileNav,
      #mobileNav.mobile-bar{
        bottom:180px!important;
        padding:8px 8px 10px!important;
        box-shadow:0 -10px 28px rgba(3,35,24,.22)!important;
      }
      body{padding-bottom:270px!important}
      #filMobileToolsSheet.fil-mobile-tools-sheet{
        box-sizing:border-box!important;
        align-items:flex-start!important;
        justify-content:center!important;
        height:100dvh!important;
        padding:12px 12px 112px!important;
        padding-top:max(12px,env(safe-area-inset-top))!important;
        overflow:hidden!important;
      }
      #filMobileToolsSheet .fil-mobile-tools-panel{
        display:flex!important;
        flex-direction:column!important;
        width:100%!important;
        height:min(560px,calc(100dvh - 136px))!important;
        max-height:calc(100dvh - 136px)!important;
        margin:0!important;
        overflow:hidden!important;
      }
      #filMobileToolsSheet .fil-mobile-tools-head{flex:0 0 auto!important}
      #filMobileToolsSheet .fil-mobile-tools-list{
        flex:1 1 auto!important;
        min-height:0!important;
        overflow-y:auto!important;
        -webkit-overflow-scrolling:touch!important;
        padding-bottom:24px!important;
      }
    }
  `;
  document.head.appendChild(style);
})();
