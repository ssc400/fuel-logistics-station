/* 成品油物流工作空间站 - 主应用逻辑 */
var PAGES = {
    dashboard: '工作台',
    supply: '互供工作',
    distance: '运距复核',
    freight: '运费核算'
};
var currentPage = 'dashboard';

/* ===== 初始化 ===== */
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initData === 'function') initData();
    initNav();
    var today = new Date();
    var dEl = document.getElementById('todayDate');
    if (dEl) dEl.textContent = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    loadPage('dashboard');
});

function initNav() {
    var items = document.querySelectorAll('.nav-item');
    for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function(e) {
            e.preventDefault();
            var page = this.getAttribute('data-page');
            if (!page) return;
            loadPage(page);
            var allItems = document.querySelectorAll('.nav-item');
            for (var j = 0; j < allItems.length; j++) allItems[j].classList.remove('active');
            this.classList.add('active');
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('active');
            }
        });
    }
    var mt = document.getElementById('menuToggle');
    if (mt) mt.addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
    });
}

function loadPage(page) {
    currentPage = page;
    var t = document.getElementById('pageTitle');
    if (t) t.textContent = PAGES[page] || page;
    var c = document.getElementById('pageContent');
    if (!c) return;
    if (page === 'dashboard') renderDashboard(c);
    else if (page === 'supply') renderSupply(c);
    else if (page === 'distance') renderDistance(c);
    else if (page === 'freight') renderFreight(c);
}

function alertMsg(msg, type) {
    type = type || 'info';
    var colors = { info: '#1890ff', success: '#52c41a', warning: '#faad14', error: '#f5222d' };
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:' + (colors[type]||'#1890ff') + ';color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:all 0.3s;';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function() { d.style.opacity = '0'; setTimeout(function() { d.remove(); }, 300); }, 2500);
}

function closeModal() {
    var c = document.getElementById('modalContainer');
    if (c) c.innerHTML = '';
}

/* ===== 仪表盘 ===== */
function renderDashboard(c) {
    var records = store.get('outbound_records', []);
    var today = new Date().toISOString().split('T')[0];
    var todayOut = 0;
    records.forEach(function(r) { if (r.date === today) todayOut += (r.amount || 0); });
    var zsh = 0, zhy = 0, wc = 0;
    records.forEach(function(r) {
        if (r.source === '中石化') zsh++;
        else if (r.source === '中海油') zhy++;
        else if (r.source === '外采') wc++;
    });
    c.innerHTML =
        '<div class="stats-grid">' +
            '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-truck-loading"></i></div><div class="stat-info"><h3>' + todayOut.toFixed(2) + '</h3><p>今日出库(吨)</p></div></div>' +
            '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-file-contract"></i></div><div class="stat-info"><h3>' + (zsh + zhy + wc) + '</h3><p>总记录数</p></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange"><i class="fas fa-route"></i></div><div class="stat-info"><h3>' + store.get('distance_records', []).length + '</h3><p>运距记录</p></div></div>' +
            '<div class="stat-card"><div class="stat-icon purple"><i class="fas fa-map-pin"></i></div><div class="stat-info"><h3>' + store.get('customer_points', []).length + '</h3><p>客户卸油点</p></div></div>' +
        '</div>' +
        '<div class="card"><div class="card-header"><div class="card-title">数据源概览</div><button class="btn btn-outline" onclick="loadPage(\'supply\')">查看详情</button></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:15px;padding:15px;">' +
                '<div style="text-align:center;padding:15px;background:#e6f7ff;border-radius:8px;"><div style="font-size:1.6rem;font-weight:700;color:#1890ff;">' + zsh + '</div><div style="font-size:0.85rem;color:#666;">中石化</div></div>' +
                '<div style="text-align:center;padding:15px;background:#f6ffed;border-radius:8px;"><div style="font-size:1.6rem;font-weight:700;color:#52c41a;">' + zhy + '</div><div style="font-size:0.85rem;color:#666;">中海油</div></div>' +
                '<div style="text-align:center;padding:15px;background:#fff7e6;border-radius:8px;"><div style="font-size:1.6rem;font-weight:700;color:#fa8c16;">' + wc + '</div><div style="font-size:0.85rem;color:#666;">外采</div></div>' +
            '</div></div>' +
        '<div class="card"><div class="card-header"><div class="card-title">快速操作</div></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;padding:15px;">' +
                '<button class="btn btn-primary" onclick="loadPage(\'supply\')" style="padding:18px;height:auto;flex-direction:column;gap:8px;display:flex;"><i class="fas fa-upload" style="font-size:1.8rem;"></i><span>上传对账CSV/Excel</span></button>' +
                '<button class="btn btn-success" onclick="loadPage(\'distance\')" style="padding:18px;height:auto;flex-direction:column;gap:8px;display:flex;"><i class="fas fa-map-marked-alt" style="font-size:1.8rem;"></i><span>运距复核</span></button>' +
                '<button class="btn btn-warning" onclick="loadPage(\'freight\')" style="padding:18px;height:auto;flex-direction:column;gap:8px;display:flex;"><i class="fas fa-calculator" style="font-size:1.8rem;"></i><span>运费核算</span></button>' +
            '</div></div>' +
        '<div class="card"><div class="card-header"><div class="card-title">最近出库记录</div></div>' + renderRecentTable(records.slice(-10).reverse()) + '</div>';
}

