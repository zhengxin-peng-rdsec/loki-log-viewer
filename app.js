const STORAGE_KEY = "loki-log-viewer-state-v2";
const LEGACY_STORAGE_KEY = "loki-log-viewer-state-v1";
const SESSION_USER_KEY = "loki-log-viewer-session-user";
// Loki 默认 max_entries_limit 通常为 5000；前端不应再额外截断到 2500 条。
const MAX_ROWS = 5000;
const PERMISSION_LEVEL = { none: 0, read: 1, edit: 2 };
const PROTECTED_USER_IDS = new Set(["admin"]);
const PROTECTED_GROUPS = new Set(["运维组", "管理员组"]);
const THEME_MODES = new Set(["system", "light", "dark"]);
const SYSTEM_DARK_QUERY = window.matchMedia?.("(prefers-color-scheme: dark)");
const LABEL_OPERATOR_OPTIONS = [
  { value: "=", label: "=" },
  { value: "!=", label: "!=" },
  { value: "contains", label: "包含" },
  { value: "not_contains", label: "不包含" },
  { value: "=~", label: "=~" },
  { value: "!~", label: "!~" }
];
const LABEL_OPERATORS = LABEL_OPERATOR_OPTIONS.map(item => item.value);

const defaultState = {
  settings: {
    lokiUrl: "/api/loki",
    lokiTarget: "",
    tenantId: "",
    activeUserId: "admin",
    activeConnectionId: "default-loki",
    sidebarCollapsed: false,
    kickstartCollapsed: false,
    themeMode: "system"
  },
  connections: [
    { id: "default-loki", name: "默认 Loki", lokiUrl: "/api/loki", tenantId: "" }
  ],
  groups: ["运维组", "ERP开发组", "商城开发组", "只读访客"],
  users: [
    { id: "admin", name: "admin", role: "admin", groups: ["运维组"], password: "admin123" },
    { id: "erp-dev", name: "erp-dev", role: "user", groups: ["ERP开发组"], password: "dev123" },
    { id: "mall-dev", name: "mall-dev", role: "user", groups: ["商城开发组"], password: "dev123" }
  ],
  sources: [
    {
      id: randomId(),
      name: "ERP 生产应用",
      group: "生产环境",
      connectionId: "default-loki",
      permissions: { 运维组: "edit", ERP开发组: "read" },
      query: '{app="erp", env="prod"}'
    },
    {
      id: randomId(),
      name: "商城 Nginx",
      group: "生产环境",
      connectionId: "default-loki",
      permissions: { 运维组: "edit", 商城开发组: "read" },
      query: '{app="mall", component="nginx"}'
    },
    {
      id: randomId(),
      name: "系统日志",
      group: "基础设施",
      connectionId: "default-loki",
      permissions: { 运维组: "edit" },
      query: '{job="system"}'
    }
  ]
};

const els = {
  loginScreen: document.getElementById("loginScreen"),
  appShell: document.getElementById("appShell"),
  toggleSidebarBtn: document.getElementById("toggleSidebarBtn"),
  loginUserName: document.getElementById("loginUserName"),
  loginPassword: document.getElementById("loginPassword"),
  loginBtn: document.getElementById("loginBtn"),
  loginError: document.getElementById("loginError"),
  accountBtn: document.getElementById("accountBtn"),
  accountName: document.getElementById("accountName"),
  accountPassword: document.getElementById("accountPassword"),
  saveAccountBtn: document.getElementById("saveAccountBtn"),
  accountModal: document.getElementById("accountModal"),
  themeMode: document.getElementById("themeMode"),
  connectionState: document.getElementById("connectionState"),
  sessionConfigRow: document.getElementById("sessionConfigRow"),
  openConfigBtn: document.getElementById("openConfigBtn"),
  lokiUrl: document.getElementById("lokiUrl"),
  lokiName: document.getElementById("lokiName"),
  tenantId: document.getElementById("tenantId"),
  logoutBtn: document.getElementById("logoutBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  newConnectionBtn: document.getElementById("newConnectionBtn"),
  deleteConnectionBtn: document.getElementById("deleteConnectionBtn"),
  healthBtn: document.getElementById("healthBtn"),
  lokiConnectionList: document.getElementById("lokiConnectionList"),
  sourceList: document.getElementById("sourceList"),
  newSourceBtn: document.getElementById("newSourceBtn"),
  sourceName: document.getElementById("sourceName"),
  sourceGroup: document.getElementById("sourceGroup"),
  sourceConnection: document.getElementById("sourceConnection"),
  sourceQuery: document.getElementById("sourceQuery"),
  permissionList: document.getElementById("permissionList"),
  saveSourceBtn: document.getElementById("saveSourceBtn"),
  deleteSourceBtn: document.getElementById("deleteSourceBtn"),
  queryInput: document.getElementById("queryInput"),
  inlineQueryBuilder: document.getElementById("inlineQueryBuilder"),
  kickstartDivider: document.getElementById("kickstartDivider"),
  toggleKickstartBtn: document.getElementById("toggleKickstartBtn"),
  rangeSelect: document.getElementById("rangeSelect"),
  limitInput: document.getElementById("limitInput"),
  directionSelect: document.getElementById("directionSelect"),
  queryBtn: document.getElementById("queryBtn"),
  saveQueryBtn: document.getElementById("saveQueryBtn"),
  tailBtn: document.getElementById("tailBtn"),
  stopTailBtn: document.getElementById("stopTailBtn"),
  clearBtn: document.getElementById("clearBtn"),
  exportBtn: document.getElementById("exportBtn"),
  includeFilter: document.getElementById("includeFilter"),
  excludeFilter: document.getElementById("excludeFilter"),
  regexFilter: document.getElementById("regexFilter"),
  caseSensitive: document.getElementById("caseSensitive"),
  autoScroll: document.getElementById("autoScroll"),
  wrapLines: document.getElementById("wrapLines"),
  viewerCard: document.getElementById("viewerCard"),
  toggleLogFullscreenBtn: document.getElementById("toggleLogFullscreenBtn"),
  logList: document.getElementById("logList"),
  resultTitle: document.getElementById("resultTitle"),
  resultMeta: document.getElementById("resultMeta"),
  logDetail: document.getElementById("logDetail"),
  toast: document.getElementById("toast"),
  levelFilters: Array.from(document.querySelectorAll(".level-filters input")),
  configModal: document.getElementById("configModal"),
  sourceModal: document.getElementById("sourceModal"),
  newUserModal: document.getElementById("newUserModal"),
  resetPasswordModal: document.getElementById("resetPasswordModal"),
  configTabs: Array.from(document.querySelectorAll("[data-config-tab]")),
  tabConnection: document.getElementById("tabConnection"),
  tabUsers: document.getElementById("tabUsers"),
  tabGroups: document.getElementById("tabGroups"),
  userList: document.getElementById("userList"),
  userNameInput: document.getElementById("userNameInput"),
  userRoleInput: document.getElementById("userRoleInput"),
  userGroupsInput: document.getElementById("userGroupsInput"),
  resetPasswordInput: document.getElementById("resetPasswordInput"),
  resetPasswordUserName: document.getElementById("resetPasswordUserName"),
  toggleResetPasswordVisibility: document.getElementById("toggleResetPasswordVisibility"),
  newUserBtn: document.getElementById("newUserBtn"),
  newUserNameInput: document.getElementById("newUserNameInput"),
  newUserPasswordInput: document.getElementById("newUserPasswordInput"),
  newUserRoleInput: document.getElementById("newUserRoleInput"),
  newUserGroupsInput: document.getElementById("newUserGroupsInput"),
  createUserBtn: document.getElementById("createUserBtn"),
  saveUserBtn: document.getElementById("saveUserBtn"),
  resetPasswordBtn: document.getElementById("resetPasswordBtn"),
  saveResetPasswordBtn: document.getElementById("saveResetPasswordBtn"),
  deleteUserBtn: document.getElementById("deleteUserBtn"),
  groupList: document.getElementById("groupList"),
  groupNameInput: document.getElementById("groupNameInput"),
  newGroupBtn: document.getElementById("newGroupBtn"),
  saveGroupBtn: document.getElementById("saveGroupBtn"),
  deleteGroupBtn: document.getElementById("deleteGroupBtn"),
  labelConditionList: document.getElementById("labelConditionList"),
  logDetailModal: document.getElementById("logDetailModal")
};

let state = structuredClone(defaultState);
let selectedSourceId = null;
let editingSourceId = null;
let selectedUserId = null;
let selectedGroupName = null;
let selectedConnectionId = null;
let logs = [];
let selectedLogId = null;
let tailSocket = null;
let livePollTimer = null;
let allowTailFallback = false;
let liveQuery = "";
let liveSinceNs = null;
let resultVersion = 0;
let toastTimer = null;
let stateSaveTimer = null;
let shouldSeedServerState = false;
let queryBuilderState = {
  labelsLoaded: false,
  connectionId: "",
  labels: [],
  labelValues: {},
  labelConditions: [],
  presets: []
};

applyTheme();

async function loadState() {
  const serverState = await loadServerState();
  if (serverState) return serverState;
  shouldSeedServerState = hasLocalState();
  return loadLocalState();
}

function hasLocalState() {
  return !!(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
}

async function loadServerState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || !Object.keys(payload).length) return null;
    return migrateState(payload);
  } catch {
    return null;
  }
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return migrateState(JSON.parse(raw));
  } catch {
    return structuredClone(defaultState);
  }
}

