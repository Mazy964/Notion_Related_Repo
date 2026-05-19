async function main(){
  let raw;
  try{
    const resp = await fetch('data.json');
    raw = await resp.json();
  }catch(e){
    document.getElementById('heatmap-outer').innerHTML =
      '<div class="loading" style="color:#f85149">加载 data.json 失败</div>';
    console.error(e);
    return;
  }

  // raw: [{date, pages}, ...]
  const data = {};
  raw.forEach(r => { data[r.date] = r.pages; });

  function color(p){
    if(p==0) return '#ebedf0';
    if(p<=5) return '#9be9a8';
    if(p<=15) return '#40c463';
    if(p<=35) return '#30a14e';
    return '#216e39';
  }

  const dates = Object.keys(data).sort();
  const part = dates[0].split('-');
  const start = new Date(parseInt(part[0]), parseInt(part[1])-1, parseInt(part[2]));
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // 计算 stats
  let totalDays=0, totalPages=0, streak=0, maxStreak=0, prevDate=null;
  for(const ds of dates){
    const p = data[ds];
    if(p>0){
      totalDays++;
      totalPages += p;
      const parts = ds.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      if(prevDate && (d - prevDate)/86400000 === 1) streak++;
      else streak = 1;
      maxStreak = Math.max(maxStreak, streak);
      prevDate = d;
    }
  }
  document.getElementById('st-days').textContent = totalDays;
  document.getElementById('st-pages').textContent = totalPages;
  document.getElementById('st-avg').textContent = Math.round(totalPages/totalDays)||0;
  document.getElementById('st-streak').textContent = maxStreak;

  // 构建周网格 — 从周一对齐
  const dow = (start.getDay() + 6) % 7;
  let gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - dow);

  let allWeeks = [];
  let cur = new Date(gridStart);
  while(cur <= end){
    let week = [];
    for(let i=0;i<7;i++){
      let d = new Date(cur); d.setDate(cur.getDate()+i);
      week.push(new Date(d));
    }
    allWeeks.push(week);
    cur.setDate(cur.getDate()+7);
  }

  const startDateStr = dates[0];
  const endDateStr = dates[dates.length-1];
  let weeks = allWeeks.filter(w => w.some(d => {
    const s = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    return s >= startDateStr && s <= endDateStr;
  }));
  const nWeeks = weeks.length;

  // 月份标签
  let monthCols = [];
  let prevMo = -1;
  const moNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  weeks.forEach((w,i) => {
    for(const d of w){
      const s = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      if(s >= startDateStr && d.getMonth()+1 !== prevMo){
        monthCols.push([i, moNames[d.getMonth()+1]]);
        prevMo = d.getMonth()+1;
        break;
      }
      if(s >= startDateStr) break;
    }
  });

  let monthCells = [];
  for(let i=0;i<nWeeks;i++){
    const mc = monthCols.find(m => m[0]===i);
    if(mc) monthCells.push('<div style="grid-column:'+(i+2)+';font-size:11px;color:#8b949e;text-align:center">' + mc[1] + '</div>');
    else monthCells.push('<div style="grid-column:'+(i+2)+'"></div>');
  }
  const monthHtml = '<div style="display:grid;grid-template-columns:40px repeat('+nWeeks+',13px);gap:3px;margin-bottom:2px">'+
    '<div></div>'+monthCells.join('')+'</div>';

  // 星期标签
  const dayLabels = '<div class="week-labels">'+
    '<div class="day-label"></div><div class="day-label">Mon</div>'+
    '<div class="day-label"></div><div class="day-label">Wed</div>'+
    '<div class="day-label"></div><div class="day-label">Fri</div>'+
    '<div class="day-label"></div></div>';

  // 格子
  let cols = [];
  weeks.forEach(w => {
    let cells = [];
    w.forEach(d => {
      const s = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      if(s < startDateStr || s > endDateStr){
        cells.push('<div class="day-cell" style="background:#ebedf0;visibility:hidden"></div>');
      } else {
        const p = data[s]||0;
        const c = color(p);
        const tip = p>0 ? s+': '+p+' 页' : s+': 未阅读';
        cells.push('<div class="day-cell" style="background:'+c+'" data-tooltip="'+tip+'"></div>');
      }
    });
    cols.push('<div class="week-column">'+cells.join('')+'</div>');
  });
  const heatHtml = '<div style="display:grid;grid-template-columns:40px repeat('+nWeeks+',13px);gap:3px">'+
    dayLabels+'\n  <div style="display:flex;gap:3px">'+cols.join('')+'</div></div>';

  document.getElementById('heatmap-outer').innerHTML = monthHtml + heatHtml;

  // tooltip
  document.querySelectorAll('.day-cell').forEach(function(c){
    c.addEventListener('mouseenter', function(e){
      var t=document.createElement('div');
      t.className='tooltip';
      t.textContent=e.target.dataset.tooltip;
      document.body.appendChild(t);
      t.style.display='block';
      var r=e.target.getBoundingClientRect();
      t.style.left=(r.left+r.width/2-t.offsetWidth/2)+'px';
      t.style.top=(r.top-t.offsetHeight-8)+'px';
      e.target._t=t;
    });
    c.addEventListener('mouseleave', function(e){
      if(e.target._t){e.target._t.remove();}
    });
  });
}
main();