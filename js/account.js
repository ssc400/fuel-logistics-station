// ===== 成品油物流工作空间站 - 本地存储服务（已取消登陆） =====
// 所有数据仅存储在本地 IndexedDB，无需登陆

// ========== 本地用户标识（简化，不依赖服务器） ==========
localStorage.setItem('_token', 'local');
localStorage.setItem('_username', '本地用户');

// ========== 全局 IndexedDB ==========

// 打开 FuelStationDB（所有模块共用的数据库）
function openFuelDB() {
  return new Promise(function(resolve, reject) {
    var r = indexedDB.open('FuelStationDB', 1);
    r.onupgradeneeded = function(e) {
      var d = e.target.result;
      if (!d.objectStoreNames.contains('uploads')) d.createObjectStore('uploads', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('distMap')) d.createObjectStore('distMap');
    };
    r.onsuccess = function(e) { resolve(e.target.result); };
    r.onerror = function(e) { reject(e.target.error); };
  });
}

// ========== 模块间通信 ==========
var _moduleCallbacks = {};

function onModuleEvent(event, callback) {
  if (!_moduleCallbacks[event]) _moduleCallbacks[event] = [];
  _moduleCallbacks[event].push(callback);
}

function notifyModules(event) {
  var cbs = _moduleCallbacks[event] || [];
  cbs.forEach(function(cb) { try { cb(); } catch(e) {} });
}

// ========== UI 更新（已取消登陆，仅显示本地用户） ==========
function updateUserUI() {
  var statusEl = document.getElementById('userStatus');
  var loginBtn = document.getElementById('loginBtn');
  var logoutBtn = document.getElementById('logoutBtn');
  var syncBtn = document.getElementById('syncBtn');
  if (statusEl) statusEl.textContent = '👤 本地用户';
  if (loginBtn) loginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (syncBtn) syncBtn.style.display = 'none';
}

// ========== 以下函数保留为空（兼容旧代码，不执行任何操作） ==========
function showLogin() {}
function hideLogin() {}
function switchLoginTab(tab) {}
function doLogin() {}
function doRegister() {}
function doLogout() {}
function setLoginMsg(text) {}
function apiCall(method, path, body) { return Promise.resolve({ ok: true }); }
function syncToServer(moduleKey, data) { return Promise.resolve({ ok: true }); }
function syncFromServer(moduleKey) { return Promise.resolve(null); }
function syncAllToServer(modules) {}
function syncDBToServer() { return Promise.resolve(); }
function syncDBFromServer() { return Promise.resolve(); }
function showSyncStatus(text) {}
function getLoginOverlayHTML() { return ''; }