function migrateState(input) {
  const migrated = {
    ...structuredClone(defaultState),
    ...input,
    settings: { ...defaultState.settings, ...(input.settings || {}) }
  };

  migrated.groups = Array.isArray(input.groups) ? input.groups : (input.teams || defaultState.groups);
  migrated.users = Array.isArray(input.users) ? input.users : structuredClone(defaultState.users);
  migrated.users = migrated.users.map(rawUser => {
    const user = {
      ...rawUser,
      password: rawUser.password || defaultPasswordForUser(rawUser)
    };
    Object.keys(user).forEach(key => {
      if (key.toLowerCase() === "displayname") delete user[key];
    });
    return user;
  });
  migrated.settings.activeUserId = migrated.users.some(user => user.id === migrated.settings.activeUserId)
    ? migrated.settings.activeUserId
    : migrated.users[0]?.id || "admin";
  migrated.settings.themeMode = normalizeThemeMode(migrated.settings.themeMode);

  migrated.connections = Array.isArray(input.connections) && input.connections.length
    ? input.connections
    : [{
        id: "default-loki",
        name: "默认 Loki",
        lokiUrl: input.settings?.lokiTarget || input.settings?.lokiUrl || defaultState.settings.lokiUrl,
        tenantId: input.settings?.tenantId || ""
      }];
  migrated.settings.activeConnectionId = migrated.connections.some(connection => connection.id === migrated.settings.activeConnectionId)
    ? migrated.settings.activeConnectionId
    : migrated.connections[0]?.id || "default-loki";
  applyActiveConnectionToSettings(migrated);

  const fallbackConnectionId = migrated.settings.activeConnectionId || migrated.connections[0]?.id || "default-loki";
  migrated.sources = (input.sources || defaultState.sources).map(source => {
    const withPermissions = source.permissions ? source : (() => {
      const permissions = {};
      (source.teams || ["运维组"]).forEach(team => {
        permissions[team] = team === "运维组" ? "edit" : "read";
      });
      return { ...source, permissions };
    })();
    if (migrated.connections.some(connection => connection.id === withPermissions.connectionId)) {
      return withPermissions;
    }
    return { ...withPermissions, connectionId: fallbackConnectionId };
  });

  return migrated;
}

function defaultConnectionId(sourceState = state) {
  return sourceState.settings.activeConnectionId || sourceState.connections[0]?.id || "default-loki";
}

function connectionById(id, sourceState = state) {
  return sourceState.connections.find(connection => connection.id === id);
}

function sourceConnection(source, sourceState = state) {
  return connectionById(source?.connectionId, sourceState) || activeConnection(sourceState);
}

function defaultPasswordForUser(user) {
  if (user?.id === "admin" || user?.role === "admin") return "admin123";
  return "dev123";
}

function activeConnection(sourceState = state) {
  return sourceState.connections.find(connection => connection.id === sourceState.settings.activeConnectionId)
    || sourceState.connections[0];
}

function applyActiveConnectionToSettings(sourceState = state) {
  const connection = activeConnection(sourceState);
  if (!connection) return;
  sourceState.settings.activeConnectionId = connection.id;
  if (/^https?:\/\//i.test(connection.lokiUrl)) {
    sourceState.settings.lokiUrl = "/api/loki";
    sourceState.settings.lokiTarget = connection.lokiUrl;
  } else {
    sourceState.settings.lokiUrl = connection.lokiUrl || "/api/loki";
    sourceState.settings.lokiTarget = connection.lokiUrl || "/api/loki";
  }
  sourceState.settings.tenantId = connection.tenantId || "";
}

async function activateConnection(connection, options = {}) {
  if (!connection) return null;
  const silent = options.silent === true;
  const needsProxySync = /^https?:\/\//i.test(connection.lokiUrl)
    && (state.settings.activeConnectionId !== connection.id
      || state.settings.lokiTarget !== connection.lokiUrl
      || state.settings.tenantId !== (connection.tenantId || ""));

  state.settings.activeConnectionId = connection.id;
  applyActiveConnectionToSettings();

  if (needsProxySync) {
    try {
      const saved = await saveServerConfig(connection.lokiUrl, connection.tenantId || "");
      connection.lokiUrl = saved.lokiUrl;
      connection.tenantId = saved.tenantId || "";
      applyActiveConnectionToSettings();
    } catch (error) {
      state.settings.lokiUrl = connection.lokiUrl;
      state.settings.lokiTarget = connection.lokiUrl;
      state.settings.tenantId = connection.tenantId || "";
      if (!silent) {
        setConnection("本地 Loki", "idle");
        showDetail({
          warning: "代理配置接口不可用，已退回浏览器直连 Loki。直连可能被 CORS 拦截。",
          error: error.message
        });
      }
    }
  }

  saveState();
  renderSettings();
  return connection;
}

async function prepareSourceConnection(source, options = {}) {
  return activateConnection(sourceConnection(source), options);
}

function resetQueryBuilderForConnection(connectionId) {
  if (queryBuilderState.connectionId === connectionId) return;
  queryBuilderState.connectionId = connectionId || "";
  queryBuilderState.labelsLoaded = false;
  queryBuilderState.labels = [];
  queryBuilderState.labelValues = {};
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleServerStateSave();
}

function scheduleServerStateSave() {
  window.clearTimeout(stateSaveTimer);
  stateSaveTimer = window.setTimeout(saveServerState, 250);
}

async function saveServerState() {
  try {
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    });
  } catch {
    // Static-file fallback keeps using localStorage only.
  }
}

function initializeRuntimeState(nextState) {
  state = nextState;
  selectedSourceId = firstVisibleSource()?.id ?? null;
  selectedUserId = state.users[0]?.id ?? null;
  selectedGroupName = state.groups[0] ?? null;
  selectedConnectionId = state.settings.activeConnectionId;
  applyTheme();
}

function normalizeThemeMode(mode) {
  return THEME_MODES.has(mode) ? mode : "system";
}

function resolvedThemeMode(mode = state.settings.themeMode) {
  const normalized = normalizeThemeMode(mode);
  if (normalized === "dark" || normalized === "light") return normalized;
  return SYSTEM_DARK_QUERY?.matches ? "dark" : "light";
}

function applyTheme() {
  const mode = normalizeThemeMode(state.settings.themeMode);
  state.settings.themeMode = mode;
  const resolved = resolvedThemeMode(mode);
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolved;
}

function setThemeMode() {
  state.settings.themeMode = normalizeThemeMode(els.themeMode.value);
  applyTheme();
  saveState();
}

function bindSystemThemeSync() {
  if (!SYSTEM_DARK_QUERY) return;
  const sync = () => {
    if (normalizeThemeMode(state.settings.themeMode) === "system") applyTheme();
  };
  if (SYSTEM_DARK_QUERY.addEventListener) {
    SYSTEM_DARK_QUERY.addEventListener("change", sync);
  } else {
    SYSTEM_DARK_QUERY.addListener(sync);
  }
}

function activeUser() {
  return state.users.find(user => user.id === state.settings.activeUserId) || state.users[0];
}

function isAdmin() {
  return activeUser()?.role === "admin";
}

function sourcePermission(source) {
  if (isAdmin()) return "edit";
  const user = activeUser();
  let best = "none";
  (user?.groups || []).forEach(group => {
    const value = source.permissions?.[group] || "none";
    if (PERMISSION_LEVEL[value] > PERMISSION_LEVEL[best]) best = value;
  });
  return best;
}

function firstVisibleSource() {
  return state.sources.find(source => PERMISSION_LEVEL[sourcePermission(source)] >= PERMISSION_LEVEL.read);
}

function visibleSources() {
  return state.sources.filter(source => PERMISSION_LEVEL[sourcePermission(source)] >= PERMISSION_LEVEL.read);
}

function normalizeBaseUrl() {
  return (state.settings.lokiUrl || "/api/loki").replace(/\/+$/, "");
}

function buildHttpUrl(path, params = {}) {
  const url = new URL(`${normalizeBaseUrl()}${path}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return url;
}

function buildWsUrl(path, params = {}) {
  const url = buildHttpUrl(path, params);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url;
}

function requestHeaders() {
  const headers = {};
  if (state.settings.tenantId) headers["X-Scope-OrgID"] = state.settings.tenantId;
  return headers;
}

function setConnection(label, mode = "idle") {
  els.connectionState.textContent = label;
  els.connectionState.className = `status-pill ${mode}`;
}

function showToast(message, mode = "ok") {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast ${mode}`;
  toastTimer = window.setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 2200);
}

