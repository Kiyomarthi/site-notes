// popup.js — menu backdrop + English UI + active-tab highlight

let currentHost = null;
let activeTabHost = null; // current browser active tab host

// DOM refs
const hamburgerBtn = document.getElementById("hamburger");
const hamburgerMenu = document.getElementById("hamburger-menu");
const menuBackdrop = document.getElementById("menu-backdrop");
const menuHomeBtn = document.getElementById("menu-home");
const menuListsBtn = document.getElementById("menu-lists");
const menuSettingsBtn = document.getElementById("menu-settings");

const listPage = document.getElementById("list-page");
const mainPage = document.getElementById("main-page");
const listBackBtn = document.getElementById("list-back");
const sitesListEl = document.getElementById("sites-list");
const siteFilterEl = document.getElementById("site-filter");

const titleHostEl = document.getElementById("title-host");
const openSiteBtn = document.getElementById("open-site");
const removeSiteBtn = document.getElementById("remove-site");

const taskInput = document.getElementById("task-input");
const taskListEl = document.getElementById("task-list");
const copyTasksBtn = document.getElementById("copy-tasks");
const clearTasksBtn = document.getElementById("clear-tasks");

const notesText = document.getElementById("notes-text");
const copyNotesBtn = document.getElementById("copy-notes");
const clearNotesBtn = document.getElementById("clear-notes");

const fileInput = document.getElementById("file-input");
const fileListEl = document.getElementById("file-list");

// helpers
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

function openMenu() {
  hamburgerMenu.classList.add("show");
  hamburgerBtn.classList.add("open");
  menuBackdrop.style.display = "block";
  menuBackdrop.style.opacity = "1";
  hamburgerMenu.setAttribute("aria-hidden", "false");
}
function closeMenu() {
  hamburgerMenu.classList.remove("show");
  hamburgerBtn.classList.remove("open");
  menuBackdrop.style.display = "none";
  menuBackdrop.style.opacity = "0";
  hamburgerMenu.setAttribute("aria-hidden", "true");
}
function toggleMenu() {
  if (hamburgerMenu.classList.contains("show")) closeMenu();
  else openMenu();
}

function showListPage() {
  listPage.classList.add("show");
  listPage.style.display = "block";
  mainPage.style.display = "none";
}
function hideListPage() {
  listPage.classList.remove("show");
  listPage.style.display = "none";
  mainPage.style.display = "block";
}

// backdrop click closes menu
menuBackdrop.addEventListener("click", () => closeMenu());

// get active tab hostname
function getActiveHost() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try {
        resolve(new URL(tabs[0].url).hostname);
      } catch {
        resolve(null);
      }
    });
  });
}

function ensureHostExists(host) {
  return new Promise((resolve) => {
    chrome.storage.local.get([host], (res) => {
      if (!res[host]) {
        const obj = { tasks: [], notes: "", files: [] };
        const o = {};
        o[host] = obj;
        chrome.storage.local.set(o, () => resolve());
      } else resolve();
    });
  });
}

function refreshSitesList() {
  return new Promise(async (resolve) => {
    activeTabHost = await getActiveHost(); // update current active tab
    chrome.storage.local.get(null, (all) => {
      const hosts = Object.keys(all)
        .filter((k) => {
          const v = all[k];
          return (
            v &&
            typeof v === "object" &&
            ("tasks" in v || "notes" in v || "files" in v)
          );
        })
        .sort();
      renderSites("", hosts);
      resolve(hosts);
    });
  });
}

// initialization

document.addEventListener("DOMContentLoaded", async () => {
  // Determine the active tab host first
  activeTabHost = await getActiveHost(); // helper returns hostname or null

  // Bind UI events (always)
  bindEvents();

  // Refresh list of saved sites (updates side list and activeTabHost)
  const hosts = await refreshSitesList();

  // If there's an active browser tab host, prefer it (even if it's not yet in storage)
  if (activeTabHost) {
    currentHost = activeTabHost;

    // Try to load stored data for this host; if none, render empty for this host
    chrome.storage.local.get([currentHost], (res) => {
      const d = res[currentHost];
      titleHostEl.textContent = currentHost || "(none)";
      if (d) {
        // Stored data exists => render it
        renderTasks(d.tasks || []);
        notesText.value = d.notes || "";
        renderFiles(d.files || []);
      } else {
        // No stored data yet for this host => show empty state for this host
        renderEmptyData();
      }
    });
    return;
  }

  // No active host (e.g. chrome:// or no tab URL) => fallback to any saved host (if exists)
  if (hosts && hosts.length > 0) {
    selectSite(hosts[0]);
  } else {
    currentHost = null;
    titleHostEl.textContent = "(none)";
    renderEmptyData();
  }
});

