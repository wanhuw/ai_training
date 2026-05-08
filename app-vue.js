const { createApp, ref, reactive, computed, onMounted, onUnmounted } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

// ============= Auth & Storage =============
const STORAGE_USERS = "bk-users";
const STORAGE_ACTIVE = "bk-active-user";
const STORAGE_PRACTICE = "bk-practice-record";
const STORAGE_EXAMS = "bk-exam-history";

function storageRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function storageWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

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
  logout() {
    this.user = null;
    localStorage.removeItem(STORAGE_ACTIVE);
  }
});

// ============= Question Bank =============
// 支持两种数据源：
// 1. 从 window.QUESTIONS_DATA 加载新题库 (questions-data.js)
// 2. 使用内置默认题库
function initializeQuestionTree() {
  if (typeof window.QUESTIONS_DATA !== 'undefined' && window.QUESTIONS_DATA && window.QUESTIONS_DATA.length > 0) {
    // 使用新题库：按题型分类
    const judgeQs = window.QUESTIONS_DATA.filter(q => q.type === 'judge');
    const singleQs = window.QUESTIONS_DATA.filter(q => q.type === 'single');
    const multiQs = window.QUESTIONS_DATA.filter(q => q.type === 'multi');
    
    return [
      {
        id: 1,
        title: '判断题',
        kps: [{ id: 101, title: `判断题 (${judgeQs.length}题)`, questions: judgeQs }]
      },
      {
        id: 2,
        title: '单选题',
        kps: [{ id: 201, title: `单选题 (${singleQs.length}题)`, questions: singleQs }]
      },
      {
        id: 3,
        title: '多选题',
        kps: [{ id: 301, title: `多选题 (${multiQs.length}题)`, questions: multiQs }]
      }
    ];
  } else {
    // 使用默认题库（10题示例）
    return [
      {
        id: 1,
        title: "人工智能基础",
        kps: [
          {
            id: 101,
            title: "机器学习概念",
            questions: [
              {
                id: 1001, type: "single", text: "以下哪项最符合监督学习定义？",
                options: [
                  { label: "A", text: "仅使用无标签数据训练" },
                  { label: "B", text: "使用带标签数据训练并学习映射关系" },
                  { label: "C", text: "不依赖数据而直接编程规则" },
                  { label: "D", text: "训练后无需评估模型" }
                ],
                answer: ["B"]
              },
              {
                id: 1002, type: "judge", text: "过拟合通常表现为训练集表现好、测试集表现差。",
                options: [
                  { label: "A", text: "正确" },
                  { label: "B", text: "错误" }
                ],
                answer: ["A"]
              }
            ]
          },
          {
            id: 102,
            title: "模型评估",
            questions: [
              {
                id: 1003, type: "single", text: "二分类问题中，查准率（Precision）主要衡量什么？",
                options: [
                  { label: "A", text: "真实正样本中被预测为正的比例" },
                  { label: "B", text: "预测为正的样本中真实为正的比例" },
                  { label: "C", text: "总体预测正确率" },
                  { label: "D", text: "负样本召回率" }
                ],
                answer: ["B"]
              },
              {
                id: 1004, type: "multi", text: "以下哪些做法有助于缓解过拟合？",
                options: [
                  { label: "A", text: "增加训练数据" },
                  { label: "B", text: "正则化" },
                  { label: "C", text: "交叉验证" },
                  { label: "D", text: "盲目增大模型复杂度" }
                ],
                answer: ["A", "B", "C"]
              }
            ]
          }
        ]
      },
      {
        id: 2,
        title: "数据处理",
        kps: [
          {
            id: 201,
            title: "特征工程",
            questions: [
              {
                id: 1005, type: "single", text: "数值特征标准化最常见的目的是什么？",
                options: [
                  { label: "A", text: "增加样本数量" },
                  { label: "B", text: "减少特征维度" },
                  { label: "C", text: "使不同量纲特征处于可比尺度" },
                  { label: "D", text: "直接提升标签质量" }
                ],
                answer: ["C"]
              },
              {
                id: 1006, type: "judge", text: "缺失值处理可以采用删除、填补等策略。",
                options: [
                  { label: "A", text: "正确" },
                  { label: "B", text: "错误" }
                ],
                answer: ["A"]
              }
            ]
          },
          {
            id: 202,
            title: "数据集划分",
            questions: [
              {
                id: 1007, type: "single", text: "训练集、验证集、测试集三者中，测试集主要用于什么？",
                options: [
                  { label: "A", text: "调参" },
                  { label: "B", text: "模型最终泛化能力评估" },
                  { label: "C", text: "数据清洗" },
                  { label: "D", text: "标签标注" }
                ],
                answer: ["B"]
              },
              {
                id: 1008, type: "multi", text: "关于交叉验证，下列说法正确的是？",
                options: [
                  { label: "A", text: "可更稳定评估模型性能" },
                  { label: "B", text: "通常增加计算开销" },
                  { label: "C", text: "不能用于小数据集" },
                  { label: "D", text: "可用于模型选择" }
                ],
                answer: ["A", "B", "D"]
              }
            ]
          }
        ]
      }
    ];
  }
}

const QUESTION_TREE = initializeQuestionTree();