function markQuerySaved(saved) {
  els.saveQueryBtn.classList.toggle("saved", saved);
  const label = saved ? "LogQL 已保存" : "保存 LogQL";
  els.saveQueryBtn.title = label;
  els.saveQueryBtn.setAttribute("aria-label", label);
}

function nextResultVersion() {
  resultVersion += 1;
  return resultVersion;
}

function isCurrentResult(version, sourceId) {
  return version === resultVersion && sourceId === selectedSourceId;
}

function showLogin() {
  els.appShell.classList.add("hidden");
  els.loginScreen.classList.remove("hidden");
  els.loginUserName.value = "";
  els.loginPassword.value = "";
  els.loginError.textContent = "";
  els.loginUserName.focus();
}

function showApp() {
  els.loginScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
}

function login() {
  const loginName = els.loginUserName.value.trim();
  const user = state.users.find(item => item.name === loginName || item.id === loginName);
  if (!user || els.loginPassword.value !== user.password) {
    els.loginError.textContent = "用户名或密码错误";
    return;
  }
  sessionStorage.setItem(SESSION_USER_KEY, user.id);
  enterApp(user.id);
}

function logout() {
  sessionStorage.removeItem(SESSION_USER_KEY);
  nextResultVersion();
  stopTail();
  logs = [];
  selectedLogId = null;
  renderLogs();
  showLogin();
}

function enterApp(userId) {
  state.settings.activeUserId = userId;
  selectedUserId = userId;
  selectedSourceId = firstVisibleSource()?.id ?? null;
  saveState();
  showApp();
  renderAll();
  const source = firstVisibleSource();
  if (source) selectSource(source.id);
  syncSelectedSourceQuery();
  renderLogs();
  loadLabelNames({ silent: true });
}

function restoreSession() {
  const userId = sessionStorage.getItem(SESSION_USER_KEY);
  if (state.users.some(user => user.id === userId)) {
    enterApp(userId);
    return;
  }
  showLogin();
}

function openAccountModal() {
  const user = activeUser();
  if (!user) return;
  els.accountPassword.value = "";
  openModal("account");
}

function saveAccount() {
  const user = activeUser();
  if (!user) return;
  if (els.accountPassword.value) user.password = els.accountPassword.value;
  els.accountPassword.value = "";
  saveState();
  renderUserSwitcher();
  renderUsers();
  closeModal("account");
  setConnection("密码已保存", "ok");
}

function renderAll() {
  applyTheme();
  renderUserSwitcher();
  renderThemeControls();
  renderSettings();
  renderSources();
  renderSourceButtons();
  renderUsers();
  renderGroups();
  renderSourceModal();
  renderLayoutControls();
}

function renderUserSwitcher() {
  const user = activeUser();
  els.accountName.textContent = user?.name || "未登录";
}

function renderThemeControls() {
  els.themeMode.value = normalizeThemeMode(state.settings.themeMode);
}

function renderSettings() {
  if (!state.connections.some(connection => connection.id === selectedConnectionId)) {
    selectedConnectionId = state.settings.activeConnectionId || state.connections[0]?.id;
  }
  const connection = state.connections.find(item => item.id === selectedConnectionId) || state.connections[0];
  els.lokiConnectionList.innerHTML = "";
  state.connections.forEach(item => {
    const row = document.createElement("div");
    row.className = `managed-item ${item.id === connection?.id ? "active" : ""}`;
    row.innerHTML = `
      <div class="managed-title">${escapeHtml(item.name || "未命名连接")}</div>
      <div class="managed-subtitle">${escapeHtml(item.lokiUrl || "未配置地址")}</div>
    `;
    row.addEventListener("click", () => {
      selectedConnectionId = item.id;
      state.settings.activeConnectionId = item.id;
      applyActiveConnectionToSettings();
      saveState();
      renderSettings();
    });
    els.lokiConnectionList.appendChild(row);
  });
  els.lokiName.value = connection?.name || "";
  els.lokiUrl.value = connection?.lokiUrl || "";
  els.tenantId.value = connection?.tenantId || "";
  els.deleteConnectionBtn.disabled = state.connections.length <= 1 || !connection;
}

function renderSourceButtons() {
  const source = state.sources.find(item => item.id === selectedSourceId);
  const canRead = canQuerySource(source);
  const canEditLogQL = canEditSourceLogQL(source);
  els.newSourceBtn.style.display = isAdmin() ? "" : "none";
  els.sessionConfigRow.style.display = isAdmin() ? "" : "none";
  els.openConfigBtn.style.display = isAdmin() ? "" : "none";
  els.queryInput.readOnly = !canEditLogQL;
  els.inlineQueryBuilder.style.display = canEditLogQL && !state.settings.kickstartCollapsed ? "" : "none";
  els.kickstartDivider.style.display = canEditLogQL ? "" : "none";
  els.saveQueryBtn.style.display = canEditLogQL ? "" : "none";
  els.saveQueryBtn.disabled = !canEditLogQL;
  els.queryBtn.disabled = !canRead;
  els.tailBtn.disabled = !canRead;
}

function renderLayoutControls() {
  els.appShell.classList.toggle("sidebar-collapsed", !!state.settings.sidebarCollapsed);
  els.toggleSidebarBtn.textContent = state.settings.sidebarCollapsed ? ">" : "<";
  els.toggleSidebarBtn.setAttribute("aria-label", state.settings.sidebarCollapsed ? "展开侧栏" : "隐藏侧栏");
  const kickstartLabel = state.settings.kickstartCollapsed ? "展开 Kick start" : "折叠 Kick start";
  els.toggleKickstartBtn.classList.toggle("collapsed", !!state.settings.kickstartCollapsed);
  els.toggleKickstartBtn.title = kickstartLabel;
  els.toggleKickstartBtn.setAttribute("aria-label", kickstartLabel);
}

function toggleSidebar() {
  state.settings.sidebarCollapsed = !state.settings.sidebarCollapsed;
  saveState();
  renderLayoutControls();
}

function toggleKickstart() {
  state.settings.kickstartCollapsed = !state.settings.kickstartCollapsed;
  saveState();
  renderSourceButtons();
  renderLayoutControls();
}

function renderSources() {
  const sources = visibleSources();
  const grouped = sources.reduce((acc, source) => {
    acc[source.group] ||= [];
    acc[source.group].push(source);
    return acc;
  }, {});

  if (!sources.some(source => source.id === selectedSourceId)) {
    const nextSourceId = sources[0]?.id ?? null;
    if (selectedSourceId !== nextSourceId) {
      selectedSourceId = nextSourceId;
      resetQueryState("等待查询");
    }
  }

  els.sourceList.innerHTML = "";
  if (!sources.length) {
    els.sourceList.innerHTML = '<div class="group-title">当前用户没有可查看的日志源</div>';
    return;
  }

  Object.keys(grouped).sort().forEach(group => {
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = group;
    els.sourceList.appendChild(title);

    grouped[group].forEach(source => {
      const permission = sourcePermission(source);
      const connection = sourceConnection(source);
      const item = document.createElement("div");
      item.className = `source-item ${source.id === selectedSourceId ? "active" : ""}`;
      item.innerHTML = `
        <div class="source-name">${escapeHtml(source.name)}</div>
        <div class="source-query">${escapeHtml(source.query)}</div>
        <div class="source-actions">
          <span class="tag">${permission === "edit" ? "可编辑" : "只读"}</span>
          <span class="tag">${escapeHtml(connection?.name || "默认 Loki")}</span>
          ${isAdmin() ? '<button class="btn small" data-edit-source>编辑</button>' : ""}
        </div>
      `;
      item.addEventListener("click", () => selectSource(source.id));
      item.querySelector("[data-edit-source]")?.addEventListener("click", event => {
        event.stopPropagation();
        openSourceModal(source.id);
      });
      els.sourceList.appendChild(item);
    });
  });
}

function selectSource(id, options = {}) {
  const changed = selectedSourceId !== id;
  selectedSourceId = id;
  if (changed || options.reset) resetQueryState("等待查询");
  const source = state.sources.find(item => item.id === id);
  if (source) {
    els.queryInput.value = source.query;
    resetQueryBuilderForConnection(sourceConnection(source)?.id);
    hydrateQueryBuilderFromQuery(source.query);
    loadLabelNames({ silent: true });
  }
  markQuerySaved(false);
  renderSources();
  renderSourceButtons();
}