function bindEvents() {
  hamburgerBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleMenu();
  });

  menuHomeBtn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    closeMenu();
    const host = await getActiveHost();
    if (!host) {
      alert("No active tab with valid hostname.");
      return;
    }
    await ensureHostExists(host);
    selectSite(host);
    hideListPage();
  });

  menuListsBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeMenu();
    showListPage();
    siteFilterEl.value = "";
    renderSites("");
  });
  menuSettingsBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeMenu();
    alert("Settings (placeholder)");
  });

  listBackBtn.addEventListener("click", () => hideListPage());
  siteFilterEl.addEventListener("input", () =>
    renderSites(siteFilterEl.value.trim().toLowerCase())
  );

  taskInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const txt = taskInput.value.trim();
    if (!txt) return;
    if (!currentHost) {
      const host = await getActiveHost();
      if (!host) {
        alert("No valid active tab.");
        return;
      }
      await ensureHostExists(host);
      currentHost = host;
      titleHostEl.textContent = host;
    }
    addTask(currentHost, txt);
    taskInput.value = "";
  });

  notesText.addEventListener(
    "input",
    debounce(() => {
      if (!currentHost) return;
      updateNotes(currentHost, notesText.value);
      refreshSitesList();
    }, 300)
  );

  fileInput.addEventListener("change", () => {
    if (!currentHost) return;
    const arr = Array.from(fileInput.files).map((f) => ({
      name: f.name,
      size: f.size,
    }));
    addFiles(currentHost, arr);
    fileInput.value = "";
  });

  copyTasksBtn.addEventListener("click", () => copyTasks(currentHost));
  clearTasksBtn.addEventListener("click", () => {
    if (!currentHost) return;
    if (!confirm(`Clear all tasks for ${currentHost}?`)) return;
    clearTasks(currentHost);
  });

  copyNotesBtn.addEventListener("click", () => copyNotes());
  clearNotesBtn.addEventListener("click", () => {
    if (!currentHost) return;
    if (!confirm(`Clear notes for ${currentHost}?`)) return;
    clearNotes(currentHost);
  });

  openSiteBtn.addEventListener("click", () => {
    if (!currentHost) return;
    chrome.tabs.create({ url: `https://${currentHost}` });
  });

  removeSiteBtn.addEventListener("click", () => {
    if (!currentHost) return;
    if (!confirm(`Delete ALL data for ${currentHost}?`)) return;
    chrome.storage.local.remove(currentHost, async () => {
      const hosts = await refreshSitesList();
      if (hosts.length) selectSite(hosts[0]);
      else {
        currentHost = null;
        titleHostEl.textContent = "(none)";
        renderEmptyData();
      }
    });
  });
}

// render sites list
function renderSites(filter = "", hostsOverride) {
  if (hostsOverride) {
    buildSitesList(hostsOverride.filter((h) => h.includes(filter)));
    return;
  }
  chrome.storage.local.get(null, (all) => {
    const hosts = Object.keys(all)
      .filter((k) => {
        const v = all[k];
        return (
          v &&
          typeof v === "object" &&
          ("tasks" in v || "notes" in v || "files" in v)
        );
      })
      .filter((h) => h.includes(filter))
      .sort();
    buildSitesList(hosts);
  });
}

function buildSitesList(hosts) {
  sitesListEl.innerHTML = "";
  if (!hosts.length) {
    const empty = document.createElement("div");
    empty.className = "tiny muted";
    empty.textContent = "No saved sites yet.";
    sitesListEl.appendChild(empty);
    return;
  }
  hosts.forEach((h) => {
    const li = document.createElement("li");
    li.dataset.host = h;

    const left = document.createElement("div");
    left.className = "host";
    left.style.alignItems = "flex-start";
    const text = document.createElement("span");
    text.textContent = h;
    text.style.fontSize = "13px";
    text.style.color = "#0f172a";
    const tiny = document.createElement("div");
    tiny.className = "tiny muted";
    tiny.textContent = "View / Edit";
    left.appendChild(text);
    left.appendChild(tiny);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "8px";

    // active-tab indicator
    if (activeTabHost && activeTabHost === h) {
      const dot = document.createElement("div");
      dot.className = "active-tab-indicator";
      dot.title = "Open in active tab";
      right.appendChild(dot);
    }

    const openBtn = document.createElement("button");
    openBtn.textContent = "↗";
    openBtn.title = `Open ${h}`;
    openBtn.onclick = (ev) => {
      ev.stopPropagation();
      chrome.tabs.create({ url: `https://${h}` });
    };
    right.appendChild(openBtn);

    li.appendChild(left);
    li.appendChild(right);

    li.onclick = () => {
      selectSite(h);
      hideListPage();
    };

    sitesListEl.appendChild(li);
  });
}

