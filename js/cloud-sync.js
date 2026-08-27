/* =========================================================================
 * cloud-sync.js  —  成品油物流工作空间站 · 云端数据同步层
 * 设计原则：
 *   1. 未配置（无 Supabase URL/anon）时，全部方法为 no-op，主程序 100% 本地运行，零影响。
 *   2. 配置后：邮箱注册/登录 → 登录即把云端数据同步到本机（云端为唯一真源），
 *      之后本机每次上传/删除/清空都实时同步到云端。换设备/换浏览器登录即可恢复，无需重复上传。
 *   3. 任何异常都被 try/catch 吞掉，绝不让同步错误拖垮主页面。
 * ========================================================================= */
(function(){
  'use strict';
  var SB_URL='', SB_ANON='', sb=null, user=null, ready=false, cfgLoaded=false;

  function cfg(){
    if(cfgLoaded) return;
    cfgLoaded=true;
    var base=(window.CLOUD_CFG)||{};
    var ls=null; try{ ls=JSON.parse(localStorage.getItem('cloudCfg')||'null'); }catch(e){ ls=null; }
    SB_URL=(ls&&ls.SUPABASE_URL)||base.SUPABASE_URL||'';
    SB_ANON=(ls&&ls.SUPABASE_ANON)||base.SUPABASE_ANON||'';
  }
  function enabled(){ cfg(); return !!(SB_URL&&SB_ANON); }

  // ---- 动态加载 supabase-js ----
  function loadSb(cb){
    if(window.supabase) return cb();
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=function(){ cb(); };
    s.onerror=function(){ cb(new Error('supabase-cdn-failed')); };
    document.head.appendChild(s);
  }

  function makeKey(rec){
    return ['up', rec.type||'', rec.fileName||'', rec.recordCount||0, rec.createdAt||''].join('#');
  }

  // ---- 公开 API ----
  var CloudSync={
    isEnabled:function(){ return enabled(); },
    isReady:function(){ return ready; },
    isLoggedIn:function(){ return !!(user&&user.email); },
    getUser:function(){ return user?user.email:null; },

    /* 初始化：加载 supabase、恢复会话。cb() 在结束后调用（无论成功失败）。 */
    init:function(cb){
      cb=cb||function(){};
      if(!enabled()){ ready=true; return cb(); }
      loadSb(function(err){
        if(err||!window.supabase){ console.warn('[CloudSync] supabase 加载失败，降级本地',err); ready=true; return cb(); }
        try{
          sb=window.supabase.createClient(SB_URL,SB_ANON,{auth:{persistSession:true,autoRefreshToken:true}});
        }catch(e){ console.warn('[CloudSync] createClient 失败',e); ready=true; return cb(); }
        sb.auth.getSession().then(function(r){
          if(r.data&&r.data.session&&r.data.session.user){
            user={email:r.data.session.user.email, id:r.data.session.user.id};
          }
          ready=true; cb();
        }).catch(function(e){ console.warn('[CloudSync] getSession 失败',e); ready=true; cb(); });
      });
    },

    /* 登录后同步：云端有数据→覆盖本机；云端空且本机有数据→上推种子；都空→无事。 */
    syncAfterLogin:function(cb){
      cb=cb||function(){};
      if(!enabled()||!sb||!user){ return cb(false); }
      fetchCloudUploads(function(rows){
        fetchCloudDist(function(distRow){
          if(rows&&rows.length>0 || distRow){
            // 云端为真源，覆盖本机
            _DB.clear('uploads',function(){
              _DB.clear('distMap',function(){
                (rows||[]).forEach(function(r){
                  try{ _DB.put('uploads', Object.assign({}, r.payload||{}, {_cloudKey:r.id})); }catch(e){}
                });
                if(distRow&&distRow.payload){
                  _DB._ok(function(){ _DB._db.transaction('distMap','readwrite').objectStore('distMap').put(distRow.payload,'data'); });
                }
                CloudSync.refreshDbView();
                cb(true);
              });
            });
          } else {
            // 本机有数据则上推种子
            pushAllLocal(function(){ cb(false); });
          }
        });
      });
    },

    /* 手动同步按钮：等同于登录后同步 */
    manualSync:function(cb){
      cb=cb||function(){};
      if(!enabled()||!sb||!user){ return cb(false); }
      CloudSync.syncAfterLogin(cb);
    },

    /* 上传成功后调用：把这条记录 upsert 到云端 */
    pushUpload:function(rec){
      if(!rec) return;
      if(!enabled()||!sb||!user) return;
      try{
        var key=rec._cloudKey||makeKey(rec);
        var payload=Object.assign({}, rec, {_cloudKey:key});
        sb.from('uploads').upsert([{
          id:key, user_id:user.id, type:rec.type||'', cat:rec.cat||'',
          file_name:rec.fileName||'', record_count:rec.recordCount||0,
          created_at:rec.createdAt||new Date().toISOString(), payload:payload
        }]).then(function(r){ if(r.error)console.warn('[CloudSync] pushUpload',r.error); })
          .catch(function(e){ console.warn('[CloudSync] pushUpload err',e); });
      }catch(e){ console.warn('[CloudSync] pushUpload exception',e); }
    },

    /* 运距映射保存后调用 */
    pushDist:function(dm){
      if(!enabled()||!sb||!user) return;
      try{
        sb.from('dist_map').upsert([{ user_id:user.id, payload:dm||{} }])
          .then(function(r){ if(r.error)console.warn('[CloudSync] pushDist',r.error); })
          .catch(function(e){ console.warn('[CloudSync] pushDist err',e); });
      }catch(e){ console.warn('[CloudSync] pushDist exception',e); }
    },

    /* 删除某条上传时调用 */
    deleteUpload:function(key){
      if(!key||!enabled()||!sb||!user) return;
      try{
        sb.from('uploads').delete().eq('id',key).eq('user_id',user.id)
          .then(function(r){ if(r.error)console.warn('[CloudSync] deleteUpload',r.error); })
          .catch(function(e){ console.warn('[CloudSync] deleteUpload err',e); });
      }catch(e){ console.warn('[CloudSync] deleteUpload exception',e); }
    },

    /* 清空数据库时调用 */
    clearAll:function(){
      if(!enabled()||!sb||!user) return;
      try{
        sb.from('uploads').delete().eq('user_id',user.id)
          .then(function(r){ if(r.error)console.warn('[CloudSync] clearAll uploads',r.error); }).catch(function(){});
        sb.from('dist_map').delete().eq('user_id',user.id)
          .then(function(r){ if(r.error)console.warn('[CloudSync] clearAll dist',r.error); }).catch(function(){});
      }catch(e){ console.warn('[CloudSync] clearAll exception',e); }
    },

    /* 注册 */
    signUp:function(email,pass,cb){
      cb=cb||function(){};
      if(!enabled()||!sb){ return cb(new Error('未配置云端')); }
      sb.auth.signUp({email:email,password:pass}).then(function(r){
        if(r.error) return cb(r.error);
        if(r.data&&r.data.user){ user={email:r.data.user.email,id:r.data.user.id}; }
        cb(null,r.data);
      }).catch(function(e){ cb(e); });
    },
    /* 登录 */
    signIn:function(email,pass,cb){
      cb=cb||function(){};
      if(!enabled()||!sb){ return cb(new Error('未配置云端')); }
      sb.auth.signInWithPassword({email:email,password:pass}).then(function(r){
        if(r.error) return cb(r.error);
        if(r.data&&r.data.user){ user={email:r.data.user.email,id:r.data.user.id}; }
        cb(null,r.data);
      }).catch(function(e){ cb(e); });
    },
    /* 登出 */
    signOut:function(cb){
      cb=cb||function(){};
      if(sb){ sb.auth.signOut().then(function(){ user=null; cb(); }).catch(function(){ user=null; cb(); }); }
      else { user=null; cb(); }
    },

    /* 把当前本机数据全部上推云端（首次种子 / 手动备份） */
    pushAllLocal:function(cb){
      cb=cb||function(){};
      if(!enabled()||!sb||!user){ return cb(); }
      _DB.getAll('uploads',function(ups){
        var chain=Promise.resolve();
        (ups||[]).forEach(function(rec){
          chain=chain.then(function(){
            var key=rec._cloudKey||makeKey(rec);
            var payload=Object.assign({},rec,{_cloudKey:key});
            return sb.from('uploads').upsert([{id:key,user_id:user.id,type:rec.type||'',cat:rec.cat||'',file_name:rec.fileName||'',record_count:rec.recordCount||0,created_at:rec.createdAt||new Date().toISOString(),payload:payload}]);
          });
        });
        chain.then(function(){ _DB.get('distMap','data',function(dm){ CloudSync.pushDist(dm||{}); cb(); }); })
             .catch(function(e){ console.warn('[CloudSync] pushAllLocal',e); cb(); });
      });
    },

    /* ---------- UI ---------- */
    renderBar:function(){
      var bar=document.getElementById('syncBar'); if(!bar) return;
      if(!enabled()){
        bar.innerHTML='<span id="csCfgBtn" onclick="CloudSync.showSettings()" style="cursor:pointer;color:#8A8878;font-size:12px;border:1px dashed #ccc;border-radius:10px;padding:2px 9px">⚙️ 云端未配置</span>';
        return;
      }
      if(user&&user.email){
        bar.innerHTML='<span style="color:#3A5C4A;font-size:12px;margin-right:2px">☁️ '+escapeHtml(user.email)+'</span>'+
          '<span onclick="CloudSync.manualSync(function(){msg(\'s\',\'☁️ 已同步\')})" title="立即与云端同步" style="cursor:pointer;color:#3A5C4A;font-size:12px;background:#E8F0E8;border-radius:10px;padding:2px 9px;margin-right:4px">🔄 同步</span>'+
          '<span onclick="CloudSync.doSignOut()" title="退出登录" style="cursor:pointer;color:#888;font-size:12px;background:#f0f0f0;border-radius:10px;padding:2px 9px">🚪 退出</span>';
      }else{
        bar.innerHTML='<span onclick="CloudSync.showLogin()" style="cursor:pointer;color:#fff;font-size:12px;background:#3A5C4A;border-radius:10px;padding:3px 12px;font-weight:600">🔐 登录/注册</span>';
      }
    },

    showLogin:function(){
      openModal('<div style="font-size:15px;font-weight:600;margin-bottom:12px">☁️ 云端登录</div>'+
        '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555">邮箱</label><input id="csEmail" type="email" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-top:4px;box-sizing:border-box"></div>'+
        '<div style="margin-bottom:14px"><label style="font-size:12px;color:#555">密码（至少6位）</label><input id="csPass" type="password" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-top:4px;box-sizing:border-box"></div>'+
        '<div style="display:flex;gap:8px;justify-content:center"><button class="btn btn-p" onclick="CloudSync.doSignIn()">登录</button><button class="btn btn-s" onclick="CloudSync.doSignUp()">注册</button><button class="btn btn-o" onclick="closeCsModal()">取消</button></div>'+
        '<div style="margin-top:10px;font-size:11px;color:#888;text-align:center">注册即创建你的私有云端空间，数据按账号隔离</div>');
    },

    showSettings:function(){
      var html='<div style="font-size:15px;font-weight:600;margin-bottom:10px">⚙️ 云端同步配置</div>'+
        '<div style="font-size:12px;color:#555;line-height:1.7;margin-bottom:10px">把你的 <b>Supabase</b> 项目地址与 anon key 填到下面对话框保存即可激活（存于本浏览器）。没有项目？按下方步骤 2 分钟免费创建：<br>'+
        '① 打开 <a href="https://supabase.com" target="_blank" style="color:#1890ff">supabase.com</a> 新建项目；<br>'+
        '② 左侧 <b>SQL Editor</b> 执行建表语句（见下方）；<br>'+
        '③ <b>Authentication → Providers</b> 关闭 Email 确认（可选，方便注册）；<br>'+
        '④ <b>Project Settings → API</b> 复制 URL 与 anon key 填入此处。</div>'+
        '<div style="margin-bottom:8px"><label style="font-size:12px;color:#555">Supabase URL</label><input id="csUrl" type="text" placeholder="https://xxxx.supabase.co" style="width:100%;padding:7px;border:1px solid #ddd;border-radius:6px;margin-top:3px;box-sizing:border-box;font-size:12px"></div>'+
        '<div style="margin-bottom:8px"><label style="font-size:12px;color:#555">anon key（public）</label><input id="csKey" type="text" placeholder="eyJ..." style="width:100%;padding:7px;border:1px solid #ddd;border-radius:6px;margin-top:3px;box-sizing:border-box;font-size:12px"></div>'+
        '<details style="margin:8px 0;font-size:11px;color:#666"><summary style="cursor:pointer">📋 点击展开：建表 SQL（复制执行）</summary>'+
        '<pre style="background:#f6f8fa;padding:10px;border-radius:6px;overflow:auto;max-height:200px;white-space:pre">'+escapeHtml(SETUP_SQL)+'</pre></details>'+
        '<div style="display:flex;gap:8px;justify-content:center;margin-top:6px"><button class="btn btn-p" onclick="CloudSync.saveSettings()">保存并激活</button><button class="btn btn-o" onclick="closeCsModal()">关闭</button></div>';
      openModal(html);
    },

    saveSettings:function(){
      var url=(document.getElementById('csUrl').value||'').trim();
      var key=(document.getElementById('csKey').value||'').trim();
      if(!url||!key){ msg('w','请填写 URL 与 anon key'); return; }
      try{ localStorage.setItem('cloudCfg',JSON.stringify({SUPABASE_URL:url,SUPABASE_ANON:key})); }catch(e){}
      SB_URL=url; SB_ANON=key; cfgLoaded=true; ready=false; sb=null; user=null;
      loadSb(function(err){
        if(err||!window.supabase){ msg('e','supabase 加载失败，请检查网络'); return; }
        try{ sb=window.supabase.createClient(SB_URL,SB_ANON,{auth:{persistSession:true,autoRefreshToken:true}}); }
        catch(e){ msg('e','初始化失败：'+e.message); return; }
        ready=true;
        msg('s','☁️ 云端已激活，请登录');
        CloudSync.showLogin();
      });
    },

    doSignIn:function(){
      var e=document.getElementById('csEmail').value.trim();
      var p=document.getElementById('csPass').value;
      if(!e||!p){ msg('w','请输入邮箱和密码'); return; }
      CloudSync.signIn(e,p,function(err){
        if(err){ msg('e','登录失败：'+(err.message||err)); return; }
        msg('s','☁️ 登录成功，正在同步…');
        closeCsModal();
        CloudSync.renderBar();
        CloudSync.syncAfterLogin(function(){ msg('s','☁️ 数据已同步'); });
      });
    },
    doSignUp:function(){
      var e=document.getElementById('csEmail').value.trim();
      var p=document.getElementById('csPass').value;
      if(!e||!p){ msg('w','请输入邮箱和密码'); return; }
      if(p.length<6){ msg('w','密码至少6位'); return; }
      CloudSync.signUp(e,p,function(err){
        if(err){ msg('e','注册失败：'+(err.message||err)); return; }
        msg('s','☁️ 注册成功，正在同步…');
        closeCsModal();
        CloudSync.renderBar();
        CloudSync.syncAfterLogin(function(){ msg('s','☁️ 数据已同步'); });
      });
    },
    doSignOut:function(){
      CloudSync.signOut(function(){ CloudSync.renderBar(); msg('i','已退出云端'); });
    },

    /* 若当前在数据库页，刷新之 */
    refreshDbView:function(){
      try{
        var on=document.querySelector('.ni.on');
        if(on&&on.getAttribute('data-p')==='db'){ if(window.rdb) rdb(document.getElementById('ct')); }
      }catch(e){}
    }
  };

  // ---- 内部：云端读取 ----
  function fetchCloudUploads(cb){
    cb=cb||function(){};
    if(!sb||!user) return cb([]);
    sb.from('uploads').select('id,payload').eq('user_id',user.id).then(function(r){
      if(r.error){ console.warn('[CloudSync] fetch uploads',r.error); return cb([]); }
      cb(r.data||[]);
    }).catch(function(e){ console.warn('[CloudSync] fetch uploads err',e); cb([]); });
  }
  function fetchCloudDist(cb){
    cb=cb||function(){};
    if(!sb||!user) return cb(null);
    sb.from('dist_map').select('payload').eq('user_id',user.id).maybeSingle().then(function(r){
      if(r.error){ console.warn('[CloudSync] fetch dist',r.error); return cb(null); }
      cb(r.data||null);
    }).catch(function(e){ console.warn('[CloudSync] fetch dist err',e); cb(null); });
  }

  // ---- 弹窗辅助 ----
  var SETUP_SQL=
"-- 在 Supabase SQL Editor 执行（启用 RLS，数据按账号隔离）\n"+
"create table if not exists public.uploads (\n"+
"  id text primary key,\n"+
"  user_id uuid not null references auth.users(id) on delete cascade,\n"+
"  type text default '',\n"+
"  cat text default '',\n"+
"  file_name text default '',\n"+
"  record_count int default 0,\n"+
"  created_at text default '',\n"+
"  payload jsonb not null,\n"+
"  updated_at timestamptz default now()\n"+
");\n"+
"create table if not exists public.dist_map (\n"+
"  user_id uuid primary key references auth.users(id) on delete cascade,\n"+
"  payload jsonb not null default '{}'::jsonb,\n"+
"  updated_at timestamptz default now()\n"+
");\n"+
"alter table public.uploads enable row level security;\n"+
"alter table public.dist_map enable row level security;\n"+
"create policy \"own_uploads\" on public.uploads for all using (auth.uid()=user_id) with check (auth.uid()=user_id);\n"+
"create policy \"own_dist\" on public.dist_map for all using (auth.uid()=user_id) with check (auth.uid()=user_id);";

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function openModal(inner){
    closeCsModal();
    var m=document.createElement('div');
    m.id='csModal';
    m.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:100000;display:flex;align-items:center;justify-content:center';
    m.onclick=function(ev){ if(ev.target===m) closeCsModal(); };
    m.innerHTML='<div style="background:#fff;border-radius:10px;padding:22px;max-width:560px;width:94%;max-height:86vh;overflow-y:auto;box-shadow:0 12px 48px rgba(0,0,0,.2)">'+inner+'</div>';
    document.body.appendChild(m);
  }
  function closeCsModal(){ var m=document.getElementById('csModal'); if(m) m.remove(); }

  window.CloudSync=CloudSync;
  window.closeCsModal=closeCsModal;
})();
