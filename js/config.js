/* 云端同步配置
 * 默认留空 = 纯本地模式（数据存浏览器 IndexedDB）。
 * 激活方式：填 Supabase URL / anon key，或线上点右上角「⚙️ 云端」粘贴保存。
 */
window.CLOUD_CFG = {
  SUPABASE_URL: '',
  SUPABASE_ANON: ''
};

/* v3.11（2026-11-09）：配送计划核对「现在出库点运费」修复
 *  ① 日报自带「运距」列纳入核算，二次运距表未维护该站该库时兜底，消除整组空白
 *  ② 一次费未登记的油库不再把四列一起置空（一次费按固定约束留空，运距/二次费照算）
 * 排序系统随 index.html 的 SORT_B64 与独立 sort_system.html 直推真实源码，无运行时补丁。 */
window.SORT_MODULE_VERSION = 'v3.11';