function syncSelectedSourceQuery() {
  const source = state.sources.find(item => item.id === selectedSourceId);
  if (!source) {
    els.queryInput.value = "";
    queryBuilderState.labelConditions = [createLabelCondition()];
    renderQueryBuilder();
    markQuerySaved(false);
    return;
  }
  if (!isAdmin()) {
    els.queryInput.value = source.query;
    hydrateQueryBuilderFromQuery(source.query);
    markQuerySaved(false);
  } else if (!els.queryInput.value.trim()) {
    els.queryInput.value = source.query;
    hydrateQueryBuilderFromQuery(source.query);
    markQuerySaved(false);
  }
}

function canQuerySource(source) {
  return !!source && PERMISSION_LEVEL[sourcePermission(source)] >= PERMISSION_LEVEL.read;
}

function canEditSourceLogQL(source) {
  return !!source && PERMISSION_LEVEL[sourcePermission(source)] >= PERMISSION_LEVEL.edit;
}

function openSourceModal(id = null) {
  if (!isAdmin()) return;
  editingSourceId = id;
  if (!editingSourceId) {
    editingSourceId = `new-${randomId()}`;
  }
  renderSourceModal();
  openModal("source");
}

function currentEditingSource() {
  if (!editingSourceId || editingSourceId.startsWith("new-")) {
    return {
      id: null,
      name: "新的日志源",
      group: "未分组",
      connectionId: defaultConnectionId(),
      query: "{}",
      permissions: { 运维组: "edit" }
    };
  }
  return state.sources.find(source => source.id === editingSourceId);
}

function renderSourceModal() {
  const source = currentEditingSource();
  els.sourceName.value = source?.name || "";
  els.sourceGroup.value = source?.group || "";
  els.sourceConnection.innerHTML = state.connections.map(connection => `
    <option value="${escapeHtml(connection.id)}">${escapeHtml(connection.name || connection.lokiUrl || "未命名连接")}</option>
  `).join("");
  els.sourceConnection.value = connectionById(source?.connectionId)?.id || defaultConnectionId();
  els.sourceQuery.value = source?.query || "";
  els.deleteSourceBtn.disabled = !source?.id;

  els.permissionList.innerHTML = "";
  state.groups.forEach(group => {
    const row = document.createElement("div");
    row.className = "permission-row";
    const value = source?.permissions?.[group] || "none";
    row.innerHTML = `
      <strong>${escapeHtml(group)}</strong>
      <select data-permission-group="${escapeHtml(group)}">
        <option value="none" ${value === "none" ? "selected" : ""}>无权限</option>
        <option value="read" ${value === "read" ? "selected" : ""}>只读</option>
        <option value="edit" ${value === "edit" ? "selected" : ""}>编辑</option>
      </select>
    `;
    els.permissionList.appendChild(row);
  });
}

function readPermissionForm() {
  const permissions = {};
  Array.from(els.permissionList.querySelectorAll("select")).forEach(select => {
    if (select.value !== "none") permissions[select.dataset.permissionGroup] = select.value;
  });
  return permissions;
}

function saveSource() {
  if (!isAdmin()) return;
  const payload = {
    name: els.sourceName.value.trim() || "未命名日志源",
    group: els.sourceGroup.value.trim() || "未分组",
    connectionId: els.sourceConnection.value || defaultConnectionId(),
    query: els.sourceQuery.value.trim() || "{}",
    permissions: readPermissionForm()
  };

  const existing = state.sources.find(source => source.id === editingSourceId);
  if (existing) {
    Object.assign(existing, payload);
    selectedSourceId = existing.id;
  } else {
    const created = { id: randomId(), ...payload };
    state.sources.push(created);
    selectedSourceId = created.id;
  }
  saveState();
  closeModal("source");
  renderAll();
  selectSource(selectedSourceId, { reset: true });
}

function deleteSource() {
  if (!isAdmin() || !editingSourceId) return;
  state.sources = state.sources.filter(source => source.id !== editingSourceId);
  selectedSourceId = firstVisibleSource()?.id ?? null;
  saveState();
  closeModal("source");
  renderAll();
}

function saveSelectedSourceQuery() {
  const source = state.sources.find(item => item.id === selectedSourceId);
  if (!canEditSourceLogQL(source)) {
    setConnection("无编辑权限", "bad");
    return;
  }
  const query = els.queryInput.value.trim();
  if (!query) return;
  source.query = query;
  saveState();
  renderSources();
  markQuerySaved(true);
  setConnection("LogQL 已保存", "ok");
}

function hydrateQueryBuilderFromQuery(query) {
  queryBuilderState.labelValues = {};
  const parsed = parseQueryForBuilder(query);
  queryBuilderState.labelConditions = parsed.labelConditions.length
    ? parsed.labelConditions
    : [createLabelCondition()];
  renderQueryBuilder();
  updateQueryPreview(parsed.hadSelector ? undefined : query.trim());
  queryBuilderState.labelConditions.forEach((condition, index) => {
    if (condition.label) loadLabelValues(condition.label, true, index);
  });
}

function parseQueryForBuilder(query) {
  const result = { hadSelector: false, labelConditions: [] };
  const selectorMatch = query.match(/^\s*\{([\s\S]*?)\}/);
  if (!selectorMatch) return result;
  result.hadSelector = true;

  splitMatcherList(selectorMatch[1]).forEach(part => {
    const match = part.match(/^\s*([A-Za-z_:][\w:.-]*)\s*(=~|!~|!=|=)\s*"((?:\\.|[^"\\])*)"\s*$/);
    if (!match) return;
    result.labelConditions.push(createLabelCondition({
      label: match[1],
      operator: match[2],
      value: unescapeLogqlString(match[3])
    }));
  });

  return result;
}

function splitMatcherList(value) {
  const parts = [];
  let current = "";
  let inQuote = false;
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && inQuote) {
      current += char;
      escaped = true;
      continue;
    }
    if (char === '"') inQuote = !inQuote;
    if (char === "," && !inQuote) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) parts.push(current);
  return parts;
}

function createLabelCondition(data = {}) {
  return {
    id: data.id || randomId(),
    label: data.label || "",
    operator: LABEL_OPERATORS.includes(data.operator) ? data.operator : "=",
    value: data.value || ""
  };
}

function addLabelCondition() {
  queryBuilderState.labelConditions.push(createLabelCondition());
  renderQueryBuilder();
  updateQueryPreview();
}

function removeLabelCondition(index) {
  queryBuilderState.labelConditions.splice(index, 1);
  if (!queryBuilderState.labelConditions.length) queryBuilderState.labelConditions.push(createLabelCondition());
  queryBuilderState.labelValues = {};
  renderQueryBuilder();
  reloadLabelValuesForBuilder();
  updateQueryPreview();
}

function renderQueryBuilder() {
  renderLabelConditions();
}

function renderLabelConditions() {
  els.labelConditionList.innerHTML = "";
  queryBuilderState.labelConditions.forEach((condition, index) => {
    const values = (queryBuilderState.labelValues[labelValueCacheKey(condition.label, index)] || []).slice(0, 500);
    const row = document.createElement("div");
    row.className = "label-filter-row";
    row.innerHTML = `
      <select class="filter-control" data-label-index="${index}" data-label-field="label" aria-label="Select Label">
        ${renderSelectOptions(queryBuilderState.labels, condition.label, "Select Label")}
      </select>
      <select class="filter-control operator-control" data-label-index="${index}" data-label-field="operator" aria-label="Operator">
        ${LABEL_OPERATOR_OPTIONS.map(operator => `<option value="${operator.value}" ${operator.value === condition.operator ? "selected" : ""}>${operator.label}</option>`).join("")}
      </select>
      <select class="filter-control" data-label-index="${index}" data-label-field="value" aria-label="Select value" ${condition.label ? "" : "disabled"}>
        ${renderSelectOptions(values, condition.value, "Select value")}
      </select>
      <div class="filter-actions">
        <button class="btn icon-btn mini add-filter-btn" type="button" data-add-label-condition title="添加 Label filter" aria-label="添加 Label filter">+</button>
        ${queryBuilderState.labelConditions.length > 1
          ? `<button class="btn icon-btn mini danger" type="button" data-remove-label-condition="${index}" title="删除 Label filter" aria-label="删除 Label filter">x</button>`
          : ""}
      </div>
    `;
    els.labelConditionList.appendChild(row);
  });
}

