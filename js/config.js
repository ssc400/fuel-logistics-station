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