function renderRecentTable(records) {
    if (records.length === 0) return '<div class="empty-state"><i class="fas fa-inbox"></i><p>暂无记录，请上传对账CSV或Excel</p></div>';
    var h = '<div class="table-container"><table><thead><tr><th>日期</th><th>来源</th><th>油库</th><th>加油站/客户</th><th>出库量(吨)</th></tr></thead><tbody>';
    records.forEach(function(r) {
        var bc = r.source === '中石化' ? 'badge-primary' : (r.source === '中海油' ? 'badge-success' : 'badge-warning');
        h += '<tr><td>' + (r.date || '-') + '</td><td><span class="badge ' + bc + '">' + (r.source || '手动') + '</span></td><td>' + (r.oilDepot || '-') + '</td><td>' + (r.station || r.customer || '-') + '</td><td><strong>' + (r.amount || 0) + '</strong></td></tr>';
    });
    return h + '</tbody></table></div>';
}

/* ===== CSV解析（对账软件核心） ===== */
function detectCSVType(lines) {
    if (!lines || lines.length < 2) return 'unknown';
    var n = lines[1].split(',').length;
    if (n >= 10) return 'zhonghaiyou';
    if (n >= 7) return 'zhongshihua';
    return 'waicai';
}

function parseZSH(text) {
    var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
    var out = [];
    for (var i = 1; i < lines.length; i++) {
        var c = lines[i].split(',').map(function(s) { return s.trim(); });
        if (c.length < 7) continue;
        out.push({ date: c[0], oilDepot: c[1], station: c[2], oilType: c[3], amount: parseFloat(c[4]) || 0, operator: c[5], remark: c[6], source: '中石化', uploadTime: new Date().toISOString() });
    }
    return out;
}

function parseZHY(text) {
    var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
    var out = [];
    for (var i = 1; i < lines.length; i++) {
        var c = lines[i].split(',').map(function(s) { return s.trim(); });
        if (c.length < 10) continue;
        out.push({ date: c[0], oilDepot: c[1], station: c[2], oilType: c[3], vehicleNo: c[4], amount: parseFloat(c[5]) || 0, inboundAmount: parseFloat(c[6]) || 0, diff: parseFloat(c[7]) || 0, operator: c[8], remark: c[9], source: '中海油', uploadTime: new Date().toISOString() });
    }
    return out;
}

function parseWC(text) {
    var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
    var out = [];
    for (var i = 1; i < lines.length; i++) {
        var c = lines[i].split(',').map(function(s) { return s.trim(); });
        if (c.length < 7) continue;
        out.push({ date: c[0], supplier: c[1], oilDepot: c[2], oilType: c[3], amount: parseFloat(c[4]) || 0, unitPrice: parseFloat(c[5]) || 0, totalPrice: parseFloat(c[6]) || 0, remark: (c[7] || ''), source: '外采', uploadTime: new Date().toISOString() });
    }
    return out;
}

/* ===== 互供工作页面 ===== */
function renderSupply(c) {
    var records = store.get('outbound_records', []);
    var plans = store.get('supply_plans', []);
    c.innerHTML =
        '<div class="card"><div class="card-header"><div class="card-title">上传对账文件</div></div>' +
            '<div style="padding:15px;display:flex;gap:10px;flex-wrap:wrap;">' +
                '<button class="btn btn-primary" onclick="uploadCSV()"><i class="fas fa-upload"></i> 上传CSV</button>' +
                '<button class="btn btn-success" onclick="uploadExcel()"><i class="fas fa-file-excel"></i> 上传Excel</button>' +
                '<input type="file" id="csvFileInput" accept=".csv,.txt" style="display:none;" onchange="onCSVFile(this)">' +
                '<input type="file" id="excelFileInput" accept=".xlsx,.xls" style="display:none;" onchange="onExcelFile(this)">' +
            '</div></div>' +
        '<div class="card"><div class="card-header"><div class="card-title">油库出库统计</div></div>' + renderDepotStats(records) + '</div>' +
        '<div class="card"><div class="card-header"><div class="card-title">月度计划管理</div><button class="btn btn-primary" onclick="showPlanModal()"><i class="fas fa-plus"></i> 添加</button></div>' + renderPlansTable(plans) + '</div>' +
        '<div class="card"><div class="card-header"><div class="card-title">所有出库记录</div><button class="btn btn-outline" onclick="exportSupplyCSV()"><i class="fas fa-download"></i> 导出</button></div>' + renderAllRecordsTable(records) + '</div>';
}

