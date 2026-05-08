# 考试模拟系统 - 功能模块地图

本文档帮助你快速理解 `app-vue.js`、`ops-page-component.js`、`ops-data.js` 与 `app.js`（vanilla 版）的代码结构，以及整合后的 **复刻站点** 组件。

---

## 整体架构概览

```
index-vue.html           ← 入口，加载所有脚本（当前版本 v=20260428j）
├─ styles.css
├─ questions-data.js     ← 理论题库（大题库，window.QUESTIONS_DATA）
├─ ops-data.js           ← 实操题库（40 题，window.OPS_DATA）
├─ ops-page-component.js ← 实操训练台组件（含 Pyodide 在线运行）
└─ app-vue.js            ← 主应用（Auth、路由、理论/考试/历史/实操页）

app-vue.js
├─ 配置与工具函数
│  ├─ localStorage 读写
│  ├─ Auth 认证系统
│  ├─ 理论题库初始化（优先读 QUESTIONS_DATA，fallback 内置题）
│  └─ 通用工具函数
│
├─ Vue 页面组件
│  ├─ LoginPage 组件 (登录/注册 + 公众号二维码)
│  ├─ AppShell 组件 (主应用壳，4 个 tab)
│  ├─ PracticePage 组件 (理论练习)
│  ├─ ExamPage 组件 (190 题模拟考试，90 分钟)
│  ├─ HistoryPage 组件 (成绩记录)
│  └─ OpsPage → window.OpsPageComponent (实操训练台)
│
└─ 路由 + App 启动
   ├─ /                  → LoginPage
   └─ /dashboard/*       → AppShell (practice / exam / history / ops)

ops-page-component.js
├─ ensurePy()            ← Pyodide 懒加载单例
├─ Python 执行环境注入   ← _run / _reset / _collect_figs
├─ FS 预加载             ← fetch datasets/* → py.FS.writeFile
└─ OpsPageComponent      ← Vue 3 组件（列表 + 详情双视图）
   ├─ cellGroups          ← computed：code_segments 按 blank 分组
   ├─ parseTemplate()     ← 将 __ 拆成内联输入框
   ├─ reconstructCode()   ← 把各子空答案拼回完整代码
   ├─ runUpTo(gi)         ← 逐组运行，支持增量输出
   └─ onFileUpload()      ← 上传文件写入 Pyodide FS
```

---

## 模块详解

### 1️⃣ 全局配置与工具

**存储键名定义**
```javascript
const STORAGE_USERS    = "bk-users";              // 用户账号列表
const STORAGE_ACTIVE   = "bk-active-user";        // 当前登录用户
const STORAGE_PRACTICE = "bk-practice-record";    // 练习做题记录
const STORAGE_EXAMS    = "bk-exam-history";       // 考试历史
// 实操题 draft/submit 存储前缀（ops-page-component.js）
const LS = 'bk-ops-';  // bk-ops-draft-{id} / bk-ops-submit-{id}
```
🔧 **修改点**：如果要换存储方案（如改用后端 API），改这里。

**storageRead / storageWrite**
- 作用：localStorage JSON 读写的安全包装
- 若要改用 IndexedDB 或数据库，修改这两个函数

**Auth 对象**
- `auth.user` → `{ username, displayName }`
- `auth.login(user)` / `auth.logout()` / `auth.isAuthenticated()`

**ensureDefaultUser()**
- 首次启动创建默认账号 `wanhuw/12345678`
- 🔧 改默认账号：改这个函数的初始数组

**题库初始化 `initializeQuestionTree()`**
- 优先读 `window.QUESTIONS_DATA`（来自 `questions-data.js`）
- 若无则使用内置 fallback 题目
- 返回 `QUESTION_TREE`（章节 → 知识点 → 题目 树状结构）

**通用工具函数**
- `normalizeAnswer(list)` — 排序答案便于比对
- `escapeHtml(text)` — 防 XSS
- `typeLabel(type)` — 题型名翻译（单选/多选/判断）
- `formatSec(sec)` — 秒数转 MM:SS

---

### 2️⃣ LoginPage 组件

**入口**：用户首次打开网页时看到

**模板**
```html
<div class="login-panel">
  <!-- 品牌头部 -->
  <header class="brand-block">
    <h1>人工智能训练师三级 备考通</h1>
  </header>
  
  <!-- 登录/注册卡片 -->
  <div class="card">
    <p class="notice">错误信息或成功提示</p>
    <form @submit.prevent="handleLogin/handleRegister">
      <!-- 表单字段 -->
    </form>
  </div>
  
  <!-- 公众号二维码 -->
  <aside class="wechat-card">
    <img src="./qrcode_for_gh_af85ddd1357b_258.jpg">
  </aside>
</div>
```

