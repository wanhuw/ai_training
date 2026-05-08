---
name: ai-trainer-exam-app
description: '生成"人工智能训练师三级 备考通"完整 Web 应用。包含理论练习、190题模拟考试、Pyodide 在线运行 Python 的实操训练台。纯前端，无需构建工具。Use when: 重建备考通, regenerate exam app, 生成ai训练师备考系统, create training exam webapp.'
argument-hint: '目标目录（默认 ai_training_like/）'
---

# 生成"人工智能训练师三级 备考通"完整项目

## 项目简介

一个**纯前端、零构建**的备考 SPA，运行方式是本地起一个 HTTP 服务器（`python -m http.server 8010`）然后用浏览器打开。

功能：
- **理论练习**：按知识点/题型筛选做题，含错题模式
- **190题模拟考试**：判断40+单选140+多选10，90分钟倒计时，满分100分，60分及格
- **成绩历史**：表格展示历次考试记录
- **实操训练台**：填写代码填空题（内联 `<input>` 嵌入模板代码），一键用 Pyodide（WebAssembly Python）在浏览器直接运行，自动评分；文档题 checkbox 自评

## 技术栈

- **Vue 3** CDN：`https://unpkg.com/vue@3/dist/vue.global.prod.js`
- **Vue Router 4** CDN：`https://unpkg.com/vue-router@4/dist/vue-router.global.prod.js`
- **Pyodide v0.26.4**：`https://cdn.jsdelivr.net/pyodide/v0.26.4/full/`
- **字体**：Noto Sans SC（Google Fonts）
- **存储**：全 `localStorage`，key 前缀 `bk-`
- 默认账号：用户名 `wanhuw`，密码 `12345678`

## 文件结构

```
ai_training_like/
├── index-vue.html          ← 入口（加载顺序严格）
├── styles.css              ← 所有样式
├── questions-data.js       ← 理论题库（window.QUESTIONS_DATA，可选，无则用内置）
├── ops-data.js             ← 实操题库（window.OPS_DATA，40题）
├── ops-page-component.js   ← 实操训练台 Vue 组件（含 Pyodide）
├── app-vue.js              ← 主应用（Auth + 路由 + 4个页面）
└── datasets/               ← CSV/XLSX 数据文件（Python 运行时可用）
    ├── patient_data.csv
    ├── sensor_data.csv
    └── ...（共16个CSV/XLSX，名见下文）
```

---

## 文件1：`index-vue.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>人工智能训练师三级 备考通</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./styles.css?v=1">
</head>
<body>
  <div id="app"></div>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <script src="https://unpkg.com/vue-router@4/dist/vue-router.global.prod.js"></script>
  <script src="./questions-data.js?v=1"></script>
  <script src="./ops-data.js?v=1"></script>
  <script src="./ops-page-component.js?v=1"></script>
  <script src="./app-vue.js?v=1"></script>
