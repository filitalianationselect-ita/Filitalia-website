(function(){
'use strict';
if(!window.FilitaliaAuth)return;
const original=window.FilitaliaAuth;
const originalGetOwnProfile=original.getOwnProfile.bind(original);
const originalAdminSet=original.adminSetAccountStatus.bind(original);
const adminRoles=new Set(['admin','super_admin']);
async function getActualOwnProfile(){return originalGetOwnProfile()}
async function getOwnProfile(){const profile=await originalGetOwnProfile();if(profile&&profile.role==='super_admin')return Object.assign({},profile,{actual_role:'super_admin',role:'admin',is_super_admin:true});return profile}
function isAdminProfile(profile){return Boolean(profile&&adminRoles.has(profile.actual_role||profile.role)&&profile.status==='active')}
function isSuperAdminProfile(profile){return Boolean(profile&&(profile.actual_role||profile.role)==='super_admin'&&profile.status==='active')}
async function adminSetAccountStatus(userId,role,status){const caller=await getActualOwnProfile();if(role==='super_admin'&&!isSuperAdminProfile(caller))throw new Error('SUPER_ADMIN_REQUIRED');if(role!=='super_admin')return originalAdminSet(userId,role,status);const result=await original.client.functions.invoke('admin-update-account-status',{body:{user_id:userId,role,status}});if(result.error)throw result.error;if(result.data&&result.data.error)throw new Error(result.data.error);return result.data||{}}
window.FilitaliaAuth=Object.freeze(Object.assign({},original,{getOwnProfile,getActualOwnProfile,adminSetAccountStatus,isAdminProfile,isSuperAdminProfile,adminRoles:Object.freeze(['admin','super_admin'])}));
window.FilitaliaAdminRoles=Object.freeze({isAdminProfile,isSuperAdminProfile,adminRoles:['admin','super_admin']});
})();