function renderSelectOptions(values, selectedValue, placeholder) {
  const selected = selectedValue || "";
  const uniqueValues = Array.from(new Set(values || []));
  if (selected && !uniqueValues.includes(selected)) uniqueValues.unshift(selected);
  return [
    `<option value="" ${selected ? "" : "selected"}>${placeholder}</option>`,
    ...uniqueValues.map(value => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`)
  ].join("");
}

function handleLabelConditionInput(event) {
  const index = Number(event.target.dataset.labelIndex);
  const field = event.target.dataset.labelField;
  if (!Number.isInteger(index) || !field || !queryBuilderState.labelConditions[index]) return;
  const previousValue = queryBuilderState.labelConditions[index][field];
  const previousLabel = queryBuilderState.labelConditions[index].label;
  queryBuilderState.labelConditions[index][field] = event.target.value;
  if (field === "label" && previousLabel !== event.target.value) {
    queryBuilderState.labelConditions[index].value = "";
  }
  if (previousValue !== event.target.value && ["label", "operator", "value"].includes(field)) {
    resetFollowingLabelConditions(index);
    renderQueryBuilder();
  }
  if (field === "label" && event.target.value) {
    loadLabelValues(event.target.value, true, index);
  }
  updateQueryPreview();
}

function handleLabelConditionCommit(event) {
  const index = Number(event.target.dataset.labelIndex);
  const field = event.target.dataset.labelField;
  if (!Number.isInteger(index) || !field) return;
  const label = queryBuilderState.labelConditions[index]?.label;
  if (field === "label" && label) {
    loadLabelValues(label, true, index);
  }
  if (["label", "operator", "value"].includes(field)) {
    reloadFollowingLabelValues(index);
  }
}

function updateQueryPreview(rawQuery) {
  const source = state.sources.find(item => item.id === selectedSourceId);
  if (!canEditSourceLogQL(source)) return;
  els.queryInput.value = rawQuery?.trim() || buildQueryFromBuilder();
  markQuerySaved(false);
}

function buildQueryFromBuilder() {
  const matchers = queryBuilderState.labelConditions
    .filter(condition => condition.label.trim() && condition.value.trim())
    .map(condition => buildLabelMatcher(condition));
  return `{${matchers.join(", ")}}`;
}

function buildLabelMatcher(condition) {
  const label = condition.label.trim();
  const value = condition.value.trim();
  if (condition.operator === "contains") {
    return `${label}=~".*${escapeLogqlRegex(value)}.*"`;
  }
  if (condition.operator === "not_contains") {
    return `${label}!~".*${escapeLogqlRegex(value)}.*"`;
  }
  return `${label}${condition.operator}"${escapeLogqlString(value)}"`;
}

function resetFollowingLabelConditions(index) {
  queryBuilderState.labelConditions.forEach((condition, conditionIndex) => {
    if (conditionIndex > index) condition.value = "";
  });
}

function labelValueCacheKey(label, index) {
  const name = String(label || "").trim();
  if (!name) return "";
  if (!Number.isInteger(index) || index <= 0) return `${name}|all`;
  return `${name}|${labelValueSeriesSelector(name, index)}`;
}

function labelValueSelectorForIndex(index) {
  if (!Number.isInteger(index) || index <= 0) return "";
  const matchers = queryBuilderState.labelConditions
    .slice(0, index)
    .filter(condition => condition.label.trim() && condition.value.trim())
    .map(condition => buildLabelMatcher(condition));
  return matchers.length ? `{${matchers.join(", ")}}` : "";
}

function labelValueSeriesSelector(name, index) {
  const conditions = Number.isInteger(index) && index > 0
    ? queryBuilderState.labelConditions
        .slice(0, index)
        .filter(condition => condition.label.trim() && condition.value.trim())
    : [];
  const matchers = conditions.map(condition => buildLabelMatcher(condition));
  return matchers.length ? `{${matchers.join(", ")}}` : "{}";
}

function reloadFollowingLabelValues(index) {
  queryBuilderState.labelConditions.forEach((condition, conditionIndex) => {
    if (conditionIndex > index && condition.label) {
      loadLabelValues(condition.label, true, conditionIndex);
    }
  });
}

function reloadLabelValuesForBuilder() {
  queryBuilderState.labelConditions.forEach((condition, index) => {
    if (condition.label) loadLabelValues(condition.label, true, index);
  });
}

function refreshLabelValueCache() {
  queryBuilderState.labelValues = {};
  renderQueryBuilder();
  reloadLabelValuesForBuilder();
}

async function loadLabelNames(options = {}) {
  const silent = options.silent === true;
  const source = state.sources.find(item => item.id === selectedSourceId);
  try {
    const connection = await prepareSourceConnection(source, { silent: true });
    resetQueryBuilderForConnection(connection?.id);
    setConnection("同步 Labels", "idle");
    const response = await fetch(buildHttpUrl("/loki/api/v1/labels", currentRangeParams()), { headers: requestHeaders() });
    if (!response.ok) throw new Error(`Loki 返回 HTTP ${response.status}`);
    const payload = await response.json();
    queryBuilderState.labels = Array.from(new Set(payload?.data || [])).sort();
    queryBuilderState.labelsLoaded = true;
    renderQueryBuilder();
    setConnection("标签已加载", "ok");
  } catch (error) {
    setConnection("Labels 同步失败", "bad");
    if (!silent) showDetail({ error: error.message, hint: "检查 Loki 地址，保存配置后会自动重新同步。" });
  }
}

async function loadLabelValues(label, rerender = true, index = -1) {
  const name = label.trim();
  if (!name) return;
  const source = state.sources.find(item => item.id === selectedSourceId);
  const connection = await prepareSourceConnection(source, { silent: true });
  resetQueryBuilderForConnection(connection?.id);
  const cacheKey = labelValueCacheKey(name, index);
  if (Object.prototype.hasOwnProperty.call(queryBuilderState.labelValues, cacheKey)) {
    if (rerender) renderQueryBuilder();
    return;
  }
  try {
    queryBuilderState.labelValues[cacheKey] = await fetchLabelValuesForIndex(name, index);
    if (rerender) renderQueryBuilder();
  } catch {
    delete queryBuilderState.labelValues[cacheKey];
    if (rerender) renderQueryBuilder();
  }
}

async function fetchLabelValuesForIndex(name, index) {
  if (!Number.isInteger(index) || index <= 0) {
    return fetchUnscopedLabelValues(name);
  }

  const params = currentRangeParams();
  params["match[]"] = labelValueSeriesSelector(name, index);
  const response = await fetch(buildHttpUrl("/loki/api/v1/series", params), {
    headers: requestHeaders()
  });
  if (!response.ok) throw new Error(`Loki 返回 HTTP ${response.status}`);
  const payload = await response.json();
  const values = Array.from(new Set((payload?.data || [])
    .map(series => series?.[name])
    .filter(value => value !== undefined && value !== null && value !== ""))).sort();
  return values;
}

async function fetchUnscopedLabelValues(name) {
  const response = await fetch(buildHttpUrl(`/loki/api/v1/label/${encodeURIComponent(name)}/values`), {
    headers: requestHeaders()
  });
  if (!response.ok) throw new Error(`Loki 返回 HTTP ${response.status}`);
  const payload = await response.json();
  return Array.from(new Set(payload?.data || [])).sort();
}

function currentRangeParams() {
  const nowMs = BigInt(Date.now());
  const rangeSeconds = BigInt(clamp(Number(els.rangeSelect.value || 900), 60, 2_592_000));
  return {
    start: ((nowMs - rangeSeconds * 1000n) * 1_000_000n).toString(),
    end: (nowMs * 1_000_000n).toString()
  };
}

function escapeLogqlString(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")
    .replaceAll('"', '\\"');
}

function escapeLogqlRegex(value) {
  return escapeLogqlString(escapeRegExp(value));
}

function unescapeLogqlString(value) {
  const map = { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\" };
  return String(value).replace(/\\([\\nrt"])/g, (_, char) => map[char] ?? char);
}

function renderGroupCheckboxes(container, selectedGroups = []) {
  container.innerHTML = "";
  state.groups.forEach(group => {
    const label = document.createElement("label");
    label.className = "checkbox-option";
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(group)}" ${selectedGroups.includes(group) ? "checked" : ""} />
      <span>${escapeHtml(group)}</span>
    `;
    container.appendChild(label);
  });
}

function readCheckedGroups(container) {
  return Array.from(container.querySelectorAll("input:checked")).map(input => input.value);
}

function renderUsers() {
  els.userList.innerHTML = "";
  if (!state.users.some(user => user.id === selectedUserId)) selectedUserId = state.users[0]?.id ?? null;
  state.users.forEach(user => {
    const item = document.createElement("div");
    item.className = `managed-item ${user.id === selectedUserId ? "active" : ""}`;
    item.innerHTML = `
      <div class="managed-title">${escapeHtml(user.name)} · ${user.role === "admin" ? "管理员" : "普通用户"}</div>
      <div class="managed-subtitle">${escapeHtml((user.groups || []).join(", ") || "未分组")}</div>
    `;
    item.addEventListener("click", () => {
      selectedUserId = user.id;
      renderUsers();
    });
    els.userList.appendChild(item);
  });

  const user = state.users.find(item => item.id === selectedUserId);
  els.userNameInput.value = user?.name || "";
  els.userRoleInput.value = user?.role || "user";
  renderGroupCheckboxes(els.userGroupsInput, user?.groups || []);
  els.deleteUserBtn.disabled = !user || state.users.length <= 1 || PROTECTED_USER_IDS.has(user.id);
  els.resetPasswordBtn.disabled = !user;
}

