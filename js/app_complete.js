/* ====== 成品油物流工作空间站 - 主应用逻辑 ====== */

// ========== 页面路由 ==========
var PAGES = {
    dashboard: "工台",
    supply: "互供工作",
    distance: "运距复核",
    freight: "运费核算"
};
var currentPage = "dashboard";
var gMap = null;
