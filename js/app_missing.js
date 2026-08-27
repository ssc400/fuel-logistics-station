
// ==================== 运费核算页面 ====================
function renderFreight(c) {
    var points = store.get('delivery_points', []);
    var records = store.get('freight_records', []);
    var details = store.get('outbound_details', []);
    c.innerHTML =
        '<div class="card"><div class="card-header"><div class="card-title">出库点管理</div>' +
            '<button class="btn btn-primary" onclick="showFPModal()"><i class="fas fa-plus"></i> 添加</button></div>' +
        '</div>' ;
    alertMsg('部分功能加载中，请刷新', 'info');
}

function backupData() {
    var data = {};
    var prefix = 'oil_logistics_';
    Object.keys(localStorage).forEach(function(k) {
        if (k.indexOf(prefix) === 0) {
            try { data[k.substring(prefix.length)] = JSON.parse(localStorage.getItem(k)); } catch(ex) {}
        }
    });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '物流工作站备份_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    alertMsg('备份已下载', 'success');
}