function openNewUserModal() {
  els.newUserNameInput.value = "";
  els.newUserPasswordInput.value = "";
  els.newUserRoleInput.value = "user";
  renderGroupCheckboxes(els.newUserGroupsInput, state.groups[0] ? [state.groups[0]] : []);
  openModal("newUser");
  els.newUserNameInput.focus();
}

function createUser() {
  const name = els.newUserNameInput.value.trim();
  const password = els.newUserPasswordInput.value;
  if (!name || !password) {
    setConnection("请输入用户名和密码", "bad");
    return;
  }
  if (state.users.some(user => user.name === name || user.id === name)) {
    setConnection("用户名已存在", "bad");
    return;
  }
  const user = {
    id: randomId(),
    name,
    role: els.newUserRoleInput.value,
    groups: readCheckedGroups(els.newUserGroupsInput),
    password
  };
  state.users.push(user);
  selectedUserId = user.id;
  saveState();
  closeModal("newUser");
  renderAll();
  setConnection("用户已创建", "ok");
}

function saveUser() {
  const user = state.users.find(item => item.id === selectedUserId);
  if (!user) return;
  user.name = els.userNameInput.value.trim() || "未命名用户";
  user.role = els.userRoleInput.value;
  user.groups = readCheckedGroups(els.userGroupsInput);
  saveState();
  renderAll();
  setConnection("用户已保存", "ok");
  showToast("用户修改成功");
}

function openResetPasswordModal() {
  const user = state.users.find(item => item.id === selectedUserId);
  if (!user) return;
  els.resetPasswordUserName.textContent = user.name;
  els.resetPasswordInput.value = "";
  els.resetPasswordInput.type = "password";
  els.toggleResetPasswordVisibility.textContent = "显示";
  openModal("resetPassword");
  els.resetPasswordInput.focus();
}

function toggleResetPasswordVisibility() {
  const shouldShow = els.resetPasswordInput.type === "password";
  els.resetPasswordInput.type = shouldShow ? "text" : "password";
  els.toggleResetPasswordVisibility.textContent = shouldShow ? "隐藏" : "显示";
  els.resetPasswordInput.focus();
}

function resetUserPassword() {
  const user = state.users.find(item => item.id === selectedUserId);
  const password = els.resetPasswordInput.value;
  if (!user || !password) return;
  user.password = password;
  els.resetPasswordInput.value = "";
  saveState();
  closeModal("resetPassword");
  setConnection("密码已重置", "ok");
  showToast("密码重置成功");
}

function deleteUser() {
  if (state.users.length <= 1) return;
  if (PROTECTED_USER_IDS.has(selectedUserId)) return;
  state.users = state.users.filter(user => user.id !== selectedUserId);
  if (state.settings.activeUserId === selectedUserId) state.settings.activeUserId = state.users[0]?.id;
  selectedUserId = state.users[0]?.id ?? null;
  saveState();
  renderAll();
}

function renderGroups() {
  if (!state.groups.includes(selectedGroupName)) selectedGroupName = state.groups[0] ?? null;
  els.groupList.innerHTML = "";
  state.groups.forEach(group => {
    const item = document.createElement("div");
    item.className = `managed-item ${group === selectedGroupName ? "active" : ""}`;
    item.innerHTML = `
      <div class="managed-title">${escapeHtml(group)}</div>
      <div class="managed-subtitle">${groupUsageText(group)}</div>
    `;
    item.addEventListener("click", () => {
      selectedGroupName = group;
      renderGroups();
    });
    els.groupList.appendChild(item);
  });
  els.groupNameInput.value = selectedGroupName || "";
  els.deleteGroupBtn.disabled = !selectedGroupName || state.groups.length <= 1 || PROTECTED_GROUPS.has(selectedGroupName);
}

function groupUsageText(group) {
  const userCount = state.users.filter(user => (user.groups || []).includes(group)).length;
  const sourceCount = state.sources.filter(source => source.permissions?.[group]).length;
  return `${userCount} 个用户，${sourceCount} 个日志源授权`;
}

function newGroup() {
  let index = state.groups.length + 1;
  let name = `新用户组${index}`;
  while (state.groups.includes(name)) {
    index += 1;
    name = `新用户组${index}`;
  }
  state.groups.push(name);
  selectedGroupName = name;
  saveState();
  renderAll();
}

function saveGroup() {
  const oldName = selectedGroupName;
  const newName = els.groupNameInput.value.trim();
  if (!oldName || !newName) return;
  if (oldName !== newName && state.groups.includes(newName)) {
    showDetail({ error: "用户组名称已存在", group: newName });
    return;
  }
  state.groups = state.groups.map(group => group === oldName ? newName : group);
  state.users.forEach(user => {
    user.groups = (user.groups || []).map(group => group === oldName ? newName : group);
  });
  state.sources.forEach(source => {
    if (source.permissions?.[oldName]) {
      source.permissions[newName] = source.permissions[oldName];
      delete source.permissions[oldName];
    }
  });
  selectedGroupName = newName;
  saveState();
  renderAll();
}

function deleteGroup() {
  if (!selectedGroupName || state.groups.length <= 1) return;
  if (PROTECTED_GROUPS.has(selectedGroupName)) return;
  const removed = selectedGroupName;
  state.groups = state.groups.filter(group => group !== removed);
  state.users.forEach(user => {
    user.groups = (user.groups || []).filter(group => group !== removed);
  });
  state.sources.forEach(source => {
    delete source.permissions?.[removed];
  });
  selectedGroupName = state.groups[0] ?? null;
  saveState();
  renderAll();
}

async function loadServerConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) return;
    const config = await response.json();
    if (config.lokiUrl) {
      const connection = activeConnection();
      if (connection) {
        connection.lokiUrl = config.lokiUrl;
        connection.tenantId = config.tenantId || "";
      }
      applyActiveConnectionToSettings();
      saveState();
      renderSettings();
    }
  } catch {
    // Static mode has no config endpoint.
  }
}

async function saveServerConfig(lokiUrl, tenantId) {
  const response = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lokiUrl, tenantId })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `保存代理配置失败: HTTP ${response.status}`);
  }
  return response.json();
}

function newConnection() {
  const connection = {
    id: randomId(),
    name: `Loki 连接 ${state.connections.length + 1}`,
    lokiUrl: "",
    tenantId: ""
  };
  state.connections.push(connection);
  selectedConnectionId = connection.id;
  state.settings.activeConnectionId = connection.id;
  saveState();
  renderSettings();
}

function deleteConnection() {
  if (state.connections.length <= 1) return;
  const removedConnectionId = selectedConnectionId;
  state.connections = state.connections.filter(connection => connection.id !== selectedConnectionId);
  selectedConnectionId = state.connections[0]?.id;
  state.settings.activeConnectionId = selectedConnectionId;
  state.sources.forEach(source => {
    if (source.connectionId === removedConnectionId) source.connectionId = selectedConnectionId;
  });
  applyActiveConnectionToSettings();
  saveState();
  renderSettings();
}

async function saveSettings() {
  const connection = state.connections.find(item => item.id === selectedConnectionId) || state.connections[0];
  if (!connection) return;
  connection.name = els.lokiName.value.trim() || "未命名连接";
  connection.lokiUrl = els.lokiUrl.value.trim() || defaultState.settings.lokiUrl;
  connection.tenantId = els.tenantId.value.trim();
  state.settings.activeConnectionId = connection.id;
  applyActiveConnectionToSettings();
  const inputUrl = connection.lokiUrl;
  const tenantId = els.tenantId.value.trim();
  if (/^https?:\/\//i.test(inputUrl)) {
    try {
      const saved = await saveServerConfig(inputUrl, tenantId);
      connection.lokiUrl = saved.lokiUrl;
      connection.tenantId = saved.tenantId || "";
      state.settings.lokiUrl = "/api/loki";
      state.settings.lokiTarget = saved.lokiUrl;
      state.settings.tenantId = saved.tenantId || "";
      setConnection("配置已保存", "ok");
    } catch (error) {
      state.settings.lokiUrl = inputUrl;
      state.settings.lokiTarget = inputUrl;
      state.settings.tenantId = tenantId;
      setConnection("本地保存", "idle");
      showDetail({
        warning: "代理配置接口不可用，已退回浏览器本地保存。直连 Loki 可能仍会被 CORS 拦截。",
        error: error.message
      });
    }
  } else {
    state.settings.lokiUrl = inputUrl;
    state.settings.lokiTarget = inputUrl;
    state.settings.tenantId = tenantId;
    setConnection("配置已保存", "ok");
  }
  saveState();
  renderSettings();
}

