/**
 * 成品油物流工作空间站 - 主应用逻辑（完整版）
 * 集成：对账软件 + 运距核对工具
 */

var PAGES = {
    dashboard: '工作台',
    supply: '互供工作',
    distance: '运距复核',
    freight: '运费核算'
};
var currentPage = 'dashboard';
var g_map = null;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof initData === 'function') initData();
    initNav();
    loadPage('dashboard');
});

function initNav() {
    var items = document.querySelectorAll('.nav-item');
    for (var i = 0; i < items.length; i++) {
        (function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                loadPage(item.dataset.page);
                for (var j = 0; j < items.length; j++) items[j].classList.remove('active');
                item.classList.add('active');
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('active');
                }
            });
        })(items[i]);
    }
    var mt = document.getElementById('menuToggle');
    if (mt) mt.addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
    });
}

function loadPage(page) {
    currentPage = page;
    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = PAGES[page];
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
    var m = document.querySelector('.modal-overlay');
    if (m) m.remove();
}

// ==================== CSV解析（对账软件核心） ====================
function detectCSVType(lines) {
    if (!lines || lines.length < 2) return 'unknown';
    var n = lines[1].split(',').length;
    if (n >= 10) return 'zhonghaiyou';
    if (n >= 7) return 'zhongshihua';
    return 'waicai';
}

function parseZSH(text) {
    var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l; });
    var out = [];
    for (var i = 1; i < lines.length; i++) {
        var c = lines[i].split(',').map(function(s){ return s.trim(); });
        if (c.length < 7) continue;
        out.push({
            date: c[0], oilDepot: c[1], station: c[2], oilType: c[3],
            amount: parseFloat(c[4]) || 0, operator: c[5], remark: c[6],
            source: '中石化', uploadTime: new Date().toISOString()
        });
    }
    return out;
}

function parseZHY(text) {
    var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l; });
    var out = [];
    for (var i = 1; i < lines.length; i++) {
        var c = lines[i].split(',').map(function(s){ return s.trim(); });
        if (c.length < 10) continue;
        out.push({
            date: c[0], oilDepot: c[1], station: c[2], oilType: c[3], vehicleNo: c[4],
            amount: parseFloat(c[5]) || 0, inboundAmount: parseFloat(c[6]) || 0,
            diff: parseFloat(c[7]) || 0, operator: c[8], remark: c[9],
            source: '中海油', uploadTime: new Date().toISOString()
        });
    }
    return out;
}

function parseWC(text) {
    var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l; });
    var out = [];
    for (var i = 1; i < lines.length; i++) {
        var c = lines[i].split(',').map(function(s){ return s.trim(); });
        if (c.length < 7) continue;
        out.push({
            date: c[0], supplier: c[1], oilDepot: c[2], oilType: c[3],
            amount: parseFloat(c[4]) || 0, unitPrice: parseFloat(c[5]) || 0,
            totalPrice: parseFloat(c[6]) || 0, remark: (c[7] || ''),
            source: '外采', uploadTime: new Date().toISOString()
        });
    }
    return out;
}

function handleCSVUpload(file, cb) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var text = e.target.result;
        var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l; });
        var type = detectCSVType(lines);
        var records = [], summary = '';
        if (type === 'zhongshihua') {
            records = parseZSH(text); summary = '中石化 ' + records.length + ' 条';
        } else if (type === 'zhonghaiyou') {
            records = parseZHY(text); summary = '中海油 ' + records.length + ' 条';
        } else {
            records = parseWC(text); summary = '外采 ' + records.length + ' 条';
        }
        var all = store.get('outbound_records', []);
        records.forEach(function(r){ all.push(r); });
        store.set('outbound_records', all);
        var ups = store.get('reconciliation_uploads', []);
        ups.push({
            fileName: file.name, fileType: type, recordCount: records.length,
            uploadTime: new Date().toISOString(), summary: summary
        });
        store.set('reconciliation_uploads', ups);
        cb(type, records, summary);
    };
    reader.readAsText(file, 'UTF-8');
}