function uploadCSV() {
    var el = document.getElementById('csvFileInput');
    if (el) el.click();
}

function uploadExcel() {
    var el = document.getElementById('excelFileInput');
    if (el) el.click();
}

function onCSVFile(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        var text = e.target.result;
        var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
        var type = detectCSVType(lines);
        var recs = [], summary = '';
        if (type === 'zhongshihua') { recs = parseZSH(text); summary = '中石化 ' + recs.length + ' 条'; }
        else if (type === 'zhonghaiyou') { recs = parseZHY(text); summary = '中海油 ' + recs.length + ' 条'; }
        else { recs = parseWC(text); summary = '外采 ' + recs.length + ' 条'; }
        var all = store.get('outbound_records', []);
        recs.forEach(function(r) { all.push(r); });
        store.set('outbound_records', all);
        var ups = store.get('reconciliation_uploads', []);
        ups.push({ fileName: file.name, fileType: type, recordCount: recs.length, uploadTime: new Date().toISOString(), summary: summary });
        store.set('reconciliation_uploads', ups);
        alertMsg('成功导入 ' + recs.length + ' 条记录', 'success');
        loadPage('supply');
    };
    reader.readAsText(file, 'UTF-8');
}

/* Excel导入 - 使用SheetJS */
function onExcelFile(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var allRecs = [];
        workbook.SheetNames.forEach(function(sheetName) {
            var sheet = workbook.Sheets[sheetName];
            var json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            // 简单解析：假设列是 日期,油库,加油站,油品,出库量
            // 实际结构需要根据Excel格式调整
            if (json.length < 2) return;
            // 尝试自动识别表头
            var header = json[0];
            var dateIdx = -1, depotIdx = -1, stationIdx = -1, oilIdx = -1, amountIdx = -1;
            header.forEach(function(h, i) {
                var hs = String(h).toLowerCase();
                if (hs.indexOf('日期') >= 0 || hs.indexOf('date') >= 0) dateIdx = i;
                if (hs.indexOf('油库') >= 0) depotIdx = i;
                if (hs.indexOf('站') >= 0 || hs.indexOf('客户') >= 0) stationIdx = i;
                if (hs.indexOf('油品') >= 0 || hs.indexOf('型号') >= 0) oilIdx = i;
                if (hs.indexOf('量') >= 0 || hs.indexOf('吨') >= 0) amountIdx = i;
            });
            // 如果没找到表头，假设前5列
            if (dateIdx < 0) dateIdx = 0;
            if (amountIdx < 0) amountIdx = 4;
            for (var r = 1; r < json.length; r++) {
                var row = json[r];
                if (!row || !row[dateIdx]) continue;
                allRecs.push({
                    date: String(row[dateIdx]).slice(0, 10),
                    oilDepot: row[depotIdx] || '',
                    station: row[stationIdx] || '',
                    oilType: row[oilIdx] || '',
                    amount: parseFloat(row[amountIdx]) || 0,
                    source: sheetName.indexOf('中石化') >= 0 ? '中石化' : (sheetName.indexOf('中海油') >= 0 ? '中海油' : '手动'),
                    uploadTime: new Date().toISOString()
                });
            }
        });
        if (allRecs.length > 0) {
            var all = store.get('outbound_records', []);
            allRecs.forEach(function(r) { all.push(r); });
            store.set('outbound_records', all);
            alertMsg('Excel导入成功，共 ' + allRecs.length + ' 条', 'success');
        } else {
            alertMsg('未识别到数据，请检查Excel格式', 'warning');
        }
        loadPage('supply');
    };
    reader.readAsArrayBuffer(file);
}

function renderDepotStats(records) {
    var stats = {};
    records.forEach(function(r) {
        var key = (r.oilDepot || '未知') + '|' + (r.source || '手动');
        if (!stats[key]) stats[key] = { depot: r.oilDepot || '未知', source: r.source || '手动', total: 0, count: 0 };
        stats[key].total += (r.amount || 0);
        stats[key].count++;
    });
    var keys = Object.keys(stats);
    if (keys.length === 0) return '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>暂无数据</p></div>';
    var h = '<div class="table-container"><table><thead><tr><th>油库</th><th>来源</th><th>总出库量(吨)</th><th>记录数</th></tr></thead><tbody>';
    keys.forEach(function(k) {
        var s = stats[k];
        h += '<tr><td><strong>' + s.depot + '</strong></td><td><span class="badge ' + (s.source === '中石化' ? 'badge-primary' : (s.source === '中海油' ? 'badge-success' : 'badge-warning')) + '">' + s.source + '</span></td><td><strong>' + s.total.toFixed(2) + '</strong></td><td>' + s.count + '</td></tr>';
    });
    return h + '</tbody></table></div>';
}