async function testHealth() {
  try {
    setConnection("测试中", "idle");
    const response = await fetch(buildHttpUrl("/ready"), { headers: requestHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setConnection("可用", "ok");
  } catch (error) {
    setConnection("不可用", "bad");
    showDetail({ error: error.message, hint: "检查 Loki 地址、代理配置或 CORS 设置。" });
  }
}

async function queryLogs(options = {}) {
  const preserveTail = options?.preserveTail === true;
  const runVersion = nextResultVersion();
  const sourceId = selectedSourceId;
  if (!preserveTail) stopTail();
  const source = state.sources.find(item => item.id === selectedSourceId);
  if (!canQuerySource(source)) {
    setConnection("无权限", "bad");
    els.resultMeta.textContent = "当前用户没有可查询的日志源";
    return false;
  }
  if (!canEditSourceLogQL(source)) els.queryInput.value = source.query;
  const query = els.queryInput.value.trim();
  if (!query) return false;
  const connection = await prepareSourceConnection(source);
  if (!isCurrentResult(runVersion, sourceId)) return false;

  const now = Date.now();
  const rangeSeconds = Number(els.rangeSelect.value);
  const start = (now - rangeSeconds * 1000) * 1_000_000;
  const end = now * 1_000_000;
  const limit = clamp(Number(els.limitInput.value || 500), 20, 5000);

  setConnection(`查询中 · ${connection?.name || "Loki"}`, "idle");
  els.resultMeta.textContent = "正在加载";

  try {
    const url = buildHttpUrl("/loki/api/v1/query_range", {
      query,
      start,
      end,
      limit,
      direction: els.directionSelect.value
    });
    const response = await fetch(url, { headers: requestHeaders() });
    if (!response.ok) throw new Error(`Loki 返回 HTTP ${response.status}`);
    const payload = await response.json();
    if (!isCurrentResult(runVersion, sourceId)) return false;
    logs = normalizeLokiResult(payload);
    selectedLogId = null;
    renderLogs();
    setConnection("已连接", "ok");
    return true;
  } catch (error) {
    if (!isCurrentResult(runVersion, sourceId)) return false;
    setConnection("查询失败", "bad");
    showDetail({ error: error.message });
    return false;
  }
}

function normalizeLokiResult(payload, direction = els.directionSelect.value) {
  const rows = [];
  const results = payload?.data?.result || [];
  results.forEach(stream => {
    const label = streamColumnSummary(stream.stream || {});
    (stream.values || []).forEach(value => {
      rows.push(makeLogRow(value[0], value[1], stream.stream || {}, label));
    });
  });
  rows.sort((a, b) => Number(a.tsNs - b.tsNs));
  if (direction === "backward") rows.reverse();
  return rows.slice(0, MAX_ROWS);
}

function makeLogRow(tsNsRaw, line, labels, source) {
  const tsNs = BigInt(tsNsRaw);
  const timestamp = new Date(Number(tsNs / 1_000_000n));
  const parsed = parseLine(line);
  return {
    id: randomId(),
    tsNs,
    time: formatTime(timestamp),
    timestamp: timestamp.toISOString(),
    source,
    labels,
    raw: line,
    parsed,
    level: detectLevel(line, parsed)
  };
}

async function startTail() {
  const sourceId = selectedSourceId;
  const source = state.sources.find(item => item.id === selectedSourceId);
  if (!canQuerySource(source)) {
    setConnection("无权限", "bad");
    els.resultMeta.textContent = "当前用户没有实时查看权限";
    return;
  }
  if (!canEditSourceLogQL(source)) els.queryInput.value = source.query;
  const query = els.queryInput.value.trim();
  if (!query) return;
  stopTail();
  const historyLoaded = await queryLogs({ preserveTail: true });
  if (!historyLoaded || sourceId !== selectedSourceId) return;
  liveQuery = query;
  liveSinceNs = latestLogNs() ?? BigInt(Date.now()) * 1_000_000n;
  allowTailFallback = true;
  const tailVersion = resultVersion;

  const url = buildWsUrl("/loki/api/v1/tail", {
    query,
    limit: clamp(Number(els.limitInput.value || 500), 20, 5000),
    delay_for: "1s"
  });

  const socket = new WebSocket(url);
  tailSocket = socket;
  els.tailBtn.disabled = true;
  els.stopTailBtn.disabled = false;
  setConnection("连接实时", "idle");
  els.resultMeta.textContent = `${logs.length} 行历史日志，等待新日志`;

  socket.onopen = () => {
    if (tailSocket !== socket || !isCurrentResult(tailVersion, sourceId)) return;
    setConnection("实时中", "ok");
  };
  socket.onmessage = event => {
    if (tailSocket !== socket || !isCurrentResult(tailVersion, sourceId)) return;
    try {
      const payload = JSON.parse(event.data);
      const rows = [];
      (payload.streams || []).forEach(stream => {
        const label = streamColumnSummary(stream.stream || {});
        (stream.values || []).forEach(value => rows.push(makeLogRow(value[0], value[1], stream.stream || {}, label)));
      });
      if (rows.length) appendLiveRows(rows);
    } catch (error) {
      showDetail({ error: error.message, raw: event.data });
    }
  };
  socket.onerror = () => {
    if (tailSocket !== socket || !isCurrentResult(tailVersion, sourceId)) return;
    setConnection("实时异常", "bad");
  };
  socket.onclose = event => {
    if (tailSocket !== socket) return;
    tailSocket = null;
    els.tailBtn.disabled = false;
    els.stopTailBtn.disabled = true;
    if (!isCurrentResult(tailVersion, sourceId)) return;
    if (allowTailFallback && event.code && event.code !== 1000) {
      startPollingTail(`WebSocket 已关闭，code=${event.code}`);
      return;
    }
    setConnection("已停止", "idle");
  };
}

function stopTail() {
  allowTailFallback = false;
  if (tailSocket) {
    tailSocket.close();
    tailSocket = null;
  }
  stopPollingTail();
  els.tailBtn.disabled = false;
  els.stopTailBtn.disabled = true;
}

function startPollingTail(reason) {
  stopPollingTail();
  els.tailBtn.disabled = true;
  els.stopTailBtn.disabled = false;
  setConnection("轮询实时", "ok");
  els.resultMeta.textContent = `${logs.length} 行历史日志，WebSocket 不可用，已切换轮询`;
  showDetail({ warning: reason, fallback: "已自动切换为 2 秒轮询 query_range。" }, false);
  pollTailOnce();
  livePollTimer = window.setInterval(pollTailOnce, 2000);
}

function stopPollingTail() {
  if (livePollTimer) {
    window.clearInterval(livePollTimer);
    livePollTimer = null;
  }
}

async function pollTailOnce() {
  if (!liveQuery || liveSinceNs === null) return;
  const runVersion = resultVersion;
  const sourceId = selectedSourceId;
  const query = liveQuery;
  const sinceNs = liveSinceNs;
  const source = state.sources.find(item => item.id === sourceId);
  await prepareSourceConnection(source, { silent: true });
  if (!isCurrentResult(runVersion, sourceId)) return;
  const start = (sinceNs + 1n).toString();
  const end = (BigInt(Date.now()) * 1_000_000n).toString();
  try {
    const url = buildHttpUrl("/loki/api/v1/query_range", {
      query,
      start,
      end,
      limit: clamp(Number(els.limitInput.value || 500), 20, 5000),
      direction: "forward"
    });
    const response = await fetch(url, { headers: requestHeaders() });
    if (!response.ok) throw new Error(`Loki 返回 HTTP ${response.status}`);
    const rows = normalizeLokiResult(await response.json(), "forward").filter(row => row.tsNs > sinceNs);
    if (!isCurrentResult(runVersion, sourceId) || query !== liveQuery) return;
    if (rows.length) appendLiveRows(rows);
  } catch (error) {
    if (!isCurrentResult(runVersion, sourceId)) return;
    setConnection("轮询异常", "bad");
    showDetail({ error: error.message });
  }
}

function appendLiveRows(rows) {
  rows.sort((a, b) => Number(a.tsNs - b.tsNs));
  liveSinceNs = rows.reduce((max, row) => row.tsNs > max ? row.tsNs : max, liveSinceNs ?? 0n);
  if (els.directionSelect.value === "backward") {
    logs = [...rows.slice().reverse(), ...logs].slice(0, MAX_ROWS);
  } else {
    logs.push(...rows);
    if (logs.length > MAX_ROWS) logs = logs.slice(logs.length - MAX_ROWS);
  }
  renderLogs();
}

function latestLogNs() {
  if (!logs.length) return null;
  return logs.reduce((max, row) => row.tsNs > max ? row.tsNs : max, logs[0].tsNs);
}

function renderLogs() {
  const filtered = applyFilters(logs);
  const fragment = document.createDocumentFragment();
  filtered.forEach(row => {
    const line = document.createElement("div");
    line.className = `log-row ${row.id === selectedLogId ? "selected" : ""}`;
    line.innerHTML = `
      <div class="log-time">${escapeHtml(row.time)}</div>
      <div class="log-level level-${row.level}">${escapeHtml(row.level.toUpperCase())}</div>
      <div class="log-source" title="${escapeHtml(row.source)}">${escapeHtml(row.source)}</div>
      <div class="log-message">${highlightLine(row.raw)}</div>
    `;
    line.addEventListener("click", () => {
      selectedLogId = row.id;
      showDetail(row);
      openModal("detail");
      renderLogs();
    });
    fragment.appendChild(line);
  });
  els.logList.innerHTML = "";
  els.logList.appendChild(fragment);
  els.logList.classList.toggle("wrap", els.wrapLines.checked);
  els.resultMeta.textContent = `${filtered.length} / ${logs.length} 行`;
  if (els.autoScroll.checked) {
    els.logList.scrollTop = els.directionSelect.value === "backward" ? 0 : els.logList.scrollHeight;
  }
}

function toggleLogFullscreen() {
  const active = els.viewerCard.classList.toggle("fullscreen");
  els.toggleLogFullscreenBtn.textContent = active ? "退出全屏" : "全屏";
  els.toggleLogFullscreenBtn.setAttribute("aria-pressed", active ? "true" : "false");
  if (els.autoScroll.checked) {
    els.logList.scrollTop = els.directionSelect.value === "backward" ? 0 : els.logList.scrollHeight;
  }
}

function applyFilters(rows) {
  const include = els.includeFilter.value;
  const exclude = els.excludeFilter.value;
  const activeLevels = new Set(els.levelFilters.filter(input => input.checked).map(input => input.value));
  return rows.filter(row => {
    if (!activeLevels.has(row.level)) return false;
    if (include && !matchFilter(row.raw, include)) return false;
    if (exclude && matchFilter(row.raw, exclude)) return false;
    return true;
  });
}

function matchFilter(text, pattern) {
  if (els.regexFilter.checked) {
    try {
      return new RegExp(pattern, els.caseSensitive.checked ? "" : "i").test(text);
    } catch {
      return false;
    }
  }
  const left = els.caseSensitive.checked ? text : text.toLowerCase();
  const right = els.caseSensitive.checked ? pattern : pattern.toLowerCase();
  return left.includes(right);
}

function highlightLine(line) {
  const escaped = escapeHtml(line);
  const include = els.includeFilter.value;
  if (!include || els.regexFilter.checked) return escaped;
  return escaped.replace(new RegExp(escapeRegExp(include), els.caseSensitive.checked ? "g" : "gi"), match => `<span class="match">${match}</span>`);
}

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
}

function detectLevel(line, parsed) {
  const value = String(parsed.level || parsed.severity || parsed.log_level || "").toLowerCase();
  const combined = `${value} ${line}`.toLowerCase();
  if (/\b(error|fatal|panic|exception|traceback)\b/.test(combined)) return "error";
  if (/\b(warn|warning)\b/.test(combined)) return "warn";
  if (/\b(info|notice)\b/.test(combined)) return "info";
  if (/\b(debug|trace)\b/.test(combined)) return "debug";
  return "other";
}

function clearLogs() {
  nextResultVersion();
  logs = [];
  selectedLogId = null;
  renderLogs();
  showDetail({ message: "已清空当前视图" }, false);
}

function resetQueryState(message = "等待查询") {
  nextResultVersion();
  stopTail();
  logs = [];
  selectedLogId = null;
  liveQuery = "";
  liveSinceNs = null;
  renderLogs();
  els.resultMeta.textContent = message;
  showDetail({ message }, false);
}

function exportLogs() {
  const content = applyFilters(logs).map(row => `${row.timestamp} ${row.source} ${row.level.toUpperCase()} ${row.raw}`).join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `logs-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function modalForName(name) {
  return {
    config: els.configModal,
    source: els.sourceModal,
    newUser: els.newUserModal,
    resetPassword: els.resetPasswordModal,
    account: els.accountModal,
    detail: els.logDetailModal
  }[name] || els.logDetailModal;
}

function openModal(name) {
  modalForName(name).classList.remove("hidden");
}

function closeModal(name) {
  modalForName(name).classList.add("hidden");
}

function switchConfigTab(tab) {
  els.configTabs.forEach(button => button.classList.toggle("active", button.dataset.configTab === tab));
  els.tabConnection.classList.toggle("active", tab === "connection");
  els.tabUsers.classList.toggle("active", tab === "users");
  els.tabGroups.classList.toggle("active", tab === "groups");
}

function showDetail(value, reveal = true) {
  els.logDetail.textContent = JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item, 2);
  if (reveal) openModal("detail");
}

function streamColumnSummary(labels) {
  const selectedLabels = queryBuilderState.labelConditions
    .filter(condition => condition.label.trim() && condition.value.trim())
    .map(condition => condition.label.trim());
  const parts = Array.from(new Set(selectedLabels))
    .filter(label => labels[label] !== undefined)
    .map(label => `${label}=${labels[label]}`);
  return parts.length ? parts.join(" ") : labelSummary(labels);
}

function labelSummary(labels) {
  return labels.app || labels.service || labels.job || labels.container || labels.filename || "stream";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatTime(date) {
  const pad = value => String(value).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function bindEvents() {
  els.loginBtn.addEventListener("click", login);
  els.loginPassword.addEventListener("keydown", event => {
    if (event.key === "Enter") login();
  });
  els.accountBtn.addEventListener("click", openAccountModal);
  els.saveAccountBtn.addEventListener("click", saveAccount);
  els.logoutBtn.addEventListener("click", logout);
  els.themeMode.addEventListener("change", setThemeMode);
  els.toggleSidebarBtn.addEventListener("click", toggleSidebar);
  els.toggleKickstartBtn.addEventListener("click", toggleKickstart);
  els.openConfigBtn.addEventListener("click", () => openModal("config"));
  document.querySelectorAll("[data-close-modal]").forEach(item => {
    item.addEventListener("click", () => closeModal(item.dataset.closeModal));
  });
  els.configTabs.forEach(button => button.addEventListener("click", () => switchConfigTab(button.dataset.configTab)));
  els.newConnectionBtn.addEventListener("click", newConnection);
  els.saveSettingsBtn.addEventListener("click", saveSettings);
  els.deleteConnectionBtn.addEventListener("click", deleteConnection);
  els.healthBtn.addEventListener("click", testHealth);
  els.newSourceBtn.addEventListener("click", () => openSourceModal(null));
  els.saveSourceBtn.addEventListener("click", saveSource);
  els.deleteSourceBtn.addEventListener("click", deleteSource);
  els.saveQueryBtn.addEventListener("click", saveSelectedSourceQuery);
  els.queryInput.addEventListener("input", () => markQuerySaved(false));
  els.labelConditionList.addEventListener("input", handleLabelConditionInput);
  els.labelConditionList.addEventListener("change", event => {
    handleLabelConditionInput(event);
    handleLabelConditionCommit(event);
  });
  els.labelConditionList.addEventListener("click", event => {
    if (event.target.closest("[data-add-label-condition]")) {
      addLabelCondition();
      return;
    }
    const button = event.target.closest("[data-remove-label-condition]");
    if (button) removeLabelCondition(Number(button.dataset.removeLabelCondition));
  });
  els.newUserBtn.addEventListener("click", openNewUserModal);
  els.createUserBtn.addEventListener("click", createUser);
  [els.newUserNameInput, els.newUserPasswordInput].forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") createUser();
    });
  });
  els.saveUserBtn.addEventListener("click", saveUser);
  els.resetPasswordBtn.addEventListener("click", openResetPasswordModal);
  els.saveResetPasswordBtn.addEventListener("click", resetUserPassword);
  els.toggleResetPasswordVisibility.addEventListener("click", toggleResetPasswordVisibility);
  els.resetPasswordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") resetUserPassword();
  });
  els.deleteUserBtn.addEventListener("click", deleteUser);
  els.newGroupBtn.addEventListener("click", newGroup);
  els.saveGroupBtn.addEventListener("click", saveGroup);
  els.deleteGroupBtn.addEventListener("click", deleteGroup);
  els.queryBtn.addEventListener("click", queryLogs);
  els.rangeSelect.addEventListener("change", refreshLabelValueCache);
  els.tailBtn.addEventListener("click", startTail);
  els.stopTailBtn.addEventListener("click", stopTail);
  els.clearBtn.addEventListener("click", clearLogs);
  els.exportBtn.addEventListener("click", exportLogs);
  els.wrapLines.addEventListener("change", renderLogs);
  els.toggleLogFullscreenBtn.addEventListener("click", toggleLogFullscreen);
  [els.includeFilter, els.excludeFilter, els.regexFilter, els.caseSensitive, ...els.levelFilters]
    .forEach(input => input.addEventListener("input", renderLogs));
}

async function init() {
  initializeRuntimeState(await loadState());
  if (shouldSeedServerState) saveState();
  bindEvents();
  bindSystemThemeSync();
  applyTheme();
  await loadServerConfig();
  restoreSession();
}

init();