// ==================== 仪表盘 ====================
function renderDashboard(c) {
    var records = store.get('outbound_records', []);
    var plans = store.get('supply_plans', []);
    var dists = store.get('distance_records', []);
    var points = store.get('customer_points', []);
    var today = new Date().toISOString().split('T')[0];
    var todayOut = 0;
    records.forEach(function(r){ if (r.date === today) todayOut += (r.amount || 0); });
    var zsh = 0, zhy = 0, wc = 0;
    records.forEach(function(r) {
        if (r.source === '中石化') zsh++;
        else if (r.source === '中海油') zhy++;
        else if (r.source === '外采') wc++;
    });
    c.innerHTML =
        '<div class="stats-grid">' +
            '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-truck-loading"></i></div><div class="stat-info"><h3>' + todayOut.toFixed(2) + '</h3><p>今日出库量(吨)</p></div></div>' +
            '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-file-contract"></i></div><div class="stat-info"><h3>' + plans.length + '</h3><p>计划数</p></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange"><i class="fas fa-route"></i></div><div class="stat-info"><h3>' + dists.length + '</h3><p>运距复核</p></div></div>' +
            '<div class="stat-card"><div class="stat-icon purple"><i class="fas fa-map-pin"></i></div><div class="stat-info"><h3>' + points.length + '</h3><p>客户卸油点</p></div></div>' +
        '</div>' +

        '<div class="card"><div class="card-header"><div class="card-title">对账数据概览</div><button class="btn btn-outline" onclick="loadPage(\'supply\')">查看</button></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:15px;padding:15px;">' +
                '<div style="text-align:center;padding:15px;background:#e6f7ff;border-radius:8px;"><div style="font-size:1.6rem;font-weight:700;color:#1890ff;">' + zsh + '</div><div style="font-size:0.85rem;color:#666;">中石化</div></div>' +
                '<div style="text-align:center;padding:15px;background:#f6ffed;border-radius:8px;"><div style="font-size:1.6rem;font-weight:700;color:#52c41a;">' + zhy + '</div><div style="font-size:0.85rem;color:#666;">中海油</div></div>' +
                '<div style="text-align:center;padding:15px;background:#fff7e6;border-radius:8px;"><div style="font-size:1.6rem;font-weight:700;color:#fa8c16;">' + wc + '</div><div style="font-size:0.85rem;color:#666;">外采</div></div>' +
            '</div></div>' +

        '<div class="card"><div class="card-header"><div class="card-title">快速操作</div></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;padding:15px;">' +
                '<button class="btn btn-primary" onclick="loadPage(\'supply\')" style="padding:18px;height:auto;flex-direction:column;gap:8px;display:flex;"><i class="fas fa-upload" style="font-size:1.8rem;"></i><span>上传对账CSV</span></button>' +
                '<button class="btn btn-success" onclick="loadPage(\'distance\')" style="padding:18px;height:auto;flex-direction:column;gap:8px;display:flex;"><i class="fas fa-map-marked-alt" style="font-size:1.8rem;"></i><span>运距复核</span></button>' +
                '<button class="btn btn-warning" onclick="loadPage(\'freight\')" style="padding:18px;height:auto;flex-direction:column;gap:8px;display:flex;"><i class="fas fa-calculator" style="font-size:1.8rem;"></i><span>运费核算</span></button>' +
            '</div></div>' +

        '<div class="card"><div class="card-header"><div class="card-title">最近记录</div></div>' + renderRecentTable(records.slice(-5).reverse()) + '</div>';
}

function renderRecentTable(records) {
    if (records.length === 0) return '<div class="empty-state"><i class="fas fa-inbox"></i><p>暂无记录，请上传对账CSV</p></div>';
    var h = '<div class="table-container"><table><thead><tr><th>日期</th><th>来源</th><th>油库</th><th>加油站/客户</th><th>出库量</th></tr></thead><tbody>';
    records.forEach(function(r) {
        var bc = r.source === '中石化' ? 'badge-primary' : (r.source === '中海油' ? 'badge-success' : 'badge-warning');
        h += '<tr><td>' + (r.date || '-') + '</td><td><span class="badge ' + bc + '">' + (r.source || '手动') + '</span></td><td>' + (r.oilDepot || '-') + '</td><td>' + (r.station || r.supplier || '-') + '</td><td><strong>' + (r.amount || 0) + '</strong></td></tr>';
    });
    return h + '</tbody></table></div>';
}
