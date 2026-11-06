/* 云端同步配置
 * 默认留空 = 纯本地模式（与旧版完全一致，数据存浏览器 IndexedDB）。
 * 激活方式（任选其一）：
 *   1) 直接在下面填入你的 Supabase 项目 URL 与 anon key（部署前填好）；
 *   2) 或线上打开后点右上角「⚙️ 云端」→ 粘贴保存（存浏览器 localStorage，立即生效）。
 * 详见 SUPABASE_SETUP.md。
 */
window.CLOUD_CFG = {
  SUPABASE_URL: '',
  SUPABASE_ANON: ''
};

/* v3.09：主站侧栏注入「主数据维护」直达入口（独立纯净页，无其他视图/导航）
   放在已被引用的小配置文件里，避免为大体积 index.html 重建 blob。 */
(function () {
  function addEntry() {
    try {
      var nav = document.getElementById('nav');
      if (!nav || document.getElementById('navMasterEntry')) return;
      var d = document.createElement('div');
      d.className = 'ni';
      d.id = 'navMasterEntry';
      d.title = '独立页面：仅主数据维护';
      d.textContent = '🛠 主数据维护';
      d.onclick = function () { window.open('master_data.html', '_blank'); };
      var items = nav.querySelectorAll('.ni'), sort = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute('data-p') === 'sort') { sort = items[i]; break; }
      }
      if (sort && sort.nextSibling) nav.insertBefore(d, sort.nextSibling);
      else nav.appendChild(d);
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addEntry);
  else addEntry();
})();