</body>
</html>
```

---

## 文件2：`styles.css`

设计令牌（CSS变量）：
```css
:root {
  --bg: #eef3f8;
  --bg-accent: #d6e4ff;
  --surface: #ffffff;
  --surface-soft: #f7f9fc;
  --ink-1: #111827;
  --ink-2: #4b5563;
  --line: #dbe2ea;
  --line-strong: #c4d0dd;
  --primary: #111827;
  --primary-hover: #1f2937;
  --danger: #dc2626;
  --radius-sm: 8px;
  --radius: 12px;
  --shadow: 0 14px 40px rgba(17,24,39,0.12);
}
```

关键 CSS 类清单（按组实现，细节参照下方代码）：

**全局 body**：渐变背景（两个 radial-gradient + var(--bg)），Noto Sans SC 字体

**登录页**：`.login-panel`（width: min(420px,100%)），`.brand-block`，`.card`，`.field`（grid 布局），`.btn`（100%宽），`.btn-primary`（黑底白字），`.btn-ghost`（白底边框），`.wechat-card`（二维码卡片）

**主应用壳**：`.exam-app`（max 920px，白色圆角卡片），`.app-header`，`.app-tabs`，`.tab-btn`（激活状态 `.active`：黑底白字）

**理论练习**：`.theory-layout`（260px侧栏 + 主内容），`.kp-btn`（激活 `.on`：蓝边蓝背景），`.chip`/`.chip.on`，`.stats-row`（3列网格），`.question-card`，`.option-btn`（状态：`.selected` `.correct` `.wrong`）

**实操训练台**：
```css
/* 列表/卡片 */
.ops-page { padding: 4px 0; }
.ops-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px,1fr)); gap: 12px; }
.ops-card { border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; background: #fff; cursor: pointer; transition: box-shadow .15s; }
.ops-card:hover { box-shadow: 0 4px 16px rgba(17,24,39,.1); }
.ops-type-chip { font-size: .76rem; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
.ops-type-chip.code { background: #ede9fe; color: #5b21b6; }
.ops-type-chip.doc  { background: #fef3c7; color: #92400e; }

/* 详情布局 */
.ops-detail-layout { display: grid; grid-template-columns: 300px minmax(0,1fr); gap: 14px; margin-top: 10px; }
.ops-left-panel { position: sticky; top: 14px; max-height: calc(100vh - 60px); overflow-y: auto; }
.ops-right-panel { display: flex; flex-direction: column; gap: 10px; }
.ops-detail-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-bottom: 10px; border-bottom: 1px solid var(--line); margin-bottom: 4px; }

/* 评分项 */
.ops-pts { display: inline-block; background: #4f46e5; color: #fff; font-size: .7rem; font-weight: 700; border-radius: 4px; padding: 1px 7px; min-width: 32px; text-align: center; }
.ops-rubric-row { padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
.ops-blank-score-line { font-size: .8rem; color: var(--ink-2); margin-top: 6px; }

/* Kernel 工具栏 */
.ops-kernel-bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f8fafc; border: 1px solid var(--line); border-radius: var(--radius-sm); flex-wrap: wrap; }
.ops-kernel-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.ops-kernel-dot.ks-unloaded { background: #d1d5db; }
.ops-kernel-dot.ks-loading  { background: #f59e0b; animation: kpulse .8s infinite alternate; }
.ops-kernel-dot.ks-ready    { background: #22c55e; }
.ops-kernel-dot.ks-busy     { background: #3b82f6; animation: kpulse .5s infinite alternate; }
.ops-kernel-dot.ks-error    { background: #ef4444; }
@keyframes kpulse { from { opacity:1; } to { opacity:.35; } }

/* 内联填空 */
.ops-inline-code-block { font-family: "Courier New", monospace; font-size: .9rem; line-height: 1.8; background: #f8fafc; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 10px 14px; white-space: pre-wrap; }
.ops-tpl-text { white-space: pre; color: #334155; }
.ops-inline-input { display: inline-block; font-family: inherit; font-size: inherit; border: none; border-bottom: 2px solid #4f46e5; background: #eff6ff; color: #1d4ed8; padding: 1px 4px; min-width: 60px; border-radius: 2px 2px 0 0; outline: none; vertical-align: middle; }
.ops-inline-input:focus { background: #dbeafe; border-bottom-color: #1d4ed8; }
.ops-inline-input:disabled { background: #f1f5f9; color: #64748b; border-bottom-color: #94a3b8; }

/* Cell 组 */
.ops-cell-group { display: flex; flex-direction: column; gap: 4px; border-left: 3px solid #e0e7ff; padding-left: 10px; margin-bottom: 10px; }
.ops-run-btn { background: #4f46e5; color: #fff; border: none; border-radius: var(--radius-sm); padding: 5px 14px; font-size: .82rem; cursor: pointer; }
.ops-run-btn:disabled { background: #c7d2fe; cursor: not-allowed; }
.ops-run-btn.running { background: #6d28d9; }
.ops-run-btn.kl-waiting { background: #f59e0b; }

/* Cell 输出 */
.ops-cell-output { background: #0f172a; border-radius: var(--radius-sm); padding: 10px 14px; margin-top: 4px; }
.ops-out-stdout { margin:0; color: #e2e8f0; font-family: "Courier New",monospace; font-size: .83rem; white-space: pre-wrap; }
.ops-out-stderr { margin:0; color: #fca5a5; font-family: "Courier New",monospace; font-size: .83rem; white-space: pre-wrap; }
.ops-out-img { max-width: 100%; border-radius: 4px; display: block; }
.ops-out-msg { font-size: .82rem; color: #fbbf24; font-style: italic; }
.ops-out-empty { font-size: .8rem; color: #94a3b8; font-style: italic; }

/* 参考答案 */
.ops-ref-box { margin-top: 10px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; padding: 10px 12px; }
.ops-ref-code { margin:0; font-family: "Courier New",monospace; font-size: .84rem; white-space: pre-wrap; color: #166534; }

/* 已上传文件条 */
.ops-uploaded-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 5px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); margin-top: 4px; }
.ops-uploaded-chip { font-size: .76rem; background: #dcfce7; color: #15803d; border: 1px solid #86efac; border-radius: 4px; padding: 1px 7px; font-family: "Courier New",monospace; }

/* 上传按钮（label 包裹 hidden input） */
.ops-upload-lbl { position: relative; cursor: pointer; }
```

**历史表格**：`.history-table`（width 100%, border-collapse:collapse），th/td（padding + border-bottom）

**响应式**：`@media (max-width: 760px)` 实操左右变上下；`@media (max-width: 540px)` 单列

---

## 文件3：`ops-data.js`

```javascript
// ops-data.js — 实操题库（window.OPS_DATA）
(function () {
  window.OPS_DATA = [
    // 代码题示例
    {
      id: 1,
      title: "智能医疗系统中的业务数据处理流程设计",
      category: "业务数据处理",
      time_limit: "30min",
      total_score: 22,
      type: "code",
      scenario: "某医疗机构使用患者数据集 patient_data.csv，字段：PatientID, Age, BMI, BloodPressure, Cholesterol, DaysInHospital。要求统计住院>7天的高风险患者占比及不同BMI区间分布。",
      tasks: [
        { title: "", description: "统计高风险患者数量和占比，截图保存为 1.1.1-1.jpg" },
        { title: "", description: "统计不同BMI区间（偏瘦<18.5, 正常18.5-23.9, 超重24-27.9, 肥胖≥28）的高风险比例" }
      ],
      rubric: [
        { id: "M1", points: 1, desc: "1.1.1-1.JPG 数据正确" },
        { id: "M4", points: 1, desc: "读取数据集代码正确" },
        { id: "M5", points: 3, desc: "高风险患者判断逻辑正确" }
      ],
      code_segments: [
        { type: "given", code: "import pandas as pd\nimport numpy as np" },
        {
          type: "blank",
          template: "df = pd.read_csv(__)",
          hint: "读取 patient_data.csv",
          points: 1,
          answer: "pd.read_csv('patient_data.csv')"
        },
        { type: "given", code: "# 定义高风险患者（住院>7天）" },
        {
          type: "blank",
          template: "high_risk = df[df['DaysInHospital'] __ 7]",
          hint: "筛选住院超过7天的患者",
          points: 3,
          answer: "df[df['DaysInHospital'] > 7]"
        },
        { type: "given", code: "print(f'高风险患者: {len(high_risk)}, 占比: {len(high_risk)/len(df):.2%}')" }
      ]
    },
    // 文档题示例
    {
      id: 2,
      title: "人工智能训练师岗位职责梳理",
      category: "岗位认知",
      time_limit: "20min",
      total_score: 10,
      type: "doc",
      scenario: "结合人工智能训练师职业标准，梳理三级训练师的核心职责。",
      tasks: [
        { title: "", description: "简述人工智能训练师三级的主要工作任务（不少于3条）" },
        { title: "", description: "说明数据标注质量控制的关键要点" }
      ],
      rubric: [
        { id: "D1", points: 5, desc: "任务描述准确，涵盖数据采集、标注、模型训练等核心环节" },
        { id: "D2", points: 5, desc: "质控要点完整，包含抽样检查、双人审核、标注规范等" }
      ],
      answer_sections: [
        { id: "D1", text: "核心职责：1.训练数据的采集与处理；2.数据标注与质量审核；3.模型效果评估；4.训练策略优化；5.标注工具使用与维护。" },
        { id: "D2", text: "质量控制要点：制定标注规范→抽样检查（10%以上）→双人审核→错误回溯→定期培训标注员。" }
      ]
    }
    // ... 更多题目（格式相同）
  ];
})();
```

**datasets/ 目录下预置数据文件名**（供 Pyodide 自动预加载）：
```
patient_data.csv, sensor_data.csv, credit_data.csv, user_behavior_data.csv,
vehicle_traffic_data.csv, auto-mpg.csv, finance数据集.csv, medical_data.csv,
fitness analysis.csv, 健康咨询客户数据集.csv,
大学生低碳生活行为的影响因素数据集.xlsx, 智能音箱数据集.xlsx,
智能照明系统数据集.xlsx, 智能健康手环数据集.xlsx,
智能健康监测系统数据集.xlsx, 智能家居环境控制系统数据集.xlsx
```

---

## 文件4：`ops-page-component.js`（完整实现）

```javascript
// ops-page-component.js — 实操训练台（本地 + Pyodide 在线运行）
(function () {
  const { reactive, computed, nextTick } = Vue;

  // ─── Pyodide 全局单例 ───────────────────────────────────────
  const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  let _py = null;
  let _pyPromise = null;

  function ensurePy(onStatus) {
    if (_py) { onStatus?.('ready', 'Kernel 就绪 ✓'); return Promise.resolve(_py); }
    if (_pyPromise) return _pyPromise;

    _pyPromise = (async () => {
      onStatus?.('loading', '下载 Pyodide（首次约 30–60 秒）…');
      if (!window.loadPyodide) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = PYODIDE_CDN + 'pyodide.js';
          s.onload = res;
          s.onerror = () => rej(new Error('pyodide.js 网络加载失败'));
          document.head.appendChild(s);
        });
      }
      onStatus?.('loading', '初始化 Python 运行时…');
      const py = await window.loadPyodide({ indexURL: PYODIDE_CDN });

      onStatus?.('loading', '安装 numpy / pandas / matplotlib…');
      await py.loadPackage(['numpy', 'pandas', 'matplotlib', 'scipy']);
      try { await py.loadPackage(['scikit-learn']); } catch (_) {}
      try { await py.loadPackage(['openpyxl']); } catch (_) {}

      // 注入执行环境
      py.runPython(`
import sys, io, base64, contextlib, traceback
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt

_ns = {}
_r_out = ''
_r_err = ''
_r_figs = []

plt.show = lambda *a, **k: None

def _reset():
    global _ns, _r_out, _r_err, _r_figs
    _ns = {}; _r_out = ''; _r_err = ''; _r_figs = []
    plt.close('all')

def _collect_figs():
    imgs = []
    for n in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(n).savefig(buf, format='png', bbox_inches='tight', dpi=100)
        imgs.append(base64.b64encode(buf.getvalue()).decode())
    plt.close('all')
    return imgs

def _run(code):
    global _r_out, _r_err, _r_figs
    out_buf, err_buf = io.StringIO(), io.StringIO()
    try:
        with contextlib.redirect_stdout(out_buf), contextlib.redirect_stderr(err_buf):
            exec(compile(code, '<cell>', 'exec'), _ns)
    except Exception:
        err_buf.write(traceback.format_exc())
    _r_out = out_buf.getvalue()
    _r_err = err_buf.getvalue()
    _r_figs = _collect_figs()

import os
os.chdir('/home/pyodide')
`);

      // 预加载 datasets/ 下数据文件
      const DATASET_NAMES = [
        'patient_data.csv','sensor_data.csv','credit_data.csv',
        'user_behavior_data.csv','vehicle_traffic_data.csv','auto-mpg.csv',
        'finance数据集.csv','medical_data.csv','fitness analysis.csv',
        '健康咨询客户数据集.csv',
        '大学生低碳生活行为的影响因素数据集.xlsx','智能音箱数据集.xlsx',
        '智能照明系统数据集.xlsx','智能健康手环数据集.xlsx',
        '智能健康监测系统数据集.xlsx','智能家居环境控制系统数据集.xlsx',
      ];
      onStatus?.('loading', '预加载数据集文件…');
      await Promise.all(DATASET_NAMES.map(async name => {
        try {
          const resp = await fetch('./datasets/' + encodeURIComponent(name));
          if (!resp.ok) return;
          py.FS.writeFile('/home/pyodide/' + name, new Uint8Array(await resp.arrayBuffer()));
        } catch (_) {}
      }));

      _py = py;
      onStatus?.('ready', 'Kernel 就绪 ✓');
      return py;
    })().catch(e => {
      _pyPromise = null;
      onStatus?.('error', '加载失败：' + e.message);
      throw e;
    });
    return _pyPromise;
  }

  // ─── 组件模板 ───────────────────────────────────────────────
  window.OpsPageComponent = {
    template: `
<div class="ops-page">

  <!-- ===== 详情视图 ===== -->
  <template v-if="state.cur">
    <div class="ops-detail-bar">
      <button @click="backToList" class="btn btn-ghost ops-back-btn">← 返回列表</button>
      <div class="ops-detail-info">
        <span class="ops-type-chip" :class="state.cur.type">
          {{ state.cur.type === 'code' ? '代码题' : '文档题' }}
        </span>
        <h3 class="ops-detail-ttl">{{ state.cur.title }}</h3>
      </div>
      <span class="ops-meta-tag">{{ state.cur.category }} · {{ state.cur.time_limit }} · {{ state.cur.total_score }}分</span>
      <div v-if="state.submitResult" class="ops-submitted-badge">
        ✓ 已提交 · {{ state.submitResult.score }}/{{ state.cur.total_score }}分
      </div>
    </div>

    <div class="ops-detail-layout">
      <!-- 左：背景/任务/评分项 -->
      <aside class="ops-left-panel">
        <div class="card ops-section">
          <div class="ops-label">题目背景</div>
          <p class="ops-scenario-text">{{ state.cur.scenario }}</p>
        </div>
        <div class="card ops-section">
          <div class="ops-label">工作任务</div>
          <div v-for="(t,i) in state.cur.tasks" :key="i" class="ops-task-item">
            <b v-if="t.title">{{ t.title }}</b>
            <p class="ops-task-desc">{{ t.description || t.text || '' }}</p>
          </div>
        </div>
        <div class="card ops-section">
          <div class="ops-label">评分项</div>
          <div v-for="r in state.cur.rubric" :key="r.id" class="ops-rubric-row">
            <template v-if="state.cur.type === 'doc'">
              <label class="ops-rubric-label">
                <input type="checkbox" v-model="state.rubricChecks[r.id]"
                  :disabled="!!state.submitResult">
                <span class="ops-pts">{{ r.points }}分</span>
                <span class="ops-rubric-desc-text">{{ r.desc }}</span>
              </label>
            </template>
            <template v-else>
              <div class="ops-rubric-plain">
                <span class="ops-pts">{{ r.points }}分</span>
                <span class="ops-rubric-desc-text">{{ r.desc }}</span>
              </div>
              <div v-if="state.submitResult" class="ops-blank-score-line">
                得分：{{ state.submitResult.blankScores[r.id] || 0 }} / {{ r.points }}
              </div>
            </template>
          </div>
        </div>
      </aside>

      <!-- 右：作答区 -->
      <main class="ops-right-panel">

        <!-- Kernel 工具栏（代码题专用） -->
        <template v-if="state.cur.type === 'code'">
          <div class="ops-kernel-bar">
            <span class="ops-kernel-dot" :class="'ks-' + state.kernelStatus"></span>
            <span class="ops-kernel-msg">{{ state.kernelMsg }}</span>
            <div style="flex:1"></div>
            <label class="btn btn-sm btn-ghost ops-kbtn ops-upload-lbl" title="上传 CSV/XLSX 到 Python 环境">
              📁 上传数据文件
              <input type="file" multiple accept=".csv,.txt,.json,.xlsx,.pkl"
                style="position:absolute;opacity:0;width:0;height:0;"
                @change="onFileUpload($event)">
            </label>
            <button v-if="state.kernelStatus === 'unloaded' || state.kernelStatus === 'error'"
              class="btn btn-sm ops-kbtn" @click="initKernel">⚡ 启动 Kernel</button>
            <template v-else>
              <button class="btn btn-sm ops-kbtn"
                :disabled="state.kernelStatus !== 'ready'"
                @click="runAll">▶▶ 全部运行</button>
              <button class="btn btn-sm btn-ghost ops-kbtn"
                :disabled="state.kernelStatus === 'loading'"
                @click="restartKernel">↻ 重置</button>
            </template>
          </div>
          <div v-if="state.uploadedFiles.length" class="ops-uploaded-bar">
            <span class="ops-uploaded-label">📂 已上传：</span>
            <span v-for="f in state.uploadedFiles" :key="f" class="ops-uploaded-chip">{{ f }}</span>
          </div>
        </template>

        <!-- 代码题：Cell 组 -->
        <template v-if="state.cur.type === 'code'">
          <div v-for="(group, gi) in cellGroups" :key="gi" class="ops-cell-group">
            <template v-for="(seg, si) in group.segments" :key="si">
              <pre v-if="seg.type === 'given'" class="ops-code-given">{{ seg.code }}</pre>
              <div v-else class="card ops-blank-card">
                <div class="ops-blank-hd">
                  <span class="ops-blank-tag">填空 {{ seg.blankIndex + 1 }}</span>
                  <span class="ops-blank-hint-text">{{ seg.hint }}</span>
                  <span class="ops-pts" style="margin-left:auto">{{ seg.points }}分</span>
                </div>
                <!-- 内联填空：模板文本 + input 框 -->
                <div class="ops-inline-code-block">
                  <template v-for="(part, pi) in parseTemplate(seg.template)" :key="pi">
                    <span v-if="part.type === 'text'" class="ops-tpl-text">{{ part.val }}</span>
                    <input v-else type="text" class="ops-inline-input"
                      :disabled="!!state.submitResult"
                      :value="state.answers['b' + seg.blankIndex + '_' + part.subIdx] || ''"
                      :size="Math.max(8, (state.answers['b' + seg.blankIndex + '_' + part.subIdx] || '').length + 2)"
                      @input="onSubInput(seg.blankIndex, part.subIdx, $event.target.value)"
                    >
                  </template>
                </div>
                <div v-if="state.showAnswer && seg.answer" class="ops-ref-box">
                  <div class="ops-ref-label">参考答案</div>
                  <pre class="ops-ref-code">{{ seg.answer }}</pre>
                </div>
                <div v-if="state.submitResult" class="ops-blank-score-line">
                  本空得分：<b>{{ state.submitResult.blankScores['b' + seg.blankIndex] || 0 }}</b>
                  / {{ seg.points }}
                </div>
              </div>
            </template>

            <!-- 运行按钮 -->
            <div class="ops-cell-run-row">
              <button class="ops-run-btn"
                :class="{ running: state.runningCell === gi, 'kl-waiting': state.kernelStatus === 'loading' }"
                :disabled="state.runningCell !== -1"
                @click="runUpTo(gi)">
                <span v-if="state.runningCell === gi">⏳ 运行中…</span>
                <span v-else>▶ 运行至此</span>
              </button>
              <span v-if="state.cellOutputs[gi]" class="ops-run-ok">
                {{ state.cellOutputs[gi].stderr ? '⚠ 有错误' : (state.cellOutputs[gi].msg ? '' : '✓ 已运行') }}
              </span>
            </div>

            <!-- 输出区 -->
            <div v-if="state.cellOutputs[gi]" class="ops-cell-output">
              <div v-if="state.cellOutputs[gi].msg" class="ops-out-msg">{{ state.cellOutputs[gi].msg }}</div>
              <pre v-if="state.cellOutputs[gi].stdout" class="ops-out-stdout">{{ state.cellOutputs[gi].stdout }}</pre>
              <pre v-if="state.cellOutputs[gi].stderr" class="ops-out-stderr">{{ state.cellOutputs[gi].stderr }}</pre>
              <div v-for="(img,ii) in (state.cellOutputs[gi].images||[])" :key="ii" class="ops-out-img-wrap">
                <img :src="'data:image/png;base64,'+img" class="ops-out-img" alt="plot">
              </div>
              <div v-if="!state.cellOutputs[gi].msg && !state.cellOutputs[gi].stdout
                && !state.cellOutputs[gi].stderr && !(state.cellOutputs[gi].images||[]).length"
                class="ops-out-empty">（无输出）</div>
            </div>
          </div>
        </template>

        <!-- 文档题：每个评分项一个 textarea -->
        <template v-else>
          <div v-for="r in state.cur.rubric" :key="r.id" class="card ops-doc-card">
            <div class="ops-blank-hd">
              <span class="ops-blank-tag">{{ r.id }}</span>
              <span class="ops-blank-hint-text">{{ r.desc }}</span>
              <span class="ops-pts" style="margin-left:auto">{{ r.points }}分</span>
            </div>
            <textarea class="ops-textarea" rows="5" placeholder="请在此作答…"
              :disabled="!!state.submitResult"
              :value="state.answers[r.id] || ''"
              @input="onInput(r.id, $event.target.value)"></textarea>
            <div v-if="state.showAnswer && getRefAnswer(r.id)" class="ops-ref-box">
              <div class="ops-ref-label">参考答案</div>
              <p class="ops-ref-text">{{ getRefAnswer(r.id) }}</p>
            </div>
          </div>
        </template>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <template v-if="!state.submitResult">
            <button @click="doSubmit" class="btn btn-primary">提交答案</button>
            <button @click="state.showAnswer = !state.showAnswer" class="btn btn-ghost">
              {{ state.showAnswer ? '隐藏参考答案' : '查看参考答案' }}
            </button>
          </template>
          <template v-else>
            <div class="ops-final-score">最终得分：<b>{{ state.submitResult.score }}</b> / {{ state.cur.total_score }} 分</div>
            <button @click="state.showAnswer = !state.showAnswer" class="btn btn-ghost">
              {{ state.showAnswer ? '隐藏参考答案' : '查看参考答案' }}
            </button>
            <button @click="doReset" class="btn btn-ghost ops-reset-btn">重新作答</button>
          </template>
        </div>
      </main>
    </div>
  </template>

  <!-- ===== 列表视图 ===== -->
  <template v-else>
    <div class="card ops-list-hd">
      <div>
        <div class="ops-label">操作实训</div>
        <h2 style="margin:4px 0 2px">实操训练台</h2>
        <p class="ops-list-sub">代码题：填写代码空格并在线运行（Pyodide）；文档题：逐项作答并自评。</p>
      </div>
      <div class="ops-filter">
        <button v-for="cat in allCategories" :key="cat"
          class="ops-chip" :class="{on: state.catFilter === cat}"
          @click="state.catFilter = cat">{{ cat === 'all' ? '全部分类' : cat }}</button>
        <span class="ops-divider">|</span>
        <button v-for="t in typeOpts" :key="t.v"
          class="ops-chip" :class="{on: state.typeFilter === t.v}"
          @click="state.typeFilter = t.v">{{ t.l }}</button>
      </div>
    </div>
    <p v-if="filteredOps.length === 0" class="ops-hint">没有符合条件的题目。</p>
    <div class="ops-grid">
      <div v-for="op in filteredOps" :key="op.id" class="ops-card" tabindex="0"
        @click="openOp(op)" @keydown.enter="openOp(op)">
        <div class="ops-card-hd">
          <span class="ops-card-no">#{{ op.id }}</span>
          <span class="ops-type-chip" :class="op.type">{{ op.type === 'code' ? '代码题' : '文档题' }}</span>
          <span class="ops-card-cat">{{ op.category }}</span>
          <span class="ops-card-meta">{{ op.time_limit }} · {{ op.total_score }}分</span>
          <span v-if="cardStatus(op.id) === 'done'" class="ops-status-done">✓ 已完成</span>
          <span v-else-if="cardStatus(op.id) === 'draft'" class="ops-status-draft">⏳ 进行中</span>
        </div>
        <div class="ops-card-title">{{ op.title }}</div>
        <p class="ops-card-desc">{{ (op.scenario||'').slice(0,130) }}{{ (op.scenario||'').length>130?'…':'' }}</p>
      </div>
    </div>
  </template>

</div>
    `,

    setup() {
      const LS = 'bk-ops-';
      const allOps = window.OPS_DATA || [];

      function lsRead(key, def) {
        try { return JSON.parse(localStorage.getItem(LS + key) || 'null') ?? def; }
        catch { return def; }
      }
      function lsWrite(key, val) { localStorage.setItem(LS + key, JSON.stringify(val)); }
      function lsDel(key) { localStorage.removeItem(LS + key); }

      const state = reactive({
        catFilter: 'all', typeFilter: 'all',
        cur: null, answers: {}, submitResult: null,
        rubricChecks: {}, showAnswer: false,
        kernelStatus: 'unloaded',  // unloaded|loading|ready|busy|error
        kernelMsg: '点击"启动 Kernel"使用在线运行功能',
        cellOutputs: [],
        runningCell: -1,
        uploadedFiles: [],
      });

      const typeOpts = [
        { v: 'all', l: '全部题型' },
        { v: 'code', l: '代码题' },
        { v: 'doc', l: '文档题' },
      ];

      const allCategories = computed(() => {
        const s = new Set(allOps.map(q => q.category));
        return ['all', ...s];
      });

      const filteredOps = computed(() =>
        allOps.filter(op =>
          (state.catFilter === 'all' || op.category === state.catFilter) &&
          (state.typeFilter === 'all' || op.type === state.typeFilter)
        )
      );

      // 扁平化 code_segments，给每个 blank 加 blankIndex
      const codeSegments = computed(() => {
        if (!state.cur || state.cur.type !== 'code') return [];
        let bi = 0;
        return (state.cur.code_segments || []).map(s =>
          s.type === 'blank' ? { ...s, blankIndex: bi++ } : s
        );
      });

      // 按 blank 分组：每组以一个 blank 结尾（最后组可以只有 given）
      const cellGroups = computed(() => {
        if (!state.cur || state.cur.type !== 'code') return [];
        const groups = [];
        let buf = [], blankIdx = 0;
        for (const seg of (state.cur.code_segments || [])) {
          if (seg.type === 'given') {
            buf.push({ ...seg });
          } else {
            buf.push({ ...seg, blankIndex: blankIdx++ });
            groups.push({ segments: [...buf], groupIdx: groups.length });
            buf = [];
          }
        }
        if (buf.length) groups.push({ segments: [...buf], groupIdx: groups.length });
        return groups;
      });

      function cardStatus(id) {
        if (lsRead('submit-' + id, null)) return 'done';
        const d = lsRead('draft-' + id, {});
        return Object.values(d).some(v => v) ? 'draft' : 'none';
      }

      function openOp(op) {
        state.cur = op;
        state.answers = lsRead('draft-' + op.id, {});
        state.submitResult = lsRead('submit-' + op.id, null);
        state.rubricChecks = state.submitResult ? { ...(state.submitResult.rubricChecks || {}) } : {};
        state.showAnswer = !!state.submitResult;
        state.cellOutputs = [];
        if (_py) { try { _py.runPython('_reset()'); } catch (_) {} }
        if (op.type === 'code' && (state.kernelStatus === 'unloaded' || state.kernelStatus === 'error')) {
          initKernel();
        }
      }

      function backToList() {
        state.cur = null; state.answers = {};
        state.submitResult = null; state.rubricChecks = {};
        state.showAnswer = false; state.cellOutputs = [];
      }

      function onInput(key, val) {
        state.answers[key] = val;
        lsWrite('draft-' + state.cur.id, state.answers);
      }

      // 子空输入（内联填空）
      function onSubInput(blankIndex, subIdx, val) {
        state.answers[`b${blankIndex}_${subIdx}`] = val;
        lsWrite('draft-' + state.cur.id, state.answers);
      }

      // 把 template 字符串按 /_{2,}/ 分割成 [{type:'text',val},{type:'blank',subIdx}...]
      function parseTemplate(template) {
        if (!template) return [{ type: 'text', val: '# 在此填写代码…' }];
        const parts = template.split(/_{2,}/);
        const result = [];
        parts.forEach((text, i) => {
          if (i > 0) result.push({ type: 'blank', subIdx: i - 1 });
          result.push({ type: 'text', val: text });
        });
        return result;
      }

      // 将各子空答案拼回完整代码行
      function reconstructCode(blankIndex, template) {
        if (!template) return state.answers['b' + blankIndex] || '';
        const parts = template.split(/_{2,}/);
        return parts.map((text, i) => {
          if (i === 0) return text;
          return (state.answers[`b${blankIndex}_${i - 1}`] || '') + text;
        }).join('');
      }

      function getRefAnswer(rubricId) {
        return (state.cur?.answer_sections || []).find(a => a.id === rubricId)?.text || '';
      }

      // Token 级相似度（用于代码空自动评分）
      function codeSim(user, ref) {
        if (!user || !user.trim()) return 0;
        const tokens = s => (s.replace(/\s+/g, ' ').toLowerCase().match(/\w+/g) || []);
        const ut = new Set(tokens(user));
        const rt = tokens(ref);
        if (!rt.length) return 0;
        return rt.filter(t => ut.has(t)).length / rt.length;
      }

      function doSubmit() {
        if (!confirm('确认提交？提交后不能修改答案。')) return;
        const op = state.cur;
        let score = 0;
        const blankScores = {};

        if (op.type === 'code') {
          const blanks = codeSegments.value.filter(s => s.type === 'blank');
          blanks.forEach((b, idx) => {
            const userCode = reconstructCode(b.blankIndex, b.template);
            const sim = codeSim(userCode, b.answer || '');
            // ≥0.7 满分；0.4~0.7 半分；<0.4 零分
            const pts = sim >= 0.7 ? b.points : sim >= 0.4 ? Math.round(b.points * 0.5) : 0;
            blankScores['b' + b.blankIndex] = pts;
            if (op.rubric[idx]) blankScores[op.rubric[idx].id] = pts;
            score += pts;
          });
        } else {
          op.rubric.forEach(r => {
            if (state.rubricChecks[r.id]) score += r.points || 0;
          });
        }

        const result = { score, answers: { ...state.answers }, rubricChecks: { ...state.rubricChecks }, blankScores };
        lsWrite('submit-' + op.id, result);
        state.submitResult = result;
        state.showAnswer = true;
      }

      function doReset() {
        if (!confirm('确认重新作答？这将清除本题的提交记录和草稿。')) return;
        lsDel('submit-' + state.cur.id);
        lsDel('draft-' + state.cur.id);
        state.answers = {}; state.submitResult = null;
        state.rubricChecks = {}; state.showAnswer = false;
        state.cellOutputs = [];
        if (_py) { try { _py.runPython('_reset()'); } catch (_) {} }
      }

      // 上传文件到 Pyodide FS
      async function onFileUpload(event) {
        const files = Array.from(event.target.files);
        event.target.value = '';
        if (!files.length) return;
        if (state.kernelStatus === 'unloaded' || state.kernelStatus === 'error') initKernel();
        state.kernelMsg = '文件写入中，等待 Kernel 就绪…';
        try {
          const py = await ensurePy((s, msg) => { state.kernelStatus = s; state.kernelMsg = msg || ''; });
          for (const file of files) {
            py.FS.writeFile('/home/pyodide/' + file.name, new Uint8Array(await file.arrayBuffer()));
            if (!state.uploadedFiles.includes(file.name)) state.uploadedFiles.push(file.name);
          }
          state.kernelMsg = `Kernel 就绪 ✓ · 已上传 ${state.uploadedFiles.length} 个文件`;
        } catch (e) { state.kernelMsg = '文件上传失败：' + e.message; }
      }

      // ── Kernel 控制 ──────────────────────────────────────────
      function initKernel() {
        if (state.kernelStatus === 'ready' || state.kernelStatus === 'loading') return;
        state.kernelStatus = 'loading';
        state.kernelMsg = '初始化中…';
        ensurePy((s, msg) => { state.kernelStatus = s; state.kernelMsg = msg || ''; }).catch(() => {});
      }

      async function runUpTo(groupIdx) {
        if (state.runningCell !== -1) return;

        // Kernel 未就绪时给出提示，不阻塞按钮
        if (state.kernelStatus !== 'ready') {
          if (state.kernelStatus === 'unloaded' || state.kernelStatus === 'error') initKernel();
          const waitMsg = state.kernelStatus === 'loading'
            ? 'Kernel 加载中（首次约 30–60 秒），加载完成后请再次点击 ▶'
            : 'Kernel 启动中，请稍后再点击 ▶ 运行';
          state.cellOutputs.splice(groupIdx, 1, { stdout: '', stderr: '', images: [], msg: waitMsg });
          return;
        }

        state.kernelStatus = 'busy';
        state.runningCell = groupIdx;
        try {
          _py.runPython('_reset()');
          const gs = cellGroups.value;
          const limit = Math.min(groupIdx, gs.length - 1);
          for (let i = 0; i <= limit; i++) {
            let code = '';
            for (const seg of gs[i].segments) {
              code += seg.type === 'given'
                ? (seg.code || '') + '\n'
                : reconstructCode(seg.blankIndex, seg.template) + '\n';
            }
            // 用 globals.set 传字符串，避免字符串注入
            _py.globals.set('__cc__', code);
            _py.runPython('_run(__cc__)');

            const stdout = _py.globals.get('_r_out') || '';
            const stderr = _py.globals.get('_r_err') || '';
            const figProxy = _py.globals.get('_r_figs');
            let images = [];
            if (figProxy) {
              try {
                const arr = figProxy.toJs ? figProxy.toJs() : [];
                images = arr ? Array.from(arr) : [];
                if (figProxy.destroy) figProxy.destroy();
              } catch (_) {}
            }
            state.cellOutputs.splice(i, 1, { stdout, stderr, images, msg: '' });
            await nextTick();
          }
        } catch (e) {
          state.cellOutputs.splice(groupIdx, 1, { stdout: '', stderr: String(e), images: [], msg: '' });
        } finally {
          state.kernelStatus = 'ready';
          state.runningCell = -1;
        }
      }

      async function runAll() {
        const n = cellGroups.value.length;
        if (n > 0) await runUpTo(n - 1);
      }

      function restartKernel() {
        try { if (_py) _py.runPython('_reset()'); } catch (_) {}
        state.cellOutputs = [];
        state.runningCell = -1;
        if (state.kernelStatus === 'ready') state.kernelMsg = 'Kernel 已重置 ✓';
      }

      return {
        state, typeOpts, allCategories, filteredOps,
        codeSegments, cellGroups,
        cardStatus, openOp, backToList, onInput, onSubInput,
        parseTemplate, reconstructCode,
        getRefAnswer, doSubmit, doReset,
        initKernel, runUpTo, runAll, restartKernel, onFileUpload,
      };
    }
  };
})();
```

---

## 文件5：`app-vue.js`（完整主应用）

> 按顺序实现以下内容。用 Vue 3 CDN global build（`const { createApp, ref, reactive, computed, onMounted, onUnmounted } = Vue;`）。

### 5.1 存储与认证

```javascript
const { createApp, ref, reactive, computed, onMounted, onUnmounted } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

const STORAGE_USERS    = "bk-users";
const STORAGE_ACTIVE   = "bk-active-user";
const STORAGE_PRACTICE = "bk-practice-record";
const STORAGE_EXAMS    = "bk-exam-history";

function storageRead(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function storageWrite(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function ensureDefaultUser() {
  const users = storageRead(STORAGE_USERS, []);
  if (!users.length) {
    const seeded = [{ username: "wanhuw", displayName: "wanhuw", password: "12345678" }];
    storageWrite(STORAGE_USERS, seeded);
    return seeded;
  }
  return users;
}

const auth = reactive({
  user: storageRead(STORAGE_ACTIVE, null),
  isAuthenticated() { return !!this.user; },
  login(user) {
    this.user = { username: user.username, displayName: user.displayName };
    storageWrite(STORAGE_ACTIVE, this.user);
  },
  logout() { this.user = null; localStorage.removeItem(STORAGE_ACTIVE); }
});
```

### 5.2 题库初始化

```javascript
function initializeQuestionTree() {
  // 优先使用 questions-data.js 提供的大题库
  if (window.QUESTIONS_DATA && Array.isArray(window.QUESTIONS_DATA) && window.QUESTIONS_DATA.length > 0) {
    return window.QUESTIONS_DATA;
  }
  // Fallback: 内置少量示例题
  return [
    {
      id: 1, title: "人工智能基础",
      kps: [
        {
          id: 101, title: "机器学习概念",
          questions: [
            { id: 1001, type: "single", text: "监督学习的特征是什么？",
              options: [
                { label: "A", text: "使用带标签的训练数据" },
                { label: "B", text: "不需要训练数据" },
                { label: "C", text: "只使用无标签数据" },
                { label: "D", text: "只用于分类任务" }
              ], answer: ["A"] }
          ]
        }
      ]
    }
  ];
}
const QUESTION_TREE = initializeQuestionTree();

function allQuestions() {
  const list = [];
  QUESTION_TREE.forEach(section => {
    section.kps.forEach(kp => {
      kp.questions.forEach(q => {
        list.push({
          ...q,
          sectionId: q.sectionId || section.id,
          sectionTitle: q.sectionTitle || section.title,
          kpId: q.kpId || kp.id,
          kpTitle: q.kpTitle || kp.title
        });
      });
    });
  });
  return list;
}
```

### 5.3 全局状态

```javascript
const globalState = reactive({
  practiceState: { currentKp: "all", filterType: "", onlyWrong: false },
  getPracticeRecord() {
    const all = storageRead(STORAGE_PRACTICE, {});
    return all[auth.user?.username] || {};
  },
  savePracticeRecord(record) {
    const all = storageRead(STORAGE_PRACTICE, {});
    all[auth.user?.username] = record;
    storageWrite(STORAGE_PRACTICE, all);
  },
  getExamHistory() { return (storageRead(STORAGE_EXAMS, {}))[auth.user?.username] || []; },
  saveExamHistory(history) {
    const all = storageRead(STORAGE_EXAMS, {});
    all[auth.user?.username] = history;
    storageWrite(STORAGE_EXAMS, all);
  }
});

function normalizeAnswer(list) { return list.slice().sort().join(","); }
function escapeHtml(text) {
  return String(text||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");
}
function typeLabel(type) { return type==="single"?"单选":type==="multi"?"多选":"判断"; }
function formatSec(sec) {
  return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");
}
```

### 5.4 LoginPage 组件

模板包含：品牌头部、登录/注册切换表单、公众号二维码（`./qrcode_for_gh_af85ddd1357b_258.jpg`）

```javascript
const LoginPage = {
  template: `
    <div class="login-panel">
      <header class="brand-block">
        <h1>人工智能训练师三级 备考通</h1>
        <p>人工智能训练师三级备考</p>
      </header>
      <div class="card">
        <p class="notice" :style="{color: noticeError ? '#dc2626' : '#16a34a'}">{{ notice }}</p>
        <form v-if="mode === 'login'" @submit.prevent="handleLogin">
          <label class="field"><span>用户名</span>
            <input v-model="form.username" type="text" autocomplete="username" required></label>
          <label class="field"><span>密码</span>
            <input v-model="form.password" type="password" autocomplete="current-password" required></label>
          <button type="submit" class="btn btn-primary" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
          <p class="switch-text">没有账号？<a @click.prevent="mode='register'" href="#">注册</a></p>
        </form>
        <form v-else @submit.prevent="handleRegister">
          <label class="field"><span>用户名</span><input v-model="form.username" type="text" required></label>
          <label class="field"><span>昵称</span><input v-model="form.displayName" type="text" required></label>
          <label class="field"><span>密码</span><input v-model="form.password" type="password" required></label>
          <label class="field"><span>确认密码</span><input v-model="form.confirmPassword" type="password" required></label>
          <button type="submit" class="btn btn-primary" :disabled="loading">{{ loading ? '注册中...' : '注册' }}</button>
          <p class="switch-text">已有账号？<a @click.prevent="mode='login'" href="#">登录</a></p>
        </form>
      </div>
      <aside class="wechat-card">
        <p>扫码关注公众号，获取更多备考资源</p>
        <img src="./qrcode_for_gh_af85ddd1357b_258.jpg" alt="公众号二维码" width="120" height="120">
        <small>作者不易，感谢支持</small>
      </aside>
    </div>
  `,
  setup() {
    const mode = ref('login');
    const loading = ref(false);
    const notice = ref('');
    const noticeError = ref(false);
    const form = ref({ username: '', displayName: '', password: '', confirmPassword: '' });
    const router = VueRouter.useRouter();

    const handleLogin = async () => {
      if (!form.value.username || !form.value.password) {
        notice.value = '请输入用户名和密码'; noticeError.value = true; return;
      }
      loading.value = true;
      const user = ensureDefaultUser().find(u =>
        u.username === form.value.username && u.password === form.value.password
      );
      if (!user) { notice.value = '用户名或密码不正确'; noticeError.value = true; loading.value = false; return; }
      auth.login(user); router.push('/dashboard'); loading.value = false;
    };

    const handleRegister = async () => {
      const { username, displayName, password, confirmPassword } = form.value;
      if (!username.trim() || !displayName.trim() || !password || !confirmPassword) {
        notice.value = '请完整填写注册信息'; noticeError.value = true; return;
      }
      if (!/^[a-zA-Z0-9_]{4,20}$/.test(username.trim())) {
        notice.value = '用户名需为 4-20 位字母、数字或下划线'; noticeError.value = true; return;
      }
      if (password.length < 8) { notice.value = '密码至少 8 位'; noticeError.value = true; return; }
      if (password !== confirmPassword) { notice.value = '两次输入密码不一致'; noticeError.value = true; return; }
      const users = ensureDefaultUser();
      if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
        notice.value = '用户名已存在'; noticeError.value = true; return;
      }
      const newUser = { username: username.trim(), displayName: displayName.trim(), password };
      users.push(newUser);
      storageWrite(STORAGE_USERS, users);
      auth.login(newUser);
      notice.value = '注册成功，已自动登录'; noticeError.value = false;
      router.push('/dashboard');
    };

    return { mode, loading, notice, noticeError, form, handleLogin, handleRegister };
  }
};
```

### 5.5 AppShell 组件

```javascript
const AppShell = {
  template: `
    <div class="exam-app">
      <header class="app-header">
        <div>
          <h2>人工智能训练师三级 · 模拟考试</h2>
          <p>含理论练习、计时考试、成绩记录</p>
        </div>
        <div class="header-actions">
          <span class="user-badge">{{ auth.user.displayName || auth.user.username }}</span>
          <button @click="handleLogout" class="btn btn-ghost">退出登录</button>
        </div>
      </header>
      <nav class="app-tabs">
        <button v-for="tab in tabs" :key="tab"
          @click="$router.push('/dashboard/' + tab)"
          :class="{active: activeTab === tab}" class="tab-btn">
          {{ tabLabel(tab) }}
        </button>
      </nav>
      <router-view></router-view>
    </div>
  `,
  setup() {
    const router = VueRouter.useRouter();
    const route  = VueRouter.useRoute();
    const tabs = ['practice', 'exam', 'history', 'ops'];
    const activeTab = computed(() => {
      const seg = route.path.split('/').pop();
      return tabs.includes(seg) ? seg : tabs[0];
    });
    const tabLabel = t => ({ practice:'理论练习', exam:'模拟考试', history:'成绩记录', ops:'实操训练' }[t]);
    const handleLogout = () => { auth.logout(); router.push('/'); };
    return { auth, activeTab, tabs, tabLabel, handleLogout };
  }
};
```

### 5.6 PracticePage 组件

知识点侧栏 + 题型筛选 + 统计行 + 题目列表。核心 setup：
```javascript
const state = globalState.practiceState;
const record = ref(globalState.getPracticeRecord());
const picked = ref({}); const answered = ref({});
// filteredList 按 currentKp / filterType / onlyWrong 三重过滤
// toggleOption: 单选替换，多选 splice/push
// submitAnswer: normalizeAnswer 比对，写入 record，lsWrite，标记 answered
// stats: computed，遍历 record 统计 total/correct/wrong
```

### 5.7 ExamPage 组件

抽题规则：`extractN(judgeQs, 40) + extractN(singleQs, 140) + extractN(multiQs, 10)`，抽完后 Fisher-Yates 随机。

```javascript
// 计时：90*60 秒，setInterval 每秒更新 leftSec，leftSec≤0 自动交卷
// 得分：Math.round(correct / total * 100)，60分及格
// 成绩记录：{ at, total, correct, score, usedSec, autoSubmit, wrongList, passed }
// onUnmounted：clearInterval(timerId)
```

### 5.8 HistoryPage 组件

```javascript
const HistoryPage = {
  template: `
    <section class="panel">
      <p v-if="!history.length" class="muted">暂无考试记录，先去"模拟考试"开始一次考试。</p>
      <table v-else class="history-table">
        <thead><tr><th>时间</th><th>得分</th><th>正确题数</th><th>用时</th><th>备注</th></tr></thead>
        <tbody>
          <tr v-for="(item,idx) in history" :key="idx">
            <td>{{ new Date(item.at).toLocaleString('zh-CN') }}</td>
            <td>{{ item.score }}</td>
            <td>{{ item.correct }}/{{ item.total }}</td>
            <td>{{ formatSec(item.usedSec) }}</td>
            <td>{{ item.autoSubmit ? '自动交卷' : '手动交卷' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
  setup() { return { history: ref(globalState.getExamHistory()), formatSec }; }
};
```

### 5.9 路由与挂载

```javascript
const OpsPage = window.OpsPageComponent || { template: '<div class="panel"><p>实操组件未加载</p></div>' };

const routes = [
  { path: '/', component: LoginPage },
  {
    path: '/dashboard', component: AppShell,
    redirect: '/dashboard/practice',
    children: [
      { path: 'practice', component: PracticePage },
      { path: 'exam',     component: ExamPage },
      { path: 'history',  component: HistoryPage },
      { path: 'ops',      component: OpsPage }
    ]
  }
];

const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to, from, next) => {
  if (to.path !== '/' && !auth.isAuthenticated()) next('/');
  else if (to.path === '/' && auth.isAuthenticated()) next('/dashboard');
  else next();
});

createApp({ template: '<router-view></router-view>' })
  .use(router)
  .mount('#app');
```

---

## 启动与访问

```bash
cd ai_training_like
python -m http.server 8010
# 本机：http://localhost:8010/index-vue.html
# 局域网：http://<本机IP>:8010/index-vue.html
```

默认账号：`wanhuw` / `12345678`

---

## 关键注意事项（给 AI 生成时）

1. **Pyodide 首次加载 30–60 秒**，需要网络访问 jsdelivr CDN
2. **运行按钮禁用条件**：`state.runningCell !== -1`（不是 `kernelStatus !== 'ready'`），点击时 Kernel 未就绪则显示等待提示并触发初始化
3. **Vue 3 数组响应式**：必须用 `array.splice(i, 1, val)` 而非 `array[i] = val`
4. **代码注入防护**：运行时用 `_py.globals.set('__cc__', code)` 再 `_run(__cc__)` 传字符串，避免直接拼接
5. **内联填空格式**：`template` 字段中用两个以上下划线 `__` 标记填空位，`parseTemplate` 按 `/_{2,}/` 分割
6. **自动评分阈值**：token 相似度 ≥0.7 满分，0.4~0.7 半分，<0.4 零分
7. **localStorage key 前缀**：理论相关用 `bk-`；实操草稿 `bk-ops-draft-{id}`；实操提交 `bk-ops-submit-{id}`
8. **不能直接双击打开**：ES Module 需要 HTTP 服务器