**响应式状态**
```javascript
const mode = ref('login');              // 'login' 或 'register'
const loading = ref(false);             // 提交中状态
const notice = ref('');                 // 消息提示文本
const noticeError = ref(false);         // 是否为错误消息
const form = ref({ username, displayName, password, confirmPassword });
```

**handleLogin()** — 查找用户名+密码匹配，成功跳转 `/dashboard`

**handleRegister()** — 校验格式（用户名 `/^[a-zA-Z0-9_]{4,20}$/`，密码 ≥8 位，两次一致，无重名）→ 写入 localStorage → 自动登录

🔧 **增强注册**：在校验后插入邮箱/手机验证逻辑

---

### 3️⃣ AppShell 组件

**作用**：登录后的主应用壳，提供导航栏

**模板**
```html
<div class="exam-app">
  <header class="app-header">
    <h2>人工智能训练师三级 · 模拟考试</h2>
    <div class="header-actions">
      <span class="user-badge">当前用户</span>
      <button @click="handleLogout">退出登录</button>
    </div>
  </header>
  
  <!-- 4 个页面选项卡 -->
  <nav class="app-tabs">
    <button @click="$router.push('/dashboard/practice')">理论练习</button>
    <button @click="$router.push('/dashboard/exam')">模拟考试</button>
    <button @click="$router.push('/dashboard/history')">成绩记录</button>
    <button @click="$router.push('/dashboard/ops')">实操训练</button>
  </nav>
  
  <router-view></router-view>
</div>
```

**tabs 数组**：`['practice', 'exam', 'history', 'ops']`

`tabLabel()` 将路由名翻译为中文显示

🔧 **扩展功能**：在 `tabs` 数组里增加新路由名，同时在路由配置中注册新组件

---

### 4️⃣ PracticePage 组件

**功能**：理论练习，参考参考站 theory 页的设计

**用户交互流程**
1. 左侧选择知识点
2. 上方筛选题型和错题模式
3. 中间做题与提交
4. 实时显示成绩统计

**响应式状态**
```javascript
const state = globalState.practiceState;  // { currentKp, filterType, onlyWrong }
const record = ref(globalState.getPracticeRecord());
const picked = ref({});    // { qid: [labels] }
const answered = ref({});  // { qid: true }
```

**filteredList 计算属性**
1. 若选了知识点，只显示该知识点的题
2. 若选了题型，只显示该题型的题
3. 若打开"仅错题"，只显示记录中 `isCorrect: false` 的题

**toggleOption()** — 单选替换，多选切换

**submitAnswer()** — 对比答案 → 写入 record → 同步 localStorage → 标记已答

🔧 **增强做题体验**：添加做题计时、错题本导出、知识点掌握统计

---

### 5️⃣ ExamPage 组件

**功能**：计时模拟考试（闭卷，190 题，90 分钟，满分 100 分，60 分及格）

**考试流程**
1. 初始：显示说明与"开始考试"按钮
2. 考试中：逐题显示，可上/下一题，倒计时
3. 交卷：显示得分、通过/未通过、错题回顾
4. 成绩写入历史

**响应式状态**
```javascript
const sessionActive = ref(false);  // 是否在进行中
const submitted   = ref(false);    // 是否已交卷
const session     = ref(null);     // 当前考试会话
const result      = ref(null);     // 交卷结果
const leftSec     = ref(0);        // 剩余时间（秒）
```

**考试会话结构**
```javascript
{
  startedAt: 时间戳,
  endsAt:    时间戳,
  index:     当前题号,
  questions: [190题随机抽取],
  answers:   { qid: [labels], ... }
}
```

**startExam() 抽题规则**
- 判断题 40 题（从 `judgeQs` 中随机抽）
- 单选题 140 题（从 `singleQs` 中随机抽）
- 多选题 10 题（从 `multiQs` 中随机抽）
- 抽完后打乱顺序
- 计时器：90 × 60 秒，每秒递减，归零时自动调用 `submitExam(true)`

🔧 **修改题数/时长**：改 `extractN(...)` 的第二参数和 `90 * 60 * 1000`

**submitExam()** — 遍历所有题对比答案 → 计算得分 = `round(correct/total * 100)` → 写入历史 → 显示结果

**成绩记录格式**
```javascript
{ at, total, correct, score, usedSec, autoSubmit, wrongList, passed }
```