function allQuestions() {
  const list = [];
  QUESTION_TREE.forEach(section => {
    section.kps.forEach(kp => {
      kp.questions.forEach(q => {
        // 补充缺失的元数据（新题库可能没有sectionId等）
        list.push({
          id: q.id,
          type: q.type,
          text: q.text,
          options: q.options,
          answer: q.answer,
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

// ============= Global State =============
const globalState = reactive({
  practiceState: {
    currentKp: "all",
    filterType: "",
    onlyWrong: false
  },
  getPracticeRecord() {
    const all = storageRead(STORAGE_PRACTICE, {});
    return all[auth.user?.username] || {};
  },
  savePracticeRecord(record) {
    const all = storageRead(STORAGE_PRACTICE, {});
    all[auth.user?.username] = record;
    storageWrite(STORAGE_PRACTICE, all);
  },
  getExamHistory() {
    const all = storageRead(STORAGE_EXAMS, {});
    return all[auth.user?.username] || [];
  },
  saveExamHistory(history) {
    const all = storageRead(STORAGE_EXAMS, {});
    all[auth.user?.username] = history;
    storageWrite(STORAGE_EXAMS, all);
  }
});

function normalizeAnswer(list) {
  return list.slice().sort().join(",");
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function typeLabel(type) {
  return type === "single" ? "单选" : type === "multi" ? "多选" : "判断";
}

function formatSec(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return m + ":" + s;
}

// ============= Components =============
const LoginPage = {
  template: `
    <div class="login-panel">
      <header class="brand-block">
        <h1>人工智能训练师三级 备考通</h1>
        <p>人工智能训练师三级备考</p>
      </header>
      <div class="card">
        <p id="notice" class="notice" :style="{color: noticeError ? '#dc2626' : '#16a34a'}">{{ notice }}</p>
        
        <form v-if="mode === 'login'" @submit.prevent="handleLogin">
          <label class="field">
            <span>用户名</span>
            <input v-model="form.username" type="text" autocomplete="username" required>
          </label>
          <label class="field">
            <span>密码</span>
            <input v-model="form.password" type="password" autocomplete="current-password" required>
          </label>
          <button type="submit" class="btn btn-primary" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
          <p class="switch-text">没有账号？<a @click.prevent="mode='register'" href="#">注册</a></p>
        </form>

        <form v-else @submit.prevent="handleRegister">
          <label class="field">
            <span>用户名</span>
            <input v-model="form.username" type="text" autocomplete="username" required>
          </label>
          <label class="field">
            <span>昵称</span>
            <input v-model="form.displayName" type="text" autocomplete="name" required>
          </label>
          <label class="field">
            <span>密码</span>
            <input v-model="form.password" type="password" autocomplete="new-password" required>
          </label>
          <label class="field">
            <span>确认密码</span>
            <input v-model="form.confirmPassword" type="password" autocomplete="new-password" required>
          </label>
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

    const getUsers = () => {
      return ensureDefaultUser();
    };

    const handleLogin = async () => {
      if (!form.value.username || !form.value.password) {
        notice.value = '请输入用户名和密码';
        noticeError.value = true;
        return;
      }
      loading.value = true;
      const user = getUsers().find(u => u.username === form.value.username && u.password === form.value.password);
      if (!user) {
        notice.value = '用户名或密码不正确';
        noticeError.value = true;
        loading.value = false;
        return;
      }
      auth.login(user);
      notice.value = '';
      router.push('/dashboard');
      loading.value = false;
    };

    const handleRegister = async () => {
      const username = form.value.username.trim();
      const displayName = form.value.displayName.trim();
      const password = form.value.password;
      const confirmPassword = form.value.confirmPassword;

      if (!username || !displayName || !password || !confirmPassword) {
        notice.value = '请完整填写注册信息';
        noticeError.value = true;
        return;
      }

      if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
        notice.value = '用户名需为 4-20 位字母、数字或下划线';
        noticeError.value = true;
        return;
      }

      if (password.length < 8) {
        notice.value = '密码至少 8 位';
        noticeError.value = true;
        return;
      }

      if (password !== confirmPassword) {
        notice.value = '两次输入密码不一致';
        noticeError.value = true;
        return;
      }

      const users = getUsers();
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        notice.value = '用户名已存在';
        noticeError.value = true;
        return;
      }

      const newUser = { username, displayName, password };
      users.push(newUser);
      storageWrite(STORAGE_USERS, users);

      auth.login(newUser);
      notice.value = '注册成功，已自动登录';
      noticeError.value = false;
      form.value = { username: '', displayName: '', password: '', confirmPassword: '' };
      router.push('/dashboard');
      loading.value = false;
    };

    return { mode, loading, notice, noticeError, form, handleLogin, handleRegister };
  }
};

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
        <button 
          v-for="tab in tabs" :key="tab"
          @click="$router.push('/dashboard/' + tab)"
          :class="{active: activeTab === tab}"
          class="tab-btn"
        >
          {{ tabLabel(tab) }}
        </button>
      </nav>

      <router-view></router-view>
    </div>
  `,
  setup(props, { expose }) {
    const router = VueRouter.useRouter();
    const route = VueRouter.useRoute();
    const tabs = ['practice', 'exam', 'history', 'ops'];
    
    const activeTab = computed(() => {
      const segment = route.path.split('/').pop();
      return tabs.includes(segment) ? segment : tabs[0];
    });

    const tabLabel = (tab) => {
      return tab === 'practice' ? '理论练习' : tab === 'exam' ? '模拟考试' : tab === 'history' ? '成绩记录' : '实操训练';
    };

    const handleLogout = () => {
      auth.logout();
      router.push('/');
    };

    return { auth, activeTab, tabs, tabLabel, handleLogout };
  }
};

const STORAGE_PRACTICE_POS = "bk-practice-pos";

const PracticePage = {
  template: `
    <section class="panel">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">累计做题</div>
          <div class="stat-value">{{ stats.total }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">累计答对</div>
          <div class="stat-value">{{ stats.correct }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">当前错题</div>
          <div class="stat-value">{{ stats.wrong }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">未做题</div>
          <div class="stat-value">{{ stats.unseen }}</div>
        </div>
      </div>

      <div class="theory-layout">
        <aside class="theory-side">
          <div class="side-block">
            <button 
              @click="selectKp('all')"
              :class="{on: state.currentKp === 'all'}"
              class="kp-btn"
            >
              全部题目 <span>{{ allQList.length }}</span>
            </button>
          </div>
          <div v-for="section in QUESTION_TREE" :key="section.id" class="side-block">
            <div class="side-title">{{ section.title }}</div>
            <button 
              v-for="kp in section.kps" :key="kp.id"
              @click="selectKp(kp.id)"
              :class="{on: state.currentKp === kp.id}"
              class="kp-btn"
            >
              {{ kp.title }} <span>{{ kp.questions.length }}</span>
            </button>
          </div>
        </aside>

        <main class="theory-main">
          <div class="chip-row">
            <button 
              @click="setFilter('')"
              :class="{on: !state.filterType}"
              class="chip"
            >全部题型</button>
            <button 
              @click="setFilter('judge')"
              :class="{on: state.filterType === 'judge'}"
              class="chip"
            >判断</button>
            <button 
              @click="setFilter('single')"
              :class="{on: state.filterType === 'single'}"
              class="chip"
            >单选</button>
            <button 
              @click="setFilter('multi')"
              :class="{on: state.filterType === 'multi'}"
              class="chip"
            >多选</button>
            <button 
              @click="toggleOnlyWrong"
              :class="{on: state.onlyWrong}"
              class="chip"
            >仅错题</button>
          </div>

          <div id="practiceList">
            <p v-if="!sortedList.length" class="muted">当前筛选条件下没有题目。</p>
            <template v-else>
              <div class="action-row" style="margin-bottom:8px">
                <strong>第 {{ pageStart + 1 }}–{{ pageEnd }} / {{ sortedList.length }} 题</strong>
                <span class="muted" style="font-size:13px">
                  (未做 {{ filterUnseen }} · 错题 {{ filterWrong }} · 已对 {{ filterCorrect }})
                </span>
                <span class="muted" style="font-size:13px;margin-left:8px">
                  第 {{ currentPage + 1 }} / {{ totalPages }} 页
                </span>
              </div>
              <div style="background:#e8f5e9;border-radius:6px;height:6px;margin-bottom:12px;overflow:hidden">
                <div :style="{width: progressPct + '%', height:'100%', background:'#4CAF50', transition:'width .3s'}"></div>
              </div>

              <article v-for="(q, qi) in pageQuestions" :key="q.id" class="question-card" style="margin-bottom:18px">
                <p class="question-title">
                  <span style="color:#1976D2;font-weight:700;margin-right:6px">{{ pageStart + qi + 1 }}.</span>
                  [{{ typeLabel(q.type) }}] {{ escapeHtml(q.text) }}
                </p>
                <div class="option-list">
                  <button 
                    v-for="opt in q.options" :key="opt.label"
                    @click="toggleOption(q.id, opt.label, q.type)"
                    :class="{
                      selected: (pickedMap[q.id] || []).includes(opt.label),
                      correct: answeredMap[q.id] && q.answer.includes(opt.label),
                      wrong: answeredMap[q.id] && (pickedMap[q.id] || []).includes(opt.label) && !q.answer.includes(opt.label)
                    }"
                    class="option-btn"
                  >
                    <strong>{{ opt.label }}.</strong> {{ escapeHtml(opt.text) }}
                  </button>
                </div>
                <div class="action-row">
                  <span class="muted" v-if="!answeredMap[q.id]">请选择答案后提交</span>
                  <span v-else :style="{color: correctMap[q.id] ? '#16a34a' : '#f44336'}">
                    {{ correctMap[q.id] ? '✓ 回答正确' : '✗ 回答错误，正确答案：' + q.answer.join(', ') }}
                  </span>
                  <button 
                    v-if="!answeredMap[q.id]"
                    @click="submitAnswer(q.id)"
                    :disabled="!(pickedMap[q.id] && pickedMap[q.id].length)"
                    class="btn btn-primary"
                  >提交答案</button>
                </div>
              </article>

              <div class="action-row" style="margin-top:12px">
                <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 0" class="btn btn-ghost">⬅ 上一页</button>
                <button @click="resetPage" class="btn btn-ghost" style="color:#f57c00" title="清除本页作答记录，重新做题">🔄 重做本页</button>
                <span style="display:flex;align-items:center;gap:6px">
                  <input type="number" v-model.number="jumpPage" min="1" :max="totalPages"
                    style="width:60px;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;text-align:center;font-size:14px"
                    @keyup.enter="goToPage(jumpPage - 1)"
                  />
                  <button @click="goToPage(jumpPage - 1)" class="btn btn-ghost" style="padding:4px 10px">跳转</button>
                </span>
                <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages - 1" class="btn btn-primary">下一页 ➡</button>
              </div>
            </template>
          </div>
        </main>
      </div>
    </section>
  `,
  setup() {
    const state = globalState.practiceState;
    const record = ref(globalState.getPracticeRecord());
    const PAGE_SIZE = 10;
    const currentPage = ref(0);
    const pickedMap = reactive({});   // { questionId: [labels] }
    const answeredMap = reactive({}); // { questionId: true/false }
    const correctMap = reactive({});  // { questionId: true/false }
    const jumpPage = ref(1);

    const allQList = computed(() => allQuestions());

    // Build filtered + smart-sorted list — cached as ref, only recalculated on filter change
    function buildSortedList() {
      let list = allQList.value;
      if (state.currentKp !== 'all') {
        list = list.filter(q => q.kpId === state.currentKp);
      }
      if (state.filterType) {
        list = list.filter(q => q.type === state.filterType);
      }
      if (state.onlyWrong) {
        list = list.filter(q => record.value[q.id] && !record.value[q.id].isCorrect);
      }
      const rec = record.value;
      const unseen = list.filter(q => !rec[q.id]);
      const wrong = list.filter(q => rec[q.id] && !rec[q.id].isCorrect);
      const correct = list.filter(q => rec[q.id] && rec[q.id].isCorrect);
      return [...unseen, ...wrong, ...correct];
    }
    const sortedList = ref(buildSortedList());

    function refreshSortedList() {
      sortedList.value = buildSortedList();
    }

    const filterUnseen = computed(() => sortedList.value.filter(q => !record.value[q.id]).length);
    const filterWrong = computed(() => sortedList.value.filter(q => record.value[q.id] && !record.value[q.id].isCorrect).length);
    const filterCorrect = computed(() => sortedList.value.filter(q => record.value[q.id] && record.value[q.id].isCorrect).length);
    const progressPct = computed(() => {
      if (!sortedList.value.length) return 0;
      const done = sortedList.value.filter(q => record.value[q.id]).length;
      return Math.round((done / sortedList.value.length) * 100);
    });

    const totalPages = computed(() => Math.max(1, Math.ceil(sortedList.value.length / PAGE_SIZE)));
    const pageStart = computed(() => currentPage.value * PAGE_SIZE);
    const pageEnd = computed(() => Math.min(pageStart.value + PAGE_SIZE, sortedList.value.length));
    const pageQuestions = computed(() => sortedList.value.slice(pageStart.value, pageEnd.value));

    // Restore saved position for current filter config
    const posKey = computed(() => `${state.currentKp}|${state.filterType}|${state.onlyWrong}`);

    function savePos() {
      const all = storageRead(STORAGE_PRACTICE_POS, {});
      const user = auth.user?.username || '_';
      if (!all[user]) all[user] = {};
      all[user][posKey.value] = currentPage.value;
      storageWrite(STORAGE_PRACTICE_POS, all);
    }

    function loadPos() {
      const all = storageRead(STORAGE_PRACTICE_POS, {});
      const user = auth.user?.username || '_';
      const saved = (all[user] || {})[posKey.value];
      if (typeof saved === 'number' && saved >= 0 && saved < totalPages.value) {
        return saved;
      }
      return 0;
    }

    function syncPageState() {
      // Load answered state from record for current page questions
      for (const q of pageQuestions.value) {
        const rec = record.value[q.id];
        if (rec) {
          pickedMap[q.id] = rec.selected ? rec.selected.slice() : [];
          answeredMap[q.id] = true;
          correctMap[q.id] = rec.isCorrect;
        } else if (!pickedMap[q.id]) {
          pickedMap[q.id] = [];
          answeredMap[q.id] = false;
          correctMap[q.id] = false;
        }
      }
      jumpPage.value = currentPage.value + 1;
    }

    function goToPage(page) {
      if (page < 0) page = 0;
      if (page >= totalPages.value) page = totalPages.value - 1;
      currentPage.value = page;
      savePos();
      syncPageState();
    }

    function resetPage() {
      for (const q of pageQuestions.value) {
        delete record.value[q.id];
        pickedMap[q.id] = [];
        answeredMap[q.id] = false;
        correctMap[q.id] = false;
      }
      globalState.savePracticeRecord(record.value);
      refreshSortedList();
    }

    // When filter changes, rebuild sorted list and restore saved position
    function onFilterChange() {
      refreshSortedList();
      const pos = loadPos();
      currentPage.value = pos;
      syncPageState();
    }

    const selectKp = (kpId) => {
      state.currentKp = kpId === 'all' ? 'all' : kpId;
      onFilterChange();
    };

    const setFilter = (type) => {
      state.filterType = type;
      onFilterChange();
    };

    const toggleOnlyWrong = () => {
      state.onlyWrong = !state.onlyWrong;
      onFilterChange();
    };

    const toggleOption = (qId, label, qType) => {
      if (answeredMap[qId]) return;
      if (!pickedMap[qId]) pickedMap[qId] = [];
      if (qType === 'multi') {
        const i = pickedMap[qId].indexOf(label);
        if (i >= 0) pickedMap[qId].splice(i, 1);
        else pickedMap[qId].push(label);
      } else {
        pickedMap[qId] = [label];
      }
    };

    const submitAnswer = (qId) => {
      const q = sortedList.value.find(item => item.id === qId);
      if (!q || !pickedMap[qId] || !pickedMap[qId].length) return;
      const isOk = normalizeAnswer(pickedMap[qId]) === normalizeAnswer(q.answer);
      record.value[qId] = { selected: pickedMap[qId].slice(), isCorrect: isOk, updatedAt: Date.now() };
      globalState.savePracticeRecord(record.value);
      answeredMap[qId] = true;
      correctMap[qId] = isOk;
    };

    const stats = computed(() => {
      const all = allQList.value;
      let correct = 0, total = 0, wrong = 0, unseen = 0;
      all.forEach(q => {
        const rec = record.value[q.id];
        if (!rec) { unseen++; }
        else { total++; if (rec.isCorrect) correct++; else wrong++; }
      });
      return { total, correct, wrong, unseen };
    });

    // Initialize position on mount
    onMounted(() => {
      onFilterChange();
    });

    return {
      state, record, allQList, sortedList, stats,
      currentPage, totalPages, pageStart, pageEnd, pageQuestions,
      pickedMap, answeredMap, correctMap, jumpPage,
      filterUnseen, filterWrong, filterCorrect, progressPct,
      selectKp, setFilter, toggleOnlyWrong, toggleOption, submitAnswer, goToPage, resetPage,
      QUESTION_TREE, escapeHtml, typeLabel
    };
  }
};

const ExamPage = {
  template: `
    <section class="panel">
      <div v-if="!sessionActive" class="question-card">
        <h3 style="margin:0 0 8px">理论模拟考试</h3>
        <p class="muted">闭卷机考 · 190 题（判断 40+单选 140+多选 10）· 90 分钟 · 满分 100 分 · 60 分及格</p>
        <div class="action-row">
          <button @click="startExam" class="btn btn-primary">开始考试</button>
        </div>
      </div>

      <div v-else-if="!submitted" class="question-card">
        <div class="action-row">
          <strong>第 {{ session.index + 1 }}/{{ session.questions.length }} 题</strong>
          <span class="timer" :style="{color: leftSec < 300 ? '#f44336' : 'inherit'}">
            ⏱️ 剩余 <strong>{{ formatSec(leftSec) }}</strong>
            <span v-if="leftSec < 300" style="color: #f44336; margin-left: 5px;">⚠️ 时间紧张</span>
          </span>
        </div>
        <p class="question-title">[{{ typeLabel(q.type) }}] {{ escapeHtml(q.text) }}</p>
        <div class="option-list">
          <button 
            v-for="opt in q.options" :key="opt.label"
            @click="selectOption(opt.label)"
            :class="{selected: session.answers[q.id] && session.answers[q.id].includes(opt.label)}"
            class="option-btn"
          >
            <strong>{{ opt.label }}.</strong> {{ escapeHtml(opt.text) }}
          </button>
        </div>
        <div class="action-row">
          <button @click="prevQ" :disabled="session.index === 0" class="btn btn-ghost">上一题</button>
          <button @click="nextQ" class="btn btn-primary">
            {{ session.index === session.questions.length - 1 ? '完成并交卷' : '下一题' }}
          </button>
        </div>
      </div>

      <div v-else class="question-card">
        <h3 style="margin:0 0 8px">交卷完成</h3>
        <p class="muted">{{ result.autoSubmit ? '时间到自动交卷' : '你已手动交卷' }}</p>
        <div :class="['pass-status', result.passed ? 'passed' : 'failed']">
          <p>{{ result.passed ? '✅ 通过' : '❌ 未通过' }}</p>
          <p>满分 100 分 | 及格线 60 分</p>
        </div>
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-label">得分</div>
            <div class="stat-value" :style="{color: result.passed ? '#4CAF50' : '#f44336'}">{{ result.score }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">答对</div>
            <div class="stat-value">{{ result.correct }}/{{ result.total }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">用时</div>
            <div class="stat-value">{{ formatSec(result.usedSec) }}</div>
          </div>
        </div>
        <div v-if="result.wrongList.length">
          <p style="margin:12px 0 0">错题回顾</p>
          <ul class="wrong-list">
            <li v-for="(w, idx) in result.wrongList" :key="idx">{{ escapeHtml(w) }}</li>
          </ul>
        </div>
        <p v-else style="margin:12px 0 0;color:#16a34a">本次满分，继续保持。</p>
        <div class="action-row">
          <button @click="startExam" class="btn btn-primary">再考一次</button>
        </div>
      </div>
    </section>
  `,
  setup() {
    const sessionActive = ref(false);
    const submitted = ref(false);
    const session = ref(null);
    const result = ref(null);
    const leftSec = ref(0);
    let timerId = null;

    const startExam = () => {
      // 闭卷机考：190题（判断40+单选140+多选10）
      const allQs = allQuestions();
      const judgeQs = allQs.filter(q => q.type === 'judge');
      const singleQs = allQs.filter(q => q.type === 'single');
      const multiQs = allQs.filter(q => q.type === 'multi');
      
      // 按题型抽题：判断40题、单选140题、多选10题
      const selected = [];
      const extractN = (pool, n) => {
        const copy = pool.slice();
        const result = [];
        while (copy.length && result.length < n) {
          const idx = Math.floor(Math.random() * copy.length);
          result.push(copy.splice(idx, 1)[0]);
        }
        return result;
      };
      
      selected.push(...extractN(judgeQs, 40));
      selected.push(...extractN(singleQs, 140));
      selected.push(...extractN(multiQs, 10));
      
      // 打乱顺序
      for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]];
      }
      
      session.value = {
        startedAt: Date.now(),
        endsAt: Date.now() + 90 * 60 * 1000,
        index: 0,
        questions: selected,
        answers: {}
      };
      sessionActive.value = true;
      submitted.value = false;
      leftSec.value = 90 * 60;

      if (timerId) clearInterval(timerId);
      timerId = setInterval(() => {
        if (!session.value) return;
        leftSec.value = Math.max(0, Math.round((session.value.endsAt - Date.now()) / 1000));
        if (leftSec.value <= 0) submitExam(true);
      }, 1000);
    };

    const q = computed(() => session.value ? session.value.questions[session.value.index] : null);

    const selectOption = (label) => {
      if (!session.value || !q.value) return;
      const qid = q.value.id;
      let ans = session.value.answers[qid] || [];
      if (q.value.type === 'multi') {
        const i = ans.indexOf(label);
        if (i >= 0) ans.splice(i, 1);
        else ans.push(label);
      } else {
        ans = [label];
      }
      session.value.answers[qid] = ans;
    };

    const prevQ = () => {
      if (session.value && session.value.index > 0) session.value.index--;
    };

    const nextQ = () => {
      if (!session.value) return;
      if (session.value.index < session.value.questions.length - 1) {
        session.value.index++;
      } else {
        submitExam(false);
      }
    };

    const submitExam = (isAuto) => {
      if (!session.value) return;
      const sess = session.value;
      const total = sess.questions.length;
      let correct = 0;
      const wrongList = [];

      sess.questions.forEach(q => {
        const picked = sess.answers[q.id] || [];
        const ok = normalizeAnswer(picked) === normalizeAnswer(q.answer);
        if (ok) correct++;
        else wrongList.push(`[${typeLabel(q.type)}] ${q.text} (正确: ${q.answer.join(',')})`);
      });

      // 计算总分（满分100分）
      const score = Math.round((correct / total) * 100);
      const passingLine = 60;  // 及格线
      const usedSec = Math.round((Date.now() - sess.startedAt) / 1000);
      const history = globalState.getExamHistory();
      history.unshift({ at: Date.now(), total, correct, score, usedSec, autoSubmit: !!isAuto, wrongList });
      globalState.saveExamHistory(history);

      result.value = { score, correct, total, usedSec, autoSubmit: !!isAuto, wrongList, passingLine, passed: score >= 60 };
      submitted.value = true;
      sessionActive.value = false;
      if (timerId) clearInterval(timerId);
    };

    onUnmounted(() => {
      if (timerId) clearInterval(timerId);
    });

    return { sessionActive, submitted, session, result, leftSec, q, startExam, selectOption, prevQ, nextQ, submitExam, escapeHtml, typeLabel, formatSec };
  }
};

const HistoryPage = {
  template: `
    <section class="panel">
      <p v-if="!history.length" class="muted">暂无考试记录，先去"模拟考试"开始一次考试。</p>
      <table v-else class="history-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>得分</th>
            <th>正确题数</th>
            <th>用时</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in history" :key="idx">
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
  setup() {
    const history = ref(globalState.getExamHistory());
    return { history, formatSec };
  }
};

// ============= OpsPage Component (fully local, see ops-page-component.js) =============
// Loaded via window.OpsPageComponent set in ops-page-component.js
const OpsPage = window.OpsPageComponent || {
  template: `
    <div class="ops-page">
      <!-- 未登录 -->
      <div v-if="!state.opsToken" class="ops-login">
        <div class="card ops-login-card">
          <h3 style="margin-top:0">登录实操平台</h3>
          <p class="ops-login-hint">使用在线备考站账号（服务器：10.109.4.4）</p>
          <p v-if="state.loginError" class="ops-error">{{ state.loginError }}</p>
          <form @submit.prevent="handleOpsLogin">
            <label class="field"><span>用户名</span>
              <input v-model="state.loginForm.username" type="text" required autocomplete="username">
            </label>
            <label class="field"><span>密码</span>
              <input v-model="state.loginForm.password" type="password" required autocomplete="current-password">
            </label>
            <button type="submit" class="btn btn-primary" style="width:100%" :disabled="state.loginLoading">
              {{ state.loginLoading ? '登录中…' : '登录' }}
            </button>
          </form>
        </div>
      </div>

      <!-- 已登录 -->
      <template v-else>
        <!-- 详情页 -->
        <div v-if="state.current">
          <div class="ops-detail-header">
            <button @click="backToList" class="btn btn-ghost">← 返回列表</button>
            <h3 style="margin:0;flex:1">{{ state.current.op.title }}</h3>
            <span class="ops-type-chip" :class="state.current.op.type">
              {{ state.current.op.type === 'code' ? '代码题' : '文档题' }}
            </span>
          </div>
          <p v-if="state.detailError" class="ops-error">{{ state.detailError }}</p>

          <div class="card ops-section">
            <div class="ops-label">题目背景</div>
            <p style="white-space:pre-wrap;margin:6px 0 0">{{ state.current.op.scenario }}</p>
          </div>

          <div class="card ops-section">
            <div class="ops-label">工作任务</div>
            <div v-for="(task, i) in state.current.op.tasks" :key="i" class="ops-task">
              <div class="ops-task-title">任务 {{ i + 1 }}：{{ task.title }}</div>
              <p class="ops-task-desc">{{ task.description }}</p>
              <div v-if="task.rubric_items && task.rubric_items.length" class="ops-rubric">
                <div v-for="(item, j) in task.rubric_items" :key="j" class="ops-rubric-row">
                  <span class="ops-pts">{{ item.points }}分</span>
                  <span>{{ item.description }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 文档题作答 -->
          <div v-if="state.current.op.type === 'doc'" class="card ops-section">
            <div class="ops-label">作答区域</div>
            <div v-for="(task, i) in state.current.op.tasks" :key="i" class="ops-answer-block">
              <div class="ops-answer-title">任务 {{ i + 1 }} 答案</div>
              <textarea
                v-model="state.answers['task_' + i]"
                class="ops-textarea"
                rows="4"
                :placeholder="'请填写任务 ' + (i + 1) + ' 的答案…'"
                :disabled="state.current.submitted"
              ></textarea>
            </div>
          </div>

          <!-- 代码题作答 -->
          <div v-if="state.current.op.type === 'code'" class="card ops-section">
            <div class="ops-label">代码作答区</div>
            <div v-for="(seg, i) in codeSegments" :key="i">
              <pre v-if="seg.type === 'given'" class="ops-code-given">{{ seg.code }}</pre>
              <div v-else class="ops-code-blank">
                <div class="ops-blank-hint">{{ seg.hint }}</div>
                <textarea
                  v-model="state.answers['blank_' + seg.blankIndex]"
                  class="ops-textarea ops-code-ta"
                  rows="3"
                  :placeholder="seg.template || '在此填写代码…'"
                  :disabled="state.current.submitted"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="ops-actions">
            <template v-if="!state.current.submitted">
              <button @click="saveAnswers" class="btn" :disabled="state.saving">
                {{ state.saving ? '保存中…' : '保存草稿' }}
              </button>
              <button @click="submitAnswers" class="btn btn-primary" :disabled="state.saving">
                提交答案
              </button>
            </template>
            <div v-else class="ops-submitted-badge">✓ 已提交</div>
          </div>
        </div>

        <!-- 列表页 -->
        <div v-else>
          <div class="card ops-list-header">
            <div class="ops-list-title-row">
              <div>
                <div class="ops-label">操作实训</div>
                <h2 style="margin:4px 0 0">实操训练台</h2>
                <p style="margin:4px 0 0;font-size:0.85rem;color:var(--ink-2)">代码题填空作答；文档题按评分项作答，提交后 AI 判分。</p>
              </div>
              <button @click="handleLogoutOps" class="btn btn-ghost ops-logout-btn">退出实操</button>
            </div>
            <div class="ops-filter">
              <button v-for="cat in ['all', ...state.categories]" :key="cat"
                class="ops-chip" :class="{on: state.filterCat === cat}"
                @click="state.filterCat = cat">{{ cat === 'all' ? '全部' : cat }}</button>
              <span class="ops-divider">|</span>
              <button v-for="t in typeOptions" :key="t.v"
                class="ops-chip" :class="{on: state.filterType === t.v}"
                @click="state.filterType = t.v">{{ t.l }}</button>
            </div>
          </div>

          <p v-if="state.loading" class="ops-hint">加载题目中…</p>
          <p v-if="state.error" class="ops-error">{{ state.error }}</p>

          <div class="ops-grid">
            <div v-for="op in filteredOps" :key="op.id"
              class="ops-card" tabindex="0"
              @click="openOp(op.id)"
              @keydown.enter="openOp(op.id)">
              <div class="ops-card-head">
                <span class="ops-card-no">#{{ op.id }}</span>
                <span class="ops-type-chip" :class="op.type">{{ op.type === 'code' ? '代码' : '文档' }}</span>
                <span class="ops-card-cat">{{ op.category }}</span>
                <span class="ops-card-meta">{{ op.time_limit }} · {{ op.total_score }}分</span>
              </div>
              <div class="ops-card-title">{{ op.title }}</div>
              <p class="ops-card-scenario">{{ (op.scenario || '').slice(0, 160) }}{{ (op.scenario || '').length > 160 ? '…' : '' }}</p>
            </div>
          </div>
          <p v-if="!state.loading && !state.error && filteredOps.length === 0" class="ops-hint">没有符合条件的题目。</p>
        </div>
      </template>
    </div>
  `,
  setup() {
    const state = reactive({
      opsToken: localStorage.getItem(OPS_TOKEN_KEY) || '',
      loginForm: { username: '', password: '' },
      loginError: '',
      loginLoading: false,
      loading: false,
      error: '',
      ops: [],
      categories: [],
      filterCat: 'all',
      filterType: 'all',
      current: null,
      detailError: '',
      answers: {},
      saving: false,
    });

    const typeOptions = [
      { v: 'all', l: '全部题型' },
      { v: 'code', l: '代码题' },
      { v: 'doc', l: '文档题' },
    ];

    const filteredOps = computed(() =>
      state.ops.filter(op =>
        (state.filterCat === 'all' || op.category === state.filterCat) &&
        (state.filterType === 'all' || op.type === state.filterType)
      )
    );

    const codeSegments = computed(() => {
      if (!state.current || state.current.op.type !== 'code') return [];
      let blankIdx = 0;
      return (state.current.op.code_segments || []).map(s =>
        s.type === 'blank' ? { ...s, blankIndex: blankIdx++ } : s
      );
    });

    async function apiFetch(path, opts = {}) {
      const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
      if (state.opsToken) headers['Authorization'] = 'Bearer ' + state.opsToken;
      const resp = await fetch(OPS_BASE + path, { ...opts, headers });
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 401) {
        state.opsToken = '';
        localStorage.removeItem(OPS_TOKEN_KEY);
        throw new Error('登录已过期，请重新登录');
      }
      if (!resp.ok) throw new Error(data.detail || `请求失败 (${resp.status})`);
      return data;
    }

    async function handleOpsLogin() {
      state.loginError = '';
      state.loginLoading = true;
      try {
        const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(state.loginForm),
        });
        state.opsToken = data.access_token;
        localStorage.setItem(OPS_TOKEN_KEY, data.access_token);
        if (data.user) localStorage.setItem('t_usr', JSON.stringify(data.user));
        await loadOps();
      } catch (e) {
        state.loginError = e.message;
      } finally {
        state.loginLoading = false;
      }
    }

    function handleLogoutOps() {
      state.opsToken = '';
      localStorage.removeItem(OPS_TOKEN_KEY);
      state.ops = [];
      state.current = null;
    }

    async function loadOps() {
      state.loading = true;
      state.error = '';
      try {
        const [catData, opsData] = await Promise.all([
          apiFetch('/api/operations/categories'),
          apiFetch('/api/operations'),
        ]);
        state.categories = (catData.categories || []).map(c => c.name || c);
        state.ops = opsData.questions || [];
      } catch (e) {
        state.error = e.message;
      } finally {
        state.loading = false;
      }
    }

    async function openOp(id) {
      state.detailError = '';
      state.current = null;
      state.answers = {};
      try {
        const s = await apiFetch('/api/operations/sessions', {
          method: 'POST',
          body: JSON.stringify({ operation_id: id }),
        });
        const session = await apiFetch(`/api/operations/sessions/${s.session_id}`);
        state.current = {
          sessionId: s.session_id,
          op: session.operation,
          submitted: session.submitted,
        };
        if (session.blanks_draft) state.answers = { ...session.blanks_draft };
      } catch (e) {
        state.detailError = e.message;
      }
    }

    function backToList() {
      state.current = null;
      state.answers = {};
      state.detailError = '';
    }

    async function saveAnswers() {
      state.saving = true;
      state.detailError = '';
      try {
        await apiFetch(`/api/operations/sessions/${state.current.sessionId}/draft`, {
          method: 'PUT',
          body: JSON.stringify({ blanks_draft: state.answers }),
        });
      } catch (e) {
        state.detailError = e.message;
      } finally {
        state.saving = false;
      }
    }

    async function submitAnswers() {
      state.saving = true;
      state.detailError = '';
      try {
        await apiFetch(`/api/operations/sessions/${state.current.sessionId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ blanks_draft: state.answers }),
        });
        state.current.submitted = true;
      } catch (e) {
        state.detailError = e.message;
      } finally {
        state.saving = false;
      }
    }

    onMounted(() => {
      if (state.opsToken) loadOps();
    });

    return {
      state, typeOptions, filteredOps, codeSegments,
      handleOpsLogin, handleLogoutOps, backToList,
      openOp, saveAnswers, submitAnswers,
    };
  }
};

// ============= Router & App =============
const routes = [
  { path: '/', component: LoginPage },
  {
    path: '/dashboard',
    component: AppShell,
    redirect: '/dashboard/practice',
    children: [
      { path: 'practice', component: PracticePage },
      { path: 'exam', component: ExamPage },
      { path: 'history', component: HistoryPage },
      { path: 'ops', component: OpsPage }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.path !== '/' && !auth.isAuthenticated()) {
    next('/');
  } else if (to.path === '/' && auth.isAuthenticated()) {
    next('/dashboard');
  } else {
    next();
  }
});

const app = createApp({
  template: '<router-view></router-view>'
});

app.use(router);
app.mount('#app');