/* ===== 运距复核页面 ===== */
function renderDistance(c) {
    var records = store.get('distance_records', []);
    var points = store.get('customer_points', []);
    c.innerHTML =
        '<div class="card"><div class="card-header"><div class="card-title">运距复核</div></div>' +
            '<div style="padding:15px;display:grid;grid-template-columns:1fr 1fr;gap:15px;">' +
                '<div class="form-group"><label class="form-label">起点（油库）</label><input type="text" class="form-input" id="distStart" placeholder="如：燕山油库"></div>' +
                '<div class="form-group"><label class="form-label">终点（加油站/客户）</label><input type="text" class="form-input" id="distEnd" placeholder="如：桂林羊角山加油站"></div>' +
            '</div>' +
            '<div style="padding:0 15px 15px;display:flex;gap:10px;">' +
                '<button class="btn btn-primary" onclick="calcDistance()"><i class="fas fa-calculator"></i> 计算运距</button>' +
                '<button class="btn btn-outline" onclick="showMapMeasure()"><i class="fas fa-ruler"></i> 地图测距</button>' +
            '</div>' +
            '<div id="distResult" style="padding:0 15px 15px;"></div>' +
            '<div id="distMapContainer" style="padding:0 15px 15px;height:300px;display:none;border-radius:8px;overflow:hidden;"></div>' +
        '</div>' +
        '<div class="card"><div class="card-header"><div class="card-title">客户卸油点管理</div><button class="btn btn-primary" onclick="showPointModal()"><i class="fas fa-plus"></i> 添加</button></div>' + renderPointsTable(points) + '</div>' +
        '<div class="card"><div class="card-header"><div class="card-title">GPS轨迹对比</div><button class="btn btn-success" onclick="showGPSModal()"><i class="fas fa-satellite-dish"></i> 上传GPS</button></div>' + renderGPSTable(records) + '</div>';
}