// select / render data
function selectSite(host) {
  currentHost = host;
  titleHostEl.textContent = host;
  Array.from(sitesListEl.children).forEach((li) => {
    if (li.dataset && li.dataset.host === host) li.classList.add("active");
    else li.classList.remove("active");
  });
  chrome.storage.local.get([host], (res) => {
    const d = res[host] || { tasks: [], notes: "", files: [] };
    renderTasks(d.tasks || []);
    notesText.value = d.notes || "";
    renderFiles(d.files || []);
  });
}

function renderEmptyData() {
  renderTasks([]);
  notesText.value = "";
  renderFiles([]);
}

// per-host operations (unchanged)
function saveHostData(host, data) {
  const obj = {};
  obj[host] = data;
  chrome.storage.local.set(obj, () => refreshSitesList());
}

function addTask(host, text) {
  if (!host || !text) return;
  chrome.storage.local.get([host], (res) => {
    const d = res[host] || { tasks: [], notes: "", files: [] };
    d.tasks.push({ text, done: false });
    saveHostData(host, d);
    renderTasks(d.tasks);
  });
}
function toggleTask(host, idx) {
  chrome.storage.local.get([host], (res) => {
    const d = res[host] || { tasks: [], notes: "", files: [] };
    if (!d.tasks[idx]) return;
    d.tasks[idx].done = !d.tasks[idx].done;
    saveHostData(host, d);
    renderTasks(d.tasks);
  });
}
function deleteTask(host, idx) {
  chrome.storage.local.get([host], (res) => {
    const d = res[host] || { tasks: [], notes: "", files: [] };
    d.tasks.splice(idx, 1);
    saveHostData(host, d);
    renderTasks(d.tasks);
  });
}
function clearTasks(host) {
  chrome.storage.local.get([host], (res) => {
    const d = res[host] || { tasks: [], notes: "", files: [] };
    d.tasks = [];
    saveHostData(host, d);
    renderTasks([]);
  });
}
function updateNotes(host, text) {
  chrome.storage.local.get([host], (res) => {
    const d = res[host] || { tasks: [], notes: "", files: [] };
    d.notes = text;
    saveHostData(host, d);
  });
}
function clearNotes(host) {
  chrome.storage.local.get([host], (res) => {
    const d = res[host] || { tasks: [], notes: "", files: [] };
    d.notes = "";
    saveHostData(host, d);
    notesText.value = "";
  });
}
function addFiles(host, files) {
  chrome.storage.local.get([host], (res) => {
    const d = res[host] || { tasks: [], notes: "", files: [] };
    d.files = d.files.concat(files);
    saveHostData(host, d);
    renderFiles(d.files);
  });
}
function deleteFile(host, idx) {
  chrome.storage.local.get([host], (res) => {
    const d = res[host] || { tasks: [], notes: "", files: [] };
    d.files.splice(idx, 1);
    saveHostData(host, d);
    renderFiles(d.files);
  });
}

// renders
function renderTasks(tasks) {
  taskListEl.innerHTML = "";
  (tasks || []).forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "task-item";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = !!t.done;
    chk.onchange = (ev) => {
      ev.stopPropagation();
      toggleTask(currentHost, i);
    };
    const span = document.createElement("span");
    span.textContent = t.text || "";
    const btnCopy = document.createElement("button");
    btnCopy.textContent = "📋";
    btnCopy.title = "Copy task";
    btnCopy.onclick = (ev) => {
      ev.stopPropagation();
      navigator.clipboard.writeText(t.text || "");
    };
    const btnDel = document.createElement("button");
    btnDel.textContent = "✖";
    btnDel.title = "Delete";
    btnDel.onclick = (ev) => {
      ev.stopPropagation();
      deleteTask(currentHost, i);
    };
    div.appendChild(chk);
    div.appendChild(span);
    div.appendChild(btnCopy);
    div.appendChild(btnDel);
    taskListEl.appendChild(div);
  });
}

function renderFiles(files) {
  fileListEl.innerHTML = "";
  (files || []).forEach((f, i) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = `${f.name} (${Math.round((f.size || 0) / 1024)} KB)`;
    const del = document.createElement("button");
    del.textContent = "✖";
    del.onclick = () => deleteFile(currentHost, i);
    li.appendChild(span);
    li.appendChild(del);
    fileListEl.appendChild(li);
  });
}

// copy helpers
function copyTasks(host) {
  if (!host) {
    alert("No site selected");
    return;
  }
  chrome.storage.local.get([host], (res) => {
    const lines = (res[host]?.tasks || [])
      .map((t) => `- ${t.text || ""}`)
      .join("\n");
    navigator.clipboard.writeText(lines).then(() => alert("Tasks copied."));
  });
}
function copyNotes() {
  const txt = notesText.value || "";
  navigator.clipboard.writeText(txt).then(() => alert("Notes copied."));
}
