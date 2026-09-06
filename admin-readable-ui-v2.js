(function(){
'use strict';
const d=document;
const old=d.getElementById('adminReadableUiV2');if(old)old.remove();
const s=d.createElement('style');s.id='adminReadableUiV3';s.textContent=`
:root{
  --admin-accent:#126847;
  --admin-accent-dark:#093d2b;
  --admin-accent-mid:#18734f;
  --admin-soft:#e8f4ed;
  --admin-soft-2:#f3f9f6;
  --admin-warm:#fff3d6;
  --admin-line:#c9ddd2;
  --admin-text:#173d2e;
  --admin-muted:#60766c;
}
body,button,input,select,textarea{font-family:Montserrat,Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
body{font-size:15px!important;line-height:1.55!important;color:var(--admin-text)!important}

/* Scala tipografica unica */
h1{font-size:30px!important;line-height:1.12!important;letter-spacing:-.025em!important}
h2{font-size:21px!important;line-height:1.22!important;letter-spacing:-.015em!important}
h3{font-size:17px!important;line-height:1.3!important}
.muted{font-size:13px!important;line-height:1.55!important;color:var(--admin-muted)!important}
.eyebrow{font-size:11px!important;letter-spacing:.11em!important;font-weight:900!important}

/* Testate principali delle pagine, uguali al linguaggio Eventi */
#dashboard>.topbar,#events>.topbar,#news>.topbar,#registrations>.topbar,#players>.topbar,#staff>.topbar,#communications>.topbar,#payments>.topbar,#users>.topbar,#settings>.topbar,#languages>.topbar,#gallery>.topbar,#documents>.topbar,
section[id]>.topbar:first-child{
  padding:21px 23px!important;
  margin-bottom:18px!important;
  border-radius:20px!important;
  background:linear-gradient(135deg,var(--admin-accent-dark),var(--admin-accent-mid))!important;
  color:#fff!important;
  border:1px solid rgba(255,255,255,.09)!important;
  box-shadow:0 14px 34px rgba(7,54,37,.14)!important;
}
#dashboard>.topbar h1,#events>.topbar h1,#news>.topbar h1,#registrations>.topbar h1,#players>.topbar h1,#staff>.topbar h1,#communications>.topbar h1,#payments>.topbar h1,#users>.topbar h1,#settings>.topbar h1,#languages>.topbar h1,#gallery>.topbar h1,#documents>.topbar h1,
section[id]>.topbar:first-child h1{color:#fff!important;margin:3px 0 5px!important}
#dashboard>.topbar .muted,#events>.topbar .muted,#news>.topbar .muted,#registrations>.topbar .muted,#players>.topbar .muted,#staff>.topbar .muted,#communications>.topbar .muted,#payments>.topbar .muted,#users>.topbar .muted,#settings>.topbar .muted,#languages>.topbar .muted,#gallery>.topbar .muted,#documents>.topbar .muted,
section[id]>.topbar:first-child .muted{color:#cbe4d7!important;font-size:14px!important}
section[id]>.topbar:first-child .eyebrow{color:#a9d7c1!important}

/* Card e statistiche */
.card,.light-integration-card,.eventday-panel,.mail-preview,.document-card{
  border-radius:19px!important;
  border:1px solid var(--admin-line)!important;
  box-shadow:0 10px 28px rgba(9,55,38,.07)!important;
}
.card{padding:19px!important}
.card h2,.light-integration-card h2{font-size:21px!important;color:#123f2d!important;margin-top:0!important}
.card h3{font-size:17px!important;color:#18543b!important}
.grid4{gap:15px!important}
.stat{min-height:132px!important;padding:18px 19px!important;background:linear-gradient(145deg,#fff,var(--admin-soft-2))!important}
.stat span{font-size:11px!important;font-weight:900!important;letter-spacing:.065em!important;color:#547064!important}
.stat strong{font-size:31px!important;line-height:1.05!important;margin-top:9px!important;color:#104b35!important}
.stat small{font-size:12.5px!important;line-height:1.45!important;margin-top:7px!important;display:block!important}

/* Form, filtri e toolbar */
.form-grid,.light-form{gap:15px!important}
.field label,.light-form label,.drawer-section label,.modal-card label,.event-editor-card label,#communications label,#news label{
  font-size:12px!important;
  line-height:1.3!important;
  font-weight:900!important;
  letter-spacing:.025em!important;
  color:#315747!important;
}
input,select,textarea,.input,.select{
  font-size:15px!important;
  line-height:1.4!important;
  min-height:50px!important;
  padding:12px 14px!important;
  border-radius:13px!important;
  border:1px solid #b9d2c5!important;
  background:#fff!important;
  color:#183d2e!important;
}
textarea{min-height:130px!important;resize:vertical!important}
input:focus,select:focus,textarea:focus,.input:focus,.select:focus{
  outline:none!important;
  border-color:#3a966e!important;
  box-shadow:0 0 0 3px rgba(24,115,79,.13)!important;
}
.toolbar{gap:11px!important;padding:13px!important;border-radius:16px!important;background:#f2f8f5!important;border:1px solid #d5e5dc!important}

/* Pulsanti */
.btn,button.primary,button.secondary,button.ghost{
  font-size:14px!important;
  line-height:1.2!important;
  min-height:44px!important;
  padding:11px 16px!important;
  border-radius:11px!important;
  font-weight:800!important;
}
.btn.small{font-size:12.5px!important;min-height:38px!important;padding:9px 13px!important}
.actions{gap:9px!important}

/* Tabelle */
.table-wrap{border-radius:17px!important;border:1px solid #d1e1d8!important;overflow:auto!important;background:#fff!important}
table{font-size:14px!important;line-height:1.45!important}
th{font-size:11.5px!important;letter-spacing:.055em!important;padding:14px 15px!important;background:#edf6f1!important;color:#315747!important}
td{font-size:14px!important;padding:15px!important;vertical-align:middle!important}
tbody tr:hover{background:#f5faf7!important}
.person b{font-size:14.5px!important}.person .muted{font-size:12.5px!important}
.pill{font-size:10.5px!important;padding:6px 9px!important}

/* Finestre e modali nello stesso modello di Eventi */
.light-modal,.modal,.drawer-backdrop,[class*="news"][class*="modal"],[id*="news"][class*="modal"]{background:rgba(5,29,21,.68)!important}
.light-modal-card,.modal-card,.reg-drawer,.drawer,[class*="news"][class*="modal"]>div,[class*="news"][class*="drawer"]{
  font-size:15px!important;
  line-height:1.55!important;
  background:linear-gradient(180deg,#f7fcf9,#edf6f1)!important;
  border:1px solid #bcd7c8!important;
  box-shadow:0 35px 100px rgba(3,29,20,.30)!important;
}
.light-modal-card{width:min(840px,96vw)!important;max-height:94vh!important;padding:24px!important;border-radius:24px!important}
.modal-card{width:min(900px,96vw)!important;max-height:94vh!important;border-radius:24px!important;padding:0!important;overflow:auto!important}
.light-modal-card>h2{
  font-size:28px!important;
  color:#fff!important;
  background:linear-gradient(135deg,var(--admin-accent-dark),var(--admin-accent-mid))!important;
  margin:-24px -24px 18px!important;
  padding:21px 24px!important;
  border-radius:23px 23px 0 0!important;
}
.modal-head,.drawer-head{
  background:linear-gradient(135deg,var(--admin-accent-dark),var(--admin-accent-mid))!important;
  color:#fff!important;
  padding:21px 23px!important;
  border-radius:23px 23px 0 0!important;
}
.modal-head h2,.drawer-head h2{font-size:28px!important;color:#fff!important;margin:0!important}
.modal-head .muted,.drawer-head .muted{color:#cbe4d7!important;font-size:14px!important}
.modal-card>.grid,.modal-card>label,.modal-card>textarea,.modal-card>.preview,.modal-card>.hint,.modal-card>.modal-actions{margin-left:23px!important;margin-right:23px!important}
.modal-card>.grid:first-of-type{margin-top:22px!important}
.modal-actions,.light-modal-actions,.drawer-actions,.event-editor-actions{gap:10px!important;padding-top:16px!important}
.modal-actions{padding:17px 23px 22px!important;margin-left:0!important;margin-right:0!important;border-top:1px solid #ccded4!important;background:rgba(247,252,249,.96)!important}
.light-modal-actions .btn,.modal-actions .btn,.drawer-actions .btn,.event-editor-actions .btn{font-size:14px!important;min-height:45px!important;padding:11px 17px!important}

/* Schede laterali */
.reg-drawer,.drawer{width:min(620px,96vw)!important}
.drawer-body{padding:20px!important}
.drawer-section{padding:18px!important;border-radius:17px!important;background:#fff!important;border:1px solid #d3e3da!important;margin-bottom:15px!important}
.drawer-section h3{font-size:18px!important;color:#18543b!important;margin-top:0!important}
.drawer-summary{gap:10px!important}.drawer-summary>div{padding:14px!important;border-radius:14px!important}

/* Comunicazioni */
#communications .comms-layout{gap:18px!important}
#communications .card{padding:20px!important}
#communications .card h2{font-size:21px!important}
.template-grid{gap:12px!important}
.template-card{padding:17px!important;border-radius:17px!important;font-size:14px!important;background:linear-gradient(145deg,#fff,#f1f7f4)!important}
.template-card b{font-size:15.5px!important;margin-bottom:7px!important}
.recipient-box{font-size:14px!important;padding:15px!important;background:var(--admin-warm)!important;border-color:#ead39a!important}
.mail-preview-head{padding:22px!important}.mail-preview-head h2{font-size:24px!important}.mail-preview-body{font-size:15px!important;padding:23px!important}

/* News */
#news .card{padding:20px!important}
#news .card h2{font-size:21px!important}
[class*="news"][class*="modal"] h2,[id*="news"][class*="modal"] h2{font-size:28px!important}
[class*="news"][class*="drawer"] .drawer-head,[id*="news"][class*="drawer"] .drawer-head{background:linear-gradient(135deg,var(--admin-accent-dark),var(--admin-accent-mid))!important}

/* Event Day allineato alla stessa scala */
.eventday-top{padding:18px 22px!important}.eventday-top b{font-size:20px!important}.eventday-top .muted{font-size:13px!important;color:#cbe4d7!important}
.eventday-body{padding:21px!important}.eventday-stat{padding:16px!important;border-radius:17px!important}.eventday-stat span{font-size:11px!important}.eventday-stat strong{font-size:29px!important}
.eventday-tools{padding:15px!important}.eventday-player{padding:14px!important;font-size:14px!important}.eventday-player b{font-size:15px!important}.eventday-player small{font-size:12.5px!important}
.eventday-detail{padding:21px!important}.eventday-profile h2{font-size:25px!important}.eventday-info span{font-size:11px!important}.eventday-info b{font-size:14px!important}.eventday-task b{font-size:14px!important}

/* Sidebar leggermente più leggibile senza ingrandirla troppo */
.sidebar,.side-nav,aside nav{font-size:14px!important}
.sidebar button,.side-nav button,aside nav button{font-size:13.5px!important;min-height:42px!important}

@media(max-width:820px){
  h1{font-size:26px!important}h2{font-size:20px!important}
  #dashboard>.topbar,#events>.topbar,#news>.topbar,#registrations>.topbar,#players>.topbar,#staff>.topbar,#communications>.topbar,#payments>.topbar,#users>.topbar,#settings>.topbar,section[id]>.topbar:first-child{padding:18px!important}
  .light-modal-card{padding:18px!important}.light-modal-card>h2{font-size:24px!important;margin:-18px -18px 16px!important;padding:18px!important}
  .modal-head,.drawer-head{padding:18px!important}.modal-head h2,.drawer-head h2{font-size:24px!important}
  .card{padding:16px!important}.grid4{grid-template-columns:1fr 1fr!important}.stat{min-height:118px!important}
  th,td{padding:12px!important}.eventday-body{padding:14px!important}
}
@media(max-width:520px){.grid4{grid-template-columns:1fr!important}.stat{min-height:auto!important}.btn{width:auto!important}.topbar{align-items:flex-start!important}}
`;
d.head.appendChild(s);
})();