function calcDistance() {
    var start = (document.getElementById('distStart') || {}).value || '';
    var end = (document.getElementById('distEnd') || {}).value || '';
    if (!start || !end) { alertMsg('请填写起点和终点', 'warning'); return; }
    var resultDiv = document.getElementById('distResult');
    resultDiv.innerHTML = '<div style="padding:10px;background:#e6f7ff;border-radius:8px;"><i class="fas fa-spinner fa-spin"></i> 正在计算...</div>';
    // 使用高德API计算驾车距离
    if (typeof AMap === 'undefined') {
        resultDiv.innerHTML = '<div style="padding:10px;background:#fff2e8;border-radius:8px;color:#fa541c;">高德地图API未加载，请在 js/config.js 中配置 AMAP_API_KEY</div>';
        return;
    }
    AMap.plugin('AMap.Driving', function() {
        var driving = new AMap.Driving();
        driving.search([{ keyword: start }, { keyword: end }], function(status, result) {
            if (status === 'complete' && result.routes && result.routes.length > 0) {
                var dist = (result.routes[0].distance / 1000).toFixed(2);
                resultDiv.innerHTML = '<div style="padding:15px;background:#f6ffed;border-radius:8px;border:1px solid #b7eb8f;">' +
                    '<div style="font-size:1.2rem;font-weight:700;color:#52c41a;">运距: ' + dist + ' km</div>' +
                    '<div style="font-size:0.85rem;color:#666;margin-top:5px;">' + start + ' → ' + end + '</div>' +
                    '<button class="btn btn-primary" style="margin-top:10px;" onclick="saveDistance(\'' + start.replace(/'/g, "\\'") + '\',\'' + end.replace(/'/g, "\\'") + '\',' + dist + ')">保存记录</button>' +
                    '</div>';
            } else {
                resultDiv.innerHTML = '<div style="padding:10px;background:#fff2e8;border-radius:8px;color:#fa541c;">计算失败，请检查地址</div>';
            }
        });
    });
}

function saveDistance(start, end, dist) {
    var records = store.get('distance_records', []);
    records.push({ start: start, end: end, distance: dist, date: new Date().toISOString().slice(0, 10), uploadTime: new Date().toISOString() });
    store.set('distance_records', records);
    alertMsg('运距记录已保存', 'success');
    loadPage('distance');
}

function showMapMeasure() {
    var container = document.getElementById('distMapContainer');
    if (!container) return;
    container.style.display = 'block';
    if (typeof AMap === 'undefined') { container.innerHTML = '高德地图API未加载'; return; }
    var map = new AMap.Map(container, { zoom: 8, center: [110.2, 25.3] });
    var ruler = new AMap.RangingTool(map);
    ruler.turnOn();
    container.scrollIntoView();
}

function showPointModal(editIdx) {
    editIdx = editIdx || -1;
    var points = store.get('customer_points', []);
    var p = editIdx >= 0 ? points[editIdx] : null;
    var modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = '<div class="modal" style="max-width:480px;">' +
        '<div class="modal-header"><h3>' + (editIdx >= 0 ? '编辑' : '添加') + '客户卸油点</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="modal-body">' +
            '<div class="form-group"><label class="form-label">客户名称</label><input type="text" class="form-input" id="ptName" value="' + (p ? p.name : '') + '" placeholder="如：中石化桂林站"></div>' +
            '<div class="form-group"><label class="form-label">卸油点地址</label><input type="text" class="form-input" id="ptAddr" value="' + (p ? (p.address || '') : '') + '" placeholder="详细地址"></div>' +
            '<div class="form-group"><label class="form-label">所属油库</label><input type="text" class="form-input" id="ptDepot" value="' + (p ? (p.depot || '') : '') + '" placeholder="所属油库"></div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="savePoint(' + editIdx + ')">保存</button></div>' +
        '</div>';
    document.getElementById('modalContainer').appendChild(modal);
}

function savePoint(editIdx) {
    var name = (document.getElementById('ptName') || {}).value || '';
    if (!name.trim()) { alertMsg('请填写客户名称', 'warning'); return; }
    var points = store.get('customer_points', []);
    var pt = { name: name.trim(), address: (document.getElementById('ptAddr') || {}).value || '', depot: (document.getElementById('ptDepot') || {}).value || '' };
    if (editIdx >= 0) points[editIdx] = pt; else points.push(pt);
    store.set('customer_points', points);
    closeModal(); loadPage('distance');
    alertMsg('已保存', 'success');
}

function renderPointsTable(points) {
    if (points.length === 0) return '<div class="empty-state"><i class="fas fa-map-pin"></i><p>暂无客户卸油点</p></div>';
    var h = '<div class="table-container"><table><thead><tr><th>名称</th><th>地址</th><th>所属油库</th><th>操作</th></tr></thead><tbody>';
    points.forEach(function(p, i) {
        h += '<tr><td><strong>' + p.name + '</strong></td><td>' + (p.address || '-') + '</td><td>' + (p.depot || '-') + '</td><td>' +
            '<button class="btn-icon" onclick="showPointModal(' + i + ')"><i class="fas fa-edit" style="color:#1890ff;"></i></button> ' +
            '<button class="btn-icon" onclick="deletePoint(' + i + ')"><i class="fas fa-trash" style="color:#f5222d;"></i></button></td></tr>';
    });
    return h + '</tbody></table></div>';
}

function deletePoint(idx) {
    if (!confirm('确定删除？')) return;
    var points = store.get('customer_points', []);
    points.splice(idx, 1);
    store.set('customer_points', points);
    loadPage('distance');
}

/* ===== 运费核算页面 ===== */
function renderFreight(c) {
    var points = store.get('delivery_points', []);
    var records = store.get('freight_records', []);
    var details = store.get('outbound_details', []);
    c.innerHTML =
        '<div class="card"><div class="card-header"><div class="card-title">出库点管理</div><button class="btn btn-primary" onclick="showFPModal()"><i class="fas fa-plus"></i> 添加</button></div>' + renderFPTable(points) + '</div>' +
        '<div class="card"><div class="card-header"><div class="card-title">吨油运费核算</div><button class="btn btn-primary" onclick="showFCalcModal()"><i class="fas fa-plus"></i> 新增</button></div>' + renderFRecords(records) + '</div>' +
        '<div class="card"><div class="card-header"><div class="card-title">出库明细核对（第一出库点）</div><button class="btn btn-success" onclick="showODUpload()"><i class="fas fa-upload"></i> 上传CSV</button></div>' + renderODTable(details, points) + '</div>';
}

function showFPModal(editIdx) {
    editIdx = editIdx || -1;
    var points = store.get('delivery_points', []);
    var p = editIdx >= 0 ? points[editIdx] : null;
    var modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = '<div class="modal" style="max-width:480px;">' +
        '<div class="modal-header"><h3>' + (editIdx >= 0 ? '编辑' : '添加') + '出库点</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="modal-body">' +
            '<div class="form-group"><label class="form-label">出库点名称</label><input type="text" class="form-input" id="fpName" value="' + (p ? p.name : '') + '" placeholder="如：燕山油库"></div>' +
            '<div class="form-group"><label class="form-label">地址</label><input type="text" class="form-input" id="fpAddr" value="' + (p ? (p.address || '') : '') + '" placeholder="地址"></div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveFP(' + editIdx + ')">保存</button></div>' +
        '</div>';
    document.getElementById('modalContainer').appendChild(modal);
}

function saveFP(editIdx) {
    var name = (document.getElementById('fpName') || {}).value || '';
    if (!name.trim()) { alertMsg('请填写名称', 'warning'); return; }
    var points = store.get('delivery_points', []);
    var pt = { name: name.trim(), address: (document.getElementById('fpAddr') || {}).value || '' };
    if (editIdx >= 0) points[editIdx] = pt; else points.push(pt);
    store.set('delivery_points', points);
    closeModal(); loadPage('freight');
    alertMsg('已保存', 'success');
}

function renderFPTable(points) {
    if (points.length === 0) return '<div class="empty-state"><i class="fas fa-map-pin"></i><p>暂无出库点</p></div>';
    var h = '<div class="table-container"><table><thead><tr><th>序号</th><th>名称</th><th>地址</th><th>操作</th></tr></thead><tbody>';
    points.forEach(function(p, i) {
        h += '<tr><td>' + (i + 1) + '</td><td><strong>' + p.name + '</strong></td><td>' + (p.address || '-') + '</td><td>' +
            '<button class="btn-icon" onclick="showFPModal(' + i + ')"><i class="fas fa-edit" style="color:#1890ff;"></i></button> ' +
            '<button class="btn-icon" onclick="deleteFP(' + i + ')"><i class="fas fa-trash" style="color:#f5222d;"></i></button></td></tr>';
    });
    return h + '</tbody></table></div>';
}

function deleteFP(idx) {
    if (!confirm('确定？')) return;
    var points = store.get('delivery_points', []);
    points.splice(idx, 1);
    store.set('delivery_points', points);
    loadPage('freight');
}

function showFCalcModal() {
    var points = store.get('delivery_points', []);
    var opts = '';
    points.forEach(function(p) { opts += '<option value="' + p.name + '">' + p.name + '</option>'; });
    var modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = '<div class="modal" style="max-width:520px;">' +
        '<div class="modal-header"><h3>吨油运费核算</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="modal-body">' +
            '<div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="fcDate" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
            '<div class="form-group"><label class="form-label">运单号</label><input type="text" class="form-input" id="fcOrder" placeholder="运单号"></div>' +
            '<div class="form-group"><label class="form-label">出库点</label><select class="form-input" id="fcPoint"><option value="">请选择</option>' + opts + '</select></div>' +
            '<div class="form-group"><label class="form-label">目的地</label><input type="text" class="form-input" id="fcDest" placeholder="目的地"></div>' +
            '<div class="form-group"><label class="form-label">运量(吨)</label><input type="number" step="0.01" class="form-input" id="fcAmt" placeholder="运量" oninput="calcTotal()"></div>' +
            '<div class="form-group"><label class="form-label">吨油运费(元/吨)</label><input type="number" step="0.01" class="form-input" id="fcPrice" placeholder="运费" oninput="calcTotal()"></div>' +
            '<div id="fcTotal" style="display:none;padding:10px;background:#f6ffed;border-radius:8px;font-weight:700;color:#52c41a;"></div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveFCalc()">保存</button></div>' +
        '</div>';
    document.getElementById('modalContainer').appendChild(modal);
}

function calcTotal() {
    var a = parseFloat((document.getElementById('fcAmt') || {}).value) || 0;
    var p = parseFloat((document.getElementById('fcPrice') || {}).value) || 0;
    if (a && p) {
        var d = document.getElementById('fcTotal');
        if (d) { d.style.display = 'block'; d.textContent = '总运费：' + (a * p).toFixed(2) + ' 元'; }
    }
}

function saveFCalc() {
    var rec = {
        date: (document.getElementById('fcDate') || {}).value || '',
        orderId: (document.getElementById('fcOrder') || {}).value || '',
        deliveryPoint: (document.getElementById('fcPoint') || {}).value || '',
        destination: (document.getElementById('fcDest') || {}).value || '',
        amount: parseFloat((document.getElementById('fcAmt') || {}).value) || 0,
        unitPrice: parseFloat((document.getElementById('fcPrice') || {}).value) || 0,
    };
    if (!rec.date || !rec.deliveryPoint) { alertMsg('请填必填项', 'warning'); return; }
    var records = store.get('freight_records', []);
    records.push(rec);
    store.set('freight_records', records);
    closeModal(); loadPage('freight');
    alertMsg('已保存', 'success');
}

function renderFRecords(records) {
    if (records.length === 0) return '<div class="empty-state"><i class="fas fa-calculator"></i><p>暂无记录</p></div>';
    var h = '<div class="table-container"><table><thead><tr><th>日期</th><th>运单</th><th>出库点</th><th>目的地</th><th>运量</th><th>运费单价</th><th>总运费</th></tr></thead><tbody>';
    records.forEach(function(r) {
        h += '<tr><td>' + (r.date || '-') + '</td><td>' + (r.orderId || '-') + '</td><td>' + (r.deliveryPoint || '-') + '</td><td>' + (r.destination || '-') + '</td><td>' + (r.amount || '-') + '</td><td>' + (r.unitPrice || '-') + '</td><td style="color:#f5222d;font-weight:700;">' + ((r.amount || 0) * (r.unitPrice || 0)).toFixed(2) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
}

function showODUpload() {
    var modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = '<div class="modal" style="max-width:560px;">' +
        '<div class="modal-header"><h3>上传出库明细CSV</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="modal-body">' +
            '<div style="padding:10px;background:#e6f7ff;border-radius:8px;margin-bottom:12px;font-size:0.85rem;color:#0050b3;">CSV格式：日期,运单号,出库点,目的地,运量(吨)</div>' +
            '<div class="form-group"><label class="form-label">选择CSV文件</label><input type="file" class="form-input" id="odFileIn" accept=".csv,.txt" onchange="onODFile(this)"></div>' +
            '<div id="odPreview"></div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveOD()">导入</button></div>' +
        '</div>';
    document.getElementById('modalContainer').appendChild(modal);
}

function onODFile(input) {
    if (!input.files.length) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        window._odText = e.target.result;
        var lines = e.target.result.split('\n').slice(0, 6).join('\n');
        var prev = document.getElementById('odPreview');
        if (prev) prev.innerHTML = '<pre style="background:#f5f5f5;padding:10px;border-radius:8px;font-size:0.82rem;overflow:auto;">' + lines + '\n...</pre>';
    };
    reader.readAsText(input.files[0], 'UTF-8');
}

function saveOD() {
    if (!window._odText) { alertMsg('请先选文件', 'warning'); return; }
    var lines = window._odText.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
    var details = store.get('outbound_details', []);
    var cnt = 0;
    for (var i = 1; i < lines.length; i++) {
        var cols = lines[i].split(',').map(function(s) { return s.trim(); });
        if (cols.length < 5) continue;
        details.push({ date: cols[0], orderId: cols[1], deliveryPoint: cols[2], destination: cols[3], amount: parseFloat(cols[4]) || 0 });
        cnt++;
    }
    store.set('outbound_details', details);
    window._odText = null;
    closeModal(); loadPage('freight');
    alertMsg('导入 ' + cnt + ' 条', 'success');
}

function renderODTable(details, points) {
    var firstPt = points.length > 0 ? points[0].name : '';
    if (details.length === 0) return '<div class="empty-state"><i class="fas fa-clipboard-check"></i><p>暂无明细，请上传CSV</p></div>';
    var h = '<div class="table-container"><table><thead><tr><th>日期</th><th>运单</th><th>出库点</th><th>目的地</th><th>运量</th><th>核对结果</th></tr></thead><tbody>';
    details.slice().reverse().forEach(function(d) {
        var isFirst = d.deliveryPoint === firstPt;
        var badge = firstPt ? ('<span class="badge ' + (isFirst ? 'badge-success' : 'badge-warning') + '">' + (isFirst ? '✓ 第一出库点' : '⚠ 非第一出库点') + '</span>') : '<span class="badge badge-info">未设置</span>';
        h += '<tr><td>' + (d.date || '-') + '</td><td>' + (d.orderId || '-') + '</td><td>' + (d.deliveryPoint || '-') + '</td><td>' + (d.destination || '-') + '</td><td>' + (d.amount || '-') + '</td><td>' + badge + '</td></tr>';
    });
    return h + '</tbody></table></div>';
}

/* ===== 数据备份 ===== */
function backupData() {
    var data = {};
    var prefix = 'oil_logistics_';
    Object.keys(localStorage).forEach(function(k) {
        if (k.indexOf(prefix) === 0) {
            try { data[k.substring(prefix.length)] = JSON.parse(localStorage.getItem(k)); } catch (ex) { }
        }
    });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '物流工作站备份_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    alertMsg('备份已下载', 'success');
}

/* ===== 计划管理 ===== */
function showPlanModal(editIdx) {
    editIdx = editIdx || -1;
    var plans = store.get('supply_plans', []);
    var p = editIdx >= 0 ? plans[editIdx] : null;
    var modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = '<div class="modal" style="max-width:520px;">' +
        '<div class="modal-header"><h3>' + (editIdx >= 0 ? '编辑' : '添加') + '月度计划</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="modal-body">' +
            '<div class="form-group"><label class="form-label">互供单位</label><input type="text" class="form-input" id="planUnit" value="' + (p ? p.unit : '') + '" placeholder="如：中石化"></div>' +
            '<div class="form-group"><label class="form-label">月份</label><input type="text" class="form-input" id="planMonth" value="' + (p ? p.month : '') + '" placeholder="如：2026-06"></div>' +
            '<div class="form-group"><label class="form-label">计划量(吨)</label><input type="number" step="0.01" class="form-input" id="planAmount" value="' + (p ? p.planAmount : '') + '"></div>' +
            '<div class="form-group"><label class="form-label">实际完成量(吨)</label><input type="number" step="0.01" class="form-input" id="planActual" value="' + (p ? (p.actualAmount || '') : '') + '"></div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="savePlan(' + editIdx + ')">保存</button></div>' +
        '</div>';
    document.getElementById('modalContainer').appendChild(modal);
}

function savePlan(editIdx) {
    var unit = (document.getElementById('planUnit') || {}).value || '';
    if (!unit.trim()) { alertMsg('请填写互供单位', 'warning'); return; }
    var plans = store.get('supply_plans', []);
    var p = {
        unit: unit.trim(),
        month: (document.getElementById('planMonth') || {}).value || '',
        planAmount: parseFloat((document.getElementById('planAmount') || {}).value) || 0,
        actualAmount: parseFloat((document.getElementById('planActual') || {}).value) || 0,
    };
    if (editIdx >= 0) plans[editIdx] = p; else plans.push(p);
    store.set('supply_plans', plans);
    closeModal(); loadPage('supply');
    alertMsg('已保存', 'success');
}

function renderPlansTable(plans) {
    if (plans.length === 0) return '<div class="empty-state"><i class="fas fa-file-contract"></i><p>暂无计划</p></div>';
    var h = '<div class="table-container"><table><thead><tr><th>互供单位</th><th>月份</th><th>计划量(吨)</th><th>实际完成(吨)</th><th>完成率</th><th>操作</th></tr></thead><tbody>';
    plans.forEach(function(p, i) {
        var rate = p.planAmount > 0 ? ((p.actualAmount / p.planAmount) * 100).toFixed(1) : '-';
        h += '<tr><td><strong>' + p.unit + '</strong></td><td>' + (p.month || '-') + '</td><td>' + (p.planAmount || '-') + '</td><td>' + (p.actualAmount || '-') + '</td><td><strong style="color:' + (rate !== '-' && parseFloat(rate) >= 100 ? '#52c41a' : '#f5222d') + ';">' + rate + '%</strong></td><td>' +
            '<button class="btn-icon" onclick="showPlanModal(' + i + ')"><i class="fas fa-edit" style="color:#1890ff;"></i></button> ' +
            '<button class="btn-icon" onclick="deletePlan(' + i + ')"><i class="fas fa-trash" style="color:#f5222d;"></i></button></td></tr>';
    });
    return h + '</tbody></table></div>';
}

function deletePlan(idx) {
    if (!confirm('确定？')) return;
    var plans = store.get('supply_plans', []);
    plans.splice(idx, 1);
    store.set('supply_plans', plans);
    loadPage('supply');
}

function renderAllRecordsTable(records) {
    if (records.length === 0) return '<div class="empty-state"><i class="fas fa-inbox"></i><p>暂无记录</p></div>';
    var h = '<div class="table-container"><table><thead><tr><th>日期</th><th>来源</th><th>油库</th><th>加油站/客户</th><th>油品</th><th>出库量(吨)</th><th>车号</th></tr></thead><tbody>';
    records.slice().reverse().forEach(function(r) {
        var bc = r.source === '中石化' ? 'badge-primary' : (r.source === '中海油' ? 'badge-success' : 'badge-warning');
        h += '<tr><td>' + (r.date || '-') + '</td><td><span class="badge ' + bc + '">' + (r.source || '手动') + '</span></td><td>' + (r.oilDepot || '-') + '</td><td>' + (r.station || r.customer || '-') + '</td><td>' + (r.oilType || '-') + '</td><td><strong>' + (r.amount || 0) + '</strong></td><td>' + (r.vehicleNo || '-') + '</td></tr>';
    });
    return h + '</tbody></table></div>';
}

function exportSupplyCSV() {
    var records = store.get('outbound_records', []);
    if (records.length === 0) { alertMsg('暂无数据', 'warning'); return; }
    var headers = ['日期', '来源', '油库', '加油站/客户', '油品', '出库量(吨)', '车号', '操作员'];
    var csv = [headers.join(',')].concat(records.map(function(r) {
        return [r.date, r.source, r.oilDepot, r.station || r.customer, r.oilType, r.amount, r.vehicleNo || '', r.operator || ''].map(function(v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(',');
    })).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '出库记录_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    alertMsg('导出成功', 'success');
}
