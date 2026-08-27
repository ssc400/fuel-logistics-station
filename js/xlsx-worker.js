// xlsx-worker.js
// Web Worker 用于异步解析 Excel 文件，不阻塞主线程
// 通过 importScripts 加载同目录下的 xlsx.full.min.js

importScripts('xlsx.full.min.js');

self.onmessage = function(e) {
  var msg = e.data;
  var buf = msg.buf;
  var fileName = msg.fileName || '';

  try {
    var wb = XLSX.read(buf, { type: 'array', cellDates: false });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

    self.postMessage({
      success: true,
      data: data,
      fileName: fileName
    });
  } catch (err) {
    self.postMessage({
      success: false,
      error: err.message || String(err),
      fileName: fileName
    });
  }
};