🔧 **扩展**：存完整题目+用户答案+正确答案，做"按题型统计"分析

---

### 6️⃣ HistoryPage 组件

**功能**：显示历史考试记录

**逻辑**
- 读取当前用户的所有考试历史 `globalState.getExamHistory()`
- 以表格显示：时间、得分、正确题数/总题数、用时、交卷方式

🔧 **增强**：
- 添加"详细回顾"按钮，展开当次错题
- 添加得分趋势折线图
- 导出 CSV / PDF 成绩单

---

### 7️⃣ OpsPage / 实操训练台（`ops-page-component.js` + `ops-data.js`）

**功能**：本地实操练习台，支持在线运行 Python（Pyodide）、内联填空、自动评分

> 组件以 `window.OpsPageComponent` 的形式导出，在 `app-vue.js` 中以 `OpsPage = window.OpsPageComponent` 引入，挂载到路由 `/dashboard/ops`。

#### 题库数据 `ops-data.js`

- `window.OPS_DATA`：40 道实操题（来源：线上 API 真实数据）
- 每题结构：

```javascript
{
  id, title, category, time_limit, total_score,
  type: "code" | "doc",
  scenario,       // 题目背景
  tasks: [{ title, description }],  // 工作任务
  rubric: [{ id, points, desc }],   // 评分项
  code_segments: [                  // 仅 code 题
    { type: "given", code },        // 已给代码段
    { type: "blank", template, hint, points, answer }  // 填空段
  ],
  answer_sections: [{ id, text }]   // 仅 doc 题，各评分项参考答案
}
```

🔧 **添加实操题**：在 `ops-data.js` 的 `OPS_DATA` 数组中 push 新对象

#### Pyodide 单例加载器 `ensurePy(onStatus)`

**调用时机**：打开代码题时自动触发；也可点击"⚡ 启动 Kernel"按钮手动触发

**5 步初始化流程**

```
1. 动态插入 <script src="cdn/pyodide.js">（首次）
2. window.loadPyodide({ indexURL: CDN })
3. py.loadPackage(['numpy','pandas','matplotlib','scipy'])
4. py.loadPackage(['scikit-learn'])（可选）
5. py.loadPackage(['openpyxl'])（可选）
↓
注入 Python 执行环境：_run / _reset / _collect_figs
os.chdir('/home/pyodide')
↓
预加载 datasets/ 下 16 个数据文件（10 CSV + 6 XLSX）→ py.FS.writeFile
```

CDN：`https://cdn.jsdelivr.net/pyodide/v0.26.4/full/`

**kernelStatus 状态机**

```
unloaded → loading → ready ⇄ busy
                  → error（可重试）
```

- 运行按钮只在 `runningCell !== -1` 时禁用（不阻塞在 loading 状态）
- loading 时点击"▶ 运行至此"会在 cell 输出区显示等待提示

#### 数据文件 `datasets/`

预置 50 个文件（10 CSV + 6 XLSX + 34 DOCX），启动 Kernel 时自动写入 `/home/pyodide/`，Python 代码可直接 `pd.read_csv('patient_data.csv')` 调用。

用户也可通过"📁 上传数据文件"按钮手动上传额外文件。

#### 双视图：列表 ↔ 详情

**列表视图**
- 卡片网格：按分类/题型筛选
- 卡片显示完成状态（`✓ 已完成` / `⏳ 进行中`）

**详情视图**

```
ops-detail-layout
├─ ops-left-panel    ← 题目背景 / 工作任务 / 评分项
└─ ops-right-panel
   ├─ ops-kernel-bar ← Kernel 状态 + 上传按钮 + 全部运行/重置
   ├─ [code 题] cell groups（每组含 given 段 + blank 卡）
   │   ├─ ops-code-given   ← <pre> 只读代码
   │   ├─ ops-blank-card   ← 内联填空（parseTemplate 拆分出 <input>）
   │   ├─ ops-cell-run-row ← ▶ 运行至此 按钮
   │   └─ ops-cell-output  ← stdout / stderr / matplotlib 图片
   └─ [doc 题] 每个评分项一个 <textarea>
```

#### 内联填空机制

- `blank` 段的 `template` 字段用 `__` 标记填空位，例如：`df = pd.read_csv(__)`
- `parseTemplate(template)` → 按 `/_{2,}/` 分割，生成 `[{type:'text'}, {type:'blank', subIdx}, ...]`
- 每个子空对应 `state.answers['b{blankIdx}_{subIdx}']`
- `reconstructCode(blankIndex, template)` → 拼回完整代码行

#### 运行机制 `runUpTo(groupIdx)`

