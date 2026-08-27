/**
 * 本地数据存储管理
 * 使用 LocalStorage 持久化数据
 */
class DataStore {
    constructor() {
        this.prefix = 'oil_logistics_';
    }

    // 保存数据
    set(key, data) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('保存数据失败:', e);
            return false;
        }
    }

    // 获取数据
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(this.prefix + key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('读取数据失败:', e);
            return defaultValue;
        }
    }

    // 删除数据
    remove(key) {
        localStorage.removeItem(this.prefix + key);
    }

    // 清空所有数据
    clear() {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => localStorage.removeItem(key));
    }

    // 导出数据
    exportData() {
        const data = {};
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => {
                data[key] = JSON.parse(localStorage.getItem(key));
            });
        return JSON.stringify(data, null, 2);
    }

    // 导入数据
    importData(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            Object.keys(data).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.setItem(key, JSON.stringify(data[key]));
                }
            });
            return true;
        } catch (e) {
            console.error('导入数据失败:', e);
            return false;
        }
    }
}

// 初始化数据存储
const store = new DataStore();

// 初始化各模块数据
function initData() {
    // 互供工作 - 出库记录（对账数据）
    if (!store.get('outbound_records')) {
        store.set('outbound_records', []);
    }

    // 互供工作 - 对账上传历史
    if (!store.get('reconciliation_uploads')) {
        store.set('reconciliation_uploads', []);
    }

    // 互供工作 - 计划量管理
    if (!store.get('supply_plans')) {
        store.set('supply_plans', []);
    }

    // 互供工作 - 外采项目
    if (!store.get('procurement_projects')) {
        store.set('procurement_projects', []);
    }

    // 互供工作 - 油库基础信息
    if (!store.get('depots')) {
        store.set('depots', [
            { name: '燕山油库', type: '自提' },
            { name: '大兴油库', type: '自提' },
            { name: '东方油库', type: '自提' },
            { name: '沙河油库', type: '自提' },
            { name: '住海油库', type: '外采' }
        ]);
    }

    // 运距复核 - 运距记录
    if (!store.get('distance_records')) {
        store.set('distance_records', []);
    }

    // 运距复核 - 客户卸油点
    if (!store.get('customer_points')) {
        store.set('customer_points', []);
    }

    // 运距复核 - GPS轨迹
    if (!store.get('gps_tracks')) {
        store.set('gps_tracks', []);
    }

    // 吨油运费 - 出库点
    if (!store.get('delivery_points')) {
        store.set('delivery_points', []);
    }

    // 吨油运费 - 运费记录
    if (!store.get('freight_records')) {
        store.set('freight_records', []);
    }

    // 吨油运费 - 出库明细
    if (!store.get('outbound_details')) {
        store.set('outbound_details', []);
    }
}
