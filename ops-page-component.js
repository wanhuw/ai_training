// 实操训练台组件（本地 + Pyodide 在线运行）
(function () {
  const { reactive, computed, nextTick } = Vue;

  // ─── Pyodide 全局单例 ─────────────────────────────────────
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
          s.onerror = () => rej(new Error('pyodide.js 网络加载失败，请检查网络'));
          document.head.appendChild(s);
        });
      }
      onStatus?.('loading', '初始化 Python 运行时…');
      const py = await window.loadPyodide({ indexURL: PYODIDE_CDN });

      onStatus?.('loading', '安装 numpy / pandas / matplotlib…');
      await py.loadPackage(['numpy', 'pandas', 'matplotlib', 'scipy']);

      try {
        onStatus?.('loading', '安装 scikit-learn…');
        await py.loadPackage(['scikit-learn']);
      } catch (_) { /* optional */ }

      try {
        onStatus?.('loading', '安装 openpyxl（xlsx 支持）…');
        await py.loadPackage(['openpyxl']);
      } catch (_) { /* optional */ }

      // 初始化执行环境
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

      // 预加载 datasets/ 目录下的所有数据文件到 Pyodide 虚拟 FS
      const CSV_NAMES = [
        // CSV
        'patient_data.csv',
        'sensor_data.csv',
        'credit_data.csv',
        'user_behavior_data.csv',
        'vehicle_traffic_data.csv',
        'auto-mpg.csv',
        'finance数据集.csv',
        'medical_data.csv',
        'fitness analysis.csv',
        '健康咨询客户数据集.csv',
        // XLSX
        '大学生低碳生活行为的影响因素数据集.xlsx',
        '智能音箱数据集.xlsx',
        '智能照明系统数据集.xlsx',
        '智能健康手环数据集.xlsx',
        '智能健康监测系统数据集.xlsx',
        '智能家居环境控制系统数据集.xlsx',
      ];
      onStatus?.('loading', '预加载数据集文件…');
      await Promise.all(CSV_NAMES.map(async name => {
        try {
          const url = './datasets/' + encodeURIComponent(name);
          const resp = await fetch(url);
          if (!resp.ok) return; // 文件不存在则静默跳过
          const buf = await resp.arrayBuffer();
          py.FS.writeFile('/home/pyodide/' + name, new Uint8Array(buf));
        } catch (_) { /* 网络问题静默忽略 */ }
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

  window.OpsPageComponent = {
    template: `
    <div class="ops-page">

      <!-- ===== Detail view ===== -->
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
          <!-- Left: question info + rubric -->
          <aside class="ops-left-panel">
            <div class="card ops-section">
              <div class="ops-label">题目背景</div>
              <p class="ops-scenario-text">{{ state.cur.scenario }}</p>
            </div>
            <div class="card ops-section">
              <div class="ops-label">工作任务</div>
              <div v-for="(t, i) in state.cur.tasks" :key="i" class="ops-task-item">
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
                </template>
              </div>
            </div>
          </aside>

          <!-- Right: answer area -->
          <main class="ops-right-panel">

            <!-- Kernel toolbar（代码题专用） -->
            <template v-if="state.cur.type === 'code'">
              <div class="ops-kernel-bar">
                <span class="ops-kernel-dot" :class="'ks-' + state.kernelStatus"></span>
                <span class="ops-kernel-msg">{{ state.kernelMsg }}</span>
                <div style="flex:1"></div>
                <!-- 上传数据文件（始终可见） -->
                <label class="btn btn-sm btn-ghost ops-kbtn ops-upload-lbl" title="将 CSV/数据文件上传到 Python 运行环境">
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
              <!-- 已上传文件列表 -->
              <div v-if="state.uploadedFiles.length" class="ops-uploaded-bar">
                <span class="ops-uploaded-label">📂 已上传：</span>
                <span v-for="f in state.uploadedFiles" :key="f" class="ops-uploaded-chip">{{ f }}</span>
              </div>
            </template>

            <!-- Code question: cell groups -->
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
                    <!-- Inline fill-in-the-blank: template text + input boxes -->
                    <div class="ops-inline-code-block">
                      <template v-for="(part, pi) in parseTemplate(seg.template)" :key="pi">
                        <span v-if="part.type === 'text'" class="ops-tpl-text">{{ part.val }}</span>
                        <input v-else
                          type="text"
                          class="ops-inline-input"
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

                <!-- Run button row -->
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

                <!-- Cell output -->
                <div v-if="state.cellOutputs[gi]" class="ops-cell-output">
                  <div v-if="state.cellOutputs[gi].msg" class="ops-out-msg">{{ state.cellOutputs[gi].msg }}</div>
                  <pre v-if="state.cellOutputs[gi].stdout" class="ops-out-stdout">{{ state.cellOutputs[gi].stdout }}</pre>
                  <pre v-if="state.cellOutputs[gi].stderr" class="ops-out-stderr">{{ state.cellOutputs[gi].stderr }}</pre>
                  <div v-for="(img, ii) in (state.cellOutputs[gi].images || [])" :key="ii" class="ops-out-img-wrap">
                    <img :src="'data:image/png;base64,' + img" class="ops-out-img" alt="plot">
                  </div>
                  <div v-if="!state.cellOutputs[gi].msg && !state.cellOutputs[gi].stdout && !state.cellOutputs[gi].stderr && !(state.cellOutputs[gi].images || []).length"
                    class="ops-out-empty">（无输出）</div>
                </div>
              </div>
            </template>

            <!-- Doc question: textarea per rubric item -->
            <template v-else>
              <div v-for="r in state.cur.rubric" :key="r.id" class="card ops-doc-card">
                <div class="ops-blank-hd">
                  <span class="ops-blank-tag">{{ r.id }}</span>
                  <span class="ops-blank-hint-text">{{ r.desc }}</span>
                  <span class="ops-pts" style="margin-left:auto">{{ r.points }}分</span>
                </div>
                <textarea
                  class="ops-textarea" rows="5"
                  placeholder="请在此作答…"
                  :disabled="!!state.submitResult"
                  :value="state.answers[r.id] || ''"
                  @input="onInput(r.id, $event.target.value)"
                ></textarea>
                <div v-if="state.showAnswer && getRefAnswer(r.id)" class="ops-ref-box">
                  <div class="ops-ref-label">参考答案</div>
                  <p class="ops-ref-text">{{ getRefAnswer(r.id) }}</p>
                </div>
              </div>
            </template>

            <!-- Action bar -->
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

      <!-- ===== List view ===== -->
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
          <div v-for="op in filteredOps" :key="op.id"
            class="ops-card" tabindex="0"
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
        // Kernel state
        kernelStatus: 'unloaded',  // unloaded|loading|ready|busy|error
        kernelMsg: '点击"启动 Kernel"使用在线运行功能',
        cellOutputs: [],
        runningCell: -1,
        uploadedFiles: [],   // 已写入 Pyodide FS 的文件名列表
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

      // 扁平 code segments（用于提交评分逻辑）
      const codeSegments = computed(() => {
        if (!state.cur || state.cur.type !== 'code') return [];
        let bi = 0;
        return (state.cur.code_segments || []).map(s =>
          s.type === 'blank' ? { ...s, blankIndex: bi++ } : s
        );
      });

      // Cell groups：每组以 blank 结尾（最后一组可能只有 given）
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
        // 重置 Python 命名空间
        if (_py) { try { _py.runPython('_reset()'); } catch (_) {} }
        // 打开代码题时自动初始化 Kernel
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

      function onSubInput(blankIndex, subIdx, val) {
        state.answers[`b${blankIndex}_${subIdx}`] = val;
        lsWrite('draft-' + state.cur.id, state.answers);
      }

      // 将 template 按 __{2,} 拆分成 [{type:'text'},{type:'blank',subIdx}...] 数组
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

      // 将各子空的答案拼回完整代码行（用于运行和评分）
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

      // Token-based similarity for auto-scoring code blanks
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

        const result = {
          score,
          answers: { ...state.answers },
          rubricChecks: { ...state.rubricChecks },
          blankScores,
        };
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

      // ── 文件上传到 Pyodide FS ──────────────────────────────
      async function onFileUpload(event) {
        const files = Array.from(event.target.files);
        event.target.value = ''; // 允许重复上传同一文件
        if (!files.length) return;

        // 如果 Kernel 未加载，先启动（ensurePy 会等待完成）
        if (state.kernelStatus === 'unloaded' || state.kernelStatus === 'error') {
          initKernel();
        }

        state.kernelMsg = '文件写入中，等待 Kernel 就绪…';
        try {
          const py = await ensurePy((s, msg) => {
            state.kernelStatus = s;
            state.kernelMsg = msg || '';
          });
          for (const file of files) {
            const buf = await file.arrayBuffer();
            py.FS.writeFile('/home/pyodide/' + file.name, new Uint8Array(buf));
            if (!state.uploadedFiles.includes(file.name)) {
              state.uploadedFiles.push(file.name);
            }
          }
          state.kernelMsg = `Kernel 就绪 ✓ · 已上传 ${state.uploadedFiles.length} 个文件`;
        } catch (e) {
          state.kernelMsg = '文件上传失败：' + e.message;
        }
      }

      // ── Kernel 方法 ─────────────────────────────────────────
      function initKernel() {
        if (state.kernelStatus === 'ready' || state.kernelStatus === 'loading') return;
        state.kernelStatus = 'loading';
        state.kernelMsg = '初始化中…';
        ensurePy((s, msg) => {
          state.kernelStatus = s;
          state.kernelMsg = msg || '';
        }).catch(() => {});
      }

      async function runUpTo(groupIdx) {
        // 若 busy（正在运行另一个 cell），忽略
        if (state.runningCell !== -1) return;

        // Kernel 未就绪：先触发加载，并在 cell 输出区显示提示
        if (state.kernelStatus !== 'ready') {
          if (state.kernelStatus === 'unloaded' || state.kernelStatus === 'error') {
            initKernel();
          }
          const waitMsg = state.kernelStatus === 'loading'
            ? 'Kernel 加载中（首次约 30–60 秒），加载完成后请再次点击 ▶'
            : 'Kernel 启动中，请稍后再点击 ▶ 运行';
          state.cellOutputs.splice(groupIdx, 1, { stdout: '', stderr: '', images: [], msg: waitMsg });
          return;
        }

        state.kernelStatus = 'busy';
        state.runningCell = groupIdx;
        try {
          // 每次运行都从头重置命名空间（保证幂等）
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
            // 使用 globals.set 传字符串，避免字符串注入问题
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
            // 用 splice 保证 Vue 3 响应式触发
            state.cellOutputs.splice(i, 1, { stdout, stderr, images, msg: '' });
            // 每组执行完让 Vue 渲染一次，显示逐步输出
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
