/* 云端同步配置
 * 默认留空 = 纯本地模式（数据存浏览器 IndexedDB）。
 * 激活方式：填 Supabase URL / anon key，或线上点右上角「⚙️ 云端」粘贴保存。
 */
window.CLOUD_CFG = {
  SUPABASE_URL: '',
  SUPABASE_ANON: ''
};

/* v3.10（2026-11-09）：排序系统已随 index.html 的 SORT_B64 与独立 sort_system.html
 * 直推为真实 v3.10 源码，不再需要运行时补丁注入。 */
window.SORT_MODULE_VERSION = 'v3.10';
