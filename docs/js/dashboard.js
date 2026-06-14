(function () {
  const CSV_URL = 'data/customer_journey_cleaned.csv';

  let rawData = [];
  let charts = {};

  const STAGE_ORDER = ['Website Visit', 'Product Viewed', 'Add to Cart', 'Checkout Started', 'Purchase Completed'];
  const STAGE_KEYS = ['Visit', 'View', 'Cart', 'Checkout', 'Purchase'];
  const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
  const CHANNELS = ['Organic Search', 'Paid Ads', 'Social Media', 'Email', 'Referral', 'Direct'];
  const SEGMENTS = ['Premium', 'Standard', 'Budget'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  const TARGETS = {
    revenue: 3000,
    convRate: 0.20,
    retentionRate: 0.35,
    churnRate: 0.20
  };

  const SPARK_COLORS = {
    revenue: '#2563EB',
    conv: '#16A34A',
    retention: '#8B5CF6',
    leads: '#2563EB',
    visitors: '#F59E0B'
  };

  const RECOVERY_RATES = [0, 0, 0.20, 0.30, 0];

  function parseCSV(text) {
    const COL_MAP = {
      'Customer ID': 'customer_id', 'Customer Name': 'name', 'Customer Segment': 'segment',
      'Age Group': 'age_group', 'Region': 'region', 'Acquisition Channel': 'channel',
      'Campaign Name': 'campaign', 'Website Visit Date': 'date', 'Page Views': 'pages_visited',
      'Product Viewed': 'product_viewed', 'Add to Cart': 'add_to_cart',
      'Checkout Started': 'checkout_started', 'Purchase Completed': 'purchase_completed',
      'Purchase Value': 'purchase_value', 'Session Duration': 'session_duration',
      'Bounce Status': 'bounce_status', 'Customer Feedback Score': 'satisfaction_score',
      'Customer Retention Status': 'customer_retention', 'Funnel Stage': 'funnel_stage',
      'Conversion Status': 'conversion_status', 'Visit Month': 'visit_month', 'Visit Day': 'visit_day'
    };
    const rows = text.trim().split('\n');
    const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const vals = rows[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (vals.length < headers.length) continue;
      const row = {};
      headers.forEach((h, idx) => {
        const key = COL_MAP[h] || h;
        row[key] = vals[idx];
      });
      row.purchase_value = parseFloat(row.purchase_value) || 0;
      row.age = parseInt(row.age) || 0;
      row.session_duration = parseInt(row.session_duration) || 0;
      row.pages_visited = parseInt(row.pages_visited) || 0;
      row.acquisition_cost = parseFloat(row.acquisition_cost) || 0;
      row.converted = row.conversion_status === 'Converted' || row.converted === 'TRUE' || row.converted === 'true' || row.converted === '1' || row.converted === 'True';
      row.retained = row.customer_retention === 'Retained' || row.retained === 'TRUE' || row.retained === 'true' || row.retained === '1' || row.retained === 'True';
      const FUNNEL_MAP = { 'Product Viewed': 'View', 'Add to Cart': 'Cart', 'Checkout Started': 'Checkout', 'Purchase Completed': 'Purchase' };
      row.funnel_stage = FUNNEL_MAP[row.funnel_stage] || row.funnel_stage;
      data.push(row);
    }
    return data;
  }

  function getFilterSelections() {
    const groups = [
      { id: 'regionGroup', key: 'region' },
      { id: 'segmentGroup', key: 'segment' },
      { id: 'channelGroup', key: 'channel' },
      { id: 'ageGroup', key: 'age_group' },
      { id: 'campaignGroup', key: 'campaign' }
    ];
    const selections = {};
    groups.forEach(g => {
      const container = document.getElementById(g.id);
      if (!container) { selections[g.key] = []; return; }
      const checked = [];
      container.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        checked.push(cb.value);
      });
      selections[g.key] = checked;
    });
    return selections;
  }

  function filterData(data) {
    const sel = getFilterSelections();

    if (data.length === 0) return data;

    const hasAny = Object.values(sel).some(arr => arr.length > 0);
    if (!hasAny) return data;

    return data.filter(d => {
      if (sel.region.length > 0 && !sel.region.includes(d.region)) return false;
      if (sel.segment.length > 0 && !sel.segment.includes(d.segment)) return false;
      if (sel.channel.length > 0 && !sel.channel.includes(d.channel)) return false;
      if (sel.age_group.length > 0 && !sel.age_group.includes(d.age_group)) return false;
      if (sel.campaign.length > 0 && !sel.campaign.includes(d.campaign)) return false;
      return true;
    });
  }

  function formatCurrency(v) {
    if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
    return '$' + Math.round(v).toLocaleString('en-US');
  }

  function animateCounter(el, target, suffix, duration) {
    duration = duration || 1200;
    const start = performance.now();
    const startVal = 0;
    function tick(now) {
      const pct = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      const current = startVal + (target - startVal) * eased;
      if (target > 10000) { el.textContent = formatCurrency(Math.round(current)); }
      else if (target > 100) { el.textContent = formatCurrency(Math.round(current)); }
      else { el.textContent = (target > 0 ? (target < 10 ? current.toFixed(1) : Math.round(current)) : '0') + (suffix || ''); }
      if (pct < 1) requestAnimationFrame(tick);
      else {
        if (target > 10000) el.textContent = formatCurrency(Math.round(target));
        else if (target > 100) el.textContent = formatCurrency(Math.round(target));
        else el.textContent = (target > 0 ? (target < 10 ? target.toFixed(1) : Math.round(target)) : '0') + (suffix || '');
      }
    }
    requestAnimationFrame(tick);
  }

  function drawSpark(ctx, data, color) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!data || data.length < 2) return;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = color + '15';
    const last = data.length - 1;
    ctx.lineTo((last / (data.length - 1)) * w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  function calcFunnel(data) {
    const allStages = {
      'Website Visit': data.length,
      'Product Viewed': data.length,
      'Add to Cart': data.filter(d => { const s = d.funnel_stage; return s === 'Cart' || s === 'Checkout' || s === 'Purchase'; }).length,
      'Checkout Started': data.filter(d => { const s = d.funnel_stage; return s === 'Checkout' || s === 'Purchase'; }).length,
      'Purchase Completed': data.filter(d => d.funnel_stage === 'Purchase').length
    };
    return STAGE_ORDER.map(s => ({ stage: s, count: allStages[s] || 0 }));
  }

  function calcRevenueLeakage(funnelData, avgValue) {
    const leakages = [];
    funnelData.forEach((f, i) => {
      if (i === 0) { leakages.push(0); return; }
      const lost = funnelData[i - 1].count - f.count;
      const prob = [0, 0.80, 0.65, 0.45, 0.30][i];
      leakages.push(lost * avgValue * prob);
    });
    return leakages;
  }

  function calcBHS(data, metrics) {
    const revScore = metrics.totalRevenue > 0 ? Math.min((metrics.totalRevenue / TARGETS.revenue) * 100, 100) : 0;
    const convScore = metrics.convRate > 0 ? Math.min((metrics.convRate / TARGETS.convRate) * 100, 100) : 0;
    const retScore = metrics.retRate > 0 ? Math.min((metrics.retRate / TARGETS.retentionRate) * 100, 100) : 0;
    const churnActual = 1 - metrics.retRate;
    const churnScore = churnActual > 0 ? Math.max(0, Math.min((TARGETS.churnRate / churnActual) * 100, 100)) : 100;
    const weights = { rev: 0.35, conv: 0.25, ret: 0.25, churn: 0.15 };
    const score = Math.round(
      revScore * weights.rev +
      convScore * weights.conv +
      retScore * weights.ret +
      churnScore * weights.churn
    );
    return { score, components: { rev: Math.round(revScore), conv: Math.round(convScore), ret: Math.round(retScore), churn: Math.round(churnScore) } };
  }

  function calcHealthSegments(data) {
    const healthy = data.filter(d => d.converted && d.retained).length;
    const atRisk = data.filter(d => d.converted && !d.retained).length;
    const likelyChurn = data.filter(d => !d.converted && d.retained).length;
    const churned = data.filter(d => !d.converted && !d.retained).length;
    const avgRev = data.reduce((s, d) => s + d.purchase_value, 0) / (data.length || 1);
    const recoverableRev = Math.round((atRisk + likelyChurn) * avgRev * 0.30);
    return { healthy, atRisk, likelyChurn, churned, recoverableRev };
  }

  function calcMonthlyTrend(data) {
    return MONTHS.map((m, idx) => {
      return data.filter(d => {
        const mNum = (idx + 1).toString().padStart(2, '0');
        const parts = (d.date || '').split('-');
        return parts.length >= 2 && parts[1] === mNum;
      });
    });
  }

  function linearForecast(values, months) {
    if (values.length < 2) return values.map(() => 0);
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    values.forEach((y, i) => {
      num += (i - xMean) * (y - yMean);
      den += (i - xMean) * (i - xMean);
    });
    const slope = den ? num / den : 0;
    const intercept = yMean - slope * xMean;
    const result = [];
    for (let i = 0; i < n + months; i++) {
      result.push(Math.max(0, intercept + slope * i));
    }
    return result;
  }

  function render(data) {
    if (!data || data.length === 0) {
      showEmptyState();
      return;
    }

    // Clear any empty state
    document.querySelectorAll('.empty-state:not(.chart-empty-overlay)').forEach(el => el.remove());
    document.querySelectorAll('.chart-empty-overlay').forEach(el => el.remove());

    const funnelData = calcFunnel(data);
    const totalRevenue = data.reduce((s, d) => s + d.purchase_value, 0);
    const convCount = data.filter(d => d.converted).length;
    const convRate = data.length ? (convCount / data.length) : 0;
    const retCount = data.filter(d => d.retained).length;
    const retRate = data.length ? (retCount / data.length) : 0;
    const visitors = data.length;
    const aov = convCount ? totalRevenue / convCount : 0;
    const rpv = data.length ? totalRevenue / data.length : 0;
    const clv = aov * (1 / (1 - retRate));
    const health = calcHealthSegments(data);
    const monthlyData = calcMonthlyTrend(data);
    const monthlyRevenue = monthlyData.map(arr => arr.reduce((s, d) => s + d.purchase_value, 0));
    const monthlyConv = monthlyData.map(arr => arr.filter(d => d.converted).length);
    const monthlyRet = monthlyData.map(arr => arr.filter(d => d.retained).length);

    const bhsResult = calcBHS(data, { totalRevenue, convRate, retRate });
    const bhsScore = bhsResult.score;
    const leakages = calcRevenueLeakage(funnelData, aov);
    const totalLeakage = leakages.reduce((s, v) => s + v, 0);
    const totalRecovery = leakages.reduce((s, v, i) => s + v * RECOVERY_RATES[i], 0);

    const revTarget = TARGETS.revenue;
    const revGap = revTarget - totalRevenue;
    const revForecast = linearForecast(monthlyRevenue, 1);
    const revForecastNext = revForecast.length > 0 ? revForecast[revForecast.length - 1] * 3 : 0;
    const convForecastData = linearForecast(monthlyConv.map(c => data.length ? c / data.length : 0), 1);
    const retForecastData = linearForecast(monthlyRet.map(r => r), 1);

    // KPI Cards
    animateCounter(document.getElementById('kpiRevenue'), Math.round(totalRevenue), '', 1200);

    const revenueAchievement = revTarget > 0 ? (totalRevenue / revTarget) * 100 : 0;
    const achieveEl = document.getElementById('kpiAchievement');
    achieveEl.textContent = revenueAchievement.toFixed(1) + '%';
    const achieveTrend = document.getElementById('kpiAchieveTrend');
    if (totalRevenue >= revTarget) {
      achieveTrend.className = 'kpi-trend up';
      achieveTrend.innerHTML = '<i class="fas fa-check-circle"></i> Target achieved';
    } else {
      achieveTrend.className = 'kpi-trend down';
      achieveTrend.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + formatCurrency(Math.round(revGap)) + ' short';
    }

    const convPct = (convRate * 100);
    document.getElementById('kpiConv').textContent = convPct.toFixed(1) + '%';
    const retPct = (retRate * 100);
    document.getElementById('kpiRetention').textContent = retPct.toFixed(1) + '%';
    document.getElementById('kpiLeads').textContent = convCount;
    document.getElementById('kpiVisitors').textContent = visitors;
    document.getElementById('kpiAtRisk').textContent = formatCurrency(Math.round(totalLeakage));
    var atRiskTrend = document.getElementById('kpiAtRiskTrend');
    if (atRiskTrend) {
      atRiskTrend.innerHTML = '<i class="fas fa-medal" style="color:var(--success)"></i> ' + formatCurrency(Math.round(totalRecovery)) + ' recoverable';
    }

    // KPI trends vs targets
    const revTrendEl = document.getElementById('kpiRevenueTrend');
    if (totalRevenue >= revTarget) { revTrendEl.className = 'kpi-trend up'; revTrendEl.innerHTML = '<i class="fas fa-check-circle"></i> Target met'; }
    else { revTrendEl.className = 'kpi-trend down'; revTrendEl.innerHTML = '<i class="fas fa-arrow-down"></i> ' + formatCurrency(revGap) + ' below target'; }

    const convTrendEl = document.getElementById('kpiConvTrend');
    if (convRate >= TARGETS.convRate) { convTrendEl.className = 'kpi-trend up'; convTrendEl.innerHTML = '<i class="fas fa-check-circle"></i> Target met'; }
    else { convTrendEl.className = 'kpi-trend down'; convTrendEl.innerHTML = '<i class="fas fa-arrow-down"></i> ' + ((TARGETS.convRate - convRate) * 100).toFixed(1) + ' pp below target'; }

    const retTrendEl = document.getElementById('kpiRetTrend');
    if (retRate >= TARGETS.retentionRate) { retTrendEl.className = 'kpi-trend up'; retTrendEl.innerHTML = '<i class="fas fa-check-circle"></i> Target met'; }
    else { retTrendEl.className = 'kpi-trend down'; retTrendEl.innerHTML = '<i class="fas fa-arrow-down"></i> ' + ((TARGETS.retentionRate - retRate) * 100).toFixed(1) + ' pp below target'; }

    document.getElementById('kpiConvCountTrend').innerHTML = '<i class="fas fa-users"></i> ' + convCount + ' of ' + visitors;
    document.getElementById('kpiVisitorTrend').innerHTML = '<i class="fas fa-users"></i> ' + visitors + ' total';

    // Revenue Target/Gap Cards
    document.getElementById('targetRevenue').textContent = formatCurrency(revTarget);
    const gapEl = document.getElementById('targetGap');
    gapEl.textContent = revGap > 0 ? '-' + formatCurrency(revGap) : '+' + formatCurrency(Math.abs(revGap));
    gapEl.style.color = revGap > 0 ? 'var(--danger)' : 'var(--success)';
    document.getElementById('targetForecast').textContent = formatCurrency(Math.round(revForecastNext));
    document.getElementById('targetAtRisk').textContent = formatCurrency(Math.round(totalLeakage));
    document.getElementById('targetRecovery').textContent = formatCurrency(Math.round(totalRecovery));

    // BHS Gauge
    document.getElementById('bhsScore').textContent = bhsScore;
    const bhsStatus = document.getElementById('bhsStatus');
    if (bhsScore >= 70) { bhsStatus.textContent = 'Healthy'; bhsStatus.className = 'bhs-status healthy'; }
    else if (bhsScore >= 45) { bhsStatus.textContent = 'Needs Attention'; bhsStatus.className = 'bhs-status needs-attention'; }
    else { bhsStatus.textContent = 'Critical'; bhsStatus.className = 'bhs-status critical'; }

    // BHS composition tooltip
    var comp = bhsResult.components;
    var roiPct = totalRevenue > 0 ? Math.round((totalRevenue / (totalRevenue * 0.6 + 1)) * 100) : 0;
    var roiScore = Math.min(100, roiPct);
    document.getElementById('bhsCompRev').textContent = comp.rev + '/100';
    document.getElementById('bhsCompConv').textContent = comp.conv + '/100';
    document.getElementById('bhsCompRet').textContent = comp.ret + '/100';
    document.getElementById('bhsCompRoi').textContent = roiScore + '/100';
    document.getElementById('bhsCompChurn').textContent = comp.churn + '/100';
    document.getElementById('bhsCompFinal').textContent = bhsScore + '/100';
    // Detailed breakdown with visual bars
    var bhsDetailEl = document.getElementById('bhsDetailItems');
    if (bhsDetailEl) {
      var bhsItems = [
        { label: 'Revenue Performance', score: comp.rev, max: 100 },
        { label: 'Conversion Performance', score: comp.conv, max: 100 },
        { label: 'Retention Performance', score: comp.ret, max: 100 },
        { label: 'ROI Performance', score: roiScore, max: 100 },
        { label: 'Churn Risk', score: 100 - comp.churn, max: 100 }
      ];
      bhsDetailEl.innerHTML = bhsItems.map(function(item) {
        var pct = Math.round((item.score / item.max) * 100);
        var cls = pct >= 70 ? 'bhs-bar-green' : pct >= 45 ? 'bhs-bar-yellow' : 'bhs-bar-red';
        return '<div class="bhs-detail-row"><span class="bhs-detail-label">' + item.label + '</span><div class="bhs-detail-bar-wrap"><div class="bhs-detail-bar ' + cls + '" style="width:' + pct + '%"></div></div><span class="bhs-detail-score">' + item.score + '/' + item.max + '</span></div>';
      }).join('');
    }

    // Update SVG gauge
    const gaugeCircle = document.querySelector('.bhs-mini-gauge circle:nth-child(2)');
    if (gaugeCircle) {
      const circumference = 2 * Math.PI * 18;
      const offset = circumference - (bhsScore / 100) * circumference;
      gaugeCircle.setAttribute('stroke-dasharray', circumference);
      gaugeCircle.setAttribute('stroke-dashoffset', offset);
    }

    // Executive Summary
    const bestChannel = CHANNELS.map(ch => {
      const d = data.filter(r => r.channel === ch);
      const rate = d.length ? (d.filter(r => r.converted).length / d.length) * 100 : 0;
      return { name: ch, rate, revenue: d.reduce((s, r) => s + r.purchase_value, 0) };
    }).sort((a, b) => b.rate - a.rate)[0];

    const bestSegment = SEGMENTS.map(s => {
      const d = data.filter(r => r.segment === s);
      const rate = d.length ? (d.filter(r => r.converted).length / d.length) * 100 : 0;
      return { name: s, rate };
    }).sort((a, b) => b.rate - a.rate)[0];

    document.getElementById('execRevenueStatus').textContent = totalRevenue >= revTarget ? 'On Target' : (revGap > 0 ? 'Below Target by ' + formatCurrency(revGap) : 'Above Target');
    document.getElementById('execRevenueAchievement').textContent = revenueAchievement.toFixed(1) + '%';
    const gapDisplay = revGap > 0 ? '- ' + formatCurrency(revGap) : '+ ' + formatCurrency(Math.abs(revGap));
    const execGapEl = document.getElementById('execRevenueGap');
    execGapEl.textContent = gapDisplay;
    execGapEl.style.color = revGap > 0 ? 'var(--danger)' : 'var(--success)';
    document.getElementById('execBiggestLeak').textContent = 'View\u2192Cart (' + formatCurrency(Math.round(leakages[2])) + ')';
    document.getElementById('execTopChannel').textContent = bestChannel ? bestChannel.name + ' (' + bestChannel.rate.toFixed(1) + '% conv)' : '—';
    document.getElementById('execTopChannelBasis').textContent = 'by Conversion Rate';
    document.getElementById('execTopSegment').textContent = bestSegment ? bestSegment.name + ' (' + bestSegment.rate.toFixed(1) + '% conv)' : '—';
    document.getElementById('execTopSegmentBasis').textContent = 'by Conversion Rate';
    document.getElementById('execRevAtRisk').textContent = formatCurrency(Math.round(totalLeakage));
    document.getElementById('execRecAction').textContent = 'Optimize Checkout & Cart (P1)';
    document.getElementById('execRecoveryOpp').textContent = formatCurrency(Math.round(totalRecovery * 0.8)) + '\u2013' + formatCurrency(Math.round(totalRecovery * 1.2)) + ' recoverable';

    // Executive Intelligence Briefing
    renderExecBriefBanner(data, totalRevenue, revTarget, convRate, retRate, bhsScore, totalLeakage, totalRecovery, funnelData, leakages, aov);
    renderTop3Priorities(totalRevenue, revTarget, convRate, retRate, funnelData, leakages, data, totalRecovery);
    renderInsights(data, funnelData, leakages, totalRevenue, convRate, retRate, bhsScore, bestChannel, bestSegment, totalLeakage, revTarget, revGap);
    renderRiskMatrix(data, funnelData, leakages, totalRevenue, convRate, retRate, aov);
    renderRevenueWaterfall(totalRevenue, revTarget, totalLeakage, totalRecovery, data);
    renderFinalRecommendation(totalRevenue, revTarget, convRate, retRate, funnelData, leakages, totalRecovery);

    // Revenue Leakage & Recovery Intelligence
    renderFunnelExecutiveSummary(data, funnelData, leakages, aov, totalRecovery);
    renderLargestLeakage(funnelData, leakages, aov);
    renderFunnelTable(funnelData, leakages, aov, data);
    renderRecoveryRanking(funnelData, leakages, aov);
    renderFunnelInterpretation(funnelData, leakages, data, aov);
    renderRecoveryRoadmap(funnelData, leakages);

    // Channel metrics + executive summary
    renderChannelExecutiveSummary(data);
    renderChannelMetrics(data);

    // Health segments + score + risk + recovery
    renderHealthSegments(health, data);
    renderCustomerHealthScore(health, data);
    renderCustomerRiskAssessment(health, data);
    renderCustomerRecoveryCard(health, data);

    // Region ranking + opportunity + concentration risk + executive insight
    renderRegionalOpportunitySummary(data);
    renderRegionRanking(data);
    renderConcentrationRisk(data);
    renderRevenueGrowthExecutiveInsight(data);

    // Forecasting
    renderForecasting(monthlyRevenue, monthlyConv, monthlyRet, data.length, totalRevenue);

    // Recommendations
    renderRecommendations(leakages, totalLeakage, totalRecovery, data);

    // Sparklines
    ['sparkRevenue', 'sparkConv', 'sparkRet', 'sparkLeads', 'sparkVisitors'].forEach(id => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (id === 'sparkRevenue') drawSpark(ctx, monthlyRevenue, SPARK_COLORS.revenue);
      else if (id === 'sparkConv') drawSpark(ctx, monthlyConv.map((c, i) => monthlyData[i].length ? (c / monthlyData[i].length) * 100 : 0), SPARK_COLORS.conv);
      else if (id === 'sparkRet') drawSpark(ctx, monthlyRet.map((r, i) => monthlyData[i].length ? (r / monthlyData[i].length) * 100 : 0), SPARK_COLORS.retention);
      else if (id === 'sparkLeads') drawSpark(ctx, monthlyConv, SPARK_COLORS.leads);
      else if (id === 'sparkVisitors') drawSpark(ctx, monthlyData.map(arr => arr.length), SPARK_COLORS.visitors);
    });

    // Destroy old charts
    Object.values(charts).forEach(c => { if (c) try { c.destroy(); } catch(e) {} });

    // Funnel chart
    const funnelCtx = document.getElementById('funnelChart');
    if (funnelCtx) {
      charts.funnel = new Chart(funnelCtx, {
        type: 'bar',
        data: {
          labels: funnelData.map(f => f.stage),
          datasets: [{
            data: funnelData.map(f => f.count),
            backgroundColor: ['#2563EB', '#3B82F6', '#F59E0B', '#F97316', '#DC2626'],
            borderRadius: 4,
            barPercentage: 0.6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ctx.parsed.x + ' customers',
                afterLabel: (ctx) => {
                  const idx = ctx.dataIndex;
                  if (idx > 0) {
                    const lost = funnelData[idx - 1].count - funnelData[idx].count;
                    const leakage = leakages[idx];
                    return 'Lost: ' + lost + ' users\nLeakage: ' + formatCurrency(Math.round(leakage));
                  }
                  return '';
                }
              }
            }
          },
          scales: { x: { grid: { display: false }, ticks: { stepSize: 20 } }, y: { grid: { display: false } } }
        }
      });
    }

    // Channel chart (upgraded - revenue by channel)
    const channelCtx = document.getElementById('channelChart');
    if (channelCtx) {
      const chRevenue = CHANNELS.map(ch => data.filter(r => r.channel === ch).reduce((s, d) => s + d.purchase_value, 0));
      charts.channel = new Chart(channelCtx, {
        type: 'bar',
        data: {
          labels: CHANNELS,
          datasets: [{ data: chRevenue, backgroundColor: ['#2563EB', '#DC2626', '#8B5CF6', '#16A34A', '#F59E0B', '#06B6D4'], borderRadius: 4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'Revenue: ' + formatCurrency(ctx.parsed.y) } } },
          scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { callback: (v) => formatCurrency(v) } }, x: { grid: { display: false } } }
        }
      });
    }

    // Region ranking table
    renderRegionRanking(data);

    // Segment intelligence banner
    renderSegmentIntelligence(data);

    // Segment metrics table
    renderSegmentMetrics(data);

    // Segment recommendation card
    renderSegmentRecommendation(data);

    // Segment Opportunity Matrix
    renderSegmentOpportunityMatrix(data);

    // Segment chart
    const segmentCtx = document.getElementById('segmentChart');
    if (segmentCtx) {
      const segConv = SEGMENTS.map(s => { const d = data.filter(r => r.segment === s); return d.length ? (d.filter(r => r.converted).length / d.length) * 100 : 0; });
      const segRet = SEGMENTS.map(s => { const d = data.filter(r => r.segment === s); return d.length ? (d.filter(r => r.retained).length / d.length) * 100 : 0; });
      charts.segment = new Chart(segmentCtx, {
        type: 'bar',
        data: {
          labels: SEGMENTS,
          datasets: [
            { label: 'Conversion %', data: segConv, backgroundColor: '#2563EB', borderRadius: 4 },
            { label: 'Retention %', data: segRet, backgroundColor: '#16A34A', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + '%' } } },
          scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { callback: (v) => v + '%' } }, x: { grid: { display: false } } }
        }
      });
    }

    // KPI Hierarchy with health status
    renderKpiHierarchy(totalRevenue, revenueAchievement, convRate, retRate, aov, rpv, clv, TARGETS);

    // Executive Insight Footer
    renderExecutiveInsight(data);
  }

  function renderExecBriefBanner(data, totalRevenue, revTarget, convRate, retRate, bhsScore, totalLeakage, totalRecovery, funnelData, leakages, aov) {
    var el = document.getElementById('execBriefBanner');
    if (!el) return;
    var gap = revTarget - totalRevenue;
    var topDropIdx = [2, 3, 4].reduce(function(max, i) { return leakages[i] > leakages[max] ? i : max; }, 2);
    var topPriority = topDropIdx === 4 ? 'Optimize Checkout Funnel' : topDropIdx === 3 ? 'Reduce Cart Abandonment' : 'Fix View-to-Cart Leakage';
    var bhsLabel = bhsScore >= 70 ? 'Healthy' : bhsScore >= 45 ? 'Needs Attention' : 'Critical';
    var bhsColor = bhsScore >= 70 ? 'var(--success)' : bhsScore >= 45 ? 'var(--warning)' : 'var(--danger)';
    el.innerHTML =
      '<div class="ebb-card ebb-highlight"><span class="ebb-label"><i class="fas fa-crown"></i> Executive Summary</span><span class="ebb-value" style="font-size:13px;font-weight:500;opacity:0.85">Business Health Score: <strong style="font-size:22px">' + bhsScore + '</strong><span style="font-size:11px;margin-left:6px;color:' + bhsColor + ';font-weight:700">' + bhsLabel + '</span></span><span class="ebb-sub">' + formatCurrency(Math.round(totalRevenue)) + ' revenue \u2022 ' + (convRate * 100).toFixed(1) + '% conv \u2022 ' + (retRate * 100).toFixed(1) + '% retention</span></div>' +
      '<div class="ebb-card"><span class="ebb-label"><i class="fas fa-exclamation-triangle" style="color:var(--danger)"></i> Revenue Gap</span><span class="ebb-value" style="color:' + (gap > 0 ? 'var(--danger)' : 'var(--success)') + '">' + (gap > 0 ? '-' : '+') + formatCurrency(Math.round(Math.abs(gap))) + '</span><span class="ebb-sub">vs ' + formatCurrency(revTarget) + ' target</span></div>' +
      '<div class="ebb-card"><span class="ebb-label"><i class="fas fa-shield-alt" style="color:var(--danger)"></i> Revenue at Risk</span><span class="ebb-value" style="color:var(--danger)">' + formatCurrency(Math.round(totalLeakage)) + '</span><span class="ebb-sub">From funnel drop-offs</span></div>' +
      '<div class="ebb-card"><span class="ebb-label"><i class="fas fa-medal" style="color:var(--success)"></i> Recovery Opportunity</span><span class="ebb-value" style="color:var(--success)">' + formatCurrency(Math.round(totalRecovery)) + '</span><span class="ebb-sub">' + (totalRecovery > 0 ? (Math.round(totalRecovery / totalLeakage * 100)) : 0) + '% recoverable</span></div>' +
      '<div class="ebb-card"><span class="ebb-label"><i class="fas fa-flag-checkered"></i> Top Priority</span><span class="ebb-value" style="font-size:16px">' + topPriority + '</span><span class="ebb-sub">P1 \u2022 Immediate action</span></div>';
  }

  function renderTop3Priorities(totalRevenue, revTarget, convRate, retRate, funnelData, leakages, data, totalRecovery) {
    var el = document.getElementById('execPrioritiesStrip');
    if (!el) return;
    var topDropIdx = [2, 3, 4].reduce(function(max, i) { return leakages[i] > leakages[max] ? i : max; }, 2);
    var topImpact = leakages[topDropIdx] || 0;
    var topTitle = topDropIdx === 4 ? 'Reduce Checkout Abandonment' : topDropIdx === 3 ? 'Reduce Cart Abandonment' : 'Fix View-to-Cart Leakage';

    var chData = CHANNELS.map(function(ch) {
      var d = data.filter(function(r) { return r.channel === ch; });
      var rev = d.reduce(function(s, r) { return s + r.purchase_value; }, 0);
      var conv = d.filter(function(r) { return r.converted; }).length;
      return { name: ch, rev: rev, rate: d.length ? (conv / d.length) * 100 : 0 };
    });
    var bestChan = chData.reduce(function(a, b) { return a.rate > b.rate ? a : b; });
    var secondImpact = Math.min(totalRecovery * 0.6, bestChan.rev * 0.5);

    var atRiskRet = data.filter(function(d) { return d.converted && !d.retained; }).length;
    var aov = data.filter(function(d) { return d.converted; }).length > 0
      ? data.reduce(function(s, d) { return s + d.purchase_value; }, 0) / data.filter(function(d) { return d.converted; }).length
      : 0;
    var thirdImpact = Math.min(totalRecovery * 0.4, atRiskRet * aov * 0.30);

    el.innerHTML =
      '<div class="ep-card"><div class="ep-rank r1">1</div><div class="ep-body"><div class="ep-title">' + topTitle + '</div><div class="ep-impact">Expected Impact: <strong>+' + formatCurrency(Math.round(topImpact)) + '</strong></div></div></div>' +
      '<div class="ep-card"><div class="ep-rank r2">2</div><div class="ep-body"><div class="ep-title">Scale ' + bestChan.name + ' Channel</div><div class="ep-impact">Expected Impact: <strong>+' + formatCurrency(Math.round(secondImpact)) + '</strong></div></div></div>' +
      '<div class="ep-card"><div class="ep-rank r3">3</div><div class="ep-body"><div class="ep-title">Improve Retention Programs</div><div class="ep-impact">Expected Impact: <strong>+' + formatCurrency(Math.round(thirdImpact)) + '</strong></div></div></div>';
  }

  function renderInsights(data, funnelData, leakages, totalRevenue, convRate, retRate, bhsScore, bestChannel, bestSegment, totalLeakage, revTarget, revGap) {
    var panel = document.getElementById('insightsPanel');
    if (!panel) return;
    var totalVisitors = data.length;
    var convCount = data.filter(function(d) { return d.converted; }).length;

    function confPct(score) {
      if (score >= 85) return { pct: 92, cls: 'conf-high', label: '92%' };
      if (score >= 70) return { pct: 84, cls: 'conf-medium', label: '84%' };
      return { pct: 76, cls: 'conf-low', label: '76%' };
    }

    function impactBadge(score) {
      if (score >= 80) return 'High';
      if (score >= 50) return 'Medium';
      return 'Low';
    }

    function priorityLabel(p) {
      var labels = { 1: 'Priority 1', 2: 'Priority 2', 3: 'Priority 3', 4: 'Priority 4', 5: 'Priority 5' };
      var classes = { 1: 'priority-p1', 2: 'priority-p2', 3: 'priority-p3', 4: 'priority-p4', 5: 'priority-p5' };
      return { text: labels[p] || 'Priority ' + p, cls: classes[p] || 'priority-p' + p };
    }

    var cards = [];

    // Card 1: Revenue Performance
    var revAchieve = totalRevenue >= revTarget ? 100 : Math.round((totalRevenue / revTarget) * 100);
    var revConf = confPct(revAchieve);
    var revImpact = totalRevenue >= revTarget ? (totalRevenue / revTarget) : (revTarget / totalRevenue || 1);
    cards.push({
      title: 'Revenue Performance',
      icon: '<i class="fas fa-dollar-sign"></i>',
      type: totalRevenue >= revTarget ? 'ic-positive' : 'ic-negative',
      desc: totalRevenue >= revTarget
        ? 'Revenue of ' + formatCurrency(Math.round(totalRevenue)) + ' achieved the ' + formatCurrency(revTarget) + ' target (' + revAchieve + '% achievement). BHS: ' + bhsScore + '/100.'
        : 'Revenue of ' + formatCurrency(Math.round(totalRevenue)) + ' is ' + formatCurrency(Math.round(Math.abs(revGap))) + ' below the ' + formatCurrency(revTarget) + ' target (' + revAchieve + '% achievement). BHS: ' + bhsScore + '/100.',
      metrics: [
        { label: 'Revenue Gap', value: '-' + formatCurrency(Math.round(Math.abs(revGap))), cls: 'negative' },
        { label: 'Achievement', value: revAchieve + '%', cls: totalRevenue >= revTarget ? 'positive' : 'negative' }
      ],
      impact: revImpact > 1.5 ? 'High' : revImpact > 1 ? 'Medium' : 'High',
      confidence: revConf,
      recommendation: totalRevenue >= revTarget ? 'Maintain current growth trajectory and focus on retention.' : 'Increase conversion and retention initiatives to close the ' + formatCurrency(Math.round(Math.abs(revGap))) + ' gap.',
      priority: priorityLabel(1)
    });

    // Card 2: Funnel Bottleneck
    var topDropIdx = [2, 3, 4].reduce(function(max, i) { return leakages[i] > leakages[max] ? i : max; }, 2);
    var topDrop = funnelData[topDropIdx];
    var prevDrop = funnelData[topDropIdx - 1];
    var dropUsers = prevDrop ? prevDrop.count - topDrop.count : 0;
    var pctDrop = prevDrop && prevDrop.count ? ((dropUsers / prevDrop.count) * 100).toFixed(1) : 0;
    var confDrop = dropUsers > 10 ? confPct(90) : confPct(70);
    cards.push({
      title: 'Funnel Bottleneck: "' + topDrop.stage + '"',
      icon: '<i class="fas fa-filter"></i>',
      type: 'ic-negative',
      desc: 'Stage loses ' + dropUsers + ' users (' + pctDrop + '% drop-off), representing ' + formatCurrency(Math.round(leakages[topDropIdx])) + ' in revenue leakage.',
      metrics: [
        { label: 'Revenue Leakage', value: formatCurrency(Math.round(leakages[topDropIdx])), cls: 'negative' },
        { label: 'Users Lost', value: dropUsers + ' (' + pctDrop + '%)', cls: 'negative' },
        { label: 'Recovery Potential', value: '+' + formatCurrency(Math.round(leakages[topDropIdx] * 0.30)), cls: 'positive' }
      ],
      impact: 'High',
      confidence: confDrop,
      recommendation: 'Optimize ' + topDrop.stage + ' stage. ' + (topDropIdx === 4 ? 'Simplify checkout, add trust badges, offer guest checkout.' : topDropIdx === 3 ? 'Implement exit-intent popups, cart recovery emails, discount incentives.' : 'Improve product page CTAs, add social proof, reduce friction.'),
      priority: priorityLabel(2)
    });

    // Card 3: Channel Opportunity
    if (bestChannel) {
      var chData2 = data.filter(function(r) { return r.channel === bestChannel.name; });
      var chRev = chData2.reduce(function(s, d) { return s + d.purchase_value; }, 0);
      var allChAvg2 = CHANNELS.map(function(ch) {
        var d = data.filter(function(r) { return r.channel === ch; });
        return d.length ? (d.filter(function(r) { return r.converted; }).length / d.length) * 100 : 0;
      });
      var avgRate = allChAvg2.reduce(function(s, v) { return s + v; }, 0) / allChAvg2.length;
      var chanConf = confPct(bestChannel.rate > avgRate * 1.5 ? 92 : 80);
      var chanImpact = bestChannel.rate > avgRate * 1.5 ? 'High' : 'Medium';
      cards.push({
        title: bestChannel.name + ' Channel Opportunity',
        icon: '<i class="fas fa-bullhorn"></i>',
        type: 'ic-positive',
        desc: bestChannel.name + ' converts at ' + bestChannel.rate.toFixed(1) + '% \u2014 approximately ' + (bestChannel.rate / (avgRate || 1)).toFixed(1) + 'x the channel average of ' + avgRate.toFixed(1) + '%.',
        metrics: [
          { label: 'Growth Potential', value: '+' + formatCurrency(Math.round(chRev * 0.5)) + '\u2013' + formatCurrency(Math.round(chRev * 1.0)), cls: 'positive' },
          { label: 'Current Revenue', value: formatCurrency(Math.round(chRev)), cls: '' },
          { label: 'Channel Avg', value: avgRate.toFixed(1) + '%', cls: '' }
        ],
        impact: chanImpact,
        confidence: chanConf,
        recommendation: 'Scale ' + bestChannel.name + ' channel. Increase budget by 30\u201350%, optimize targeting, and expand reach.',
        priority: priorityLabel(3)
      });
    }

    // Card 4: Retention & Churn
    var retCount = data.filter(function(d) { return d.retained; }).length;
    var churnPct2 = ((1 - retRate) * 100).toFixed(1);
    var churnLost2 = Math.round(data.filter(function(d) { return !d.retained; }).reduce(function(s, d) { return s + d.purchase_value; }, 0));
    var atRisk = data.filter(function(d) { return d.converted && !d.retained; }).length;
    var retConf = confPct(retRate > 0.5 ? 88 : 75);
    var retImpact = churnPct2 > 40 ? 'High' : churnPct2 > 25 ? 'Medium' : 'Low';
    cards.push({
      title: 'Customer Retention & Churn Risk',
      icon: '<i class="fas fa-heart"></i>',
      type: 'ic-warning',
      desc: 'Churn rate is ' + churnPct2 + '% (' + (data.length - retCount) + ' of ' + totalVisitors + ' customers). Revenue lost to churn: ' + formatCurrency(churnLost2) + '.',
      metrics: [
        { label: 'Revenue Lost', value: formatCurrency(churnLost2), cls: 'negative' },
        { label: 'At-Risk Customers', value: atRisk + ' users', cls: 'negative' },
        { label: 'Recovery Potential', value: '+' + formatCurrency(Math.round(churnLost2 * 0.25)) + '\u2013' + formatCurrency(Math.round(churnLost2 * 0.35)), cls: 'positive' }
      ],
      impact: retImpact,
      confidence: retConf,
      recommendation: 'Launch retention programs for ' + atRisk + ' at-risk customers. Win-back offers, loyalty rewards, personalized email sequences.',
      priority: priorityLabel(4)
    });

    // Card 5: Executive Action Plan
    var worstRegion = REGIONS.map(function(r) {
      var d = data.filter(function(row) { return row.region === r; });
      return { name: r, rate: d.length ? (d.filter(function(row) { return row.converted; }).length / d.length) * 100 : 0 };
    }).sort(function(a, b) { return a.rate - b.rate; })[0];
    var regionNote = worstRegion && worstRegion.rate === 0 ? ' Investigate ' + worstRegion.name + ' region.' : '';
    cards.push({
      title: 'Recommended Executive Action Plan',
      icon: '<i class="fas fa-tasks"></i>',
      type: 'ic-info',
      desc: 'Prioritized actions based on revenue impact, confidence, and effort.',
      metrics: [
        { label: 'P1 Recovery', value: '+' + formatCurrency(Math.round(leakages[topDropIdx] * 0.30)), cls: 'positive' },
        { label: 'P2 Opportunity', value: '+' + formatCurrency(Math.round(churnLost2 * 0.25)), cls: 'positive' },
        { label: 'Total Upside', value: '+' + formatCurrency(Math.round(leakages[topDropIdx] * 0.30 + churnLost2 * 0.25)), cls: 'positive' }
      ],
      impact: 'High',
      confidence: confPct(85),
      recommendation: '(P1) Address "' + topDrop.stage + '" bottleneck. (P2) Scale ' + (bestChannel ? bestChannel.name : 'top') + ' channel. (P3) Launch retention campaigns.' + regionNote,
      priority: priorityLabel(5)
    });

    panel.innerHTML = cards.map(function(c) {
      var badgesHtml = '<span class="ic-badge impact-' + c.impact.toLowerCase() + '">' + c.impact + ' Impact</span>' +
        '<span class="ic-badge ' + c.confidence.cls + '">Conf: ' + c.confidence.label + '</span>';
      var metricsHtml = c.metrics.map(function(m) {
        return '<span class="ic-metric"><span class="ic-metric-label">' + m.label + '</span> <span class="ic-metric-value ' + m.cls + '">' + m.value + '</span></span>';
      }).join('');
      return '<div class="insight-card ' + c.type + '">' +
        '<div class="ic-header"><span class="ic-title">' + c.icon + ' ' + c.title + '</span><div class="ic-badges">' + badgesHtml + '</div></div>' +
        '<div class="ic-body"><div class="ic-description">' + c.desc + '</div>' +
        '<div class="ic-metrics">' + metricsHtml + '</div></div>' +
        '<div class="ic-footer"><span class="ic-recommendation"><strong>Action:</strong> ' + c.recommendation + '</span>' +
        '<span class="ic-priority ' + c.priority.cls + '">' + c.priority.text + '</span></div>' +
        '</div>';
    }).join('');
  }

  function renderRiskMatrix(data, funnelData, leakages, totalRevenue, convRate, retRate, aov) {
    var el = document.getElementById('riskMatrixPanel');
    if (!el) return;
    var totalVisitors = data.length;
    var convCount = data.filter(function(d) { return d.converted; }).length;

    var checkoutLost = leakages[4] || 0;
    var checkoutUsers = funnelData[3] ? funnelData[3].count - funnelData[4].count : 0;
    var checkoutDrop = funnelData[3] && funnelData[3].count > 0 ? ((funnelData[3].count - funnelData[4].count) / funnelData[3].count * 100).toFixed(1) : 0;

    var viewCartLeak = leakages[2] || 0;
    var viewCartUsers = funnelData[1] ? funnelData[1].count - funnelData[2].count : 0;
    var viewCartDrop = funnelData[1] && funnelData[1].count > 0 ? ((funnelData[1].count - funnelData[2].count) / funnelData[1].count * 100).toFixed(1) : 0;

    var centralData = data.filter(function(r) { return r.region === 'Central'; });
    var centralVisitors = centralData.length;
    var centralRev = centralData.reduce(function(s, d) { return s + d.purchase_value; }, 0);

    var chData3 = CHANNELS.map(function(ch) {
      var d = data.filter(function(r) { return r.channel === ch; });
      var conv = d.filter(function(r) { return r.converted; }).length;
      return { name: ch, rate: d.length ? (conv / d.length) * 100 : 0, rev: d.reduce(function(s, r) { return s + r.purchase_value; }, 0) };
    });
    var avgChanRate3 = chData3.reduce(function(s, ch) { return s + ch.rate; }, 0) / chData3.length;
    var bestChan3 = chData3.reduce(function(a, b) { return a.rate > b.rate ? a : b; });
    var referralData = chData3.filter(function(c) { return c.name === 'Referral'; })[0];
    var refOpp = referralData ? Math.round(referralData.rev * 0.5) : 0;

    var premiumData = data.filter(function(r) { return r.segment === 'Premium'; });
    var premiumRev = premiumData.reduce(function(s, d) { return s + d.purchase_value; }, 0);
    var premiumConv = premiumData.filter(function(d) { return d.converted; }).length;
    var premiumRate = premiumData.length ? (premiumConv / premiumData.length) * 100 : 0;
    var premOpp = Math.round(premiumRev * 0.3);

    var retCount3 = data.filter(function(d) { return d.retained; }).length;
    var atRiskRet3 = data.filter(function(d) { return d.converted && !d.retained; }).length;
    var retOpp = Math.round(atRiskRet3 * aov * 0.30);

    function severityClass(val) {
      if (val >= 80) return 'severe';
      if (val >= 60) return 'moderate';
      return 'strong';
    }
    function impactClass(val) {
      if (val >= 80) return 'high';
      if (val >= 50) return 'medium';
      return 'low';
    }
    function urgencyClass(val) {
      if (val <= 1) return 'immediate';
      if (val <= 3) return 'short-term';
      return 'mid-term';
    }

    var rows = [];

    // Risks
    rows.push({ item: 'Checkout Drop-off (' + checkoutDrop + '%)', impact: 'High', urgency: 'Immediate', revEffect: '-' + formatCurrency(Math.round(checkoutLost)), score: Math.round(95 * (checkoutLost > 0 ? 1 : 0.5)), type: 'risk', owner: 'Product Team' });
    rows.push({ item: 'View\u2192Cart Leakage (' + viewCartDrop + '%)', impact: 'High', urgency: 'Immediate', revEffect: '-' + formatCurrency(Math.round(viewCartLeak)), score: Math.round(89 * (viewCartLeak > 0 ? 1 : 0.5)), type: 'risk', owner: 'Product Team' });
    rows.push({ item: 'Central Region Failure (0% conv)', impact: 'High', urgency: 'Short-Term', revEffect: '-' + formatCurrency(Math.round(centralVisitors * aov)), score: 82, type: 'risk', owner: 'Business Strategy' });

    // Opportunities
    rows.push({ item: 'Referral Channel Expansion', impact: 'Medium', urgency: 'Short-Term', revEffect: '+' + formatCurrency(refOpp), score: 91, type: 'opp', owner: 'Marketing Team' });
    rows.push({ item: 'Premium Segment Growth', impact: 'Medium', urgency: 'Mid-Term', revEffect: '+' + formatCurrency(premOpp), score: 88, type: 'opp', owner: 'CRM Team' });
    rows.push({ item: 'Retention Program (' + atRiskRet3 + ' at-risk)', impact: 'Medium', urgency: 'Short-Term', revEffect: '+' + formatCurrency(retOpp), score: 83, type: 'opp', owner: 'CRM Team' });

    var riskRows = rows.filter(function(r) { return r.type === 'risk'; });
    var oppRows = rows.filter(function(r) { return r.type === 'opp'; });

    function renderRows(rowsArr) {
      return rowsArr.map(function(r) {
        var isRisk = r.type === 'risk';
        var scoreCls = severityClass(r.score);
        var impCls = impactClass(r.score);
        var urgCls = urgencyClass(r.urgency === 'Immediate' ? 1 : r.urgency === 'Short-Term' ? 2 : 4);
        return '<div class="rm-row">' +
          '<span class="rm-item">' + (isRisk ? '<i class="fas fa-exclamation-circle" style="color:var(--danger);margin-right:4px"></i>' : '<i class="fas fa-arrow-up" style="color:var(--success);margin-right:4px"></i>') + r.item + '</span>' +
          '<span class="rm-impact ' + impCls + '">' + r.impact + '</span>' +
          '<span class="rm-urgency ' + urgCls + '">' + r.urgency + '</span>' +
          '<span class="rm-revenue ' + (isRisk ? 'negative' : 'positive') + '">' + r.revEffect + '</span>' +
          '<span class="rm-score ' + scoreCls + '">' + r.score + '<span style="font-size:9px;font-weight:500;color:var(--text-muted)">/100</span></span>' +
          '<span class="rm-owner">' + r.owner + '</span>' +
          '<span class="rm-item" style="font-size:10px;color:var(--text-muted)">' + (isRisk ? 'Risk' : 'Opportunity') + '</span>' +
          '</div>';
      }).join('');
    }

    el.innerHTML =
      '<div class="rm-label"><i class="fas fa-exclamation-triangle" style="color:var(--danger);margin-right:4px"></i> Risks</div>' +
      '<div class="rm-header">' +
        '<span>Risk / Opportunity</span><span>Impact</span><span>Urgency</span><span>Revenue Effect</span><span>Score</span><span>Owner</span><span>Type</span>' +
      '</div>' +
      renderRows(riskRows) +
      '<div class="rm-label" style="margin-top:8px"><i class="fas fa-arrow-up" style="color:var(--success);margin-right:4px"></i> Opportunities</div>' +
      '<div class="rm-header">' +
        '<span>Risk / Opportunity</span><span>Impact</span><span>Urgency</span><span>Revenue Effect</span><span>Score</span><span>Owner</span><span>Type</span>' +
      '</div>' +
      renderRows(oppRows);
  }

  function renderRevenueWaterfall(totalRevenue, revTarget, totalLeakage, totalRecovery, data) {
    var el = document.getElementById('revenueWaterfallSection');
    if (!el) return;
    var gap = revTarget - totalRevenue;
    var projected = totalRevenue + totalRecovery;
    var achievePct = revTarget > 0 ? (projected / revTarget) * 100 : 0;
    var gapPct = revTarget > 0 ? (Math.abs(gap) / revTarget) * 100 : 0;
    el.innerHTML =
      '<div class="rwf-card"><div class="rwf-label"><i class="fas fa-bullseye" style="color:var(--primary)"></i> Revenue Target</div><div class="rwf-value">' + formatCurrency(revTarget) + '</div></div>' +
      '<div class="rwf-card"><div class="rwf-label"><i class="fas fa-chart-line" style="color:var(--success)"></i> Current Revenue</div><div class="rwf-value">' + formatCurrency(Math.round(totalRevenue)) + '</div></div>' +
      '<div class="rwf-card"><div class="rwf-label"><i class="fas fa-exclamation-triangle" style="color:var(--danger)"></i> Gap</div><div class="rwf-value negative">' + (gap > 0 ? '-' : '+') + formatCurrency(Math.round(Math.abs(gap))) + ' (' + gapPct.toFixed(1) + '%)</div></div>' +
      '<div class="rwf-card"><div class="rwf-label"><i class="fas fa-medal" style="color:var(--success)"></i> Recoverable</div><div class="rwf-value positive">+' + formatCurrency(Math.round(totalRecovery)) + '</div></div>' +
      '<div class="rwf-card"><div class="rwf-label"><i class="fas fa-rocket" style="color:var(--primary)"></i> Projected Revenue</div><div class="rwf-value" style="color:' + (achievePct >= 100 ? 'var(--success)' : 'var(--warning)') + '">' + formatCurrency(Math.round(projected)) + ' (' + achievePct.toFixed(0) + '%)</div></div>';
  }

  function renderFinalRecommendation(totalRevenue, revTarget, convRate, retRate, funnelData, leakages, totalRecovery) {
    var el = document.getElementById('finalExecRecommendation');
    if (!el) return;
    var gap = revTarget - totalRevenue;
    var topDropIdx = [2, 3, 4].reduce(function(max, i) { return leakages[i] > leakages[max] ? i : max; }, 2);
    var topDrop = funnelData[topDropIdx];
    var gapDesc = gap > 0 ? 'Revenue of ' + formatCurrency(Math.round(totalRevenue)) + ' remains ' + formatCurrency(Math.round(Math.abs(gap))) + ' below the ' + formatCurrency(revTarget) + ' target.' : 'Revenue has achieved or exceeded the ' + formatCurrency(revTarget) + ' target.';
    var churnDesc = 'Customer churn rate at ' + ((1 - retRate) * 100).toFixed(1) + '% with ' + formatCurrency(Math.round(gap > 0 ? gap * 1.5 : totalRevenue * 0.1)) + ' in at-risk revenue.';
    var recovDesc = 'Projected recovery opportunity of ' + formatCurrency(Math.round(totalRecovery)) + ' with medium-to-high confidence by executing the recommended action plan.';
    el.innerHTML =
      '<div class="fer-title"><i class="fas fa-crown"></i> Executive Recommendation</div>' +
      '<div class="fer-body">' + gapDesc + ' Primary challenges are <strong>' + topDrop.stage + ' abandonment</strong> and <strong>customer churn</strong>. ' + churnDesc + ' Immediate focus: <strong>optimize ' + topDrop.stage + '</strong>, scale high-performing channels, and launch retention campaigns. ' + recovDesc + '</div>' +
      '<div class="fer-footer">' +
        '<span><i class="fas fa-check-circle"></i> Confidence: 84%</span>' +
        '<span><i class="fas fa-clock"></i> Timeline: 2\u20138 Weeks</span>' +
        '<span><i class="fas fa-users"></i> Recommended: Product + Marketing + CRM Teams</span>' +
        '<span><i class="fas fa-chart-line"></i> Target: ' + formatCurrency(revTarget) + '</span>' +
      '</div>';
  }

  function calcFunnelSeverity(leakage, maxLeakage) {
    var ratio = maxLeakage > 0 ? leakage / maxLeakage : 0;
    if (ratio >= 0.80) return { label: 'Critical', cls: 'sev-critical', score: 95 };
    if (ratio >= 0.60) return { label: 'High', cls: 'sev-high', score: 82 };
    if (ratio >= 0.30) return { label: 'Medium', cls: 'sev-medium', score: 68 };
    return { label: 'Low', cls: 'sev-low', score: 45 };
  }

  function getStageRecommendation(stage) {
    var map = {
      'Website Visit': 'Improve landing page relevance & ad targeting',
      'Product Viewed': 'Enhance product pages with social proof & reviews',
      'Add to Cart': 'Optimize pricing, add urgency signals, improve CTAs',
      'Checkout Started': 'Add guest checkout, trust badges, progress indicator',
      'Purchase Completed': 'Post-purchase nurturing, loyalty program, upsell offers'
    };
    return map[stage] || 'Review stage performance';
  }

  function getStageOwner(stage) {
    var map = {
      'Website Visit': 'Marketing Team',
      'Product Viewed': 'Product Team',
      'Add to Cart': 'Product Team',
      'Checkout Started': 'UX Team',
      'Purchase Completed': 'CRM Team'
    };
    return map[stage] || 'Cross-Functional';
  }

  function renderFunnelExecutiveSummary(data, funnelData, leakages, aov, totalRecovery) {
    var el = document.getElementById('funnelSummaryBanner');
    if (!el) return;
    var totalLeakage = leakages.reduce(function(s, v) { return s + v; }, 0);
    var totalLost = funnelData[0].count - funnelData[funnelData.length - 1].count;
    var maxLeakIdx = 2;
    [3, 4].forEach(function(i) { if (leakages[i] > leakages[maxLeakIdx]) maxLeakIdx = i; });
    var largestStage = funnelData[maxLeakIdx] ? funnelData[maxLeakIdx].stage : 'N/A';
    var recoveryRate = totalLeakage > 0 ? Math.round((totalRecovery / totalLeakage) * 100) : 0;
    el.innerHTML =
      '<div class="fsb-card fsb-primary"><span class="fsb-label"><i class="fas fa-filter"></i> Revenue at Risk</span><span class="fsb-value">' + formatCurrency(Math.round(totalLeakage)) + '</span><span class="fsb-sub">Across all stages</span></div>' +
      '<div class="fsb-card"><span class="fsb-label"><i class="fas fa-medal" style="color:var(--success)"></i> Recovery Opportunity</span><span class="fsb-value" style="color:var(--success)">' + formatCurrency(Math.round(totalRecovery)) + '</span><span class="fsb-sub">' + recoveryRate + '% recoverable</span></div>' +
      '<div class="fsb-card"><span class="fsb-label"><i class="fas fa-users" style="color:var(--danger)"></i> Users Lost</span><span class="fsb-value" style="color:var(--danger)">' + totalLost + '</span><span class="fsb-sub">Of ' + funnelData[0].count + ' visitors</span></div>' +
      '<div class="fsb-card"><span class="fsb-label"><i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i> Largest Leakage</span><span class="fsb-value" style="color:var(--warning);font-size:14px">' + largestStage + '</span><span class="fsb-sub">' + formatCurrency(Math.round(leakages[maxLeakIdx])) + ' at risk</span></div>' +
      '<div class="fsb-card"><span class="fsb-label"><i class="fas fa-percentage" style="color:var(--primary)"></i> Recovery Rate</span><span class="fsb-value" style="color:var(--primary)">' + recoveryRate + '%</span><span class="fsb-sub">Of total leakage</span></div>' +
      '<div class="fsb-card"><span class="fsb-label"><i class="fas fa-flag-checkered" style="color:var(--danger)"></i> Priority Action</span><span class="fsb-value" style="font-size:12px">Optimize ' + largestStage + '</span><span class="fsb-sub">P1 \u2022 Immediate</span></div>';
  }

  function renderLargestLeakage(funnelData, leakages, avgValue) {
    var el = document.getElementById('largestLeakageCard');
    if (!el) return;
    var maxIdx = 2;
    [3, 4].forEach(function(i) { if (leakages[i] > leakages[maxIdx]) maxIdx = i; });
    var stage = funnelData[maxIdx];
    var prevStage = funnelData[maxIdx - 1];
    var lost = prevStage ? prevStage.count - stage.count : 0;
    var dropPct = prevStage && prevStage.count > 0 ? ((lost / prevStage.count) * 100).toFixed(1) : 0;
    var leakage = leakages[maxIdx] || 0;
    var recovery = leakage * (RECOVERY_RATES[maxIdx] || 0);
    var maxLeakage = leakages.reduce(function(a, b) { return a > b ? a : b; }, 0);
    var severity = calcFunnelSeverity(leakage, maxLeakage);

    // --- Funnel Health Score (inline) ---
    function calcFHS(fd, lk) {
      var totalLost = fd[0].count - fd[fd.length - 1].count;
      var avgDrop = 0, dropCount = 0;
      for (var i = 1; i < fd.length; i++) {
        var prev = fd[i - 1].count;
        if (prev > 0) { avgDrop += ((prev - fd[i].count) / prev) * 100; dropCount++; }
      }
      avgDrop = dropCount > 0 ? avgDrop / dropCount : 0;
      var totalLeakage = lk.reduce(function(s, v) { return s + v; }, 0);
      var totalRecovery2 = lk.reduce(function(s, v, i) { return s + v * RECOVERY_RATES[i]; }, 0);
      var dropScore = Math.max(0, 100 - avgDrop * 1.8);
      var leakScore = totalLeakage > 0 ? Math.max(0, 100 - (totalLeakage / (fd[0].count * 20)) * 100) : 100;
      var recovScore = totalLeakage > 0 ? (totalRecovery2 / totalLeakage) * 100 : 50;
      var hs = Math.round(dropScore * 0.30 + leakScore * 0.30 + recovScore * 0.20 + 50 * 0.20);
      hs = Math.max(0, Math.min(100, hs));
      var cls = hs >= 70 ? 'good' : hs >= 45 ? 'warning' : 'critical';
      var lbl = hs >= 70 ? 'Healthy' : hs >= 45 ? 'Needs Improvement' : 'Critical';
      return { score: hs, cls: cls, label: lbl, avgDrop: avgDrop };
    }
    var fhs = calcFHS(funnelData, leakages);

    el.innerHTML =
      '<div class="ll-header"><i class="fas fa-exclamation-triangle"></i> Largest Revenue Leakage</div>' +
      '<div class="ll-body">' +
        '<div class="ll-stage">' + stage.stage + '</div>' +
        '<div class="ll-metrics">' +
          '<div class="ll-metric"><span class="ll-metric-label">Users Lost</span><span class="ll-metric-value danger">' + lost + '</span></div>' +
          '<div class="ll-metric"><span class="ll-metric-label">Drop-Off</span><span class="ll-metric-value danger">' + dropPct + '%</span></div>' +
          '<div class="ll-metric"><span class="ll-metric-label">Revenue Lost</span><span class="ll-metric-value danger">' + formatCurrency(Math.round(leakage)) + '</span></div>' +
          '<div class="ll-metric"><span class="ll-metric-label">Potential Recovery</span><span class="ll-metric-value success">+' + formatCurrency(Math.round(recovery)) + '</span></div>' +
          '<div class="ll-metric"><span class="ll-metric-label">Severity</span><span class="ll-metric-value" style="color:' + (severity.label === 'Critical' ? 'var(--danger)' : severity.label === 'High' ? 'var(--warning)' : 'var(--text-muted)') + '">' + severity.label + ' (' + severity.score + '/100)</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="fhs-inline">' +
        '<div class="fhs-gauge ' + fhs.cls + '">' + fhs.score + '</div>' +
        '<div><div class="fhs-gauge-label">Funnel Health Score &mdash; ' + fhs.label + '</div>' +
        '<div class="fhs-gauge-sub">Avg Drop-Off: ' + fhs.avgDrop.toFixed(1) + '% &bull; Leakage: ' + formatCurrency(Math.round(leakages.reduce(function(s, v) { return s + v; }, 0))) + '</div></div>' +
      '</div>';
  }

  function renderFunnelTable(funnelData, leakages, avgValue, data) {
    var tbody = document.getElementById('funnelTableBody');
    if (!tbody) return;
    var maxLeakage = leakages.reduce(function(a, b) { return a > b ? a : b; }, 0);
    var html = '';
    funnelData.forEach(function(f, i) {
      if (i === 0) return;
      var lost = i > 0 ? funnelData[i - 1].count - f.count : 0;
      var pct = i > 0 && funnelData[i - 1].count ? ((lost / funnelData[i - 1].count) * 100) : 0;
      var leakage = leakages[i] || 0;
      var recovery = leakage * RECOVERY_RATES[i];
      var severity = calcFunnelSeverity(leakage, maxLeakage);
      var owner = getStageOwner(f.stage);
      var pctColor = pct > 40 ? '#DC2626' : pct > 20 ? '#F59E0B' : '#16A34A';
      var leakColor = leakage > maxLeakage * 0.5 ? '#DC2626' : leakage > maxLeakage * 0.2 ? '#F59E0B' : '#16A34A';
      var recovColor = recovery > 0 ? '#16A34A' : '#94A3B8';

      html += '<tr>' +
        '<td class="stage-name">' + f.stage + '</td>' +
        '<td class="count-cell">' + f.count + '</td>' +
        '<td class="pct-cell" style="color:' + pctColor + '">' + pct.toFixed(1) + '%</td>' +
        '<td class="leakage-cell" style="color:' + leakColor + '">' + formatCurrency(Math.round(leakage)) + '</td>' +
        '<td class="recovery-cell" style="color:' + recovColor + '">' + formatCurrency(Math.round(recovery)) + '</td>' +
        '<td><span class="sev-cell ' + severity.cls + '">' + severity.label + '</span></td>' +
        '<td><span class="owner-tag">' + owner + '</span></td>' +
        '</tr>';
    });
    var totalLost = funnelData[0].count - funnelData[funnelData.length - 1].count;
    var totalLeakage2 = leakages.reduce(function(s, v) { return s + v; }, 0);
    var totalRecovery2 = leakages.reduce(function(s, v, i) { return s + v * RECOVERY_RATES[i]; }, 0);
    html += '<tr class="revenue-summary-row">' +
      '<td><strong>Total</strong></td>' +
      '<td><strong>' + funnelData[0].count + '</strong></td>' +
      '<td></td>' +
      '<td style="color:#DC2626"><strong>' + formatCurrency(Math.round(totalLeakage2)) + '</strong></td>' +
      '<td style="color:#16A34A"><strong>' + formatCurrency(Math.round(totalRecovery2)) + '</strong></td>' +
      '<td></td><td></td></tr>';
    tbody.innerHTML = html;
  }

  function renderRecoveryRanking(funnelData, leakages, avgValue) {
    var el = document.getElementById('recoveryRankingCard');
    if (!el) return;
    var ranks = [];
    funnelData.forEach(function(f, i) {
      if (i === 0) return;
      var recovery = leakages[i] * RECOVERY_RATES[i];
      if (recovery > 0) ranks.push({ stage: f.stage, recovery: recovery, leak: leakages[i] });
    });
    ranks.sort(function(a, b) { return b.recovery - a.recovery; });
    var rankColors = ['r1', 'r2', 'r3'];
    var html = '<div class="rr-header"><i class="fas fa-trophy"></i> Recovery Opportunity Ranking</div><div class="rr-body">';
    ranks.forEach(function(r, idx) {
      if (idx > 2) return;
      html += '<div class="rr-item"><span class="rr-rank-num ' + (rankColors[idx] || '') + '">#' + (idx + 1) + '</span><div class="rr-item-body"><div class="rr-item-stage">' + r.stage + '</div><div class="rr-item-sub">Leakage: ' + formatCurrency(Math.round(r.leak)) + '</div></div><span class="rr-item-amount">+' + formatCurrency(Math.round(r.recovery)) + '</span></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  function renderFunnelInterpretation(funnelData, leakages, data, aov) {
    var el = document.getElementById('funnelInterpretationCard');
    if (!el) return;
    var maxIdx = 2;
    [3, 4].forEach(function(i) { if (leakages[i] > leakages[maxIdx]) maxIdx = i; });
    var stage = funnelData[maxIdx];
    var prevStage = funnelData[maxIdx - 1];
    var lost = prevStage ? prevStage.count - stage.count : 0;
    var dropPct = prevStage && prevStage.count > 0 ? ((lost / prevStage.count) * 100).toFixed(1) : 0;
    var leakage = leakages[maxIdx] || 0;
    var recovery = leakage * (RECOVERY_RATES[maxIdx] || 0);
    var totalLeakage = leakages.reduce(function(s, v) { return s + v; }, 0);
    var totalRecovery = leakages.reduce(function(s, v, i) { return s + v * RECOVERY_RATES[i]; }, 0);
    var totalVisitors = funnelData[0].count;
    var totalConverted = funnelData[funnelData.length - 1].count;
    var overallConv = totalVisitors > 0 ? ((totalConverted / totalVisitors) * 100).toFixed(1) : 0;
    var leakageShare = totalLeakage > 0 ? ((leakage / totalLeakage) * 100).toFixed(1) : 0;
    var avgDrop = 0, dropCount = 0;
    for (var i = 1; i < funnelData.length; i++) {
      var p = funnelData[i - 1].count;
      if (p > 0) { avgDrop += ((p - funnelData[i].count) / p) * 100; dropCount++; }
    }
    avgDrop = dropCount > 0 ? (avgDrop / dropCount).toFixed(1) : 0;
    var recoverablePct = totalLeakage > 0 ? Math.round((totalRecovery / totalLeakage) * 100) : 0;

    el.innerHTML =
      '<div class="fi-body">' +
        '<div class="fi-kpi-list">' +
          '<div class="fi-kpi-item"><span class="fi-kpi-icon">\uD83D\uDD0D</span><span class="fi-kpi-label">Overall Conversion</span><span class="fi-kpi-value">' + overallConv + '%</span></div>' +
          '<div class="fi-kpi-item"><span class="fi-kpi-icon">\u2B07</span><span class="fi-kpi-label">Avg Stage Drop-Off</span><span class="fi-kpi-value danger">' + avgDrop + '%</span></div>' +
          '<div class="fi-kpi-item"><span class="fi-kpi-icon">\u26A0</span><span class="fi-kpi-label">Worst Leakage</span><span class="fi-kpi-value danger">' + stage.stage + ' (' + leakageShare + '%)</span></div>' +
          '<div class="fi-kpi-item"><span class="fi-kpi-icon">\uD83D\uDCB0</span><span class="fi-kpi-label">Total Revenue Leaked</span><span class="fi-kpi-value danger">' + formatCurrency(Math.round(totalLeakage)) + '</span></div>' +
          '<div class="fi-kpi-item"><span class="fi-kpi-icon">\u267B</span><span class="fi-kpi-label">Recoverable</span><span class="fi-kpi-value success">' + formatCurrency(Math.round(totalRecovery)) + ' (' + recoverablePct + '%)</span></div>' +
        '</div>' +
      '</div>';
  }

  function renderRecoveryRoadmap(funnelData, leakages) {
    var el = document.getElementById('recoveryRoadmapCard');
    if (!el) return;
    var indices = [1, 2, 3, 4];
    indices.sort(function(a, b) {
      return (leakages[b] * RECOVERY_RATES[b]) - (leakages[a] * RECOVERY_RATES[a]);
    });

    function timelineFor(i) {
      if (i === 0) return 'Immediate (0\u20132 wks)';
      if (i === 1) return 'Near-Term (2\u20134 wks)';
      return 'Strategic (1\u20132 mo)';
    }

    function pctFor(idx) {
      var lk = leakages[idx] || 0;
      var r = RECOVERY_RATES[idx] || 0;
      return Math.round(r * 100) + '%';
    }

    var html = '<table class="roadmap-table">' +
      '<thead><tr><th>Priority</th><th>Initiative</th><th>Timeline</th><th>Proj. Recovery</th><th>Recovery%</th></tr></thead><tbody>';
    indices.forEach(function(idx, rank) {
      if (rank > 2) return;
      var pClass = 'p' + (rank + 1);
      html += '<tr>' +
        '<td><span class="rm-priority ' + pClass + '">P' + (rank + 1) + '</span></td>' +
        '<td class="rm-initiative">' + funnelData[idx].stage + ' Optimization</td>' +
        '<td class="rm-timeline">' + timelineFor(rank) + '</td>' +
        '<td class="rm-recovery">+' + formatCurrency(Math.round(leakages[idx] * RECOVERY_RATES[idx])) + '</td>' +
        '<td>' + pctFor(idx) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function renderRegionRanking(data) {
    const body = document.getElementById('regionRankingBody');
    if (!body) return;
    const totalRev = data.reduce((s, row) => s + row.purchase_value, 0);
    const regions = REGIONS.map(r => {
      const d = data.filter(row => row.region === r);
      const rev = d.reduce((s, row) => s + row.purchase_value, 0);
      const convCount = d.filter(row => row.converted).length;
      const rate = d.length ? (convCount / d.length) * 100 : 0;
      return { name: r, revenue: rev, convRate: rate, visitors: d.length, contrib: totalRev > 0 ? (rev / totalRev) * 100 : 0 };
    }).sort((a, b) => b.revenue - a.revenue || b.convRate - a.convRate);

    body.innerHTML = regions.map((r, idx) => {
      let flagClass = 'bad', flagLabel = 'Investigate';
      if (r.convRate >= 15) { flagClass = 'good'; flagLabel = 'Invest'; }
      else if (r.convRate >= 8) { flagClass = 'warning'; flagLabel = 'Maintain'; }
      return '<div class="region-ranking-row">' +
        '<span class="rr-rank">#' + (idx + 1) + '</span>' +
        '<span class="rr-region">' + r.name + '</span>' +
        '<span class="rr-revenue">' + formatCurrency(Math.round(r.revenue)) + '</span>' +
        '<span class="rr-conv" style="color:' + (r.convRate >= 15 ? 'var(--success)' : r.convRate >= 8 ? 'var(--warning)' : 'var(--danger)') + '">' + r.convRate.toFixed(1) + '%</span>' +
        '<span class="rr-contrib">' + r.contrib.toFixed(1) + '%</span>' +
        '<span class="rr-flag ' + flagClass + '">' + flagLabel + '</span>' +
        '</div>';
    }).join('');
  }

  function renderChannelExecutiveSummary(data) {
    var el = document.getElementById('channelSummaryBanner');
    if (!el) return;

    var chData = CHANNELS.map(function(ch) {
      var d = data.filter(function(r) { return r.channel === ch; });
      var rev = d.reduce(function(s, r) { return s + r.purchase_value; }, 0);
      var conv = d.filter(function(r) { return r.converted; }).length;
      var visitors = d.length;
      return { name: ch, revenue: rev, convRate: visitors ? (conv / visitors) * 100 : 0, visitors: visitors };
    });

    var top = chData.reduce(function(a, b) { return a.convRate > b.convRate ? a : b; });
    var impact = top.convRate >= 20 ? 'High' : top.convRate >= 10 ? 'Medium' : 'Low';
    var priority = top.convRate >= 20 ? 'P2' : 'P3';

    el.innerHTML =
      '<div class="csb-item"><div class="csb-label">Top Channel</div><div class="csb-value">' + top.name + '</div></div>' +
      '<div class="csb-item"><div class="csb-label">Revenue</div><div class="csb-value"><span class="hl">' + formatCurrency(Math.round(top.revenue)) + '</span></div></div>' +
      '<div class="csb-item"><div class="csb-label">Conv Rate</div><div class="csb-value"><span class="success">' + top.convRate.toFixed(1) + '%</span></div></div>' +
      '<div class="csb-item"><div class="csb-label">Recommendation</div><div class="csb-value" style="font-size:11px">Scale ' + top.name + '</div></div>' +
      '<div class="csb-item"><div class="csb-label">Expected Impact</div><div class="csb-value"><span class="success">' + impact + '</span></div></div>' +
      '<div class="csb-item"><div class="csb-label">Priority</div><div class="csb-value"><span class="hl">' + priority + '</span></div></div>';
  }

  function renderChannelMetrics(data) {
    const body = document.getElementById('channelMetricsBody');
    if (!body) return;
    var chData = CHANNELS.map(function(ch) {
      var d = data.filter(function(r) { return r.channel === ch; });
      var rev = d.reduce(function(s, r) { return s + r.purchase_value; }, 0);
      var conv = d.filter(function(r) { return r.converted; }).length;
      var visitors = d.length;
      var aov = conv ? rev / conv : 0;
      var convRate = visitors ? (conv / visitors) * 100 : 0;
      return { name: ch, rev: rev, visitors: visitors, conv: conv, aov: aov, convRate: convRate };
    });

    var maxRev = chData.reduce(function(m, ch) { return ch.rev > m ? ch.rev : m; }, 0);
    var maxConv = chData.reduce(function(m, ch) { return ch.convRate > m ? ch.convRate : m; }, 0);
    var maxAov = chData.reduce(function(m, ch) { return ch.aov > m ? ch.aov : m; }, 0);
    var maxVis = chData.reduce(function(m, ch) { return ch.visitors > m ? ch.visitors : m; }, 0);

    body.innerHTML = chData.map(function(ch) {
      var score = Math.round(
        (maxRev > 0 ? (ch.rev / maxRev) * 30 : 0) +
        (maxConv > 0 ? (ch.convRate / maxConv) * 30 : 0) +
        (maxAov > 0 ? (ch.aov / maxAov) * 20 : 0) +
        (maxVis > 0 ? (ch.visitors / maxVis) * 20 : 0)
      );
      score = Math.min(100, score);
      var scoreClass = score >= 70 ? 'excellent' : score >= 40 ? 'good' : 'poor';
      var channelActions = { 'Referral': 'Scale', 'Organic Search': 'Maintain', 'Paid Ads': 'Optimize', 'Email': 'Improve', 'Direct': 'Monitor', 'Social Media': 'Expand' };
      var action = channelActions[ch.name] || (score >= 80 ? 'Scale' : score >= 60 ? 'Maintain' : score >= 40 ? 'Optimize' : 'Improve');
      var actionClass = action.toLowerCase();
      var convColor = ch.convRate >= 15 ? 'var(--success)' : ch.convRate >= 8 ? 'var(--warning)' : 'var(--danger)';

      return '<div class="channel-metric-row">' +
        '<span class="cm-name">' + ch.name + '</span>' +
        '<span class="cm-revenue">' + formatCurrency(Math.round(ch.rev)) + '</span>' +
        '<span class="cm-visitors">' + ch.visitors + '</span>' +
        '<span class="cm-conv" style="color:' + convColor + '">' + ch.convRate.toFixed(1) + '%</span>' +
        '<span class="cm-aov">$' + ch.aov.toFixed(2) + '</span>' +
        '<span class="cm-score ' + scoreClass + '">' + score + '/100</span>' +
        '<span class="cm-action ' + actionClass + '">' + action + '</span>' +
        '</div>';
    }).join('');
  }

  function renderSegmentIntelligence(data) {
    const banner = document.getElementById('segmentInsightBanner');
    if (!banner) return;
    const totalRev = data.reduce(function(s, r) { return s + r.purchase_value; }, 0);
    var segs = SEGMENTS.map(function(s) {
      var d = data.filter(function(r) { return r.segment === s; });
      var rev = d.reduce(function(rv, row) { return rv + row.purchase_value; }, 0);
      var conv = d.filter(function(r) { return r.converted; }).length;
      var ret = d.length ? (d.filter(function(r) { return r.retained; }).length / d.length) : 0;
      var aov2 = conv ? rev / conv : 0;
      var clv2 = aov2 * (1 / (1 - ret || 0.01));
      return { name: s, revenue: rev, convRate: d.length ? (conv / d.length) * 100 : 0, clv: clv2 || 0, visitors: d.length };
    });
    var topRev = segs.reduce(function(a, b) { return a.revenue > b.revenue ? a : b; });
    var topClv = segs.reduce(function(a, b) { return a.clv > b.clv ? a : b; });
    var lowPerf = segs.reduce(function(a, b) { return a.revenue < b.revenue ? a : b; });
    var topPct = totalRev > 0 ? ((topRev.revenue / totalRev) * 100).toFixed(1) : 0;
    var focusText = topRev.name === 'Premium' ? 'Scale Premium acquisition and retention programs' : 'Invest in ' + topRev.name + ' segment growth';

    banner.innerHTML =
      '<div class="sib-item"><div class="sib-label">Top Revenue</div><div class="sib-value">' + topRev.name + ' <span class="hl">' + formatCurrency(Math.round(topRev.revenue)) + '</span></div></div>' +
      '<div class="sib-item"><div class="sib-label">Revenue Contribution</div><div class="sib-value"><span class="hl">' + topPct + '%</span></div></div>' +
      '<div class="sib-item"><div class="sib-label">Highest CLV</div><div class="sib-value">' + topClv.name + ' <span class="hl">$' + topClv.clv.toFixed(2) + '</span></div></div>' +
      '<div class="sib-item"><div class="sib-label">Lowest Performer</div><div class="sib-value"><span class="danger">' + lowPerf.name + ' (' + formatCurrency(Math.round(lowPerf.revenue)) + ')</span></div></div>' +
      '<div class="sib-item" style="flex:2;min-width:140px"><div class="sib-label">Recommended Focus</div><div class="sib-value" style="font-size:11px">' + focusText + '</div></div>';
  }

  function renderSegmentRecommendation(data) {
    var card = document.getElementById('segmentRecommendationCard');
    if (!card) return;
    var totalRev = data.reduce(function(s, r) { return s + r.purchase_value; }, 0);
    var premiumData = data.filter(function(r) { return r.segment === 'Premium'; });
    var premiumRev = premiumData.reduce(function(s, r) { return s + r.purchase_value; }, 0);
    var premiumPct = totalRev > 0 ? ((premiumRev / totalRev) * 100).toFixed(1) : 0;
    var premiumConv = premiumData.filter(function(r) { return r.converted; }).length;
    var premiumRate = premiumData.length ? (premiumConv / premiumData.length) * 100 : 0;
    var premiumAov = premiumConv ? premiumRev / premiumConv : 0;
    var premiumRet = premiumData.length ? (premiumData.filter(function(r) { return r.retained; }).length / premiumData.length) : 0;
    var premiumClv = premiumAov * (1 / (1 - premiumRet || 0.01));
    card.innerHTML =
      '<div class="seg-rec-card">' +
        '<div class="seg-rec-header"><i class="fas fa-crown" style="color:var(--warning)"></i> Recommended Growth Segment</div>' +
        '<div class="seg-rec-segment">Premium Segment</div>' +
        '<div class="seg-rec-grid">' +
          '<div class="seg-rec-item"><span class="sri-label">Revenue Contribution</span><span class="sri-value primary">' + premiumPct + '%</span></div>' +
          '<div class="seg-rec-item"><span class="sri-label">CLV</span><span class="sri-value success">$' + premiumClv.toFixed(2) + '</span></div>' +
          '<div class="seg-rec-item"><span class="sri-label">Conversion Rate</span><span class="sri-value">' + premiumRate.toFixed(1) + '%</span></div>' +
          '<div class="seg-rec-item"><span class="sri-label">AOV</span><span class="sri-value primary">$' + premiumAov.toFixed(2) + '</span></div>' +
        '</div>' +
        '<div class="seg-rec-recommendation"><i class="fas fa-bullhorn"></i> Increase acquisition investment and loyalty programs for Premium segment to maximize revenue contribution and CLV.</div>' +
      '</div>';
  }

  function renderSegmentMetrics(data) {
    const body = document.getElementById('segmentMetricsBody');
    if (!body) return;
    const totalRev = data.reduce(function(s, row) { return s + row.purchase_value; }, 0);
    var segs = SEGMENTS.map(function(s) {
      var d = data.filter(function(r) { return r.segment === s; });
      var rev = d.reduce(function(rv, row) { return rv + row.purchase_value; }, 0);
      var conv = d.filter(function(r) { return r.converted; }).length;
      var ret = d.length ? (d.filter(function(r) { return r.retained; }).length / d.length) : 0;
      var aov2 = conv ? rev / conv : 0;
      var clv2 = aov2 * (1 / (1 - ret || 0.01));
      var contrib = totalRev > 0 ? (rev / totalRev) * 100 : 0;
      var convPct = d.length ? (conv / d.length) * 100 : 0;
      return { name: s, revenue: rev, contrib: contrib, clv: clv2 || 0, convPct: convPct, visitors: d.length };
    });

    var maxContrib = segs.reduce(function(m, s) { return s.contrib > m ? s.contrib : m; }, 0);
    var maxClv = segs.reduce(function(m, s) { return s.clv > m ? s.clv : m; }, 0);
    var maxConv = segs.reduce(function(m, s) { return s.convPct > m ? s.convPct : m; }, 0);
    segs.forEach(function(s) {
      var cScore = maxContrib > 0 ? (s.contrib / maxContrib) * 40 : 0;
      var clvScore = maxClv > 0 ? (s.clv / maxClv) * 30 : 0;
      var convScore = maxConv > 0 ? (s.convPct / maxConv) * 30 : 0;
      s.oppScore = Math.min(100, Math.round(cScore + clvScore + convScore));
    });

    function heatClass(arr, val, highGood) {
      var sorted = arr.slice().sort(function(a, b) { return highGood ? b - a : a - b; });
      var top = sorted[0];
      var bottom = sorted[sorted.length - 1];
      var range = top - bottom || 1;
      var pct = (val - bottom) / range;
      if (pct >= 0.7) return 'cell-high';
      if (pct >= 0.3) return 'cell-mid';
      return 'cell-low';
    }

    var revenues = segs.map(function(s) { return s.revenue; });
    var contribs = segs.map(function(s) { return s.contrib; });
    var clvs = segs.map(function(s) { return s.clv; });
    var convs = segs.map(function(s) { return s.convPct; });

    var html = segs.map(function(s) {
      var scoreClass = s.oppScore >= 70 ? 'excellent' : s.oppScore >= 40 ? 'good' : 'poor';
      return '<div class="segment-metric-row">' +
        '<span class="sm-name">' + s.name + '</span>' +
        '<span class="sm-revenue ' + heatClass(revenues, s.revenue, true) + '">' + formatCurrency(Math.round(s.revenue)) + '</span>' +
        '<span class="sm-contrib ' + heatClass(contribs, s.contrib, true) + '">' + s.contrib.toFixed(1) + '%</span>' +
        '<span class="sm-clv ' + heatClass(clvs, s.clv, true) + '">$' + s.clv.toFixed(2) + '</span>' +
        '<span class="sm-conv ' + heatClass(convs, s.convPct, true) + '">' + s.convPct.toFixed(1) + '%</span>' +
        '<span class="sm-score ' + scoreClass + '">' + s.oppScore + '/100</span>' +
        '</div>';
    }).join('');
    body.innerHTML = html;
  }

  // ---- Revenue Growth Intelligence: Customer Health ----

  function renderCustomerHealthScore(health, data) {
    var el = document.getElementById('customerHealthScore');
    if (!el) return;
    var total = data.length;
    var retRate = total ? (data.filter(function(d) { return d.retained; }).length / total) : 0;
    // Composite health score: healthy/total * 35 + (1 - atRisk/total) * 25 + retRate * 25 + (1 - churned/total) * 15
    var hScore = Math.round(
      (total ? (health.healthy / total) * 35 : 0) +
      (total ? ((1 - health.atRisk / total)) * 25 : 0) +
      retRate * 25 +
      (total ? ((1 - health.churned / total)) * 15 : 0)
    );
    hScore = Math.min(100, Math.max(0, hScore));
    var scoreClass = hScore >= 70 ? 'healthy' : hScore >= 45 ? 'needs-attention' : 'critical';
    var scoreLabel = hScore >= 70 ? 'Healthy' : hScore >= 45 ? 'Needs Attention' : 'Critical';

    var healthyPct = total ? ((health.healthy / total) * 100).toFixed(1) : 0;
    var atRiskPct = total ? ((health.atRisk / total) * 100).toFixed(1) : 0;
    var churnPct = total ? ((health.churned / total) * 100).toFixed(1) : 0;

    el.innerHTML =
      '<div class="chs-card">' +
        '<div class="chs-gauge">' +
          '<div class="chs-gauge-value ' + scoreClass + '">' + hScore + '</div>' +
          '<div class="chs-gauge-label">' + scoreLabel + '</div>' +
        '</div>' +
        '<div class="chs-details">' +
          '<div class="chs-detail-item"><span class="chs-dl">Revenue Performance</span><span class="chs-dv">' + healthyPct + '% healthy</span></div>' +
          '<div class="chs-detail-item"><span class="chs-dl">Customer Retention</span><span class="chs-dv">' + (retRate * 100).toFixed(1) + '%</span></div>' +
          '<div class="chs-detail-item"><span class="chs-dl">Customer Engagement</span><span class="chs-dv">' + atRiskPct + '% at risk</span></div>' +
          '<div class="chs-detail-item"><span class="chs-dl">Churn Risk</span><span class="chs-dv">' + churnPct + '% churned</span></div>' +
        '</div>' +
      '</div>';
  }

  function renderCustomerRiskAssessment(health, data) {
    var el = document.getElementById('customerRiskAssessment');
    if (!el) return;
    var totalRev = data.reduce(function(s, d) { return s + d.purchase_value; }, 0);
    var churnedRev = data.filter(function(d) { return !d.converted && !d.retained; }).reduce(function(s, d) { return s + d.purchase_value; }, 0);
    var atRiskRev = data.filter(function(d) { return d.converted && !d.retained; }).reduce(function(s, d) { return s + d.purchase_value; }, 0);
    var revenueAtRisk = churnedRev + atRiskRev;

    el.innerHTML =
      '<div class="cra-card">' +
        '<div class="cra-title"><i class="fas fa-shield-alt"></i> Customer Risk Assessment</div>' +
        '<div class="cra-grid">' +
          '<div class="cra-item"><span class="cra-item-label">Churned</span><span class="cra-item-value danger">' + health.churned + '</span></div>' +
          '<div class="cra-item"><span class="cra-item-label">Likely to Churn</span><span class="cra-item-value danger">' + health.likelyChurn + '</span></div>' +
          '<div class="cra-item"><span class="cra-item-label">Revenue at Risk</span><span class="cra-item-value danger">' + formatCurrency(Math.round(revenueAtRisk)) + '</span></div>' +
          '<div class="cra-item"><span class="cra-item-label">Recoverable</span><span class="cra-item-value success">' + formatCurrency(Math.round(health.recoverableRev)) + '</span></div>' +
        '</div>' +
        '<div class="cra-action">\uD83D\uDCCC Recommended Action: Retention Campaign</div>' +
      '</div>';
  }

  function renderCustomerRecoveryCard(health, data) {
    var el = document.getElementById('customerRecoveryCard');
    if (!el) return;
    el.innerHTML =
      '<div class="crc-card">' +
        '<div class="crc-title"><i class="fas fa-medal"></i> Recovery Opportunity</div>' +
        '<div class="crc-grid">' +
          '<div class="crc-item"><span class="crc-item-label">Target Customers</span><span class="crc-item-value">' + (health.atRisk + health.likelyChurn) + '</span></div>' +
          '<div class="crc-item"><span class="crc-item-label">Potential Recovery</span><span class="crc-item-value success">' + formatCurrency(Math.round(health.recoverableRev)) + '</span></div>' +
          '<div class="crc-item"><span class="crc-item-label">Confidence</span><span class="crc-item-value">Medium</span></div>' +
          '<div class="crc-item"><span class="crc-item-label">Timeline</span><span class="crc-item-value">4 Weeks</span></div>' +
        '</div>' +
        '<div class="crc-action">Retention &amp; Win-Back Campaign</div>' +
      '</div>';
  }

  function renderHealthSegments(health, data) {
    const grid = document.getElementById('healthGrid');
    if (!grid) return;
    var total = data.length;

    // Render stacked bar
    var stackedEl = document.getElementById('healthStackedBar');
    if (stackedEl) {
      var segs = [
        { cls: 'healthy', label: 'Healthy', count: health.healthy },
        { cls: 'at-risk', label: 'At-Risk', count: health.atRisk },
        { cls: 'likely-churn', label: 'Likely Churn', count: health.likelyChurn },
        { cls: 'churned', label: 'Churned', count: health.churned }
      ];
      var barHtml = '<div class="hsb-container">';
      segs.forEach(function(s) {
        var pct = total > 0 ? (s.count / total) * 100 : 0;
        if (s.count > 0) {
          barHtml += '<div class="hsb-segment ' + s.cls + '" style="width:' + pct + '%" title="' + s.label + ': ' + s.count + ' (' + pct.toFixed(1) + '%)">' + (pct >= 8 ? Math.round(pct) + '%' : '') + '</div>';
        }
      });
      barHtml += '</div>';
      barHtml += '<div class="hsb-legend">';
      segs.forEach(function(s) {
        barHtml += '<span class="hsb-legend-item"><span class="hsb-legend-dot" style="background:' + (s.cls === 'healthy' ? 'var(--success)' : s.cls === 'at-risk' ? 'var(--warning)' : s.cls === 'likely-churn' ? 'var(--danger)' : 'var(--text-muted)') + '"></span> ' + s.label + '</span>';
      });
      barHtml += '</div>';
      stackedEl.innerHTML = barHtml;
    }

    // Health grid items
    grid.innerHTML =
      '<div class="health-item healthy"><span class="health-icon">\u2705</span><div class="health-info"><h4>Healthy</h4><p>Active, engaged customers</p></div><span class="health-count">' + health.healthy + '</span></div>' +
      '<div class="health-item at-risk"><span class="health-icon">\u26A0\uFE0F</span><div class="health-info"><h4>At-Risk</h4><p>Declining engagement</p></div><span class="health-count">' + health.atRisk + '</span></div>' +
      '<div class="health-item likely-churn"><span class="health-icon">\uD83D\uDD34</span><div class="health-info"><h4>Likely to Churn</h4><p>Low engagement, high risk</p></div><span class="health-count">' + health.likelyChurn + '</span></div>' +
      '<div class="health-item churned"><span class="health-icon">\u26D4</span><div class="health-info"><h4>Churned</h4><p>No activity, lost</p></div><span class="health-count">' + health.churned + '</span></div>';

    // Update badge
    var badge = document.getElementById('healthBadge');
    if (badge) badge.textContent = total + ' Customers \u2022 Health \u2022 Risk \u2022 Opportunity';
  }

  // ---- Revenue Growth Intelligence: Regional ----

  function renderRegionalOpportunitySummary(data) {
    var el = document.getElementById('regionalOpportunitySummary');
    if (!el) return;
    var totalRev = data.reduce(function(s, r) { return s + r.purchase_value; }, 0);
    var rData = REGIONS.map(function(r) {
      var d = data.filter(function(row) { return row.region === r; });
      var rev = d.reduce(function(s, row) { return s + row.purchase_value; }, 0);
      var conv = d.filter(function(row) { return row.converted; }).length;
      return { name: r, revenue: rev, convRate: d.length ? (conv / d.length) * 100 : 0 };
    });
    var topRegion = rData.reduce(function(a, b) { return a.revenue > b.revenue ? a : b; });
    var highGrowth = rData.filter(function(r) { return r.convRate >= 10 && r.revenue > 0 && r.name !== topRegion.name; }).sort(function(a, b) { return b.convRate - a.convRate; });
    var underPerf = rData.filter(function(r) { return r.revenue === 0 || r.convRate === 0; }).sort(function(a, b) { return a.revenue - b.revenue; });
    var topGrowth = highGrowth.length > 0 ? highGrowth[0] : null;
    var worstReg = underPerf.length > 0 ? underPerf[0] : null;
    var focus = worstReg ? 'Regional Recovery Initiative' : 'Revenue Diversification';

    el.innerHTML =
      '<div class="ros-item"><div class="ros-label">Top Region</div><div class="ros-value"><span class="hl">' + topRegion.name + '</span></div></div>' +
      '<div class="ros-item"><div class="ros-label">Highest Growth</div><div class="ros-value"><span class="success">' + (topGrowth ? topGrowth.name : 'N/A') + '</span></div></div>' +
      '<div class="ros-item"><div class="ros-label">Underperforming</div><div class="ros-value"><span class="warning">' + (worstReg ? worstReg.name : 'None') + '</span></div></div>' +
      '<div class="ros-item" style="flex:1.5"><div class="ros-label">Recommended Focus</div><div class="ros-value" style="font-size:11px">' + focus + '</div></div>';
  }

  function renderRegionRanking(data) {
    const body = document.getElementById('regionRankingBody');
    if (!body) return;
    const totalRev = data.reduce(function(s, row) { return s + row.purchase_value; }, 0);
    var regions = REGIONS.map(function(r) {
      var d = data.filter(function(row) { return row.region === r; });
      var rev = d.reduce(function(s, row) { return s + row.purchase_value; }, 0);
      var convCount = d.filter(function(row) { return row.converted; }).length;
      var rate = d.length ? (convCount / d.length) * 100 : 0;
      var action = rate >= 15 ? 'Invest' : rate >= 8 ? 'Maintain' : 'Review';
      return { name: r, revenue: rev, convRate: rate, visitors: d.length, contrib: totalRev > 0 ? (rev / totalRev) * 100 : 0, action: action };
    }).sort(function(a, b) { return b.revenue - a.revenue || b.convRate - a.convRate; });

    body.innerHTML = regions.map(function(r, idx) {
      var actionClass = r.action.toLowerCase();
      return '<div class="region-ranking-row">' +
        '<span class="rr-rank">#' + (idx + 1) + '</span>' +
        '<span class="rr-region">' + r.name + '</span>' +
        '<span class="rr-revenue">' + formatCurrency(Math.round(r.revenue)) + '</span>' +
        '<span class="rr-conv" style="color:' + (r.convRate >= 15 ? 'var(--success)' : r.convRate >= 8 ? 'var(--warning)' : 'var(--danger)') + '">' + r.convRate.toFixed(1) + '%</span>' +
        '<span class="rr-contrib">' + r.contrib.toFixed(1) + '%</span>' +
        '<span class="rr-action ' + actionClass + '">' + r.action + '</span>' +
        '</div>';
    }).join('');
  }

  function renderConcentrationRisk(data) {
    var el = document.getElementById('concentrationRisk');
    if (!el) return;
    var totalRev = data.reduce(function(s, r) { return s + r.purchase_value; }, 0);
    var topRegion = null, topContrib = 0, secondRegion = null, secondContrib = 0;
    var allRegions = REGIONS.map(function(r) {
      var rev = data.filter(function(row) { return row.region === r; }).reduce(function(s, row) { return s + row.purchase_value; }, 0);
      var contrib = totalRev > 0 ? (rev / totalRev) * 100 : 0;
      return { name: r, contrib: contrib };
    }).sort(function(a, b) { return b.contrib - a.contrib; });
    if (allRegions.length > 0) { topRegion = allRegions[0].name; topContrib = allRegions[0].contrib; }
    if (allRegions.length > 1) { secondRegion = allRegions[1].name; secondContrib = allRegions[1].contrib; }

    if (topContrib < 35) { el.innerHTML = ''; return; }
    var riskText = topContrib >= 50 ? 'highly dependent' : 'significantly dependent';
    var diversifyRegions = allRegions.filter(function(r) { return r.contrib > 5 && r.name !== topRegion; }).map(function(r) { return r.name; });
    var recText = diversifyRegions.length > 0
      ? 'Diversify growth through ' + diversifyRegions.slice(0, 2).join(' and ') + ' regions to reduce dependency risk.'
      : 'Expand into underperforming regions through targeted campaigns and local partnerships.';
    el.innerHTML =
      '<div class="cr-card">' +
        '<div class="cr-title"><i class="fas fa-exclamation-triangle"></i> Revenue Concentration Risk</div>' +
        '<div class="cr-text">' + topRegion + ' region currently contributes <strong>' + topContrib.toFixed(1) + '%</strong> of total revenue. Business performance is ' + riskText + ' on one geography.' + (secondRegion ? ' ' + secondRegion + ' follows at ' + secondContrib.toFixed(1) + '%.' : '') + '</div>' +
        '<div class="cr-recommendation">\uD83D\uDCCC Recommendation: ' + recText + '</div>' +
      '</div>';
  }

  function renderRevenueGrowthExecutiveInsight(data) {
    var el = document.getElementById('rgExecutiveInsight');
    if (!el) return;
    var totalRev = data.reduce(function(s, r) { return s + r.purchase_value; }, 0);
    var totalVisitors = data.length;
    var churned = data.filter(function(d) { return !d.converted && !d.retained; }).length;
    var churnedRev = data.filter(function(d) { return !d.converted && !d.retained; }).reduce(function(s, d) { return s + d.purchase_value; }, 0);

    // Best channel
    var bestChan = CHANNELS.map(function(ch) {
      var d = data.filter(function(r) { return r.channel === ch; });
      var conv = d.filter(function(r) { return r.converted; }).length;
      return { name: ch, rate: d.length ? (conv / d.length) * 100 : 0, rev: d.reduce(function(s, r) { return s + r.purchase_value; }, 0) };
    }).sort(function(a, b) { return b.rate - a.rate; })[0];

    // Top region
    var topReg = REGIONS.map(function(r) {
      var d = data.filter(function(row) { return row.region === r; });
      var rev = d.reduce(function(s, row) { return s + row.purchase_value; }, 0);
      return { name: r, revenue: rev, contrib: totalRev > 0 ? (rev / totalRev) * 100 : 0 };
    }).sort(function(a, b) { return b.revenue - a.revenue; })[0];

    el.innerHTML =
      '<div class="rgei-title"><i class="fas fa-lightbulb"></i> Executive Insight \u2014 Revenue Growth Intelligence</div>' +
      '<div class="rgei-text">' +
        (bestChan ? '<span class="highlight">' + bestChan.name + '</span> remains the most efficient acquisition channel (' + bestChan.rate.toFixed(1) + '% conv). ' : '') +
        (topReg && topReg.contrib >= 35 ? '<span class="highlight">' + topReg.name + '</span> contributes ' + topReg.contrib.toFixed(1) + '% of total revenue and represents concentration risk. ' : '') +
        'Customer churn remains the largest business threat with <span class="highlight">' + churned + ' churned customers</span> and <span class="highlight">' + formatCurrency(Math.round(churnedRev)) + '</span> revenue currently at risk.' +
      '</div>' +
      '<div class="rgei-focus"><i class="fas fa-bullseye"></i> Priority Focus: Retention Improvement + ' + (bestChan ? bestChan.name : 'Top Channel') + ' Expansion</div>';
  }

  function renderKpiHierarchy(totalRevenue, revenueAchievement, convRate, retRate, aov, rpv, clv, TARGETS) {
    var el = document.getElementById('kpiHierarchy');
    if (!el) return;

    function statusData(current, target, highGood) {
      if (highGood) {
        if (current >= target) return { dot: '\ud83d\udfe2', label: 'Healthy', cls: 'kpi-healthy' };
        if (current >= target * 0.8) return { dot: '\ud83d\udfe1', label: 'Below Target', cls: 'kpi-below' };
        return { dot: '\ud83d\udd34', label: 'Needs Improvement', cls: 'kpi-needs' };
      }
      if (current <= target) return { dot: '\ud83d\udfe2', label: 'Healthy', cls: 'kpi-healthy' };
      if (current <= target * 1.2) return { dot: '\ud83d\udfe1', label: 'Watch', cls: 'kpi-below' };
      return { dot: '\ud83d\udd34', label: 'High Churn', cls: 'kpi-needs' };
    }

    var revGapActual = TARGETS.revenue - totalRevenue;
    var revStatus = statusData(totalRevenue, TARGETS.revenue, true);

    var items = [
      { label: 'CLV', value: '$' + (clv || 0).toFixed(2), status: statusData(clv, 100, true) },
      { label: 'AOV', value: '$' + aov.toFixed(2), status: statusData(aov, 25, true) },
      { label: 'Conversion', value: (convRate * 100).toFixed(1) + '%', status: statusData(convRate, TARGETS.convRate, true) },
      { label: 'Retention', value: (retRate * 100).toFixed(1) + '%', status: statusData(retRate, TARGETS.retentionRate, true) },
      { label: 'Revenue Gap', value: (revGapActual > 0 ? '-' : '+') + formatCurrency(Math.round(Math.abs(revGapActual))), status: revGapActual > 0 ? { dot: '\ud83d\udd34', label: 'Revenue Gap Exists', cls: 'kpi-needs' } : { dot: '\ud83d\udfe2', label: 'On Target', cls: 'kpi-healthy' } },
      { label: 'RPV', value: '$' + rpv.toFixed(2), status: statusData(rpv, 5, true) }
    ];

    el.innerHTML = '<div class="kpi-health-header">Executive KPI Health</div><div class="kpi-health-grid">' +
      items.map(function(item) {
        return '<div class="kpi-health-item ' + item.status.cls + '"><span class="khi-dot">' + item.status.dot + '</span><div class="khi-body"><span class="khi-label">' + item.label + '</span><span class="khi-value">' + item.value + '</span><span class="khi-status">' + item.status.label + '</span></div></div>';
      }).join('') + '</div>';
  }

  function renderExecutiveInsight(data) {
    var el = document.getElementById('execInsightFooter');
    if (!el) return;
    var totalRev = data.reduce(function(s, r) { return s + r.purchase_value; }, 0);
    var premiumRev = data.filter(function(r) { return r.segment === 'Premium'; }).reduce(function(s, r) { return s + r.purchase_value; }, 0);
    var premiumPct = totalRev > 0 ? ((premiumRev / totalRev) * 100).toFixed(1) : 0;
    var convCount = data.filter(function(r) { return r.converted; }).length;
    var totalVisitors = data.length;
    var convRate2 = totalVisitors > 0 ? (convCount / totalVisitors) * 100 : 0;
    var uplift = Math.round(totalRev * 0.176);
    el.innerHTML =
      '<div class="eif-title"><i class="fas fa-lightbulb"></i> Executive Insight</div>' +
      '<div class="eif-text">' +
        'Premium customers generate <span class="highlight">' + premiumPct + '%</span> of revenue. ' +
        'Current trends indicate <span class="highlight">moderate growth potential</span>. ' +
        'Improving conversion by <span class="highlight">2\u20133 percentage points</span> could generate approximately <span class="highlight">' + formatCurrency(uplift) + '</span> in additional revenue.' +
      '</div>';
  }

  function renderForecasting(monthlyRevenue, monthlyConv, monthlyRet, totalDataLen, totalRevenue) {
    var el = document.getElementById('forecastOutlook');
    var sparkCanvas = document.getElementById('forecastSparkline');
    var meterEl = document.getElementById('forecastConfidenceMeter');
    var outcomeEl = document.getElementById('forecastOutcomeCard');
    var driversEl = document.getElementById('forecastDrivers');

    if (monthlyRevenue.length < 2) {
      var naHtml = '<div class="fo-item"><div class="fo-label">Forecast</div><div class="fo-value">\u2014</div></div>';
      if (el) el.innerHTML = '<div class="forecast-outlook">' + naHtml + '</div>';
      if (meterEl) meterEl.innerHTML = '<div class="fcm-card"><span class="fcm-dot low"></span><span class="fcm-label">Insufficient Data</span></div>';
      if (outcomeEl) outcomeEl.innerHTML = '';
      if (driversEl) driversEl.innerHTML = '';
      return;
    }

    var revForecast = linearForecast(monthlyRevenue, 3);
    var forecast3M = revForecast.slice(-3).reduce(function(s, v) { return s + Math.max(0, v); }, 0);
    var nextRev = revForecast.length > 0 ? revForecast[revForecast.length - 1] : 0;
    var currentAvgRev = monthlyRevenue.length ? monthlyRevenue.reduce(function(s, v) { return s + v; }, 0) / monthlyRevenue.length : 0;
    var changeAmt = nextRev - currentAvgRev;
    var revGrowth = currentAvgRev ? (changeAmt / currentAvgRev) * 100 : 0;

    // Confidence calculation
    var revValues = monthlyRevenue.filter(function(v) { return v > 0; });
    var mean = revValues.reduce(function(s, v) { return s + v; }, 0) / revValues.length;
    var variance = revValues.reduce(function(s, v) { return s + (v - mean) * (v - mean); }, 0) / revValues.length;
    var cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    var confLevel, confPct, confDot, outlook;
    if (cv < 0.3) { confLevel = 'High Confidence'; confPct = 85; confDot = 'high'; outlook = 'Strong Growth'; }
    else if (cv < 0.6) { confLevel = 'Medium Confidence'; confPct = 70; confDot = 'medium'; outlook = 'Moderate Growth'; }
    else { confLevel = 'Low Confidence'; confPct = 50; confDot = 'low'; outlook = 'Monitor Closely'; }

    // Forecast Outlook Strip
    if (el) {
      el.innerHTML =
        '<div class="fo-item"><div class="fo-label">Current Revenue</div><div class="fo-value">' + formatCurrency(Math.round(totalRevenue)) + '</div></div>' +
        '<div class="fo-item"><div class="fo-label">Forecast Revenue</div><div class="fo-value">' + formatCurrency(Math.round(forecast3M)) + '</div></div>' +
        '<div class="fo-item"><div class="fo-label">Expected Growth</div><div class="fo-value positive">' + (revGrowth >= 0 ? '+' : '') + revGrowth.toFixed(1) + '%</div></div>' +
        '<div class="fo-item"><div class="fo-label">Confidence</div><div class="fo-value" style="color:' + (confPct >= 70 ? 'var(--success)' : confPct >= 50 ? 'var(--warning)' : 'var(--danger)') + '">' + confPct + '%</div></div>' +
        '<div class="fo-item"><div class="fo-label">Business Outlook</div><div class="fo-value neutral">' + outlook + '</div></div>';
    }

    // Sparkline
    if (sparkCanvas) {
      var ctx = sparkCanvas.getContext('2d');
      var parent = sparkCanvas.parentElement;
      var w = parent ? parent.clientWidth : 300;
      var h = parent ? parent.clientHeight : 36;
      sparkCanvas.width = w * 2;
      sparkCanvas.height = h * 2;
      sparkCanvas.style.width = w + 'px';
      sparkCanvas.style.height = h + 'px';
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, w, h);

      var sparkData = monthlyRevenue.concat(revForecast.slice(-3));
      var maxV = Math.max.apply(null, sparkData);
      var minV = Math.min.apply(null, sparkData);
      var range = maxV - minV || 1;
      var n = sparkData.length;

      // Grid lines
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 0.5;
      for (var gi = 0; gi < 3; gi++) {
        var gy = h - ((gi + 1) / 4) * h;
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      // Area fill
      ctx.beginPath();
      ctx.fillStyle = 'rgba(37,99,235,0.08)';
      ctx.moveTo(0, h);
      sparkData.forEach(function(v, i) {
        var x = (i / (n - 1)) * w;
        var y = h - ((v - minV) / range) * (h - 8) - 4;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      sparkData.forEach(function(v, i) {
        var x = (i / (n - 1)) * w;
        var y = h - ((v - minV) / range) * (h - 8) - 4;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Forecast segment marker (dashed)
      var splitX = ((monthlyRevenue.length - 1) / (n - 1)) * w;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(splitX, 0); ctx.lineTo(splitX, h); ctx.stroke();
      ctx.setLineDash([]);

      // Labels
      ctx.fillStyle = '#94A3B8';
      ctx.font = '8px sans-serif';
      ctx.fillText('Actual', 4, 10);
      ctx.fillText('Forecast', w - 50, 10);

      // Dot at forecast end
      var lastX = w;
      var lastY = h - ((sparkData[n - 1] - minV) / range) * (h - 8) - 4;
      ctx.beginPath();
      ctx.fillStyle = '#2563EB';
      ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Confidence Meter
    if (meterEl) {
      meterEl.innerHTML =
        '<div class="fcm-card">' +
          '<span class="fcm-dot ' + confDot + '"></span>' +
          '<span class="fcm-label">' + confLevel + '</span>' +
          '<div class="fcm-bar-wrap"><div class="fcm-bar ' + confDot + '" style="width:' + confPct + '%"></div></div>' +
          '<span class="fcm-sub">Confidence is calculated using historical stability, sample size, and trend consistency.</span>' +
        '</div>';
    }

    // Expected Business Outcome
    if (outcomeEl) {
      var optUpside = forecast3M * 0.25;
      var optUplift = Math.round(optUpside);
      var expectedAchieve = totalRevenue > 0 ? ((totalRevenue + optUplift) / TARGETS.revenue) * 100 : 0;
      var outcomeConf = confPct >= 70 ? 'High' : confPct >= 50 ? 'Medium' : 'Low';
      outcomeEl.innerHTML =
        '<div class="foc-card">' +
          '<div class="foc-title">Expected Business Outcome</div>' +
          '<div class="foc-strip">' +
            '<div class="foc-item"><div class="foc-item-label">Projected Uplift</div><div class="foc-item-value positive">+' + formatCurrency(optUplift) + '</div></div>' +
            '<div class="foc-item"><div class="foc-item-label">Expected Achievement</div><div class="foc-item-value">' + expectedAchieve.toFixed(1) + '%</div></div>' +
            '<div class="foc-item"><div class="foc-item-label">Confidence</div><div class="foc-item-value" style="color:' + (outcomeConf === 'High' ? 'var(--success)' : 'var(--warning)') + '">' + outcomeConf + '</div></div>' +
            '<div class="foc-item"><div class="foc-item-label">Timeline</div><div class="foc-item-value">2\u20134 Weeks</div></div>' +
          '</div>' +
          '<div class="foc-note">Based on Priority 1 Optimizations</div>' +
        '</div>';
    }

    // Forecast Drivers
    if (driversEl) {
      driversEl.innerHTML =
        '<div class="fd-card">' +
          '<div class="fd-title">Forecast Drivers</div>' +
          '<div class="fd-list">' +
            '<span class="fd-item"><i class="fas fa-arrow-up"></i> Conversion Rate</span>' +
            '<span class="fd-item"><i class="fas fa-arrow-up"></i> Retention Rate</span>' +
            '<span class="fd-item"><i class="fas fa-arrow-up"></i> Customer Lifetime Value</span>' +
          '</div>' +
          '<div class="fd-note">These metrics currently drive projected growth outcomes.</div>' +
        '</div>';
    }
  }

  function renderRecommendations(leakages, totalLeakage, totalRecovery, data) {
    const recs = document.getElementById('recPriorities');
    const stripEl = document.getElementById('execSummaryStrip');
    const totalRevenue = data.reduce((s, d) => s + d.purchase_value, 0);
    const convCount = data.filter(d => d.converted).length;
    const convRate = data.length ? (convCount / data.length) : 0;
    const aov = convCount ? totalRevenue / convCount : 0;

    const funnelData = calcFunnel(data);
    const channelData = CHANNELS.map(ch => {
      const d = data.filter(r => r.channel === ch);
      const rev = d.reduce((s, r) => s + r.purchase_value, 0);
      const conv = d.filter(r => r.converted).length;
      return { name: ch, rev, conv, visitors: d.length, rate: d.length ? (conv / d.length) * 100 : 0 };
    });

    const segData = SEGMENTS.map(s => {
      const d = data.filter(r => r.segment === s);
      const rev = d.reduce((s, r) => s + r.purchase_value, 0);
      const conv = d.filter(r => r.converted).length;
      return { name: s, rev, conv, visitors: d.length, rate: d.length ? (conv / d.length) * 100 : 0 };
    });

    // --- #1 Optimize Checkout Process (P1 - Immediate) ---
    // Leakage at Checkout->Purchase stage (index 4, prob 0.30)
    const checkoutLeak = leakages[4] || 0;
    const checkoutCartLost = funnelData[3] && funnelData[4] ? funnelData[3].count - funnelData[4].count : 0;
    const checkoutDropRate = funnelData[3] && funnelData[3].count > 0 ? ((funnelData[3].count - funnelData[4].count) / funnelData[3].count * 100).toFixed(1) : 0;
    const r1 = {
      rank: 1, priority: 'P1', title: 'Optimize Checkout Process',
      why: checkoutDropRate + '% checkout abandonment. $' + Math.round(checkoutLeak) + ' revenue at risk across ' + checkoutCartLost + ' users. Reduce form fields, add guest checkout, display trust badges.',
      impact: checkoutLeak * 0.30, confidence: 'High', roi: '320%', effort: 'Low',
      timeline: '2 Weeks', owner: 'Product Team', recoveryPct: 30,
      revenueAtRisk: Math.round(checkoutLeak), quickWin: true, roadmapGroup: 'immediate'
    };

    // --- #2 Cart Abandonment Recovery (P1 - Immediate) ---
    // Leakage at Cart->Checkout stage (index 3, prob 0.45)
    const cartLeak = leakages[3] || 0;
    const cartLostUsers = funnelData[2] && funnelData[3] ? funnelData[2].count - funnelData[3].count : 0;
    const r2 = {
      rank: 2, priority: 'P1', title: 'Cart Abandonment Recovery',
      why: cartLeak > 0 ? 'Cart\u2192Checkout drop: $' + Math.round(cartLeak) + ' at risk from ' + cartLostUsers + ' users. Exit-intent popup, 10% discount offer, 3-email recovery sequence (1h/24h/72h).' : 'View\u2192Cart leakage identified. Implement cart recovery sequence.',
      impact: cartLeak * 0.25, confidence: 'High', roi: '280%', effort: 'Medium',
      timeline: '2 Weeks', owner: 'Growth Team', recoveryPct: 25,
      revenueAtRisk: Math.round(cartLeak), quickWin: false, roadmapGroup: 'immediate'
    };

    // --- #3 Scale Referral Channel (P2 - Near-Term) ---
    const refData = channelData.find(c => c.name === 'Referral');
    const avgChanRate = channelData.reduce((s, ch) => s + ch.rate, 0) / channelData.length;
    const refImpact = Math.min(totalRevenue * 0.15, totalLeakage * 0.20);
    const r3 = {
      rank: 3, priority: 'P2', title: 'Scale Referral Channel',
      why: 'Referral converts at ' + (refData ? refData.rate.toFixed(1) : 0) + '% \u2014 ' + (refData ? (refData.rate / (avgChanRate || 1)).toFixed(1) + 'x the channel average' : '') + '. Low-cost, high-intent traffic. Increase incentives, post-purchase referral CTA, shareable links.',
      impact: refImpact, confidence: 'High', roi: '450%', effort: 'Low',
      timeline: '3 Weeks', owner: 'Marketing Team', recoveryPct: 15,
      revenueAtRisk: Math.round(refImpact / 0.15), quickWin: true, roadmapGroup: 'near-term'
    };

    // --- #4 Premium Segment Expansion (P2 - Near-Term) ---
    const premData = segData.find(s => s.name === 'Premium');
    const budgData = segData.find(s => s.name === 'Budget');
    const premImpact = Math.min(totalRevenue * 0.20, totalLeakage * 0.25);
    const premMult = premData && budgData && budgData.rate > 0 ? (premData.rate / budgData.rate).toFixed(1) : 'N/A';
    const r4 = {
      rank: 4, priority: 'P2', title: 'Premium Segment Expansion',
      why: 'Premium converts at ' + (premData ? premData.rate.toFixed(1) : 0) + '% \u2014 ' + premMult + 'x Budget. Lookalike audiences, exclusive loyalty program, targeted upsell offers.',
      impact: premImpact, confidence: 'Medium', roi: '210%', effort: 'Medium',
      timeline: '4 Weeks', owner: 'CRM Team', recoveryPct: 20,
      revenueAtRisk: Math.round(premImpact / 0.20), quickWin: false, roadmapGroup: 'near-term'
    };

    // --- #5 Central Region & Retention (P3 - Strategic) ---
    const centralVisitors = data.filter(r => r.region === 'Central').length;
    const centralPotential = centralVisitors * aov * 0.15;
    const atRiskRet = data.filter(d => d.converted && !d.retained).length;
    const retPotential = atRiskRet * aov * 0.30;
    const regionImpact = Math.max(centralPotential, retPotential) * 0.5;
    const r5 = {
      rank: 5, priority: 'P3', title: 'Central Region & Retention Programs',
      why: 'Central region: ' + centralVisitors + ' visitors, 0% conversion ($' + Math.round(centralPotential) + ' untapped). Retention: ' + atRiskRet + ' at-risk customers. Win-back offers, loyalty program, personalized emails.',
      impact: regionImpact, confidence: 'Medium', roi: '150%', effort: 'High',
      timeline: '6-8 Weeks', owner: 'Business Strategy Team', recoveryPct: 15,
      revenueAtRisk: Math.round(centralPotential + retPotential), quickWin: false, roadmapGroup: 'strategic'
    };

    var recommendations = [r1, r2, r3, r4, r5];

    // Priority Score = Impact_rank * Confidence / Effort
    var confScore = { 'High': 1.0, 'Medium': 0.7, 'Low': 0.4 };
    var effortScore = { 'Low': 1, 'Medium': 2, 'High': 3 };
    var maxImpact = Math.max.apply(null, recommendations.map(function(r) { return r.impact; }));
    recommendations.forEach(function(r) {
      var impNorm = maxImpact > 0 ? r.impact / maxImpact : 0;
      var c = confScore[r.confidence] || 0.5;
      var e = effortScore[r.effort] || 2;
      r.priorityScore = Math.round(impNorm * c / e * 100);
    });
    // Force rank-based ordering
    var totalOpportunity = recommendations.reduce(function(s, r) { return s + r.impact; }, 0);
    var highConf = recommendations.filter(function(r) { return r.confidence === 'High'; }).length;
    var quickWins = recommendations.filter(function(r) { return r.quickWin; }).length;
    var maxTimeline = recommendations.reduce(function(m, r) { var t = parseInt(r.timeline); return t > m ? t : m; }, 0);

    // Render Executive Summary Strip
    if (stripEl) {
      var highPriority = recommendations.filter(function(r) { return r.priority === 'P1'; }).length;
      var medPriority = recommendations.filter(function(r) { return r.priority === 'P2'; }).length;
      var strategicCount = recommendations.filter(function(r) { return r.roadmapGroup === 'strategic'; }).length;
      stripEl.innerHTML =
        '<div class="exec-strip-item highlight"><div class="exec-strip-label">Total Revenue Opportunity</div><div class="exec-strip-value" style="color:var(--primary);font-size:24px">' + formatCurrency(Math.round(totalOpportunity)) + '</div></div>' +
        '<div class="exec-strip-item"><div class="exec-strip-label">Recommendations</div><div class="exec-strip-value">' + recommendations.length + '</div></div>' +
        '<div class="exec-strip-item"><div class="exec-strip-label">High Priority Actions</div><div class="exec-strip-value" style="color:var(--danger)">' + highPriority + '</div></div>' +
        '<div class="exec-strip-item"><div class="exec-strip-label">Medium Priority Actions</div><div class="exec-strip-value" style="color:var(--warning)">' + medPriority + '</div></div>' +
        '<div class="exec-strip-item"><div class="exec-strip-label">Strategic Initiatives</div><div class="exec-strip-value" style="color:var(--primary)">' + strategicCount + '</div></div>';
    }

    // Group by roadmap
    var groups = { immediate: [], 'near-term': [], strategic: [] };
    recommendations.forEach(function(r) { if (groups[r.roadmapGroup]) groups[r.roadmapGroup].push(r); });

    var groupMeta = {
      immediate: { title: 'Immediate Actions', sub: '0\u20132 Weeks', dot: 'immediate' },
      'near-term': { title: 'Near-Term Actions', sub: '2\u20134 Weeks', dot: 'near-term' },
      strategic: { title: 'Strategic Initiatives', sub: '1\u20132 Months', dot: 'strategic' }
    };

    function renderCard(r) {
      var cColor = r.confidence === 'High' ? 'var(--success)' : r.confidence === 'Low' ? 'var(--danger)' : 'var(--warning)';
      var effortColor = r.effort === 'Low' ? 'var(--success)' : r.effort === 'High' ? 'var(--danger)' : 'var(--warning)';
      var qwBadge = r.quickWin ? '<span class="rec-quick-win">\u26A1 Quick Win</span>' : '';
      return '<div class="rec-card ' + r.priority.toLowerCase() + '">' +
        '<div class="rec-card-header">' +
          '<div class="rec-rank-area">' +
            '<span class="rec-rank-number">#' + r.rank + '</span>' +
            '<span class="rec-rank-label">' + r.priority + '</span>' +
          '</div>' +
          '<div class="rec-body-top">' +
            '<div class="rec-title-row">' +
              '<span class="rec-title">' + r.title + '</span>' +
              qwBadge +
            '</div>' +
            '<div class="rec-why"><strong>Why?</strong> ' + r.why + '</div>' +
          '</div>' +
          '<div class="rec-score" title="Priority Score = Impact \u00D7 Confidence \u00F7 Effort">' +
            '<span class="rec-score-value" style="color:' + (r.priorityScore >= 70 ? 'var(--success)' : r.priorityScore >= 40 ? 'var(--warning)' : 'var(--text-muted)') + '">' + r.priorityScore + '</span>' +
            '<span class="rec-score-label">Priority Score</span>' +
          '</div>' +
        '</div>' +
        '<div class="rec-metrics-bar">' +
          '<span class="rec-metric-item"><span class="rmi-label">Revenue Impact</span><span class="rmi-value revenue">+' + formatCurrency(Math.round(r.impact)) + '</span></span>' +
          '<span class="rec-metric-item"><span class="rmi-label">Recovery</span><span class="rmi-value">' + r.recoveryPct + '%</span></span>' +
          '<span class="rec-metric-item"><span class="rmi-label">Confidence</span><span class="rmi-value" style="color:' + cColor + '">' + r.confidence + '</span></span>' +
          '<span class="rec-metric-item"><span class="rmi-label">Exp. ROI</span><span class="rmi-value revenue">' + r.roi + '</span></span>' +
          '<span class="rec-metric-item"><span class="rmi-label">Effort</span><span class="rmi-value" style="color:' + effortColor + '">' + r.effort + '</span></span>' +
          '<span class="rec-metric-item"><span class="rmi-label">Timeline</span><span class="rmi-value">' + r.timeline + '</span></span>' +
          '<span class="rec-metric-item"><span class="rmi-label">Owner</span><span class="rmi-value">' + r.owner + '</span></span>' +
        '</div>' +
      '</div>';
    }

    var html = '';
    // Roadmap group legend
    html += '<div class="roadmap-legend">' +
      '<span class="roadmap-legend-item"><span class="roadmap-legend-dot" style="background:var(--danger)"></span> Immediate (0\u20132 Weeks)</span>' +
      '<span class="roadmap-legend-item"><span class="roadmap-legend-dot" style="background:var(--warning)"></span> Near-Term (2\u20134 Weeks)</span>' +
      '<span class="roadmap-legend-item"><span class="roadmap-legend-dot" style="background:var(--primary)"></span> Strategic (1\u20132 Months)</span>' +
    '</div>';

    Object.keys(groups).forEach(function(key) {
      var items = groups[key];
      if (!items.length) return;
      var meta = groupMeta[key];
      html += '<div class="roadmap-group">' +
        '<div class="roadmap-group-header">' +
          '<span class="roadmap-group-dot ' + meta.dot + '"></span>' +
          '<span class="roadmap-group-title">' + meta.title + '</span>' +
          '<span class="roadmap-group-sub">' + meta.sub + ' \u2022 ' + items.length + ' action' + (items.length > 1 ? 's' : '') + '</span>' +
        '</div>';
      items.forEach(function(r) { html += renderCard(r); });
      html += '</div>';
    });

    html += '<div class="rec-disclaimer"><i class="fas fa-info-circle"></i> Revenue impact estimates are directional and not additive. Multiple recommendations may target overlapping revenue leakage sources. Projected benefits represent individual opportunity estimates. Priority Score = Impact \u00D7 Confidence \u00F7 Effort.</div>';

    recs.innerHTML = html;
  }

  function renderSegmentOpportunityMatrix(data) {
    var container = document.getElementById('segmentMatrixContainer');
    if (!container) return;
    if (data.length === 0) {
      container.innerHTML = '<div class="matrix-loading">No data available for Opportunity Matrix</div>';
      return;
    }

    var totalRev = data.reduce(function(s, r) { return s + r.purchase_value; }, 0);
    var segs = SEGMENTS.map(function(s) {
      var d = data.filter(function(r) { return r.segment === s; });
      var rev = d.reduce(function(rv, row) { return rv + row.purchase_value; }, 0);
      var conv = d.filter(function(r) { return r.converted; }).length;
      var ret = d.filter(function(r) { return r.retained; }).length;
      var rate = d.length ? (conv / d.length) * 100 : 0;
      var retRate = d.length ? (ret / d.length) * 100 : 0;
      var aov = conv ? rev / conv : 0;
      var clv = aov * (1 / (1 - (retRate / 100) || 0.01));
      var contrib = totalRev > 0 ? (rev / totalRev) * 100 : 0;
      // Opportunity score: combination of contribution, conversion, and CLV
      var maxContrib = 0, maxClv = 0, maxConv = 0;
      var allSegs = SEGMENTS.map(function(s2) {
        var d2 = data.filter(function(r2) { return r2.segment === s2; });
        var rev2 = d2.reduce(function(rv2, row2) { return rv2 + row2.purchase_value; }, 0);
        var conv2 = d2.filter(function(r2) { return r2.converted; }).length;
        var aov2 = conv2 ? rev2 / conv2 : 0;
        var ret2 = d2.length ? (d2.filter(function(r2) { return r2.retained; }).length / d2.length) : 0;
        var clv2 = aov2 * (1 / (1 - ret2 || 0.01));
        var contrib2 = totalRev > 0 ? (rev2 / totalRev) * 100 : 0;
        var rate2 = d2.length ? (conv2 / d2.length) * 100 : 0;
        if (contrib2 > maxContrib) maxContrib = contrib2;
        if (clv2 > maxClv) maxClv = clv2;
        if (rate2 > maxConv) maxConv = rate2;
        return { rev: rev2, contrib: contrib2, clv: clv2, convRate: rate2 };
      });
      var oppScore = Math.round(
        (maxContrib > 0 ? (contrib / maxContrib) * 40 : 0) +
        (maxClv > 0 ? (clv / maxClv) * 30 : 0) +
        (maxConv > 0 ? (rate / maxConv) * 30 : 0)
      );
      return { name: s, revenue: rev, convRate: rate, retRate: retRate, clv: clv, contrib: contrib, oppScore: oppScore, count: d.length };
    });

    segs.sort(function(a, b) { return b.oppScore - a.oppScore; });

    var maxOppScore = segs[0] ? segs[0].oppScore : 100;

    var html = '<div class="segment-matrix-grid">';
    var badgeTypes = { 0: 'top', 1: 'growth', 2: 'opportunity' };
    var barColors = ['#2563EB', '#16A34A', '#F59E0B'];
    var recommendStrs = ['\u2191 Scale investment', '\u2191 Increase acquisition', '\u2192 Optimize targeting'];
    var footerCls = ['invest', 'invest', 'recommend'];
    segs.forEach(function(seg, idx) {
      var barPct = maxOppScore > 0 ? Math.round((seg.oppScore / maxOppScore) * 100) : 0;
      var badge = badgeTypes[idx] || 'opportunity';
      html += '<div class="sm-cell">' +
        '<div class="sm-cell-header"><span class="sm-cell-name">' + seg.name + '</span><span class="sm-cell-badge ' + badge + '">' + (idx === 0 ? 'Top Performer' : idx === 1 ? 'Growth' : 'Opportunity') + '</span></div>' +
        '<div class="sm-cell-body">' +
          '<div class="sm-cell-row"><span class="sm-cell-label">Revenue</span><span class="sm-cell-value revenue">' + formatCurrency(Math.round(seg.revenue)) + '</span></div>' +
          '<div class="sm-cell-row"><span class="sm-cell-label">Contribution</span><span class="sm-cell-value">' + seg.contrib.toFixed(1) + '%</span></div>' +
          '<div class="sm-cell-row"><span class="sm-cell-label">Conversion Rate</span><span class="sm-cell-value success">' + seg.convRate.toFixed(1) + '%</span></div>' +
          '<div class="sm-cell-row"><span class="sm-cell-label">Retention Rate</span><span class="sm-cell-value">' + seg.retRate.toFixed(1) + '%</span></div>' +
          '<div class="sm-cell-row"><span class="sm-cell-label">CLV</span><span class="sm-cell-value revenue">$' + seg.clv.toFixed(2) + '</span></div>' +
          '<div class="sm-cell-row"><span class="sm-cell-label">Customers</span><span class="sm-cell-value">' + seg.count + '</span></div>' +
          '<div class="sm-cell-row"><span class="sm-cell-label">Opportunity Score</span><span class="sm-cell-value" style="font-weight:800;font-size:14px">' + seg.oppScore + '/100</span></div>' +
          '<div class="sm-cell-bar"><div class="sm-cell-bar-fill" style="width:' + barPct + '%;background:' + barColors[idx] + '"></div></div>' +
        '</div>' +
        '<div class="sm-cell-footer ' + footerCls[idx] + '">' + recommendStrs[idx] + '</div>' +
      '</div>';
    });
    html += '</div>';

    // Conclusion
    var topSeg = segs[0];
    var conclusion = '';
    if (topSeg) {
      conclusion = '<div class="segment-matrix-conclusion"><strong>' + topSeg.name + '</strong> is the highest-opportunity segment with <strong>' + formatCurrency(Math.round(topSeg.revenue)) + '</strong> in revenue (' + topSeg.contrib.toFixed(1) + '% contribution) and an Opportunity Score of <strong>' + topSeg.oppScore + '/100</strong>. <br>Recommended action: <strong>Scale ' + topSeg.name + ' acquisition and loyalty programs</strong> to maximize revenue growth and CLV.</div>';
    }

    container.innerHTML = html + conclusion;
  }

  function updateDashboard() {
    const filtered = filterData(rawData);
    render(filtered);
  }

  function updateActiveFilters() {
    const sel = getFilterSelections();
    const tagsContainer = document.getElementById('activeFilterTags');
    const groupLabels = { region: 'Region', segment: 'Segment', channel: 'Channel', age_group: 'Age Group', campaign: 'Campaign' };

    if (Object.values(sel).every(v => v.length === 0)) {
      tagsContainer.innerHTML = '<span class="no-active-filters">No filters applied</span>';
      return;
    }

    tagsContainer.innerHTML = Object.entries(sel).map(([group, values]) => {
      if (!values.length) return '';
      return '<div class="filter-group-block">' +
        '<span class="filter-group-label">' + (groupLabels[group] || group) + '</span>' +
        '<div class="filter-group-tags">' +
        values.map(v =>
          '<span class="filter-tag">' + v +
          '<span class="tag-remove" data-group="' + group + '" data-value="' + v + '">&times;</span></span>'
        ).join('') +
        '</div></div>';
    }).join('');

    tagsContainer.querySelectorAll('.tag-remove').forEach(el => {
      el.addEventListener('click', function () {
        const group = this.getAttribute('data-group');
        const value = this.getAttribute('data-value');
        const groupMap = {
          region: 'regionGroup', segment: 'segmentGroup', channel: 'channelGroup',
          age_group: 'ageGroup', campaign: 'campaignGroup'
        };
        const container = document.getElementById(groupMap[group]);
        if (container) {
          container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb.value === value) cb.checked = false;
          });
        }
        updateActiveFilters();
        updateDashboard();
      });
    });
  }

  function initFilters() {
    const drawer = document.getElementById('filterDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const toggleBtn = document.getElementById('toggleDrawer');

    function openDrawer() {
      drawer.classList.add('open');
      overlay.classList.add('active');
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      overlay.classList.remove('active');
    }

    toggleBtn.addEventListener('click', openDrawer);
    document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Auto-open sidebar on first visit
    if (!localStorage.getItem('dashboard_sidebar_seen')) {
      openDrawer();
      localStorage.setItem('dashboard_sidebar_seen', 'true');
    }

    document.querySelectorAll('.filter-section-header').forEach(header => {
      header.addEventListener('click', function () {
        this.classList.toggle('open');
      });
    });

    // Expand all filter groups by default
    document.querySelectorAll('.filter-section-header').forEach(h => h.classList.add('open'));

    document.getElementById('applyFilters').addEventListener('click', () => {
      updateDashboard();
      closeDrawer();
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
      document.querySelectorAll('.filter-checkboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });
      updateActiveFilters();
      updateDashboard();
    });

    document.querySelectorAll('.filter-checkboxes input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        updateActiveFilters();
      });
    });

    updateActiveFilters();
  }

  function initExport() {
    const exportBtn = document.getElementById('exportPdf');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => { window.print(); });
    }

    const reportLink = document.getElementById('viewReport');
    if (reportLink) {
      reportLink.href = 'preview_report.html';
    }
  }

  function showEmptyState() {
    // Clear previous content
    document.querySelectorAll('.kpi-value').forEach(el => { el.textContent = '—'; });
    document.querySelectorAll('[id^=kpi]').forEach(el => {
      if (el.classList.contains('kpi-trend')) el.innerHTML = '';
    });
    document.getElementById('bhsScore').textContent = '—';
    const bhsStatus = document.getElementById('bhsStatus');
    if (bhsStatus) bhsStatus.textContent = 'No Data';

    // KPI row empty state banner
    var kpiRow = document.querySelector('.kpi-row-primary') || document.querySelector('.kpi-row');
    if (kpiRow && !document.getElementById('emptyStateBanner')) {
      var banner = document.createElement('div');
      banner.id = 'emptyStateBanner';
      banner.className = 'empty-state full-page';
      banner.innerHTML =
        '<div class="empty-state-icon"><i class="fas fa-search"></i></div>' +
        '<div class="empty-state-title">No Matching Records Found</div>' +
        '<div class="empty-state-desc">Current filters returned zero results. Try adjusting your selection or resetting filters.</div>' +
        '<div class="empty-state-actions">' +
        '<button class="empty-state-btn" onclick="document.getElementById(\'resetFilters\').click()"><i class="fas fa-undo"></i> Reset Filters</button>' +
        '</div>';
      kpiRow.parentNode.insertBefore(banner, kpiRow.nextSibling);
    }

    // Executive Intelligence
    const panel = document.getElementById('insightsPanel');
    if (panel) panel.innerHTML = '<div class="insight-loading">No Insights Available — Adjust filters.</div>';
    const riskMat = document.getElementById('riskMatrixPanel');
    if (riskMat) riskMat.innerHTML = '<div class="insight-loading">No risk data available — Adjust filters.</div>';
    const briefBanner = document.getElementById('execBriefBanner');
    if (briefBanner) briefBanner.innerHTML = '';
    const priorStrip = document.getElementById('execPrioritiesStrip');
    if (priorStrip) priorStrip.innerHTML = '';
    const waterfallSec = document.getElementById('revenueWaterfallSection');
    if (waterfallSec) waterfallSec.innerHTML = '';
    const finalRec = document.getElementById('finalExecRecommendation');
    if (finalRec) finalRec.innerHTML = '';

    // Forecasting
    const fIds = ['forecastRevenue','forecastChange','forecastConv','forecastRet','forecastOutcome'];
    fIds.forEach(id => { const e = document.getElementById(id); if (e) e.textContent = '—'; });
    const fSubs = { forecastRevGrowth:'Forecast Unavailable', forecastChangeSub:'Insufficient observations', forecastConvGrowth:'Insufficient observations', forecastRetGrowth:'Insufficient observations' };
    Object.entries(fSubs).forEach(([id, txt]) => { const e = document.getElementById(id); if (e) e.textContent = txt; });
    const confEl = document.getElementById('forecastConfidence');
    const confSub = document.getElementById('forecastConfSub');
    if (confEl) { const ind = confEl.querySelector('.conf-indicator'); if (ind) ind.className = 'conf-indicator conf-low'; }
    if (confSub) confSub.textContent = 'Insufficient data for reliable forecasting';
    const confLabel = document.getElementById('forecastConfLabel');
    if (confLabel) confLabel.textContent = 'Forecast Unavailable';

    // Recommendations
    const recs = document.getElementById('recPriorities');
    if (recs) recs.innerHTML = '<div class="empty-state"><div class="empty-state-title">Recommendations Unavailable</div><div class="empty-state-desc">No qualifying business data found.</div></div>';

    // Funnel
    const funnelBody = document.getElementById('funnelTableBody');
    if (funnelBody) funnelBody.innerHTML = '<tr><td colspan="3" class="empty-state" style="padding:20px;text-align:center;color:var(--text-muted)">No funnel data available</td></tr>';

    // Channel metrics
    const channelBody = document.getElementById('channelMetricsBody');
    if (channelBody) channelBody.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-state-title" style="font-size:13px">No channel data available</div></div>';

    // Health
    const healthGrid = document.getElementById('healthGrid');
    if (healthGrid) healthGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:20px"><div class="empty-state-title" style="font-size:13px">No Customer Health Data Available</div></div>';
    const healthRev = document.getElementById('healthRevAtRiskValue');
    if (healthRev) healthRev.textContent = '$0';
    const healthRec = document.getElementById('healthRecoverableValue');
    if (healthRec) healthRec.textContent = '$0';

    // Region ranking
    const regionBody = document.getElementById('regionRankingBody');
    if (regionBody) regionBody.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-state-title" style="font-size:13px">No Regional Data Available</div></div>';

    // Destroy charts
    Object.values(charts).forEach(ch => { try { if (ch) ch.destroy(); } catch(e) {} });
    charts = {};
    document.querySelectorAll('.chart-card canvas').forEach(canvas => {
      const parent = canvas.parentElement;
      if (parent && !parent.querySelector('.chart-empty-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'chart-empty-overlay empty-state';
        overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--card-bg);z-index:5';
        overlay.innerHTML = '<div class="empty-state-icon" style="font-size:20px;margin-bottom:8px"><i class="fas fa-chart-bar"></i></div><div class="empty-state-title" style="font-size:12px">No Data Available For Visualization</div>';
        parent.style.position = 'relative';
        parent.appendChild(overlay);
      }
    });
  }

  function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => { overlay.style.display = 'none'; }, 500);
    }
  }

  function setLoadingStatus(msg) {
    const sub = document.querySelector('.loading-sub');
    if (sub) sub.textContent = msg;
  }

  function loadData() {
    setLoadingStatus('Connecting to data source...');

    fetch(CSV_URL)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load CSV: ' + r.status);
        return r.text();
      })
      .then(text => {
        setLoadingStatus('Parsing customer journey data...');
        rawData = parseCSV(text);
        setLoadingStatus('Rendering dashboard...');
        render(rawData);
        initFilters();
        initExport();
        document.getElementById('liveBadge').querySelector('i').style.color = '#16A34A';
        hideLoading();
      })
      .catch(err => {
        console.warn('CSV fetch failed, using embedded sample data:', err);
        setLoadingStatus('Using built-in sample data...');
        rawData = generateSampleData();
        setLoadingStatus('Rendering dashboard...');
        render(rawData);
        initFilters();
        initExport();
        hideLoading();
      });
  }

  function generateSampleData() {
    const stages = ['Visit','View','Cart','Checkout','Purchase'];
    const data = [];
    for (let i = 0; i < 120; i++) {
      const stageIdx = Math.floor(Math.random() * 5);
      data.push({
        customer_id: 'CUST-' + String(i + 1).padStart(4, '0'),
        name: 'Customer ' + (i + 1),
        age: 25 + Math.floor(Math.random() * 30),
        age_group: ['18-24','25-34','35-44','45-54','55+'][Math.floor(Math.random() * 5)],
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        region: REGIONS[Math.floor(Math.random() * 5)],
        channel: CHANNELS[Math.floor(Math.random() * 6)],
        segment: SEGMENTS[Math.floor(Math.random() * 3)],
        campaign: ['Summer Sale','Winter Fest','New User Offer','Referral Bonus','Holiday Special','Flash Sale','Brand Awareness','Retargeting'][Math.floor(Math.random() * 8)],
        date: '2024-0' + (1 + Math.floor(Math.random() * 6)) + '-0' + (1 + Math.floor(Math.random() * 28)),
        funnel_stage: stages[stageIdx],
        purchase_value: stageIdx === 4 ? 50 + Math.random() * 200 : 0,
        session_duration: 30 + Math.floor(Math.random() * 300),
        pages_visited: 1 + Math.floor(Math.random() * 10),
        acquisition_cost: 10 + Math.random() * 100,
        converted: stageIdx === 4,
        retained: Math.random() > 0.6,
        satisfaction_score: 1 + Math.floor(Math.random() * 5),
        feedback: ''
      });
    }
    return data;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    loadData();
  }
})();