1. `_py.runPython('_reset()')` — 清空命名空间（每次从头运行，保证幂等）
2. 循环 `i = 0 .. groupIdx`：
   - 将 given 段 code + reconstructed blank 合并为 `code` 字符串
   - `_py.globals.set('__cc__', code)` → `_py.runPython('_run(__cc__)')` （避免字符串注入）
   - 读 `_r_out / _r_err / _r_figs`，`state.cellOutputs.splice(i, 1, {...})` 触发响应式
   - `await nextTick()` 让 Vue 渲染逐步输出
3. `runAll()` 直接调用 `runUpTo(最后一组)`

#### 自动评分 `doSubmit()`

- **代码题**：对每个 blank，`codeSim(userCode, refAnswer)` 计算 token 级相似度
  - ≥ 0.7 → 满分；≥ 0.4 → 50%；< 0.4 → 0 分
- **文档题**：checkbox 自评，勾选评分项计分
- 结果写入 `localStorage['bk-ops-submit-{id}']`，重新进入题目时自动恢复

🔧 **改评分逻辑**：修改 `doSubmit()` 中 `codeSim` 阈值，或接入 LLM API 评分

---

### 8️⃣ [扩展] 复刻站点面板 ReplicaPanel (`app.js`)

> 本节对应的是 **vanilla 版 `app.js`** 的扩展，不在 `app-vue.js` / `index-vue.html` 中（入口为 `index.html`）。

**功能**：将 `site_replica`（从线上站点 http://10.109.4.4/ai_training 抓取的前端副本）以真实 Vue 组件方式内嵌进同一个入口页，而非 iframe。

**涉及文件**

| 文件 | 改动 |
|------|------|
| `index.html` | 新增 `<button data-tab="replica">复刻站点</button>` 和 `<section id="panel-replica">` |
| `app.js` | 新增 `replicaMounted` 标志、`injectReplicaCSS()`、`mountReplicaApp()`、`renderReplicaPanel()` |
| `styles.css` | 新增 `.replica-shell`、`.replica-head`、`.replica-body` 等样式 |
| `site_replica/static/assets/app.js` | 最后一行 `.mount('#app')` 改为 `.mount(window.__REPLICA_MOUNT__ \|\| '#app')` |

**加载流程**

```
用户点击「复刻站点」tab
  └─ renderReplicaPanel()            ← 首次调用时构建 DOM 壳
       ├─ injectReplicaCSS()         ← 动态向 <head> 注入 theme.css / components.css（已注入则跳过）
       └─ mountReplicaApp()
            ├─ 设置 window.__REPLICA_MOUNT__ = '#replica-root'
            ├─ 检查 window.Vue 是否已加载
            │    └─ 否：动态插入 <script src="vendor/vue.global.prod.js">
            └─ 动态插入 <script type="module" src="site_replica/static/assets/app.js">
                 └─ Vue app 挂载到 #replica-root（页内组件，无 iframe）

再次切换 tab 回来 → replicaMounted = true → 直接跳过，复用已挂载实例
```

🔧 **常见调整**：
- 换源站：把 `./site_replica/` 路径改成其他副本目录
- 改组件高度：修改 `styles.css` 中 `.replica-body { min-height: 60vh }` 的值
- 新窗口打开按钮：位于 `renderReplicaPanel()` 的 HTML 字符串，`href="./site_replica/index.html"`

---

## 全局状态 globalState

```javascript
const globalState = reactive({
  practiceState: {
    currentKp: "all",    // 当前选中知识点
    filterType: "",      // 当前选中题型
    onlyWrong: false     // 是否仅显示错题
  },
  getPracticeRecord() {},      // 获取练习记录
  savePracticeRecord(record){}, // 保存练习记录
  getExamHistory() {},         // 获取考试历史
  saveExamHistory(history){}   // 保存考试历史
});
```

核心作用：跨组件共享状态（PracticePage / ExamPage 都能访问），提供统一的数据读写接口

---

## 路由配置

```javascript
const routes = [
  { path: '/', component: LoginPage },
  {
    path: '/dashboard',
    component: AppShell,
    redirect: '/dashboard/practice',
    children: [
      { path: 'practice', component: PracticePage },
      { path: 'exam',     component: ExamPage },
      { path: 'history',  component: HistoryPage },
      { path: 'ops',      component: OpsPage }      // 实操训练台
    ]
  }
];
```

**路由守卫**
```javascript
router.beforeEach((to, from, next) => {
  if (to.path !== '/' && !auth.isAuthenticated()) next('/');
  else if (to.path === '/' && auth.isAuthenticated()) next('/dashboard');
  else next();
});
```

---

## 常见修改场景

### 1. 添加理论题目
📍 `questions-data.js`（`window.QUESTIONS_DATA`）→ 在对应知识点 `questions` 数组中 push：
```javascript
{ id, type: "single"|"multi"|"judge", text, options: [{label, text}], answer: ["B"] }
```

### 2. 添加实操题
📍 `ops-data.js`（`window.OPS_DATA`）→ push 新 code/doc 题对象（参考题库格式）

### 3. 改模拟考试题数/时长
📍 `app-vue.js` ExamPage `startExam()`：
- 改 `extractN(judgeQs, 40)` / `(singleQs, 140)` / `(multiQs, 10)` 的第二参数
- 改 `90 * 60 * 1000`（毫秒）

### 4. 添加新页面
1. 在 `app-vue.js` 中创建新组件
2. 在 `routes` children 里增加路由
3. 在 `AppShell` 的 `tabs` 数组里增加路由名

### 5. 接入后端 API
- `storageRead/storageWrite` → 改成 fetch API
- `getUsers()` → 调用登录接口
- `getPracticeRecord/saveExamHistory` → 接后端存储
- 实操评分 `doSubmit()` 中 `codeSim` → 接 LLM API

---

## 开发建议

1. **先理解数据流**：登录 → 理论练习/考试/实操 → 成绩保存
2. **测试时用浏览器 F12 的 Application → LocalStorage** 查看数据是否正确保存
3. **注意响应式**：所有状态都用 `ref()` 或 `reactive()` 包装；数组修改用 `splice()` 触发响应式
4. **Pyodide 首次加载约 30–60 秒**：需要网络访问 jsdelivr CDN，内网环境请考虑离线部署
5. **考虑后端迁移**：现在的本地存储设计易于改成 API 调用

Good luck！有问题随时问。

---

## 🚀 如何启动本站

### 方法一：Python 内置 HTTP 服务器（推荐，无需安装额外依赖）

```bash
# 进入 ai_training_like 目录
cd C:\N-21MMPF5D57TT-Data\wanhuw\Desktop\range\test\config\ai_training_like

# Python 3（监听所有网卡，局域网其他人也能访问）
python -m http.server 8010
```

然后浏览器访问：

```
# 本机访问
http://localhost:8010/index-vue.html

# 局域网其他人访问（本机 Wi-Fi IP）
http://10.243.29.28:8010/index-vue.html
```

### 方法二：VS Code Live Server 插件

1. 安装 VS Code 插件 **Live Server**（ritwickdey.LiveServer）
2. 在 VS Code 中打开 `index-vue.html`
3. 右键 → **Open with Live Server**
4. 浏览器自动打开，默认地址为 `http://127.0.0.1:5500/index-vue.html`
5. 局域网其他人访问：`http://10.243.29.28:5500/index-vue.html`（需在 Live Server 设置中将 `host` 改为 `0.0.0.0`）

### 方法三：PowerShell 一键启动

```powershell
Set-Location 'C:\N-21MMPF5D57TT-Data\wanhuw\Desktop\range\test\config\ai_training_like'
python -m http.server 8010
# 本机访问：http://localhost:8010/index-vue.html
# 局域网访问：http://10.243.29.28:8010/index-vue.html
```

> ⚠️ **不能直接双击打开**：因为页面使用了 ES Module（`<script type="module">`），浏览器对 `file://` 协议有跨域限制，必须通过 HTTP 服务器访问。

---

## 🔑 登录账号

### 本地版（ai_training_like）

| 项目 | 值 |
|------|----|
| 入口地址（本机） | `http://localhost:8010/index-vue.html` |
| 入口地址（局域网） | `http://10.243.29.28:8010/index-vue.html` |
| 默认用户名 | `wanhuw` |
| 默认密码 | `12345678` |
| 账号来源 | `app-vue.js` 中 `ensureDefaultUser()` 初始化，首次启动时写入 localStorage |

> 也可点击「注册」自行创建新账号，账号数据保存在浏览器 **localStorage** 中，key 为 `bk-users`。

### 复刻站点（site_replica / 线上版）

| 项目 | 值 |
|------|----|
| 线上地址 | `http://10.109.4.4/ai_training/#/ops` |
| 用户名 | `wanhuw` |
| 密码 | `12345678` |
| 鉴权方式 | JWT Bearer Token，存入 localStorage `t_tok` / `t_usr` |
| 注销 | 清除 `t_tok` / `t_usr` 后自动跳回登录页 |
