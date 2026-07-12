let PROJECT_PASSWORD = "979797";
let protectedNavItems = [];
let activeProtectedItem = null;
let pendingProtectedHref = "projects.html";
let copyProtectionEnabled = false;

const currentPage = window.location.pathname.split("/").pop() || "index.html";
const defaultProtectedNavItems = [
  {
    label: "项目经验",
    href: "projects.html",
    matches: ["projects-all.html"],
    requirePassword: true,
    password: PROJECT_PASSWORD
  }
];

function isEditableElement(element) {
  return Boolean(element?.closest?.("input, textarea, [contenteditable='true']"));
}

function preventContentCopy() {
  document.body.classList.toggle("copy-protected", copyProtectionEnabled);

  document.addEventListener("copy", (event) => {
    if (copyProtectionEnabled && !isEditableElement(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener("cut", (event) => {
    if (copyProtectionEnabled && !isEditableElement(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener("selectstart", (event) => {
    if (copyProtectionEnabled && !isEditableElement(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener("contextmenu", (event) => {
    if (copyProtectionEnabled && !isEditableElement(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", (event) => {
    if (copyProtectionEnabled) {
      event.preventDefault();
    }
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const isCopyShortcut = (event.metaKey || event.ctrlKey) && ["a", "c", "x", "s", "p"].includes(key);
    if (copyProtectionEnabled && isCopyShortcut && !isEditableElement(event.target)) {
      event.preventDefault();
    }
  });
}

function setCopyProtection(enabled) {
  copyProtectionEnabled = enabled;
  document.body.classList.toggle("copy-protected", enabled);
}

function attachNavLinkFeedback() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    if (link.dataset.feedbackReady === "true") {
      return;
    }
    link.dataset.feedbackReady = "true";

    link.addEventListener("pointerdown", () => {
      link.classList.add("is-pressed");
    });

    link.addEventListener("pointerup", () => {
      window.setTimeout(() => link.classList.remove("is-pressed"), 120);
    });

    link.addEventListener("pointerleave", () => {
      link.classList.remove("is-pressed");
    });
  });
}

function getProtectedKey(item) {
  return encodeURIComponent(item.slug || item.href || item.label || "protected");
}

function getAccessKey(item) {
  return `chilala-access-${getProtectedKey(item)}`;
}

function hasProtectedAccess(item) {
  return window.sessionStorage.getItem(getAccessKey(item)) === "granted";
}

function grantProtectedAccess(item) {
  window.sessionStorage.setItem(getAccessKey(item), "granted");
}

function isSameTarget(linkHref, itemHref) {
  const link = new URL(linkHref, window.location.href);
  const item = new URL(itemHref, window.location.href);
  const samePage = link.pathname.split("/").pop() === item.pathname.split("/").pop();
  return samePage && (item.search === "" || link.search === item.search);
}

function getProtectedTargets(item) {
  const targets = [getNavHref(item), ...(item.matches || [])];
  if (item.slug) {
    targets.push(`custom-page.html?slug=${encodeURIComponent(item.slug)}`);
    targets.push(`custom-page-all.html?slug=${encodeURIComponent(item.slug)}`);
  }
  return targets.filter(Boolean);
}

function normalizeProtectedItems(items) {
  return items
    .map((item) => ({
      ...item,
      requirePassword: item.href === "projects.html" ? item.requirePassword !== false : item.requirePassword === true,
      password: item.password || (item.href === "projects.html" ? PROJECT_PASSWORD : "")
    }))
    .filter((item) => item.requirePassword && item.password);
}

function findProtectedItemForHref(href) {
  return protectedNavItems.find((item) => getProtectedTargets(item).some((target) => isSameTarget(href, target)));
}

function findProtectedItemForCurrentPage() {
  return protectedNavItems.find((item) => isActiveNavItem(item));
}

function showProtectedGate(item, nextHref = getNavHref(item)) {
  activeProtectedItem = item;
  pendingProtectedHref = nextHref;
  document.body.classList.add("password-open");
  const modal = document.querySelector(".password-modal");
  const input = modal.querySelector("input");
  modal.querySelector("h2").textContent = `${item.label || "当前页面"}需要密码`;
  modal.querySelector("input").setAttribute("aria-label", `${item.label || "当前页面"}查看密码`);
  modal.querySelector(".password-error").textContent = "";
  input.value = "";
  input.focus();
}

function hideProtectedGate() {
  document.body.classList.remove("password-open");
}

const passwordModal = document.createElement("div");
passwordModal.className = "password-modal";
passwordModal.setAttribute("aria-hidden", "true");
passwordModal.innerHTML = `
  <form class="password-box">
    <span class="password-badge">LOCKED</span>
    <h2>当前页面需要密码</h2>
    <p>请输入查看密码后继续浏览。</p>
    <input type="password" inputmode="numeric" placeholder="输入密码" aria-label="页面查看密码" />
    <span class="password-error" role="alert"></span>
    <div class="password-actions">
      <button class="password-submit" type="submit">确认查看</button>
      <button class="password-cancel" type="button">取消</button>
    </div>
  </form>
`;
document.body.appendChild(passwordModal);

passwordModal.querySelector("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = passwordModal.querySelector("input");
  const error = passwordModal.querySelector(".password-error");
  if (activeProtectedItem && input.value === activeProtectedItem.password) {
    grantProtectedAccess(activeProtectedItem);
    document.body.classList.remove("project-locked");
    hideProtectedGate();
    if (!isSameTarget(window.location.href, pendingProtectedHref)) {
      window.location.href = pendingProtectedHref || getNavHref(activeProtectedItem);
    }
    return;
  }
  error.textContent = "密码不正确";
  input.select();
});

passwordModal.querySelector(".password-cancel").addEventListener("click", () => {
  hideProtectedGate();
  const currentProtectedItem = findProtectedItemForCurrentPage();
  if (currentProtectedItem && !hasProtectedAccess(currentProtectedItem)) {
    window.location.href = "index.html";
  }
});

protectedNavItems = normalizeProtectedItems(defaultProtectedNavItems);
const initialProtectedItem = findProtectedItemForCurrentPage();
if (initialProtectedItem && !hasProtectedAccess(initialProtectedItem)) {
  document.body.classList.add("project-locked");
  window.setTimeout(() => showProtectedGate(initialProtectedItem, window.location.href), 0);
}

function attachProtectedLinkGuards() {
  document.querySelectorAll("a[href]").forEach((link) => {
    if (link.dataset.protectedGuardReady === "true") {
      return;
    }
    link.dataset.protectedGuardReady = "true";

    link.addEventListener("click", (event) => {
      const protectedItem = findProtectedItemForHref(link.getAttribute("href"));
      if (protectedItem && !hasProtectedAccess(protectedItem)) {
        event.preventDefault();
        showProtectedGate(protectedItem, link.getAttribute("href"));
      }
    });
  });
}

attachNavLinkFeedback();
attachProtectedLinkGuards();
preventContentCopy();

document.querySelectorAll(".newsletter form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    const originalText = button.textContent;
    button.textContent = "已收到";
    window.setTimeout(() => {
      button.textContent = originalText;
      form.reset();
    }, 1400);
  });
});

async function loadJsonFile(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path} is unavailable.`);
  }
  return response.json();
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) {
    element.textContent = value;
  }
}

function setHtml(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) {
    element.innerHTML = value;
  }
}

function getNavHref(item) {
  if (item.href) {
    return item.href;
  }
  if (item.slug) {
    return `custom-page.html?slug=${encodeURIComponent(item.slug)}`;
  }
  return "index.html";
}

function isActiveNavItem(item) {
  const href = getNavHref(item);
  const matches = item.matches || [];
  const params = new URLSearchParams(window.location.search);

  if ((currentPage === "custom-page.html" || currentPage === "custom-page-all.html") && item.slug) {
    return params.get("slug") === item.slug;
  }

  return href === currentPage || matches.includes(currentPage);
}

function renderNavigation(navigation) {
  if (!navigation || !Array.isArray(navigation.items)) {
    return;
  }

  const items = navigation.items.filter((item) => item.visible !== false);
  protectedNavItems = normalizeProtectedItems(items);
  const linksHtml = items
    .map((item) => {
      const activeClass = isActiveNavItem(item) ? " active" : "";
      return `<a class="nav-link${activeClass}" href="${escapeHtml(getNavHref(item))}">${escapeHtml(item.label)}</a>`;
    })
    .join("");

  const footerHtml = items
    .map((item) => {
      const activeClass = isActiveNavItem(item) ? ' class="active"' : "";
      return `<a${activeClass} href="${escapeHtml(getNavHref(item))}">${escapeHtml(item.label)}</a>`;
    })
    .join("");

  document.querySelectorAll(".nav-links").forEach((nav) => {
    nav.innerHTML = linksHtml;
  });

  document.querySelectorAll(".footer-tabs").forEach((nav) => {
    nav.innerHTML = footerHtml;
  });

  attachNavLinkFeedback();
  attachProtectedLinkGuards();

  const currentProtectedItem = findProtectedItemForCurrentPage();
  if (currentProtectedItem && !hasProtectedAccess(currentProtectedItem)) {
    document.body.classList.add("project-locked");
    window.setTimeout(() => showProtectedGate(currentProtectedItem, window.location.href), 0);
  }
}

function renderHomeContent(home) {
  if (!home) {
    return;
  }

  setText("[data-home-eyebrow]", home.eyebrow);
  setHtml("[data-home-title]", home.titleHtml);
  setText("[data-home-lead]", home.lead);
  setHtml("[data-home-services-title]", home.servicesTitleHtml);
  setText("[data-home-services-description]", home.servicesDescription);

  const services = document.querySelector("[data-home-services]");
  if (services && Array.isArray(home.services)) {
    services.innerHTML = home.services
      .map((service) => `
        <article class="thick-card mini-card">
          <span class="icon-dot ${escapeHtml(service.color || "blue")}"></span>
          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(service.description)}</p>
        </article>
      `)
      .join("");
  }
}

function renderAboutContent(about) {
  if (!about) {
    return;
  }

  const idCard = about.idCard || {};
  setText("[data-about-id-name]", idCard.name);
  setText("[data-about-id-major]", idCard.major);
  setText("[data-about-id-job]", idCard.job);
  setText("[data-about-id-birth]", idCard.birth);
  setText("[data-about-id-location]", idCard.location);
  setText("[data-about-eyebrow]", about.eyebrow);
  setHtml("[data-about-title]", about.titleHtml);
  setText("[data-about-lead]", about.lead);
  setText("[data-about-statement-label]", about.statementLabel);
  setText("[data-about-statement-text]", about.statementText);
  setText("[data-about-statement-text-copy]", about.statementText);
  setText("[data-about-statement-copy]", about.statementCopy);

  const factList = document.querySelector("[data-about-facts]");
  if (factList && Array.isArray(about.facts)) {
    factList.innerHTML = about.facts
      .map((fact) => `
        <div>
          <span class="fact-swatch ${escapeHtml(fact.color || "blue")}"></span>
          <strong>${escapeHtml(fact.title)}</strong>
          <p>${escapeHtml(fact.description)}</p>
        </div>
      `)
      .join("");
  }
}

function renderProjectCards(projects) {
  const projectLists = document.querySelectorAll("[data-project-list]");
  if (!projectLists.length || !Array.isArray(projects)) {
    return;
  }

  projectLists.forEach((projectList) => {
    const limit = Number(projectList.dataset.limit);
    const visibleProjects = Number.isFinite(limit) && limit > 0 ? projects.slice(0, limit) : projects;

    projectList.innerHTML = visibleProjects
      .map((project) => {
        const searchTitle = [
          project.date,
          project.number,
          project.title,
          project.description,
          project.tools,
          ...(project.points || [])
        ].join(" ");

        return `
          <article class="resume-project-card ${escapeHtml(project.color || "blue")}" data-title="${escapeHtml(searchTitle)}">
            <div class="project-card-head">
              <span class="project-date">${escapeHtml(project.date)}</span>
              <span class="project-number">${escapeHtml(project.number)}</span>
            </div>
            <h2>${escapeHtml(project.title)}</h2>
            <p>${escapeHtml(project.description)}</p>
            <div class="tool-box">
              <strong>测试工具</strong>
              <span>${escapeHtml(project.tools)}</span>
            </div>
            <ul>
              ${(project.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
            </ul>
          </article>
        `;
      })
      .join("");

    setupProjectListing(projectList);
  });
}

function setupProjectListing(projectList) {
  if (!projectList || projectList.dataset.listingReady === "true") {
    return;
  }

  projectList.dataset.listingReady = "true";
  projectList.querySelectorAll(".resume-project-card").forEach((card) => {
    if (!card.dataset.title) {
      card.dataset.title = card.textContent.replace(/\s+/g, " ").trim();
    }
  });

  setupListingTools(
    projectList,
    document.querySelector("#projectSearchInput"),
    document.querySelector("[data-project-empty]"),
    document.querySelector("[data-project-end]")
  );
}

function setupProjectListings() {
  document.querySelectorAll("[data-project-list]").forEach((projectList) => setupProjectListing(projectList));
}

function renderExperienceContent(experience) {
  if (!experience) {
    return;
  }

  setHtml("[data-experience-title]", experience.introTitleHtml);
  setText("[data-experience-lead]", experience.introLead);

  const experienceList = document.querySelector("[data-experience-list]");
  if (experienceList && Array.isArray(experience.items)) {
    experienceList.innerHTML = experience.items
      .map((item) => `
        <article class="thick-card timeline-card">
          <div class="timeline-top">
            <strong>${escapeHtml(item.date)}</strong>
            <span class="round-icon ${escapeHtml(item.color || "blue")}">${escapeHtml(item.icon)}</span>
          </div>
          <h2>${escapeHtml(item.company)}</h2>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `)
      .join("");
  }
}

function renderToolboxContent(toolbox) {
  if (!toolbox) {
    return;
  }

  setText("[data-toolbox-eyebrow]", toolbox.eyebrow);
  setHtml("[data-toolbox-title]", toolbox.titleHtml);
  setText("[data-toolbox-description]", toolbox.description);

  const toolboxList = document.querySelector("[data-toolbox-list]");
  if (toolboxList && Array.isArray(toolbox.tools)) {
    const limit = Number(toolboxList.dataset.limit);
    const tools = Number.isFinite(limit) && limit > 0 ? toolbox.tools.slice(0, limit) : toolbox.tools;
    toolboxList.innerHTML = tools
      .map((tool) => `
        <article class="tool-card ${escapeHtml(tool.color || "blue")}" data-title="${escapeHtml([tool.category, tool.name, ...(tool.tags || [])].join(" "))}">
          <span class="tool-number">${escapeHtml(tool.number)}</span>
          <p>${escapeHtml(tool.category)}</p>
          <h2>${escapeHtml(tool.name)}</h2>
          <span>${escapeHtml(tool.description)}</span>
          <div class="tool-tags">
            ${(tool.tags || []).map((tag) => `<b>${escapeHtml(tag)}</b>`).join("")}
          </div>
        </article>
      `)
      .join("");
    setupListingTools(
      toolboxList,
      document.querySelector("#toolSearchInput"),
      document.querySelector("[data-tool-empty]"),
      document.querySelector("[data-tool-end]")
    );
  }
}

const defaultTrainingData = {
  eyebrow: "QA TRAINING LAB",
  titleHtml: '测试模拟 <span class="highlight yellow">训练平台</span>',
  description: "把真实 WMS 项目经验拆成一个可操作练习场：新人可以按任务说明执行测试、发现缺陷、提交记录并做回归。",
  systems: [
    { name: "WMS 仓储供应链系统", status: "已开放", description: "覆盖入库、库存、出库、库位、盘点和缺陷闭环，适合练功能测试、接口思维、数据校验和回归测试。", modules: ["入库单", "库存查询", "出库扣减", "盘点调整", "缺陷提交"] },
    { name: "MES 打版生产系统", status: "规划中", description: "后续可扩展工单、BOM、工艺路线、派工、生产进度和异常处理。", modules: ["工单", "BOM", "派工", "工时", "异常"] },
    { name: "论坛 APP", status: "规划中", description: "后续可扩展注册登录、发帖、评论点赞、弱网和真机兼容性练习。", modules: ["登录", "发帖", "评论", "点赞", "弱网"] }
  ],
  tasks: [
    { number: "01", title: "需求评审训练", description: "阅读 WMS 入库、出库和盘点规则，至少提出 5 个需求疑问。" },
    { number: "02", title: "功能测试训练", description: "执行新增入库单、出库扣减、盘点调整，观察库存数量和状态变化。" },
    { number: "03", title: "缺陷发现训练", description: "平台里故意埋了库存边界、重复提交和盘点备注相关问题，请尝试发现并提交缺陷。" },
    { number: "04", title: "回归验证训练", description: "提交缺陷后，根据缺陷描述补充回归范围和验收标准。" }
  ],
  inventory: [
    { sku: "SKU-WMS-001", name: "智能扫码枪", location: "A-01-01", stock: 120, status: "正常" },
    { sku: "SKU-WMS-002", name: "PDA 手持终端", location: "A-02-03", stock: 38, status: "低库存" },
    { sku: "SKU-WMS-003", name: "包装耗材", location: "B-03-02", stock: 560, status: "正常" }
  ],
  knownBugs: [
    "出库数量等于当前库存时，系统没有把状态改成缺货。",
    "盘点调整允许负数库存，需要测试人员识别边界风险。",
    "新增入库单连续点击两次可能重复入库。"
  ]
};

let trainingInventory = [];
let trainingLog = [];
let currentTrainingData = defaultTrainingData;

function getInventoryStatus(stock) {
  if (stock <= 0) {
    return "缺货";
  }
  if (stock < 50) {
    return "低库存";
  }
  return "正常";
}

function addTrainingLog(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  trainingLog.unshift({ timestamp, message, type });
  const logList = document.querySelector("[data-lab-log]");
  if (!logList) {
    return;
  }
  logList.innerHTML = trainingLog
    .slice(0, 12)
    .map((item) => `<li class="${escapeHtml(item.type)}"><b>${escapeHtml(item.timestamp)}</b><span>${escapeHtml(item.message)}</span></li>`)
    .join("");
}

function renderInventoryTable(keyword = "") {
  const table = document.querySelector("[data-inventory-table]");
  if (!table) {
    return;
  }
  const normalizedKeyword = keyword.trim().toLowerCase();
  const rows = trainingInventory.filter((item) => {
    const text = [item.sku, item.name, item.location, item.status].join(" ").toLowerCase();
    return text.includes(normalizedKeyword);
  });

  table.innerHTML = `
    <div class="inventory-row inventory-row-head">
      <span>SKU</span><span>商品</span><span>库位</span><span>库存</span><span>状态</span>
    </div>
    ${
      rows.length
        ? rows
            .map((item) => `
              <div class="inventory-row">
                <span>${escapeHtml(item.sku)}</span>
                <span>${escapeHtml(item.name)}</span>
                <span>${escapeHtml(item.location)}</span>
                <span>${escapeHtml(item.stock)}</span>
                <span><b class="stock-status">${escapeHtml(item.status)}</b></span>
              </div>
            `)
            .join("")
        : '<p class="lab-empty">没有找到对应库存。</p>'
    }
  `;
}

function findInventoryItem(sku) {
  return trainingInventory.find((item) => item.sku.toLowerCase() === String(sku).trim().toLowerCase());
}

function getTrainingSystem(training) {
  const slug = document.body.dataset.trainingSystem;
  return (training.systems || []).find((system) => system.slug === slug);
}

function renderTrainingOverview(training) {
  setText("[data-training-eyebrow]", training.eyebrow);
  setHtml("[data-training-title]", training.titleHtml);
  setText("[data-training-description]", training.description);

  const systemGrid = document.querySelector("[data-training-systems]");
  if (!systemGrid || !Array.isArray(training.systems)) {
    return;
  }

  const limit = Number(systemGrid.dataset.limit);
  const visibleSystems = Number.isFinite(limit) && limit > 0 ? training.systems.slice(0, limit) : training.systems;

  systemGrid.innerHTML = visibleSystems
    .map((system, index) => `
      <a class="training-card ${["blue", "coral", "green", "violet", "yellow"][index % 5]}" href="${escapeHtml(system.link || "training.html")}" data-title="${escapeHtml([
        system.name,
        system.status,
        system.badge,
        system.description,
        ...(system.modules || [])
      ].join(" "))}">
        <span>${escapeHtml(system.status)}</span>
        <h2>${escapeHtml(system.name)}</h2>
        <p>${escapeHtml(system.description)}</p>
        <div class="tool-tags">${(system.modules || []).map((module) => `<b>${escapeHtml(module)}</b>`).join("")}</div>
        <strong class="training-enter">进入练习</strong>
      </a>
    `)
    .join("");

  setupTrainingListing(systemGrid);
}

function setupTrainingListing(systemGrid) {
  if (!systemGrid || systemGrid.dataset.trainingListingReady === "true") {
    return;
  }

  const searchInput = document.querySelector("#trainingSearchInput");
  const emptySearch = document.querySelector("[data-training-empty]");
  const endOfList = document.querySelector("[data-training-end]");
  if (!searchInput && !emptySearch && !endOfList) {
    return;
  }

  systemGrid.dataset.trainingListingReady = "true";
  const cards = Array.from(systemGrid.querySelectorAll("[data-title]"));
  const updateEndMessage = setupListEndMessage(systemGrid, endOfList, cards.length);
  setupListingSearch(systemGrid, searchInput, emptySearch, endOfList, updateEndMessage);
}

const trainingResourceCards = [
  {
    color: "blue",
    type: "论坛 APP",
    title: "Discourse / Flarum / NodeBB",
    description: "适合练注册登录、发帖、评论、点赞、举报、审核、角色权限、移动端兼容和内容安全。",
    keywords: "论坛 APP Discourse Flarum NodeBB 注册 登录 发帖 评论 点赞 举报 审核 角色权限 移动端 内容安全",
    links: [
      ["Discourse", "https://www.discourse.org/"],
      ["Flarum", "https://flarum.org/"],
      ["NodeBB", "https://nodebb.org/"]
    ]
  },
  {
    color: "yellow",
    type: "财务管理",
    title: "ERPNext / Odoo / Dolibarr",
    description: "适合练费用单、收付款、发票、审批流、报表、权限隔离、多币种、导出和数据一致性。",
    keywords: "财务管理 ERPNext Odoo Dolibarr 费用 收付款 发票 审批流 报表 权限 多币种 导出 数据一致性",
    links: [
      ["ERPNext", "https://erpnext.com/"],
      ["Odoo Accounting", "https://www.odoo.com/app/accounting"],
      ["Dolibarr", "https://www.dolibarr.org/"]
    ]
  },
  {
    color: "coral",
    type: "跨境电商",
    title: "nopCommerce / Spree Commerce",
    description: "适合练商品中心、SKU、多规格、多语言、多币种、海外仓、订单、支付、平台同步和结算链路。",
    keywords: "跨境电商 nopCommerce Spree WooCommerce 商品中心 SKU 多规格 多语言 多币种 海外仓 订单 支付 平台同步 结算",
    links: [
      ["nopCommerce", "https://www.nopcommerce.com/"],
      ["Spree", "https://spreecommerce.org/"],
      ["WooCommerce", "https://woocommerce.com/"]
    ]
  },
  {
    color: "green",
    type: "MES 生产",
    title: "ERPNext Manufacturing / Odoo Manufacturing / OFBiz",
    description: "适合练工单、BOM、工艺路线、派工、报工、质检、完工入库、ERP/WMS 联动和现场 UAT。",
    keywords: "MES 生产 ERPNext Manufacturing Odoo Manufacturing OFBiz 工单 BOM 工艺路线 派工 报工 质检 完工入库 UAT",
    links: [
      ["ERPNext MES", "https://erpnext.com/open-source-manufacturing-erp-software"],
      ["Odoo MRP", "https://www.odoo.com/app/manufacturing"],
      ["Apache OFBiz", "https://ofbiz.apache.org/"]
    ]
  },
  {
    color: "violet",
    type: "WMS 仓储",
    title: "ERPNext Stock / Odoo Inventory / OpenBoxes",
    description: "适合练入库、出库、库存锁定、库位、批次序列号、盘点、拣货、API 同步和账实一致。",
    keywords: "WMS 仓储 ERPNext Stock Odoo Inventory OpenBoxes 入库 出库 库存锁定 库位 批次序列号 盘点 拣货 API 同步 账实一致",
    links: [
      ["ERPNext Stock", "https://erpnext.com/open-source-inventory-management-software"],
      ["Odoo Inventory", "https://www.odoo.com/app/inventory"],
      ["OpenBoxes", "https://openboxes.com/"]
    ]
  },
  {
    color: "blue",
    type: "CRM 客户",
    title: "SuiteCRM / Odoo CRM / EspoCRM",
    description: "适合练线索、客户、公海、商机、跟进记录、销售报表、重复客户和角色权限。",
    keywords: "CRM 客户 SuiteCRM Odoo CRM EspoCRM 线索 客户 公海 商机 跟进记录 销售报表 重复客户 角色权限",
    links: [
      ["SuiteCRM", "https://suitecrm.com/"],
      ["Odoo CRM", "https://www.odoo.com/app/crm"],
      ["EspoCRM", "https://www.espocrm.com/"]
    ]
  },
  {
    color: "yellow",
    type: "OA 审批",
    title: "低代码表单 / Flowable / Camunda",
    description: "适合练请假、报销、采购审批、条件流、会签、加签、撤回、驳回和审批日志。",
    keywords: "OA 审批 低代码表单 Flowable Camunda 请假 报销 采购审批 条件流 会签 加签 撤回 驳回 审批日志",
    links: [
      ["Flowable", "https://www.flowable.com/open-source/"],
      ["Camunda", "https://camunda.com/"],
      ["Odoo Employees", "https://www.odoo.com/app/employees"]
    ]
  },
  {
    color: "coral",
    type: "HR 人事",
    title: "OrangeHRM / Odoo Employees",
    description: "适合练员工档案、入职、转正、调岗、离职、考勤、薪资权限和敏感信息脱敏。",
    keywords: "HR 人事 OrangeHRM Odoo Employees 员工档案 入职 转正 调岗 离职 考勤 薪资权限 敏感信息脱敏",
    links: [
      ["OrangeHRM", "https://www.orangehrm.com/"],
      ["Odoo Employees", "https://www.odoo.com/app/employees"],
      ["ERPNext HR", "https://erpnext.com/open-source-hr-payroll-software"]
    ]
  },
  {
    color: "green",
    type: "订单支付",
    title: "Saleor / Medusa / Magento Open Source",
    description: "适合练购物车、订单状态、优惠、支付回调、退款、库存扣减、流水和财务对账。",
    keywords: "订单支付 Saleor Medusa Magento Open Source 购物车 订单状态 优惠 支付回调 退款 库存扣减 流水 财务对账",
    links: [
      ["Saleor", "https://saleor.io/"],
      ["Medusa", "https://medusajs.com/"],
      ["Magento", "https://business.adobe.com/products/magento/open-source.html"]
    ]
  },
  {
    color: "violet",
    type: "TMS 物流",
    title: "Odoo Fleet / OpenBoxes / ERPNext Delivery",
    description: "适合练运单、承运商、物流轨迹、签收、异常件、费用规则和订单/WMS 联动。",
    keywords: "TMS 物流 Odoo Fleet OpenBoxes ERPNext Delivery 运单 承运商 物流轨迹 签收 异常件 费用规则 订单 WMS 联动",
    links: [
      ["Odoo Fleet", "https://www.odoo.com/app/fleet"],
      ["OpenBoxes", "https://openboxes.com/"],
      ["ERPNext", "https://erpnext.com/"]
    ]
  },
  {
    color: "blue",
    type: "游戏测试",
    title: "Godot / Unity Learn / Game Server Demo",
    description: "适合练角色、背包、道具、充值、活动奖励、排行榜、弱网、多端登录和反作弊思维。",
    keywords: "游戏测试 Godot Unity Learn PlayFab 角色 背包 道具 充值 活动奖励 排行榜 弱网 多端登录 反作弊",
    links: [
      ["Godot", "https://godotengine.org/"],
      ["Unity Learn", "https://learn.unity.com/"],
      ["PlayFab", "https://playfab.com/"]
    ]
  },
  {
    color: "yellow",
    type: "银行金融",
    title: "Apache Fineract / Mifos / Demo Bank",
    description: "适合练账户、转账、余额、限额、验证码、风控、冲正、流水、对账和金额精度。",
    keywords: "银行金融 Apache Fineract Mifos ParaBank 账户 转账 余额 限额 验证码 风控 冲正 流水 对账 金额精度",
    links: [
      ["Apache Fineract", "https://fineract.apache.org/"],
      ["Mifos", "https://mifos.org/"],
      ["ParaBank", "https://parabank.parasoft.com/"]
    ]
  }
];

function getAutoTrainingResourceCards(training) {
  const systems = Array.isArray(training?.systems) ? training.systems : [];
  const existingText = trainingResourceCards.map((resource) => `${resource.type} ${resource.keywords}`).join(" ").toLowerCase();
  return systems
    .filter((system) => {
      const keyText = [system.slug, system.name, system.badge].join(" ").toLowerCase();
      return keyText && !existingText.includes(keyText);
    })
    .map((system, index) => ({
      color: ["blue", "yellow", "coral", "green", "violet"][index % 5],
      type: system.badge || system.name || "新增系统",
      title: `${system.name || "新增测试系统"} 练习资源`,
      description: `适合练${(system.modules || ["需求评审", "功能测试", "接口测试", "数据校验", "缺陷闭环"]).join("、")}，可按训练页任务继续补充真实练习平台或项目资料。`,
      keywords: [system.name, system.badge, system.description, ...(system.modules || []), ...(system.tasks || []).map((task) => `${task.title} ${task.description}`)].join(" "),
      links: system.link ? [["进入本地练习", system.link]] : []
    }));
}

function renderTrainingResourceCards(resourceMap, training = currentTrainingData) {
  if (!resourceMap?.hasAttribute("data-render-resources")) {
    return;
  }

  const resources = [...trainingResourceCards, ...getAutoTrainingResourceCards(training)];
  resourceMap.innerHTML = resources
    .map((resource) => `
      <article class="resource-card ${escapeHtml(resource.color)}" data-title="${escapeHtml(resource.keywords)}">
        <span>${escapeHtml(resource.type)}</span>
        <h3>${escapeHtml(resource.title)}</h3>
        <p>${escapeHtml(resource.description)}</p>
        <div class="resource-links">
          ${(resource.links || []).map(([label, href]) => `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`).join("")}
        </div>
      </article>
    `)
    .join("");
}

function setupTrainingResourceMap(training = currentTrainingData) {
  const resourceMap = document.querySelector("[data-resource-map]");
  if (!resourceMap || resourceMap.dataset.resourceReady === "true") {
    return;
  }

  renderTrainingResourceCards(resourceMap, training);
  resourceMap.dataset.resourceReady = "true";
  const searchInput = document.querySelector("#resourceSearchInput");
  const emptySearch = document.querySelector("[data-resource-empty]");
  const endOfList = document.querySelector("[data-resource-end]");
  const cards = Array.from(resourceMap.querySelectorAll("[data-title]"));
  const updateEndMessage = setupListEndMessage(resourceMap, endOfList, cards.length);
  setupListingSearch(resourceMap, searchInput, emptySearch, endOfList, updateEndMessage);
}

function formatActionLog(template, formData) {
  return String(template || "已提交操作，请检查数据变化和预期结果。").replace(/\{(\w+)\}/g, (_, key) => formData[key] || "-");
}

function renderGenericTrainingTable(system) {
  const table = document.querySelector("[data-training-records]");
  if (!table) {
    return;
  }

  const columns = system.columns || [];
  const records = trainingInventory;
  table.innerHTML = `
    <div class="inventory-row inventory-row-head" style="grid-template-columns: repeat(${columns.length || 1}, minmax(120px, 1fr));">
      ${columns.map((column) => `<span>${escapeHtml(column)}</span>`).join("")}
    </div>
    ${records
      .map((record) => `
        <div class="inventory-row" style="grid-template-columns: repeat(${columns.length || 1}, minmax(120px, 1fr));">
          ${record.map((cell) => `<span>${escapeHtml(cell)}</span>`).join("")}
        </div>
      `)
      .join("")}
  `;
}

function generateTrainingCode(prefix = "QA") {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${date}-${random}`;
}

function renderTrainingField(field) {
  const name = escapeHtml(field.name);
  const value = escapeHtml(field.value || "");
  const autoAttribute = field.autoGenerate ? ` data-auto-generate="${escapeHtml(field.autoGenerate)}"` : "";
  const input = Array.isArray(field.options) && field.options.length
    ? `<select name="${name}"${autoAttribute}>
        ${field.options.map((option) => `<option value="${escapeHtml(option)}"${option === field.value ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>`
    : `<input name="${name}" type="${escapeHtml(field.type || "text")}" value="${value}"${autoAttribute} />`;

  const generateButton = field.autoGenerate
    ? `<button class="mini-generate" type="button" data-generate-field="${name}">随机生成</button>`
    : "";

  return `
    <label>${escapeHtml(field.label)}
      <span class="field-control">${input}${generateButton}</span>
    </label>
  `;
}

function renderActionForm(action, index) {
  return `
    <div class="lab-view${index === 0 ? " active" : ""}" data-lab-view="${escapeHtml(action.id)}">
      <h3>${escapeHtml(action.title)}</h3>
      <form class="lab-form" data-training-action="${escapeHtml(action.id)}">
        ${Array.isArray(action.presets) && action.presets.length ? `
          <label>选择场景预设
            <select name="__preset" data-action-preset>
              ${action.presets.map((preset, presetIndex) => `<option value="${presetIndex}">${escapeHtml(preset.label || `预设 ${presetIndex + 1}`)}</option>`).join("")}
              <option value="custom">其他 / 自主填写实际需求情况</option>
            </select>
          </label>
        ` : ""}
        ${(action.fields || []).map(renderTrainingField).join("")}
        <button type="submit">${escapeHtml(action.button || "提交")}</button>
      </form>
      <p class="lab-tip">${escapeHtml(action.tip || "执行后记录结果，并思考是否符合预期。")}</p>
    </div>
  `;
}

function renderKnowledgeBox(system) {
  const knowledge = system.knowledge || {};
  const sections = [
    { title: "岗位视角", items: knowledge.roleFocus ? [knowledge.roleFocus] : [] },
    { title: "常见情况", items: knowledge.commonCases || [] },
    { title: "行业常识", items: knowledge.industryKnowledge || [] },
    { title: "核心术语", items: knowledge.terms || [] },
    { title: "老手提醒", items: knowledge.seniorTips || [] },
    { title: "拓展测试", items: knowledge.extensionTests || [] }
  ].filter((section) => section.items.length);

  if (!sections.length) {
    return "";
  }

  return `
    <div class="knowledge-box">
      <strong>经验老手补给包</strong>
      ${sections
        .map((section) => `
          <section>
            <h3>${escapeHtml(section.title)}</h3>
            <ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </section>
        `)
        .join("")}
    </div>
  `;
}

function renderCommonCaseLab(system) {
  const cases = system.knowledge?.commonCases || [];
  if (!cases.length) {
    return "";
  }

  return `
    <div class="lab-view" data-lab-view="common-cases">
      <h3>常见情况演练</h3>
      <form class="lab-form" data-common-case-form>
        <label>选择常见情况
          <select name="caseIndex" data-common-case-select>
            ${cases.map((item, index) => `<option value="${index}">${escapeHtml(item.split("：")[0] || `常见情况 ${index + 1}`)}</option>`).join("")}
            <option value="custom">其他 / 自主填写实际需求情况</option>
          </select>
        </label>
        <label>情况说明
          <textarea name="caseDetail" rows="6" data-common-case-detail>${escapeHtml(cases[0] || "")}</textarea>
        </label>
        <button type="submit">记录情况分析</button>
      </form>
      <p class="lab-tip">训练点：先选一个贴近真实项目的业务情况，再从地区、平台、币种、仓库、权限、接口、数据一致性角度拆测试点；如果没有匹配项，就写自己的实际需求。</p>
    </div>
  `;
}

function renderTrainingDetail(training) {
  const detailRoot = document.querySelector("[data-training-detail]");
  const system = getTrainingSystem(training);
  if (!detailRoot || !system) {
    return;
  }

  document.title = `CHILALA | ${system.name}`;
  trainingInventory = (system.records || []).map((row) => [...row]);
  trainingLog = [];

  detailRoot.innerHTML = `
    <section class="training-hero page-band">
      <button class="button secondary back-button training-back" type="button" data-back-button data-back-fallback="training.html">返回上一页</button>
      <div class="section-title">
        <p class="eyebrow">${escapeHtml(system.badge || "QA PRACTICE")}</p>
        <h1>${escapeHtml(system.name)}</h1>
        <p>${escapeHtml(system.description)}</p>
      </div>
    </section>
    <section class="training-workbench page-band">
      <div class="training-layout">
        <aside class="training-panel">
          <span class="panel-label">TODAY TASKS</span>
          <h2>训练任务</h2>
          <div class="task-list">
            ${(system.tasks || []).map((task) => `
              <article>
                <span>${escapeHtml(task.number)}</span>
                <div><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.description)}</p></div>
              </article>
            `).join("")}
          </div>
          <div class="known-bugs">
            <strong>隐藏缺陷提示</strong>
            <ul>${(system.knownBugs || []).map((bug) => `<li>${escapeHtml(bug)}</li>`).join("")}</ul>
          </div>
          <div class="known-bugs scenario-box">
            <strong>检查清单</strong>
            <ul>${(system.scenarios || []).map((scenario) => `<li>${escapeHtml(scenario)}</li>`).join("")}</ul>
          </div>
          ${renderKnowledgeBox(system)}
        </aside>
        <section class="wms-lab" aria-label="${escapeHtml(system.name)}练习系统">
          <div class="lab-header">
            <div><p class="eyebrow">PRACTICE SYSTEM</p><h2>${escapeHtml(system.name)}</h2></div>
            <span class="lab-status">测试环境</span>
          </div>
          <div class="lab-tabs" role="tablist" aria-label="训练模块">
            ${(system.actions || []).map((action, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-lab-tab="${escapeHtml(action.id)}">${escapeHtml(action.title)}</button>`).join("")}
            ${system.knowledge?.commonCases?.length ? '<button type="button" data-lab-tab="common-cases">常见情况</button>' : ""}
            <button type="button" data-lab-tab="records">数据表</button>
            <button type="button" data-lab-tab="bug">缺陷提交</button>
          </div>
          ${(system.actions || []).map(renderActionForm).join("")}
          ${renderCommonCaseLab(system)}
          <div class="lab-view" data-lab-view="records">
            <h3>业务数据表</h3>
            <div class="inventory-table" data-training-records></div>
          </div>
          <div class="lab-view" data-lab-view="bug">
            <h3>提交缺陷</h3>
            <form class="lab-form" data-bug-form>
              <label>缺陷标题<input name="title" placeholder="例如：库存为 0 后状态未更新" /></label>
              <label>复现步骤<textarea name="steps" rows="4" placeholder="1. 进入某模块；2. 输入测试数据；3. 点击提交"></textarea></label>
              <label>预期结果<textarea name="expected" rows="3" placeholder="写清楚应该出现什么结果"></textarea></label>
              <button type="submit">提交缺陷记录</button>
            </form>
          </div>
          <div class="lab-log">
            <div class="log-head"><strong>测试执行记录</strong><button type="button" data-clear-log>清空记录</button></div>
            <ol data-lab-log></ol>
          </div>
        </section>
      </div>
    </section>
  `;

  setupTrainingLab(system);
  renderGenericTrainingTable(system);
  addTrainingLog(`${system.name} 训练环境已启动。`, "info");
}

function renderTrainingContent(training) {
  currentTrainingData = training || defaultTrainingData;
  if (document.querySelector("[data-training-detail]")) {
    renderTrainingDetail(currentTrainingData);
    setupInterviewTraining(currentTrainingData);
    return;
  }
  renderTrainingOverview(currentTrainingData);
  setupTrainingResourceMap(currentTrainingData);
  setupInterviewTraining(currentTrainingData);
}

function setupTrainingLab(system) {
  document.querySelectorAll("[data-lab-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.labTab;
      document.querySelectorAll("[data-lab-tab]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll("[data-lab-view]").forEach((view) => view.classList.toggle("active", view.dataset.labView === tab));
      if (tab === "records") {
        renderGenericTrainingTable(system);
      }
    });
  });

  document.querySelectorAll("[data-training-action]").forEach((form) => {
    const action = (system.actions || []).find((item) => item.id === form.dataset.trainingAction);
    form.querySelectorAll("[data-auto-generate]").forEach((field) => {
      if (!field.value) {
        field.value = generateTrainingCode(field.dataset.autoGenerate);
      }
    });

    form.querySelectorAll("[data-generate-field]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = form.elements[button.dataset.generateField];
        if (target) {
          target.value = generateTrainingCode(target.dataset.autoGenerate);
          addTrainingLog(`已生成编号：${target.value}`, "info");
        }
      });
    });

    form.querySelector("[data-action-preset]")?.addEventListener("change", (event) => {
      const presetIndex = event.currentTarget.value;
      if (presetIndex === "custom") {
        addTrainingLog("已切换为自定义情况：请按实际需求填写字段。", "info");
        return;
      }
      const preset = action?.presets?.[Number(presetIndex)];
      Object.entries(preset?.values || {}).forEach(([key, value]) => {
        if (form.elements[key]) {
          form.elements[key].value = value;
        }
      });
      form.querySelectorAll("[data-auto-generate]").forEach((field) => {
        field.value = generateTrainingCode(field.dataset.autoGenerate);
      });
      addTrainingLog(`已套用场景预设：${preset?.label || "未命名预设"}。`, "info");
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = Object.fromEntries(new FormData(form).entries());
      const emptyField = Object.entries(formData).find(([, value]) => String(value).trim() === "");
      if (emptyField) {
        addTrainingLog(`提交提醒：${emptyField[0]} 为空，请判断真实系统是否应阻止。`, "warning");
      }
      addTrainingLog(formatActionLog(action?.log, formData), "success");
      renderGenericTrainingTable(system);
    });
  });

  const commonCaseSelect = document.querySelector("[data-common-case-select]");
  const commonCaseDetail = document.querySelector("[data-common-case-detail]");
  const commonCases = system.knowledge?.commonCases || [];
  commonCaseSelect?.addEventListener("change", () => {
    if (!commonCaseDetail) {
      return;
    }
    if (commonCaseSelect.value === "custom") {
      commonCaseDetail.value = "";
      commonCaseDetail.placeholder = "请填写当前项目的实际需求情况，例如：目标地区、平台、币种、仓库、结算方式、业务规则、测试风险。";
      commonCaseDetail.focus();
      return;
    }
    commonCaseDetail.value = commonCases[Number(commonCaseSelect.value)] || "";
  });

  document.querySelector("[data-common-case-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const detail = commonCaseDetail?.value.trim() || "";
    if (!detail) {
      addTrainingLog("常见情况记录失败：请选择常见情况，或填写实际需求情况。", "error");
      return;
    }
    const label = commonCaseSelect?.value === "custom" ? "自定义情况" : "常见情况";
    addTrainingLog(`${label}已记录：${detail} 下一步请拆分测试范围、关键风险和回归点。`, "success");
  });

  document.querySelector("[data-bug-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const title = form.elements.title.value.trim();
    const steps = form.elements.steps.value.trim();
    const expected = form.elements.expected.value.trim();
    if (!title || !steps || !expected) {
      addTrainingLog("缺陷提交失败：标题、复现步骤、预期结果都必须填写。", "error");
      return;
    }
    addTrainingLog(`缺陷已记录：${title}。下一步请补充影响范围并做回归。`, "warning");
    form.reset();
  });

  document.querySelector("[data-clear-log]")?.addEventListener("click", () => {
    trainingLog = [];
    document.querySelector("[data-lab-log]").innerHTML = "";
  });
}

const defaultToolboxData = {
  eyebrow: "QA TOOLBOX",
  titleHtml: '测试 <span class="highlight yellow">工具箱</span>',
  description: "把常用测试工具按场景整理起来，从需求分析、接口验证、性能压测到移动端专项，让每一次测试都有合适的工具和方法。",
  tools: [
    { number: "01", color: "blue", category: "接口测试", name: "Postman / JMeter", description: "用于接口调试、参数校验、断言验证和接口自动化执行。", tags: ["接口文档", "参数校验", "断言", "自动化"] },
    { number: "02", color: "coral", category: "性能测试", name: "JMeter / LoadRunner", description: "用于并发压测、响应时间观察、吞吐量分析和性能瓶颈定位。", tags: ["并发", "响应时间", "吞吐量", "瓶颈分析"] },
    { number: "03", color: "yellow", category: "抓包调试", name: "Fiddler", description: "用于分析客户端请求、响应内容、异常接口和数据传输问题。", tags: ["抓包", "请求响应", "PDA", "APP"] },
    { number: "04", color: "green", category: "数据库校验", name: "MySQL / Navicat", description: "用于验证业务数据落库、状态流转、接口执行后的数据一致性。", tags: ["SQL", "数据一致性", "状态校验", "业务验证"] },
    { number: "05", color: "violet", category: "移动端专项", name: "ADB / iTest / GT", description: "用于安装升级、弱网、兼容性、稳定性和随机压力测试。", tags: ["真机", "弱网", "Monkey", "兼容性"] },
    { number: "06", color: "blue", category: "测试分析", name: "XMind / Excel", description: "用于整理测试点、设计测试用例、拆分业务流程和输出测试记录。", tags: ["测试点", "测试用例", "评审", "报告"] },
    { number: "07", color: "coral", category: "浏览器兼容", name: "Chrome / Firefox / IETest", description: "用于验证 Web 系统在不同浏览器中的页面展示、交互行为和兼容性问题。", tags: ["Web", "兼容性", "页面交互", "回归"] },
    { number: "08", color: "yellow", category: "接口文档", name: "Swagger / Apifox", description: "用于查看接口定义、字段规则、请求示例和响应结构，辅助接口用例设计。", tags: ["接口定义", "字段规则", "Mock", "联调"] },
    { number: "09", color: "green", category: "环境与日志", name: "Linux / Xshell", description: "用于连接测试环境、查看服务日志、辅助定位接口异常和系统运行问题。", tags: ["测试环境", "日志", "命令行", "定位问题"] },
    { number: "10", color: "violet", category: "自动化测试", name: "Python / Selenium", description: "用于编写基础自动化脚本、回归检查脚本和浏览器端流程验证。", tags: ["脚本", "回归", "UI 自动化", "断言"] },
    { number: "11", color: "blue", category: "缺陷管理", name: "禅道 / Jira", description: "用于提交缺陷、记录复现步骤、跟踪修复状态并推动问题闭环。", tags: ["BUG", "复现步骤", "状态流转", "闭环"] },
    { number: "12", color: "coral", category: "AI 辅助测试", name: "ChatGPT / Codex", description: "用于辅助拆解需求、生成测试点、整理脚本思路和优化测试文档表达。", tags: ["需求拆解", "测试点", "脚本思路", "文档优化"] }
  ]
};

function renderCustomPage(customPages) {
  const customPageCards = document.querySelector("[data-custom-cards]");
  if (!customPageCards || !customPages || !Array.isArray(customPages.pages)) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug") || customPages.pages[0]?.slug;
  const page = customPages.pages.find((item) => item.slug === slug) || customPages.pages[0];

  if (!page) {
    return;
  }

  document.title = `CHILALA | ${page.titleHtml.replace(/<[^>]*>/g, "")}`;
  setText("[data-custom-eyebrow]", page.eyebrow);
  setHtml("[data-custom-title]", page.titleHtml);
  setText("[data-custom-description]", page.description);

  const moreLink = document.querySelector("[data-custom-more-link]");
  if (moreLink) {
    moreLink.href = `custom-page-all.html?slug=${encodeURIComponent(page.slug)}`;
  }

  const fallbackButton = document.querySelector("[data-back-fallback='custom-page.html']");
  if (fallbackButton) {
    fallbackButton.dataset.backFallback = `custom-page.html?slug=${encodeURIComponent(page.slug)}`;
  }

  const limit = Number(customPageCards.dataset.limit);
  const cards = Number.isFinite(limit) && limit > 0 ? (page.cards || []).slice(0, limit) : (page.cards || []);

  customPageCards.innerHTML = cards
    .map((card) => `
      <article class="custom-card ${escapeHtml(card.color || "blue")}" data-title="${escapeHtml([card.meta, card.title, card.description].join(" "))}">
        <span class="tool-number">${escapeHtml(card.number)}</span>
        <p>${escapeHtml(card.meta)}</p>
        <h2>${escapeHtml(card.title)}</h2>
        <span>${escapeHtml(card.description)}</span>
      </article>
    `)
    .join("");
  setupListingTools(
    customPageCards,
    document.querySelector("#customSearchInput"),
    document.querySelector("[data-custom-empty]"),
    document.querySelector("[data-custom-end]")
  );
}

function renderFooterContent(footer) {
  if (!footer) {
    return;
  }

  document.querySelectorAll("[data-footer-info]").forEach((footerInfo) => {
    footerInfo.innerHTML = `
      <div class="footer-links">
        <strong>${escapeHtml(footer.friendLinksTitle || "友情链接")}</strong>
        ${(footer.friendLinks || [])
          .map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`)
          .join("")}
      </div>
      <div class="footer-statement">
        <strong>${escapeHtml(footer.statementTitle || "网站声明")}</strong>
        <p>${escapeHtml(footer.statement)}</p>
      </div>
    `;
  });

  if (footer.copyright) {
    document.querySelectorAll(".site-footer > p").forEach((copyright) => {
      copyright.classList.add("footer-copyright");
      copyright.textContent = footer.copyright;
    });
  }
}

async function initManagedContent() {
  try {
    const navigationData = await loadJsonFile("data/navigation.json");
    renderNavigation(navigationData);
  } catch (error) {
    // Keep the hardcoded navigation visible during local file previews.
  }

  try {
    const siteData = await loadJsonFile("data/site.json");
    PROJECT_PASSWORD = siteData.settings?.projectPassword || PROJECT_PASSWORD;
    setCopyProtection(siteData.settings?.copyProtection !== false);
    if (siteData.settings?.email) {
      document.querySelectorAll(".mail-button").forEach((link) => {
        link.href = `mailto:${siteData.settings.email}`;
      });
    }
    renderHomeContent(siteData.home);
    renderAboutContent(siteData.about);
    renderFooterContent(siteData.footer);
  } catch (error) {
    PROJECT_PASSWORD = PROJECT_PASSWORD || "979797";
    setCopyProtection(true);
  }

  try {
    const projectData = await loadJsonFile("data/projects.json");
    renderProjectCards(projectData.projects);
  } catch (error) {
    // Keep the hardcoded project cards visible during local file previews.
    setupProjectListings();
  }

  try {
    const experienceData = await loadJsonFile("data/experience.json");
    renderExperienceContent(experienceData);
  } catch (error) {
    // Keep the hardcoded timeline visible during local file previews.
  }

  try {
    const toolboxData = await loadJsonFile("data/toolbox.json");
    renderToolboxContent(toolboxData);
  } catch (error) {
    renderToolboxContent(defaultToolboxData);
  }

  try {
    const trainingData = await loadJsonFile("data/training.json");
    renderTrainingContent(trainingData);
  } catch (error) {
    renderTrainingContent(defaultTrainingData);
  }

  try {
    const customPagesData = await loadJsonFile("data/custom-pages.json");
    renderCustomPage(customPagesData);
  } catch (error) {
    // Keep the hardcoded custom page fallback visible during local file previews.
  }
}

const backButton = document.querySelector("[data-back-button]");

if (backButton) {
  backButton.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = backButton.dataset.backFallback || "articles.html";
  });
}

document.addEventListener("click", (event) => {
  const dynamicBackButton = event.target.closest("[data-back-button]");
  if (!dynamicBackButton || dynamicBackButton === backButton) {
    return;
  }
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = dynamicBackButton.dataset.backFallback || "training.html";
});

const defaultArticleData = {
  "ai-testing-efficiency": {
    index: "01",
    title: "AI 编程如何帮测试工程师提效",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "用 AI 辅助整理需求、生成测试点和构造边界场景，让测试准备更快进入状态。",
    body: [
      "AI 编程最直接的价值，不是替测试工程师做决定，而是把重复整理和初稿生成的时间压缩下来。需求文档很长、字段很多、状态流复杂时，可以先让 AI 帮忙提炼模块、角色、流程和异常点。",
      "我更倾向于把 AI 当成一个测试准备助手：让它生成测试点清单、边界值候选、接口字段校验方向，再由测试人员结合业务规则做取舍和补充。",
      "真正影响质量的仍然是判断力。AI 可以很快列出看似完整的场景，但哪些路径最容易出问题、哪些数据会影响账务或库存、哪些缺陷必须阻断上线，还是需要测试人员自己把关。",
      "所以更好的用法是：AI 提速，人来校准。把 AI 产出的内容当作草稿，而不是结论。"
    ]
  },
  "ai-test-cases": {
    index: "02",
    title: "用大模型辅助编写测试用例",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "把需求文档转成测试思路，再人工校验业务逻辑，可以提升覆盖率但不能替代判断。",
    body: [
      "写测试用例时，大模型适合先帮我们搭一个框架。例如从功能描述里拆出前置条件、操作步骤、预期结果、异常路径和数据准备。",
      "但测试用例不是越多越好，而是要能覆盖关键风险。AI 生成的用例经常会偏通用，需要测试人员补充业务上下文，比如 WMS 的库存变化、MES 的工单状态、财务系统的数据一致性。",
      "我会把 AI 生成内容分成三类处理：可以直接保留的基础路径、需要人工确认的业务规则、明显不符合系统逻辑的无效场景。",
      "这样做的好处是节省初稿时间，也能帮助自己发现遗漏的角度，但最终用例质量仍然取决于评审和执行反馈。"
    ]
  },
  "ai-api-automation": {
    index: "03",
    title: "从接口测试到自动化：AI 能做什么",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "AI 适合生成脚本草稿、解释报错和补充异常场景，核心仍是测试人员对业务风险的把控。",
    body: [
      "接口测试和自动化测试里，AI 可以帮助生成脚本草稿、整理断言思路、解释报错信息，也可以根据接口文档补充参数组合。",
      "比如面对一个订单接口，可以让 AI 先列出必填字段、非法字段、边界值、状态流转和并发风险，再根据系统实际规则筛选。",
      "不过自动化脚本真正难的不是写出来，而是长期维护。测试数据、接口依赖、环境差异、断言稳定性，都会影响脚本是否可靠。",
      "因此 AI 更适合帮助启动和排查，而不是完全接管。测试人员要负责定义验证目标、识别风险和维护自动化策略。"
    ]
  },
  "automation-maintenance": {
    index: "04",
    title: "自动化测试脚本如何更容易维护",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "稳定选择器、清晰分层和可复用数据，是自动化测试从能跑到好用的关键。",
    body: [
      "自动化测试脚本能跑起来只是第一步，真正决定价值的是后续维护成本。如果每次页面微调都要大量改脚本，自动化就会变成负担。",
      "我认为维护性来自三个方面：稳定的定位方式、清晰的业务封装、可复用的测试数据。脚本应该表达业务动作，而不是堆满脆弱的操作细节。",
      "接口自动化也是一样。公共鉴权、参数构造、断言方法和环境配置应该抽出来复用，避免每个用例都从零写一遍。",
      "好的自动化不是追求覆盖所有东西，而是优先覆盖高频、稳定、收益明确的回归路径。"
    ]
  },
  "jmeter-thinking": {
    index: "05",
    title: "JMeter 接口压测前要想清楚什么",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "压测不是只看并发数，还要明确业务链路、数据准备、断言和瓶颈观察方式。",
    body: [
      "使用 JMeter 做接口压测前，最需要先想清楚的不是并发数，而是业务目标。要压的是登录、下单、生成拣货单，还是完整业务链路？不同目标对应的数据和断言完全不同。",
      "第二是测试数据。压测数据如果不可重复、不可清理，结果就很容易失真。库存、订单、用户、权限这些数据都要提前准备好。",
      "第三是观察指标。响应时间、错误率、吞吐量只是表面，还要结合服务器资源、数据库慢查询、接口日志一起看。",
      "压测的意义不是制造数字，而是帮助团队知道系统在什么条件下会慢、会错、会撑不住。"
    ]
  },
  "bug-closure": {
    index: "06",
    title: "缺陷闭环里最容易漏掉的细节",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "复现路径、影响范围、回归证据和风险说明，决定问题是否真的被关闭。",
    body: [
      "缺陷闭环不是把状态改成已关闭就结束了。一个问题是否真的解决，要看复现路径是否清楚、修复范围是否明确、回归验证是否充分。",
      "记录缺陷时，我会特别关注触发条件、测试数据、实际结果、预期结果和影响范围。信息越完整，开发定位越快，后续复盘也更容易。",
      "修复后也不能只验证原步骤，还要看相关模块是否被影响。例如库存变动、订单状态、财务数据、外部接口同步，都可能因为一个修复产生连锁变化。",
      "缺陷闭环的核心是让问题从发现到修复都有证据，而不是只留下一个状态。"
    ]
  },
  "test-report-audience": {
    index: "07",
    title: "测试报告应该写给谁看",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "测试报告不只是记录执行结果，更要帮助团队看清质量风险、上线条件和后续动作。",
    body: [
      "测试报告不是为了证明测试做过了，而是为了让不同角色快速理解当前质量状态。研发关心缺陷修复和回归范围，产品关心需求完成度，项目负责人关心上线风险。",
      "一份有用的测试报告应该包含测试范围、执行情况、缺陷分布、遗留风险和上线建议。数据要清楚，结论也要明确。",
      "如果报告只有用例执行数量，很难支持决策。更关键的是解释哪些问题已经解决，哪些问题仍然存在，继续上线会带来什么影响。",
      "测试报告的价值，是把测试过程转化为团队能理解、能行动的质量信息。"
    ]
  },
  "weak-network-testing": {
    index: "08",
    title: "弱网测试为什么不能省",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "移动端体验经常坏在网络波动里，弱网测试能提前暴露超时、重试和数据一致性问题。",
    body: [
      "很多移动端问题在正常网络下看不出来，但用户真实环境并不总是稳定。地铁、电梯、地下停车场、跨区域网络切换，都可能让请求超时或状态异常。",
      "弱网测试要关注加载提示、超时处理、重复提交、数据缓存和失败重试。尤其是订单、支付、发帖、上传这类操作，网络波动很容易带来重复数据或状态不一致。",
      "测试时可以结合工具模拟延迟、丢包和断网，也可以在真机环境中切换 Wi-Fi、蜂窝网络和飞行模式。",
      "弱网测试不是为了制造极端场景，而是为了确保用户在不完美的网络里也能得到清楚、可恢复的体验。"
    ]
  },
  "requirement-review-quality": {
    index: "09",
    title: "从需求评审开始做质量保障",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "越早识别规则冲突、边界条件和数据影响，后面测试与修复的成本就越可控。",
    body: [
      "质量保障不应该从提测才开始。需求评审阶段如果能提前发现规则不清、状态遗漏、字段冲突和上下游影响，后面的返工会少很多。",
      "我在评审时会重点看三件事：主流程是否闭合，异常流是否说明清楚，数据变化是否能被验证。业务系统尤其要关注库存、工单、财务和接口同步。",
      "好的问题不只是指出不合理，还要让团队意识到可能的风险。例如某个状态能不能回退，某个接口失败后数据是否会补偿，某个权限是否影响操作路径。",
      "测试人员越早参与需求，越能把质量思维前置到设计阶段。"
    ]
  },
  "api-data-consistency": {
    index: "10",
    title: "接口测试里的数据一致性怎么验证",
    author: "CHILALA",
    updated: "2026.07.10",
    modified: "2026.07.10",
    summary: "接口返回只是第一层结果，还要结合数据库、上下游系统和业务状态验证数据是否一致。",
    body: [
      "接口测试不能只看返回码和 message。对于业务系统来说，更重要的是接口执行后数据有没有真的按规则变化。",
      "比如 WMS 里的出库接口，除了返回成功，还要检查订单状态、库存数量、拣货单数据，以及是否同步到相关系统。财务类接口也要关注金额、账期和统计口径。",
      "验证数据一致性时，可以结合数据库查询、后台页面、日志和上下游接口结果。不同来源的信息互相印证，才能判断接口是否真正正确。",
      "接口测试的目标不是让接口表面通过，而是确认业务链路里的数据真实、准确、可追踪。"
    ]
  }
};

let articleData = defaultArticleData;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getArticles() {
  return Object.entries(articleData)
    .map(([id, article]) => ({ id, ...article }))
    .sort((a, b) => Number(a.index) - Number(b.index));
}

function articleCardTemplate(article) {
  return `
    <article class="thick-card article-card note-card" data-title="${escapeHtml(article.title)}">
      <span class="date-block yellow">${escapeHtml(article.index)}</span>
      <h2>${escapeHtml(article.title)}</h2>
      <p>${escapeHtml(article.summary)}</p>
      <a href="article-detail.html?id=${encodeURIComponent(article.id)}">阅读全文</a>
    </article>
  `;
}

function renderArticleCards(container, articles) {
  container.innerHTML = articles.map(articleCardTemplate).join("");
}

async function loadArticleData() {
  try {
    const response = await fetch("data/articles.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Article data is unavailable.");
    }
    const rawData = await response.json();
    const articles = Array.isArray(rawData) ? rawData : rawData.articles;
    if (!Array.isArray(articles)) {
      throw new Error("Article data format is invalid.");
    }
    articleData = Object.fromEntries(
      articles
        .filter((article) => article.id)
        .map(({ id, ...article }) => [id, article])
    );
  } catch (error) {
    articleData = defaultArticleData;
  }
}

function setupListEndMessage(list, endOfList, itemCount) {
  if (!endOfList) {
    return () => {};
  }

  let currentCount = itemCount;

  const updateEndMessage = (visibleCount = currentCount) => {
    currentCount = visibleCount;
    const isScrollable = visibleCount > 6;
    list.classList.toggle("is-scrollable", isScrollable);

    if (!isScrollable) {
      endOfList.hidden = false;
      return;
    }

    const reachedBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 8;
    endOfList.hidden = !reachedBottom;
  };

  list.addEventListener("scroll", () => updateEndMessage());
  window.requestAnimationFrame(() => updateEndMessage(itemCount));
  return updateEndMessage;
}

function setupListingSearch(list, searchInput, emptySearch, endOfList, updateEndMessage) {
  if (!searchInput) {
    return;
  }

  const cards = Array.from(list.querySelectorAll("[data-title]"));

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const title = card.dataset.title.toLowerCase();
      const isVisible = title.includes(keyword);
      card.hidden = !isVisible;
      if (isVisible) {
        visibleCount += 1;
      }
    });

    if (emptySearch) {
      emptySearch.hidden = keyword === "" || visibleCount > 0;
    }

    if (endOfList) {
      if (keyword !== "" && visibleCount === 0) {
        endOfList.hidden = true;
      } else if (updateEndMessage) {
        updateEndMessage(visibleCount);
      } else {
        endOfList.hidden = false;
      }
    }
  });
}

function setupListingTools(list, searchInput, emptySearch, endOfList) {
  if (!list || list.dataset.searchReady === "true") {
    return;
  }
  list.dataset.searchReady = "true";
  const cards = Array.from(list.querySelectorAll("[data-title]"));
  const updateEndMessage = setupListEndMessage(list, endOfList, cards.length);
  setupListingSearch(list, searchInput, emptySearch, endOfList, updateEndMessage);
}

function setupInterviewListingPages() {
  document.querySelectorAll("[data-interview-listing]").forEach((list) => {
    const section = list.closest("[data-interview-listing-section]") || document;
    list.querySelectorAll(":scope > *").forEach((item) => {
      if (!item.dataset.title) {
        item.dataset.title = item.textContent.replace(/\s+/g, " ").trim();
      }
    });
    setupListingTools(
      list,
      section.querySelector("[data-interview-search]"),
      section.querySelector("[data-interview-empty]"),
      section.querySelector("[data-interview-end]")
    );
  });
}

function renderArticleDetail() {
  const articleDetail = document.querySelector("[data-article-detail]");

  if (!articleDetail) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const article = articleData[params.get("id")] || articleData["ai-testing-efficiency"];
  document.title = `CHILALA | ${article.title}`;
  document.querySelector("[data-article-index]").textContent = article.index;
  document.querySelector("[data-article-title]").textContent = article.title;
  document.querySelector("[data-article-meta]").innerHTML = `<span>作者：${escapeHtml(article.author)}</span><span>更新：${escapeHtml(article.updated)}</span>`;
  document.querySelector("[data-article-summary]").textContent = article.summary;
  renderArticleBody(article);
}

function renderArticleBody(article) {
  const body = document.querySelector("[data-article-body]");
  const toc = document.querySelector("[data-article-toc]");

  if (!body) {
    return;
  }

  if (article.contentHtml) {
    body.innerHTML = article.contentHtml;
  } else {
    body.innerHTML = article.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  }

  const anchors = Array.from(body.querySelectorAll("h2, h3"));
  anchors.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = `article-section-${index + 1}`;
    }
  });

  if (toc) {
    if (anchors.length === 0) {
      toc.hidden = true;
      toc.innerHTML = "";
      return;
    }

    toc.hidden = false;
    toc.innerHTML = `
      <strong>文章目录</strong>
      <div>
        ${anchors.map((heading) => `<a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.textContent)}</a>`).join("")}
      </div>
    `;
  }
}

const interviewQuizQuestions = [
  {
    category: "测试基础",
    question: "需求评审阶段，测试人员最应该优先确认什么？",
    options: ["页面颜色是否好看", "业务规则、角色权限、主流程、异常流和验收标准", "开发什么时候下班"],
    answer: 1,
    explanation: "需求评审不是听需求，而是提前发现歧义、缺口和风险。主流程、异常流、权限、数据来源、验收标准必须先确认。"
  },
  {
    category: "测试环境",
    question: "测试环境准备时，以下哪项最容易导致“误报 Bug”？",
    options: ["测试账号权限不完整或基础数据不一致", "测试用例写得太详细", "截图太清晰"],
    answer: 0,
    explanation: "账号权限、配置、基础数据、接口地址不一致，很容易让环境问题伪装成业务缺陷，所以执行前要先做环境冒烟。"
  },
  {
    category: "用例设计",
    question: "金额输入框最需要覆盖哪类边界？",
    options: ["最小值、最大值、超限、小数精度、负数、空值和非法字符", "只测 100 元", "只测页面是否显示"],
    answer: 0,
    explanation: "金额字段属于高风险字段，尤其要关注精度、边界、非法输入和数据落库，财务、订单、银行类系统都很常问。"
  },
  {
    category: "接口测试",
    question: "订单发货接口重复提交时，最应该验证什么？",
    options: ["按钮颜色", "是否重复扣库存、重复生成单据或状态错乱", "浏览器窗口大小"],
    answer: 1,
    explanation: "重复提交对应接口幂等风险。WMS、订单、支付、财务场景都要关注重复请求造成的数据不一致。"
  },
  {
    category: "数据库",
    question: "接口返回成功后，为什么还要查数据库？",
    options: ["确认数据是否正确落库、状态是否流转、关联表是否一致", "为了显得很忙", "查数据库和测试无关"],
    answer: 0,
    explanation: "接口成功不代表业务成功。测试要验证前端、接口返回、数据库、上下游同步是否一致。"
  },
  {
    category: "Linux",
    question: "接口报 500，测试人员排查时最贴近真实工作的动作是？",
    options: ["直接说开发写错了", "保留请求参数、响应、账号数据，并协助查看服务日志和异常栈", "刷新浏览器就结束"],
    answer: 1,
    explanation: "专业表达是证据链：请求、响应、环境、账号、数据库、日志。这样开发更容易复现和定位。"
  },
  {
    category: "Java 理解",
    question: "测试人员理解 Java 异常和日志，主要价值是什么？",
    options: ["替代开发写业务代码", "看懂报错、定位接口问题、提升缺陷沟通效率", "和测试完全无关"],
    answer: 1,
    explanation: "测试不一定要做开发，但懂异常、对象、集合、JSON、HTTP、日志，会明显提高接口和缺陷定位能力。"
  },
  {
    category: "WMS 业务",
    question: "WMS 出库测试最核心的数据风险是什么？",
    options: ["库存扣减、库位库存、单据状态和外部系统同步不一致", "页面标题太长", "按钮圆角不统一"],
    answer: 0,
    explanation: "仓储系统的核心是账实一致。出库链路要看库存、库位、波次、拣货、发货、ERP/TMS 同步。"
  },
  {
    category: "跨境电商",
    question: "跨境商品服务系统测试，多币种场景最容易漏测什么？",
    options: ["汇率换算、展示币/结算币、精度舍入、平台同步差异", "商品图片好不好看", "登录按钮大小"],
    answer: 0,
    explanation: "跨境业务常涉及美元、当地币、平台币种、海外仓和结算规则，金额精度和汇率来源是高频风险。"
  },
  {
    category: "上线验收",
    question: "上线前测试报告里最应该写清楚什么？",
    options: ["测试范围、通过情况、缺陷状态、遗留风险和上线建议", "今天心情", "电脑型号"],
    answer: 0,
    explanation: "测试报告不是流水账，而是给团队判断是否可上线的质量依据。"
  }
];

const interviewScenarioCases = {
  wms: {
    title: "WMS 仓储供应链系统",
    prompt: "需求：新增“发货订单生成拣货单”接口，并同步 TMS。请模拟一次上机测试表达。",
    context: "重点关注库存扣减、库位库存、单据状态、重复提交、PDA 请求、ERP/TMS/MES 数据一致性。",
    points: [
      "先确认需求规则：发货订单状态、库存占用、拣货单生成条件和失败回滚规则。",
      "准备测试数据：商品、批次、库位、库存数量、发货订单、承运商和外部系统配置。",
      "设计主流程用例：正常生成拣货单、PDA 拣货、发货完成、TMS 同步成功。",
      "设计异常流用例：库存不足、库位不可用、重复提交、外部接口超时、部分同步失败。",
      "使用 JMeter 或 Postman 执行接口测试，检查参数、返回码、幂等和响应时间。",
      "使用 MySQL/Navicat 验证库存、单据状态、接口日志和同步记录。",
      "发现缺陷后提交复现步骤、请求响应、数据库前后变化和影响范围。",
      "回归时验证缺陷修复，同时关注是否引入库存错扣或状态错乱新问题。"
    ]
  },
  mes: {
    title: "MES 打版生产系统",
    prompt: "需求：工单下发后支持工序报工和异常处理。请说明你如何测试。",
    context: "重点关注 BOM、工艺路线、派工、报工、在制品状态、ERP 工单同步和现场 UAT 反馈。",
    points: [
      "确认工艺路线、BOM、工序顺序、报工权限、异常类型和完工入库规则。",
      "准备工单、物料、工位、人员、设备、工序和半成品状态数据。",
      "覆盖正常生产链路：工单下发、派工、首工序开工、报工、末工序完工。",
      "覆盖异常场景：跳工序报工、重复报工、报工数量超工单、异常暂停和返工。",
      "验证 MES 与 ERP 接口同步：工单状态、物料消耗、完工数量和异常数据。",
      "做浏览器兼容和现场 UAT 支持，记录现场反馈并转成可复现缺陷。",
      "用数据库核对工单、工序、报工明细和库存变更是否一致。",
      "输出回归范围和测试报告，说明高风险模块是否已验证。"
    ]
  },
  ecommerce: {
    title: "跨境电商商品服务系统",
    prompt: "需求：商品中心新增多规格 SKU 并同步 Shopee/Amazon。请做测试分析。",
    context: "重点关注平台差异、展示币/结算币、汇率、海外仓、本地仓、SKU 映射和同步失败重试。",
    points: [
      "确认平台规则：Shopee、Amazon、独立站字段差异、必填项、类目和图片限制。",
      "确认币种规则：展示币、结算币、汇率来源、精度舍入和美元统一结算场景。",
      "准备商品、SPU、SKU、规格、库存、价格、仓库和平台账号测试数据。",
      "覆盖主流程：商品创建、多规格维护、上架、平台同步、价格库存同步。",
      "覆盖异常流：部分 SKU 同步失败、汇率为空、仓库不匹配、平台字段超长。",
      "验证数据库商品主表、SKU 表、同步日志、平台映射表和失败重试记录。",
      "使用 Fiddler/Postman/JMeter 验证接口参数、返回、重试和并发同步稳定性。",
      "输出测试风险：平台规则变动、多币种精度、同步延迟、海外仓库存不一致。"
    ]
  },
  finance: {
    title: "财务管理系统",
    prompt: "需求：新增费用报销审批和付款统计报表。请说明测试重点。",
    context: "重点关注金额精度、审批流、角色权限、汇总统计、导出、财务数据准确性和审计日志。",
    points: [
      "确认费用类型、审批层级、付款状态、报表口径和金额精度规则。",
      "准备申请人、审批人、财务、部门、费用科目和多状态单据数据。",
      "覆盖主流程：提交报销、审批通过、财务付款、报表统计和导出。",
      "覆盖异常流：驳回、撤回、重复提交、超额、附件缺失、无权限审批。",
      "验证金额小数、合计、筛选条件、日期范围和跨部门权限隔离。",
      "使用 SQL 核对明细表、审批表、付款表、报表统计口径是否一致。",
      "关注审计日志：谁在什么时候改了什么状态，是否可追踪。",
      "回归时重点看旧报表、旧审批流和权限是否受新需求影响。"
    ]
  },
  forum: {
    title: "论坛 APP 项目",
    prompt: "需求：新增帖子评论点赞和弱网重试。请模拟测试方案。",
    context: "重点关注移动端兼容、网络切换、弱网、重复点赞、内容审核、消息通知和服务端数据一致性。",
    points: [
      "确认评论、点赞、取消点赞、通知、审核和弱网重试的业务规则。",
      "准备多账号、帖子、评论、敏感词、不同网络和不同机型数据。",
      "覆盖主流程：发布帖子、评论、点赞、取消点赞、消息通知。",
      "覆盖异常流：重复点击、弱网断网、切后台、登录失效、内容被审核拦截。",
      "使用 Fiddler 抓包分析客户端请求、重试次数和服务端返回。",
      "使用 ADB/真机做兼容、安装升级、网络切换和 Monkey 稳定性测试。",
      "验证数据库评论数、点赞数、通知记录和用户状态是否一致。",
      "输出专项报告：兼容机型、弱网表现、稳定性问题和遗留风险。"
    ]
  }
};

function buildGenericInterviewScenario(system) {
  const modules = system.modules || [];
  const tasks = system.tasks || [];
  const knowledge = system.knowledge || {};
  const commonCases = knowledge.commonCases || [];
  const title = system.name || "新增测试系统";
  const moduleText = modules.length ? modules.join("、") : "核心模块、接口、权限、数据和回归范围";
  const taskPoints = tasks.slice(0, 3).map((task) => `${task.title}：${task.description}`);
  const commonPoints = commonCases.slice(0, 2).map((item) => `结合常见业务情况分析：${item}`);

  return {
    title,
    prompt: `需求：${title} 新增或调整核心业务流程。请按真实测试工作说明你的测试方案。`,
    context: `重点关注 ${moduleText}，并结合需求评审、测试环境、测试数据、接口数据一致性、缺陷跟踪和回归验收来表达。`,
    points: [
      `先确认需求范围：${moduleText} 的业务规则、角色权限、状态流转和验收标准。`,
      "准备测试环境：版本包、配置、账号权限、基础数据、第三方接口地址、日志和数据库访问。",
      "拆主流程和异常流：至少覆盖正常路径、边界值、重复提交、权限不足、接口失败和数据回滚。",
      ...taskPoints,
      ...commonPoints,
      "使用接口工具验证请求参数、返回结果、幂等、异常提示和响应时间。",
      "使用数据库验证关键表状态、关联数据、操作日志、同步记录和报表口径。",
      "提交缺陷时补齐复现步骤、账号数据、截图录屏、接口请求响应、数据库前后变化和影响范围。",
      "回归测试时验证缺陷是否修复，并关注相关模块是否产生新问题。",
      "最后输出测试报告：测试范围、通过情况、缺陷状态、遗留风险和上线建议。"
    ].slice(0, 10)
  };
}

function getInterviewScenarioCases(training = currentTrainingData) {
  const dynamicCases = {};
  (training?.systems || []).forEach((system) => {
    const key = system.slug || system.name;
    if (!key) {
      return;
    }
    dynamicCases[key] = interviewScenarioCases[key] || buildGenericInterviewScenario(system);
  });
  return { ...interviewScenarioCases, ...dynamicCases };
}

function getInterviewQuestionRound(question) {
  if (question.round) {
    return question.round;
  }
  if (/(WMS|MES|跨境|财务|APP|业务|项目)/i.test(question.category)) {
    return "second";
  }
  if (/(上线|规划|沟通|反问|风险)/.test(question.category)) {
    return "third";
  }
  return "first";
}

const interviewFoundationQuestions = [
  ["测试基础", "黑盒测试常用方法不包括哪一项？", ["等价类", "边界值", "代码覆盖率统计"], 2, "代码覆盖率更偏白盒或自动化统计，黑盒常用等价类、边界值、判定表、场景法、错误推测。", "first"],
  ["测试基础", "冒烟测试的核心目的是什么？", ["验证版本是否具备继续测试条件", "把所有用例都跑完", "只测页面颜色"], 0, "冒烟测试先看主流程是否可用，避免版本不可测导致大量无效执行。", "first"],
  ["测试基础", "回归测试应该优先覆盖什么？", ["改动模块、关联模块、历史高频缺陷和核心主流程", "随机点几个页面", "只看新需求"], 0, "回归不是全部重测，而是围绕改动影响面和核心风险做优先级。", "first"],
  ["测试基础", "缺陷严重程度通常看什么？", ["对业务、数据、用户、上线风险的影响", "开发是否忙", "测试是否喜欢这个功能"], 0, "严重程度由影响范围和业务损失决定，优先级由修复紧急程度决定。", "first"],
  ["测试环境", "测试前发现接口地址还是开发本机地址，应该怎么处理？", ["先确认配置并阻止继续误测", "继续执行所有用例", "直接上线"], 0, "环境配置错误会污染测试结论，必须先确认环境再执行。", "first"],
  ["测试环境", "测试账号权限不完整，最可能导致什么问题？", ["把权限配置问题误判成功能缺陷", "提升测试效率", "自动修复 Bug"], 0, "账号、角色、菜单、数据权限是环境准备重点。", "first"],
  ["用例设计", "状态流转类需求最适合先画什么？", ["状态机或流程图", "个人头像", "颜色表"], 0, "订单、工单、审批、出入库都需要先梳理状态流转。", "first"],
  ["用例设计", "权限测试至少要覆盖什么？", ["无权限、有权限、越权、数据隔离", "只测管理员", "只测按钮是否存在"], 0, "权限不仅是菜单，还包括接口、数据范围和操作权限。", "first"],
  ["接口测试", "接口测试里 Token 过期应该验证什么？", ["返回码、错误提示、是否允许继续访问敏感数据", "页面字体", "电脑电量"], 0, "认证失效属于安全和权限风险。", "first"],
  ["接口测试", "接口幂等主要防什么？", ["重复请求导致重复扣款、重复扣库存、重复生成单据", "用户换头像", "页面滚动"], 0, "订单、支付、库存、财务接口都要特别关注幂等。", "first"],
  ["数据库", "查询订单及明细常见会用到什么 SQL 能力？", ["join 关联查询", "只会刷新页面", "只会截图"], 0, "主表和明细表、状态表、日志表经常需要关联验证。", "first"],
  ["数据库", "生产环境数据问题排查时，测试人员最应该注意什么？", ["只读优先、谨慎操作、保留证据、不要随意改数", "随便 update", "删除重建"], 0, "线上数据高风险，测试要有安全边界和审计意识。", "first"],
  ["Linux", "查看实时日志常用命令是哪一个？", ["tail -f", "paint", "rename"], 0, "tail -f 常用于实时观察服务日志，再配合 grep 搜关键字。", "first"],
  ["Linux", "排查接口超时时，除了接口响应还要关注什么？", ["服务日志、数据库慢查询、网络、第三方依赖", "桌面壁纸", "浏览器主题"], 0, "超时可能来自服务、数据库、网络、缓存或外部接口。", "first"],
  ["Java 理解", "NullPointerException 常说明什么？", ["对象为空却被调用", "网络一定断了", "浏览器版本太新"], 0, "测试看到空指针异常时，可以结合入参、日志和数据为空场景协助定位。", "first"],
  ["Java 理解", "接口返回 JSON 字段缺失，测试应该优先确认什么？", ["接口文档、实际返回、前端依赖字段和兼容影响", "屏幕亮度", "键盘布局"], 0, "字段缺失可能影响前端展示、下游解析和旧版本兼容。", "first"],
  ["性能测试", "性能测试前为什么要明确业务模型？", ["不同接口访问比例和数据量会影响压测真实性", "为了写更多字", "为了换浏览器"], 0, "性能测试不是盲压，要接近真实业务访问比例。", "first"],
  ["性能测试", "压测发现错误率升高，应优先查看什么？", ["错误响应、服务日志、资源监控和瓶颈点", "网页背景", "鼠标速度"], 0, "错误率上升要结合接口返回、日志、CPU、内存、数据库等定位。", "first"],
  ["三面综合", "面试被问到不会的问题，比较稳妥的回答是？", ["承认不熟，但说明自己的排查思路和学习补齐方式", "乱编一个答案", "直接沉默"], 0, "真实可靠比硬编更重要，三面尤其看沟通和稳定性。", "third"],
  ["三面综合", "反问面试官时，最适合问什么？", ["团队测试流程、岗位重点、系统复杂度和质量建设现状", "公司八卦", "面试官年龄"], 0, "反问要体现你关注岗位匹配和质量交付。", "third"]
].map(([category, question, options, answer, explanation, round]) => ({ category, question, options, answer, explanation, round }));

function buildSystemInterviewQuestions(system) {
  const name = system.name || "新增测试系统";
  const modules = system.modules?.length ? system.modules.join("、") : "核心模块";
  const firstTask = system.tasks?.[0]?.title || "需求评审";
  const firstTaskDescription = system.tasks?.[0]?.description || "确认业务规则、角色权限、主流程、异常流和验收标准";
  const secondTask = system.tasks?.[1]?.title || "主流程测试";
  const knowledge = system.knowledge || {};
  const commonCase = knowledge.commonCases?.[0] || `${name} 常见情况需要结合业务规则、接口和数据库一起判断。`;

  return [
    {
      category: `${name} 项目`,
      question: `面试官问你 ${name} 怎么做需求评审，最应该先讲什么？`,
      options: [`围绕${modules}确认规则、权限、主流程、异常流和验收标准`, "先说页面好不好看", "只说自己执行过测试"],
      answer: 0,
      explanation: `${firstTask} 要落到业务规则和风险识别。可以补充：${firstTaskDescription}`,
      round: "second"
    },
    {
      category: `${name} 项目`,
      question: `${name} 做测试数据准备时，最合理的做法是？`,
      options: ["按角色、状态、边界、异常和关联数据准备", "只准备一个默认账号", "完全依赖线上数据"],
      answer: 0,
      explanation: "测试数据要覆盖主流程和异常流，还要能支撑接口、数据库和回归验证。",
      round: "second"
    },
    {
      category: `${name} 项目`,
      question: `${secondTask} 执行时，除了页面成功，还要验证什么？`,
      options: ["接口返回、数据库落库、状态流转、日志和上下游同步", "只看按钮变色", "只看截图清晰"],
      answer: 0,
      explanation: "真实项目测试要形成证据链：前端、接口、数据库、日志、上下游系统。",
      round: "second"
    },
    {
      category: `${name} 项目`,
      question: `${name} 出现上线风险时，测试报告里最应该写清楚什么？`,
      options: ["影响范围、复现条件、缺陷状态、回归情况和上线建议", "个人心情", "电脑配置"],
      answer: 0,
      explanation: "上线报告的价值是帮助团队判断风险是否可接受。",
      round: "third"
    },
    {
      category: `${name} 行业常识`,
      question: `结合 ${name} 的常见业务情况，测试表达最应该体现什么？`,
      options: [commonCase, "只说功能点，不谈业务", "只背定义，不举例"],
      answer: 0,
      explanation: "二面会深挖行业理解，回答要把业务规则、数据流和测试验证动作连起来。",
      round: "second"
    }
  ];
}

function getInterviewQuestionBank(training = currentTrainingData, round = "all") {
  const baseQuestions = interviewQuizQuestions.map((question) => ({
    ...question,
    round: getInterviewQuestionRound(question)
  }));
  const systemQuestions = (training?.systems || []).flatMap(buildSystemInterviewQuestions);
  const bank = [...baseQuestions, ...interviewFoundationQuestions, ...systemQuestions];
  const filtered = round === "all" ? bank : bank.filter((question) => question.round === round);
  return filtered.slice(0, round === "all" ? 80 : 60);
}

function setupInterviewQuiz() {
  const quizList = document.querySelector("[data-interview-quiz]");
  if (!quizList) {
    return;
  }

  const scoreBox = document.querySelector("[data-quiz-score]");
  const progressBox = document.querySelector("[data-quiz-progress]");
  const submitButton = document.querySelector("[data-quiz-submit]");
  const resetButton = document.querySelector("[data-quiz-reset]");
  const modeButtons = Array.from(document.querySelectorAll("[data-quiz-round]"));

  const renderQuiz = () => {
    const activeRound = quizList.dataset.activeRound || "all";
    const questionBank = getInterviewQuestionBank(currentTrainingData, activeRound);
    quizList.interviewQuestionBank = questionBank;
    quizList.innerHTML = questionBank.map((item, index) => `
      <article class="quiz-question" data-quiz-question="${index}">
        <div class="quiz-question-head">
          <span>${escapeHtml(item.category)}</span>
          <b>${String(index + 1).padStart(2, "0")}</b>
        </div>
        <h3>${escapeHtml(item.question)}</h3>
        <div class="quiz-options">
          ${item.options.map((option, optionIndex) => `
            <label>
              <input type="radio" name="interview-question-${index}" value="${optionIndex}" />
              <span>${escapeHtml(option)}</span>
            </label>
          `).join("")}
        </div>
        <p class="quiz-explanation" hidden>${escapeHtml(item.explanation)}</p>
      </article>
    `).join("");
    if (scoreBox) {
      scoreBox.textContent = "未作答";
    }
    if (progressBox) {
      const roundName = { all: "完整模拟", first: "一面基础", second: "二面项目", third: "三面综合" }[activeRound] || "完整模拟";
      progressBox.textContent = `${roundName}：本次 ${questionBank.length} 题，建议 80 分以上再进入下一轮。`;
    }
  };

  renderQuiz();

  if (quizList.dataset.ready === "true") {
    return;
  }
  quizList.dataset.ready = "true";

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      modeButtons.forEach((item) => item.classList.toggle("active", item === button));
      quizList.dataset.activeRound = button.dataset.quizRound || "all";
      renderQuiz();
    });
  });

  submitButton?.addEventListener("click", () => {
    let rightCount = 0;
    const questionCards = Array.from(quizList.querySelectorAll(".quiz-question"));
    const questionBank = quizList.interviewQuestionBank || [];

    questionCards.forEach((card, index) => {
      const checked = card.querySelector("input:checked");
      const selected = checked ? Number(checked.value) : -1;
      const isRight = selected === questionBank[index].answer;
      card.classList.remove("is-right", "is-wrong");
      card.classList.add(isRight ? "is-right" : "is-wrong");
      card.querySelectorAll("label").forEach((label, optionIndex) => {
        label.classList.toggle("is-answer", optionIndex === questionBank[index].answer);
      });
      const explanation = card.querySelector(".quiz-explanation");
      if (explanation) {
        explanation.hidden = false;
      }
      if (isRight) {
        rightCount += 1;
      }
    });

    const score = questionCards.length ? Math.round((rightCount / questionCards.length) * 100) : 0;
    const level = score >= 90 ? "优秀，可以进入项目深挖" : score >= 80 ? "通过，建议继续刷错题" : score >= 60 ? "基础不稳，先补流程和工具" : "需要重学测试基础";
    if (scoreBox) {
      scoreBox.textContent = `${score} 分 / 答对 ${rightCount}/${questionCards.length} / ${level}`;
    }
  });

  resetButton?.addEventListener("click", renderQuiz);
}

function setupInterviewScenarioExam(training = currentTrainingData) {
  const select = document.querySelector("[data-scenario-select]");
  const caseBox = document.querySelector("[data-scenario-case]");
  const checklist = document.querySelector("[data-scenario-checklist]");
  const scoreButton = document.querySelector("[data-scenario-score]");
  const resetButton = document.querySelector("[data-scenario-reset]");
  const result = document.querySelector("[data-scenario-result]");

  if (!select || !caseBox || !checklist) {
    return;
  }

  const cases = getInterviewScenarioCases(training);
  const currentValue = select.value;
  select.innerHTML = Object.entries(cases)
    .map(([key, scenario]) => `<option value="${escapeHtml(key)}">${escapeHtml(scenario.title)}</option>`)
    .join("");
  if (cases[currentValue]) {
    select.value = currentValue;
  }

  const renderScenario = () => {
    const latestCases = getInterviewScenarioCases(currentTrainingData);
    const scenario = latestCases[select.value] || latestCases.wms || Object.values(latestCases)[0];
    if (!scenario) {
      return;
    }
    caseBox.innerHTML = `
      <span class="round-badge">项目场景</span>
      <h3>${escapeHtml(scenario.title)}</h3>
      <p><strong>面试官：</strong>${escapeHtml(scenario.prompt)}</p>
      <p><strong>业务提醒：</strong>${escapeHtml(scenario.context)}</p>
    `;
    checklist.innerHTML = scenario.points.map((point, index) => `
      <label>
        <input type="checkbox" value="${index}" />
        <span>${escapeHtml(point)}</span>
      </label>
    `).join("");
    if (result) {
      result.textContent = "请选择场景并完成自评。";
    }
  };

  if (select.dataset.ready !== "true") {
    select.addEventListener("change", renderScenario);
    select.dataset.ready = "true";
  }
  renderScenario();

  scoreButton?.addEventListener("click", () => {
    const total = checklist.querySelectorAll("input").length;
    const checked = checklist.querySelectorAll("input:checked").length;
    const score = total ? Math.round((checked / total) * 100) : 0;
    let comment = "还需要补测试流程、数据校验和缺陷闭环。";
    if (score >= 90) {
      comment = "表达完整，具备独立负责项目测试的面试表现。";
    } else if (score >= 75) {
      comment = "整体过关，建议补充异常流、接口数据和上线风险表达。";
    } else if (score >= 60) {
      comment = "能讲主流程，但项目深度不足，需要补业务链路和证据链。";
    }
    if (result) {
      result.textContent = `${score} 分：${comment}`;
    }
  });

  resetButton?.addEventListener("click", renderScenario);
}

function renderInterviewExtendGrid(training = currentTrainingData) {
  const extendGrid = document.querySelector("[data-interview-extend-grid]");
  if (!extendGrid) {
    return;
  }

  const baseCards = [
    {
      title: "按项目拓展",
      description: "新增 WMS、MES、跨境、财务、论坛 APP、银行、游戏等项目专项问答。"
    },
    {
      title: "按岗位拓展",
      description: "区分初级测试、功能测试、接口测试、自动化测试、性能测试、测试组长。"
    },
    {
      title: "按工具拓展",
      description: "继续补 Postman、JMeter、Fiddler、MySQL、Linux、Git、Java 基础题。"
    },
    {
      title: "按面试反馈拓展",
      description: "每次真实面试后，把被问到的问题沉淀成“题目 + 答案 + 项目例子 + 避坑点”。"
    }
  ];

  const systemCards = (training?.systems || []).map((system) => {
    const modules = system.modules?.length ? system.modules.join("、") : "主流程、异常流、接口、数据和回归";
    const taskTitle = system.tasks?.[0]?.title || "需求评审";
    return {
      title: `${system.name || "新增系统"} 面试专项`,
      description: `围绕${modules}追问：${taskTitle}怎么做、测试数据怎么准备、接口和数据库怎么验证、缺陷如何闭环。`
    };
  });

  extendGrid.innerHTML = [...baseCards, ...systemCards]
    .map((card) => `
      <article data-title="${escapeHtml([card.title, card.description].join(" "))}">
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.description)}</p>
      </article>
    `)
    .join("");
  extendGrid.dataset.searchReady = "false";
  setupInterviewListingPages();
}

function renderRoundPracticeBoard(training = currentTrainingData) {
  const board = document.querySelector("[data-round-practice-board]");
  if (!board) {
    return;
  }

  const systems = training?.systems || [];
  const systemLinks = systems
    .map((system) => `<a href="${escapeHtml(system.link || "training.html")}">${escapeHtml(system.name || "新增系统")}</a>`)
    .join("");

  board.innerHTML = `
    <article class="round-column blue">
      <span>一面训练</span>
      <h3>测试基础 + 工具能力</h3>
      <p>重点刷测试流程、测试环境、用例设计、缺陷生命周期、SQL、Linux、接口测试、Java 基础理解。</p>
      <ul>
        <li>能不能讲清楚“从需求到上线”的测试工作流</li>
        <li>能不能用项目例子解释测试方法</li>
        <li>能不能用工具证明问题、定位问题</li>
      </ul>
      <div class="round-card-actions">
        <a href="interview-practice.html?round=first&type=single">开始练习</a>
        <a href="interview-practice.html?round=first&type=multi">刷题模式</a>
      </div>
    </article>
    <article class="round-column coral">
      <span>二面训练</span>
      <h3>项目深挖 + 业务链路</h3>
      <p>从测试训练系统里自动同步项目入口，用来练真实项目描述、业务风险、接口数据和缺陷闭环。</p>
      <div class="system-chip-list">${systemLinks}</div>
      <div class="round-card-actions">
        <a href="interview-practice.html?round=second&type=single">开始练习</a>
        <a href="interview-practice.html?round=second&type=multi">刷题模式</a>
      </div>
    </article>
    <article class="round-column green">
      <span>三面训练</span>
      <h3>综合匹配 + 反问策略</h3>
      <p>重点准备职业规划、稳定性、团队协作、上线风险处理、质量建设和面试者反问。</p>
      <ul>
        <li>用“经历 + 方法 + 结果”回答综合问题</li>
        <li>反问团队流程、系统复杂度、自动化现状</li>
        <li>避免夸大，保留真实可验证的表达</li>
      </ul>
      <div class="round-card-actions">
        <a href="interview-practice.html?round=third&type=single">开始练习</a>
        <a href="interview-practice.html?round=third&type=multi">刷题模式</a>
      </div>
    </article>
  `;
}

const PRACTICE_MISTAKE_KEY = "chilala-interview-practice-mistakes";

const interviewPracticeGeneralQuestions = [
  { id: "sd-01", kind: "single", round: "first", category: "软件基础知识", question: "B/S 架构系统测试时，前端页面请求后端接口通常基于什么协议？", options: ["HTTP/HTTPS", "Bluetooth", "HDMI"], answer: 0, explanation: "Web 系统一般通过 HTTP/HTTPS 调用接口，测试时要关注请求方法、状态码、参数、响应和鉴权。" },
  { id: "sd-02", kind: "single", round: "first", category: "软件基础知识", question: "客户端提示成功但数据库没有数据，最优先怀疑哪类问题？", options: ["页面颜色", "接口或事务提交异常", "键盘坏了"], answer: 1, explanation: "前端成功不等于业务成功，要核对接口返回、服务日志、事务提交和数据库落库。" },
  { id: "sd-03", kind: "fill", round: "first", category: "软件基础知识", question: "常见 Web 请求方法中，查询数据通常使用 ___，新增数据通常使用 ___。", keywords: ["GET", "POST"], explanation: "GET 常用于查询，POST 常用于新增或提交复杂数据，真实项目仍以接口文档为准。" },
  { id: "sd-04", kind: "single", round: "first", category: "软件测试基础", question: "需求评审时测试人员最应该输出什么？", options: ["需求疑问、测试范围、风险点和验收标准", "个人审美意见", "上线庆祝方案"], answer: 0, explanation: "需求评审的核心是把需求说清楚，把风险提前暴露出来。" },
  { id: "sd-05", kind: "single", round: "first", category: "软件测试基础", question: "等价类划分最适合解决什么问题？", options: ["从大量输入中抽取代表性有效/无效数据", "替代所有测试", "只测 UI"], answer: 0, explanation: "等价类用于减少重复输入，边界值用于补关键边界。" },
  { id: "sd-06", kind: "fill", round: "first", category: "软件测试基础", question: "缺陷报告至少要包含标题、复现步骤、实际结果、预期结果和 ___。", keywords: ["环境", "截图", "证据", "日志"], explanation: "环境、截图、日志、接口请求响应、数据库前后变化都能提高定位效率。" },
  { id: "tool-01", kind: "single", round: "first", category: "测试软件平台基础知识", question: "Postman 更适合用来做什么？", options: ["接口调试和参数验证", "制作海报", "压缩图片"], answer: 0, explanation: "Postman 常用于接口请求构造、断言、环境变量和集合执行。" },
  { id: "tool-02", kind: "single", round: "first", category: "测试软件平台基础知识", question: "JMeter 在线程组里主要配置什么？", options: ["并发用户数、循环次数、启动时间", "网页字体", "图片尺寸"], answer: 0, explanation: "线程组决定压测并发模型，是性能和接口批量执行的重要配置。" },
  { id: "tool-03", kind: "fill", round: "first", category: "测试软件平台基础知识", question: "Fiddler 常用于对 APP/PDA 请求进行 ___ 分析。", keywords: ["抓包", "请求", "响应"], explanation: "抓包能看到客户端与服务端交互数据，适合定位移动端和接口问题。" },
  { id: "flow-01", kind: "single", round: "first", category: "日常测试工作流程", question: "拿到新需求后，比较稳的工作顺序是？", options: ["需求评审→范围拆分→计划→用例→执行→缺陷→回归→上线验收", "先上线再测试", "只看页面"], answer: 0, explanation: "完整流程能避免漏测、乱测和上线风险失控。" },
  { id: "flow-02", kind: "fill", round: "first", category: "日常测试工作流程", question: "冒烟测试通过后，才适合进入大范围 ___ 测试。", keywords: ["系统", "功能", "详细"], explanation: "冒烟测试用于确认版本是否具备继续测试条件。" },
  { id: "flow-03", kind: "single", round: "first", category: "日常测试工作流程", question: "回归测试范围主要由什么决定？", options: ["代码改动影响面、核心流程和历史缺陷", "随机心情", "页面截图数量"], answer: 0, explanation: "回归要围绕变更风险和核心业务，不是机械全部重测。" },
  { id: "db-01", kind: "single", round: "first", category: "数据库", question: "MySQL 中筛选订单状态通常会使用哪个关键字？", options: ["WHERE", "STYLE", "CLICK"], answer: 0, explanation: "WHERE 用于过滤条件，真实测试常结合订单号、状态、时间、用户等字段查询。" },
  { id: "db-02", kind: "fill", round: "first", category: "数据库", question: "关联订单主表和明细表通常会用到 SQL 的 ___ 查询。", keywords: ["JOIN", "join"], explanation: "主表、明细表、日志表经常需要 JOIN 验证数据一致性。" },
  { id: "linux-01", kind: "single", round: "first", category: "Linux", question: "查看日志中包含 error 的内容常用哪个命令组合？", options: ["grep error app.log", "open color", "copy image"], answer: 0, explanation: "grep 可按关键字过滤日志，tail -f 可实时观察日志。" },
  { id: "linux-02", kind: "fill", round: "first", category: "Linux", question: "实时查看日志常用命令是 tail ___。", keywords: ["-f"], explanation: "tail -f app.log 是测试排查接口异常时的高频动作。" },
  { id: "java-01", kind: "single", round: "first", category: "Java 基础", question: "接口报 NullPointerException，测试表达更专业的是？", options: ["对象为空导致调用异常，建议结合入参和日志定位", "电脑卡了", "浏览器坏了"], answer: 0, explanation: "理解常见异常可以提升缺陷沟通效率。" },
  { id: "java-02", kind: "fill", round: "first", category: "Java 基础", question: "接口返回 JSON，本质上常见结构包含对象、数组和 ___。", keywords: ["字段", "键值", "key"], explanation: "测试接口时要关注字段类型、必填、枚举、精度和兼容性。" },
  { id: "proj-01", kind: "single", round: "second", category: "测试项目知识", question: "项目深挖时，回答最不能只停留在什么层面？", options: ["只说点了哪些按钮", "说明业务规则和数据流", "说明风险和回归"], answer: 0, explanation: "二面常看项目真实参与深度，要讲业务链路、数据验证和缺陷闭环。" },
  { id: "proj-02", kind: "fill", round: "second", category: "测试项目知识", question: "项目表达建议按“背景、职责、流程、工具、结果、___”组织。", keywords: ["风险", "复盘", "亮点"], explanation: "结构化表达更像真实做过项目，避免流水账。" },
  { id: "proj-03", kind: "single", round: "second", category: "测试项目知识", question: "接口测试执行后，除响应成功外，还应验证什么？", options: ["数据库状态、业务结果、日志和上下游同步", "按钮颜色", "电脑型号"], answer: 0, explanation: "接口测试要形成前端、接口、数据库、日志、外部系统的证据链。" },
  { id: "third-01", kind: "single", round: "third", category: "综合匹配", question: "三面被问到职业规划，最稳的回答方向是？", options: ["结合岗位能力、业务理解、自动化/质量提升方向", "说完全没想过", "只谈薪资"], answer: 0, explanation: "三面更看稳定性、成长方向、团队匹配和表达真实性。" },
  { id: "third-02", kind: "fill", round: "third", category: "综合匹配", question: "面试反问可以围绕团队流程、系统复杂度、质量建设和 ___ 展开。", keywords: ["岗位重点", "自动化", "上线节奏"], explanation: "好的反问体现你在判断岗位匹配，而不是随便问。" },
  { id: "third-03", kind: "single", round: "third", category: "综合匹配", question: "如果线上出现高风险缺陷，测试人员首先要做什么？", options: ["确认影响范围、保留证据、协同止损并推动修复回归", "责怪别人", "退出群聊"], answer: 0, explanation: "线上问题处理要先止损、定范围、保留证据、修复验证、复盘预防。" },
  { id: "multi-01", kind: "multi", round: "first", category: "软件测试基础", question: "以下哪些属于常见黑盒用例设计方法？", options: ["等价类", "边界值", "场景法", "随便点一点"], answers: [0, 1, 2], explanation: "黑盒常用等价类、边界值、判定表、因果图、场景法、错误推测。" },
  { id: "multi-02", kind: "multi", round: "first", category: "测试软件平台基础知识", question: "以下哪些工具常用于接口或性能测试？", options: ["Postman", "JMeter", "LoadRunner", "画图板"], answers: [0, 1, 2], explanation: "Postman 偏接口调试，JMeter/LoadRunner 常用于接口批量执行和性能压测。" },
  { id: "multi-03", kind: "multi", round: "first", category: "日常测试工作流程", question: "提交缺陷时，哪些信息能明显提升定位效率？", options: ["复现步骤", "测试环境", "截图/录屏", "请求响应和日志"], answers: [0, 1, 2, 3], explanation: "缺陷证据越完整，开发复现和定位越快。" },
  { id: "multi-04", kind: "multi", round: "second", category: "测试项目知识", question: "项目深挖时，哪些内容更能证明你真实参与过？", options: ["业务流程", "测试数据准备", "缺陷案例", "上线风险处理"], answers: [0, 1, 2, 3], explanation: "真实项目表达要有业务、工具、数据、缺陷、回归和结果。" },
  { id: "multi-05", kind: "multi", round: "third", category: "综合匹配", question: "三面反问可以问哪些内容？", options: ["岗位主要负责系统", "团队测试流程", "自动化建设现状", "上线节奏和质量要求"], answers: [0, 1, 2, 3], explanation: "反问要围绕岗位匹配和后续工作开展。" }
];

const interviewPracticeExpansionQuestions = [
  { id: "exp-basic-01", kind: "single", round: "first", category: "软件基础知识", question: "Web 系统出现 403，测试人员优先判断哪类问题？", options: ["权限或鉴权问题", "图片太大", "鼠标没电"], answer: 0, explanation: "403 通常与权限、Token、角色、接口鉴权有关，要结合账号和接口响应判断。" },
  { id: "exp-basic-02", kind: "single", round: "first", category: "软件基础知识", question: "前端页面显示缓存旧数据，可能与哪些因素有关？", options: ["浏览器缓存、接口缓存、服务端缓存或数据未刷新", "屏幕贴膜", "键盘输入法"], answer: 0, explanation: "缓存问题要结合接口返回、页面刷新、缓存策略和后端数据变化判断。" },
  { id: "exp-basic-03", kind: "fill", round: "first", category: "软件基础知识", question: "常见 HTTP 状态码中，404 表示资源 ___，500 表示服务端 ___。", keywords: ["不存在", "异常", "错误"], explanation: "状态码是接口和 Web 排查的基础，面试常结合场景追问。" },
  { id: "exp-test-01", kind: "single", round: "first", category: "软件测试基础", question: "测试范围拆分时，最容易被新人漏掉的是哪一类？", options: ["异常流、权限、历史缺陷和关联模块", "正常主流程", "页面标题"], answer: 0, explanation: "新人常只测正向流程，真实项目要重点补异常流和影响面。" },
  { id: "exp-test-02", kind: "fill", round: "first", category: "软件测试基础", question: "判定表适合处理多个条件组合导致不同 ___ 的需求。", keywords: ["结果", "动作", "规则"], explanation: "如优惠、审批、权限、计费等多条件规则适合用判定表。" },
  { id: "exp-tool-01", kind: "single", round: "first", category: "测试软件平台基础知识", question: "Fiddler 抓不到 HTTPS 请求时，通常要检查什么？", options: ["证书安装、代理配置、手机网络代理", "页面配色", "Excel 格式"], answer: 0, explanation: "移动端抓包要配置代理和证书，否则看不到 HTTPS 明文请求。" },
  { id: "exp-tool-02", kind: "single", round: "first", category: "测试软件平台基础知识", question: "JMeter 做接口关联时，常用什么把上一个接口结果传给下一个接口？", options: ["提取器和变量", "截图工具", "浏览器收藏夹"], answer: 0, explanation: "例如 JSON Extractor 提取 token、orderId，再传给后续请求。" },
  { id: "exp-sql-01", kind: "single", round: "first", category: "数据库", question: "核对报表统计金额时，最应该关注什么？", options: ["统计口径、筛选条件、小数精度和明细汇总", "表格颜色", "按钮大小"], answer: 0, explanation: "财务、订单、库存报表都要核对明细与汇总口径。" },
  { id: "exp-linux-01", kind: "fill", round: "first", category: "Linux", question: "排查日志时按关键字过滤通常使用 ___ 命令。", keywords: ["grep"], explanation: "grep 常配合 tail、cat、less 使用。" },
  { id: "exp-java-01", kind: "single", round: "first", category: "Java 基础", question: "接口超时但数据库有慢 SQL，测试沟通时应强调什么？", options: ["业务请求与慢查询的关联证据", "页面不够好看", "电脑风扇声音"], answer: 0, explanation: "要用请求参数、耗时、日志、SQL 证据辅助定位。" },
  { id: "exp-wms-01", kind: "single", round: "second", category: "WMS 项目场景", question: "WMS 盘点差异调整后，最需要验证什么？", options: ["账面库存、库位库存、批次库存和盘点记录一致", "登录页背景", "浏览器标题"], answer: 0, explanation: "仓储系统核心是库存一致，盘点会影响多张库存相关表。" },
  { id: "exp-wms-02", kind: "fill", round: "second", category: "WMS 项目场景", question: "出库链路常见状态包括待拣货、已拣货、已复核、已发货和 ___。", keywords: ["取消", "异常", "失败"], explanation: "状态流转题要结合主流程和异常流表达。" },
  { id: "exp-mes-01", kind: "single", round: "second", category: "MES 项目场景", question: "MES 报工数量超过工单数量，测试重点是什么？", options: ["是否拦截、提示、记录异常并避免错误入库", "字体大小", "头像是否显示"], answer: 0, explanation: "生产系统要防止数量、工序、物料消耗错误。" },
  { id: "exp-ecom-01", kind: "single", round: "second", category: "跨境电商项目场景", question: "Shopee SG 商品同步时，币种最常见会涉及什么？", options: ["SGD 展示、USD 或平台规则结算、汇率和精度", "只用人民币", "不需要价格"], answer: 0, explanation: "跨境要关注展示币、结算币、汇率来源、舍入和平台字段差异。" },
  { id: "exp-ecom-02", kind: "fill", round: "second", category: "跨境电商项目场景", question: "跨境商品同步失败时，要检查平台映射、字段校验、同步日志和 ___ 机制。", keywords: ["重试", "补偿"], explanation: "同步失败要看是否可重试、是否产生脏数据、是否通知运营处理。" },
  { id: "exp-finance-01", kind: "single", round: "second", category: "财务项目场景", question: "财务系统审批流测试，最需要覆盖哪些角色？", options: ["申请人、审批人、财务、管理员和无权限用户", "只有管理员", "游客"], answer: 0, explanation: "审批流必须覆盖角色、权限、状态、金额和审计日志。" },
  { id: "exp-forum-01", kind: "single", round: "second", category: "论坛 APP 项目场景", question: "APP 弱网测试时，最适合观察什么？", options: ["请求重试、加载提示、重复提交、数据一致性", "手机壳颜色", "屏幕亮度"], answer: 0, explanation: "移动端弱网容易导致重复提交、状态不同步和体验问题。" },
  { id: "exp-bank-01", kind: "single", round: "second", category: "银行项目场景", question: "银行转账类场景测试最重要的风险是什么？", options: ["金额、账户、幂等、风控、对账和审计日志", "按钮圆角", "首页图片"], answer: 0, explanation: "金融类系统高风险，必须关注资金安全、风控和可追溯。" },
  { id: "exp-game-01", kind: "single", round: "second", category: "游戏项目场景", question: "游戏充值到账测试，除支付成功外还要验证什么？", options: ["道具到账、订单状态、重复回调、补单和日志", "角色发型", "背景音乐"], answer: 0, explanation: "游戏测试同样重视支付、资产、账号、弱网、兼容和反作弊。" },
  { id: "exp-third-01", kind: "single", round: "third", category: "综合匹配", question: "被追问项目里最大的困难时，回答结构最好是？", options: ["背景困难 + 我的动作 + 协作对象 + 结果复盘", "说没有困难", "说都是别人问题"], answer: 0, explanation: "三面更看解决问题和复盘能力，避免甩锅。" },
  { id: "exp-third-02", kind: "fill", round: "third", category: "综合匹配", question: "谈离职原因建议保持真实、克制，并回到岗位匹配和 ___。", keywords: ["成长", "发展", "稳定"], explanation: "离职原因不要抱怨前公司，要表达正向选择。" },
  { id: "exp-multi-01", kind: "multi", round: "first", category: "软件测试基础", question: "测试计划里通常应包含哪些内容？", options: ["测试范围", "人员和时间安排", "环境和数据准备", "风险和交付物"], answers: [0, 1, 2, 3], explanation: "测试计划是执行前的作战图，不是形式文档。" },
  { id: "exp-multi-02", kind: "multi", round: "first", category: "接口测试", question: "接口测试用例一般覆盖哪些维度？", options: ["必填和类型", "边界和枚举", "权限和幂等", "数据库与日志"], answers: [0, 1, 2, 3], explanation: "接口测试要覆盖参数、业务、权限、异常和数据一致性。" },
  { id: "exp-multi-03", kind: "multi", round: "second", category: "项目深挖", question: "讲 WMS/MES 项目时，哪些点能体现业务理解？", options: ["状态流转", "上下游接口", "异常流", "数据一致性"], answers: [0, 1, 2, 3], explanation: "业务系统项目表达一定要讲链路和数据。" },
  { id: "exp-multi-04", kind: "multi", round: "third", category: "综合匹配", question: "上线前质量评估应关注哪些内容？", options: ["严重缺陷是否关闭", "核心流程回归结果", "遗留风险", "回滚方案"], answers: [0, 1, 2, 3], explanation: "上线验收不是只看测试通过率，还要判断风险是否可接受。" }
];

const practiceRoundNames = {
  all: "完整模拟",
  first: "一面基础",
  second: "二面项目",
  third: "三面综合"
};

function getPracticeMistakes() {
  try {
    return JSON.parse(localStorage.getItem(PRACTICE_MISTAKE_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function savePracticeMistake(category, amount = 1) {
  const mistakes = getPracticeMistakes();
  mistakes[category] = (mistakes[category] || 0) + amount;
  localStorage.setItem(PRACTICE_MISTAKE_KEY, JSON.stringify(mistakes));
}

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildSystemPracticeQuestions(system, index) {
  const name = system.name || `训练系统${index + 1}`;
  const slug = system.slug || `system-${index + 1}`;
  const modules = system.modules?.length ? system.modules.join("、") : "主流程、接口、权限、数据、回归";
  const firstTask = system.tasks?.[0] || { title: "需求评审", description: "确认规则、流程和验收标准" };
  const secondTask = system.tasks?.[1] || { title: "测试执行", description: "覆盖主流程和异常流" };
  const risk = system.knowledge?.risks?.[0] || "业务数据不一致、状态流转异常或接口同步失败";
  const commonCase = system.knowledge?.commonCases?.[0] || `${name} 要结合真实业务流程拆测试范围。`;

  return [
    { id: `${slug}-single-01`, kind: "single", round: "second", category: `${name} 项目知识`, question: `${name} 做需求评审时，最应该优先确认什么？`, options: [`${modules} 的业务规则、角色权限、状态流转和验收标准`, "页面配色是否可爱", "只确认开发什么时候提测"], answer: 0, explanation: `结合 ${firstTask.title}：${firstTask.description}` },
    { id: `${slug}-single-02`, kind: "single", round: "second", category: `${name} 项目知识`, question: `${name} 执行主流程后，除页面提示成功外还要看什么？`, options: ["接口返回、数据库落库、日志、状态流转和上下游同步", "只看按钮", "只看标题"], answer: 0, explanation: "真实项目验证要形成证据链。" },
    { id: `${slug}-single-03`, kind: "single", round: "second", category: `${name} 项目知识`, question: `${name} 缺陷回归时，最应该关注什么？`, options: ["原问题是否修复以及关联模块是否产生新问题", "只把状态改关闭", "只问开发好了没"], answer: 0, explanation: "回归要覆盖修复点和影响面。" },
    { id: `${slug}-single-04`, kind: "single", round: "second", category: `${name} 行业常识`, question: `结合 ${name}，以下哪种表达更像真实做过项目？`, options: [commonCase, "我只点页面", "我没看过需求"], answer: 0, explanation: "行业常识能让项目表达更具体、更可信。" },
    { id: `${slug}-fill-01`, kind: "fill", round: "second", category: `${name} 项目知识`, question: `${name} 重点模块可概括为：${modules}，其中测试要特别关注 ___。`, keywords: [risk, "数据", "状态", "接口", "回归"], explanation: `该系统高频风险：${risk}` },
    { id: `${slug}-fill-02`, kind: "fill", round: "second", category: `${name} 项目知识`, question: `${name} 面试表达建议把“需求、用例、执行、缺陷、___、上线风险”串起来。`, keywords: ["回归", "报告", "复盘"], explanation: "项目表达要闭环，不能只停在执行。" },
    { id: `${slug}-multi-01`, kind: "multi", round: "second", category: `${name} 项目知识`, question: `${name} 做测试范围拆分时，应覆盖哪些维度？`, options: ["主流程", "异常流", "权限和数据", "接口与回归"], answers: [0, 1, 2, 3], explanation: `范围拆分要围绕 ${modules} 和核心风险。` },
    { id: `${slug}-multi-02`, kind: "multi", round: "second", category: `${name} 项目知识`, question: `${name} 提交关键缺陷时，哪些证据更有价值？`, options: ["复现步骤", "测试数据", "接口请求响应", "数据库前后变化"], answers: [0, 1, 2, 3], explanation: "关键缺陷要补齐证据链，方便定位和回归。" },
    { id: `${slug}-multi-03`, kind: "multi", round: "third", category: `${name} 综合面`, question: `三面聊到 ${name}，哪些回答角度比较加分？`, options: ["业务价值", "质量风险", "团队协作", "上线验收和复盘"], answers: [0, 1, 2, 3], explanation: "三面更关注你是否能从交付和协作角度看问题。" }
  ];
}

function normalizePracticeQuestion(question, fallbackIndex) {
  const kind = question.kind || "single";
  return {
    ...question,
    id: question.id || `practice-${fallbackIndex}`,
    kind,
    round: question.round || getInterviewQuestionRound(question),
    category: question.category || "综合题库"
  };
}

function getInterviewPracticePool(training = currentTrainingData, round = "all", type = "single") {
  const singleFromQuiz = getInterviewQuestionBank(training, "all").map((question, index) => ({
    ...question,
    id: `quiz-${index}`,
    kind: "single"
  }));
  const systemQuestions = (training?.systems || []).flatMap(buildSystemPracticeQuestions);
  const rawPool = [...interviewPracticeGeneralQuestions, ...interviewPracticeExpansionQuestions, ...singleFromQuiz, ...systemQuestions]
    .map(normalizePracticeQuestion);
  const kindPool = type === "multi"
    ? rawPool.filter((question) => question.kind === "multi")
    : rawPool.filter((question) => question.kind !== "multi");
  const roundPool = round === "all" ? kindPool : kindPool.filter((question) => question.round === round);
  return roundPool.length ? roundPool : kindPool;
}

function buildWeightedPracticeSet(pool, targetCount) {
  const mistakes = getPracticeMistakes();
  const weighted = pool.flatMap((question) => {
    const weight = Math.min(5, 1 + (mistakes[question.category] || 0));
    return Array.from({ length: weight }, () => question);
  });
  const source = shuffleItems(weighted.length ? weighted : pool);
  const selected = [];
  let cursor = 0;
  while (selected.length < targetCount && source.length) {
    selected.push({ ...source[cursor % source.length], instanceId: `${source[cursor % source.length].id}-${selected.length}` });
    cursor += 1;
  }
  return selected;
}

function isFillAnswerRight(value, question) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (question.keywords || []).some((keyword) => normalized.includes(String(keyword).toLowerCase()));
}

function evaluatePracticeCard(card, question) {
  if (question.kind === "fill") {
    const value = card.querySelector("input[type='text']")?.value || "";
    return isFillAnswerRight(value, question);
  }
  if (question.kind === "multi") {
    const selected = Array.from(card.querySelectorAll("input:checked")).map((input) => Number(input.value)).sort((a, b) => a - b);
    const rightAnswers = [...(question.answers || [])].sort((a, b) => a - b);
    return selected.length === rightAnswers.length && selected.every((value, index) => value === rightAnswers[index]);
  }
  const checked = card.querySelector("input:checked");
  return checked ? Number(checked.value) === question.answer : false;
}

function renderPracticeQuestion(question, index) {
  const answerText = question.kind === "multi"
    ? (question.answers || []).map((answer) => question.options?.[answer]).join("、")
    : question.kind === "fill"
      ? (question.keywords || []).join(" / ")
      : question.options?.[question.answer];
  const inputName = `practice-${question.instanceId}`;

  return `
    <article class="practice-question-card" data-practice-question="${index}" data-category="${escapeHtml(question.category)}">
      <div class="practice-question-head">
        <span>${escapeHtml(question.category)}</span>
        <b>${String(index + 1).padStart(3, "0")}</b>
      </div>
      <h3>${escapeHtml(question.question)}</h3>
      ${question.kind === "fill" ? `
        <input class="practice-fill-input" type="text" placeholder="输入你的答案关键词" />
      ` : `
        <div class="practice-options">
          ${(question.options || []).map((option, optionIndex) => `
            <label>
              <input type="${question.kind === "multi" ? "checkbox" : "radio"}" name="${escapeHtml(inputName)}" value="${optionIndex}" />
              <span>${escapeHtml(option)}</span>
            </label>
          `).join("")}
        </div>
      `}
      <div class="practice-question-actions">
        <button type="button" data-mark-unknown>不会，加入下次重点</button>
      </div>
      <p class="practice-explanation" hidden>
        <strong>参考答案：</strong>${escapeHtml(answerText || "见解析")}<br />
        ${escapeHtml(question.explanation || "答题后建议结合项目例子复述一遍。")}
      </p>
    </article>
  `;
}

function setupInterviewPracticePage(training = currentTrainingData) {
  const page = document.querySelector("[data-interview-practice-page]");
  if (!page) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const roundSelect = page.querySelector("[data-practice-round]");
  const typeSelect = page.querySelector("[data-practice-type]");
  const list = page.querySelector("[data-practice-list]");
  const countBox = page.querySelector("[data-practice-count]");
  const scoreBox = page.querySelector("[data-practice-score]");
  const boostBox = page.querySelector("[data-practice-boost]");
  const title = page.querySelector("[data-practice-title]");
  const description = page.querySelector("[data-practice-description]");
  const submitButton = page.querySelector("[data-practice-submit]");
  const regenerateButton = page.querySelector("[data-practice-regenerate]");
  const clearButton = page.querySelector("[data-practice-clear-mistakes]");
  const wrongButton = page.querySelector("[data-practice-show-wrong]");

  if (!roundSelect || !typeSelect || !list) {
    return;
  }

  if (!page.dataset.practiceInitialized) {
    roundSelect.value = params.get("round") || "all";
    typeSelect.value = params.get("type") || "single";
    page.dataset.practiceInitialized = "true";
  }

  const render = () => {
    const round = roundSelect.value || "all";
    const type = typeSelect.value || "single";
    const targetCount = type === "multi" ? 50 : 100;
    const pool = getInterviewPracticePool(currentTrainingData, round, type);
    const questions = buildWeightedPracticeSet(pool, targetCount);
    page.practiceQuestions = questions;
    list.dataset.submitted = "false";
    list.classList.remove("show-wrong-only");
    list.innerHTML = questions.map(renderPracticeQuestion).join("");
    if (title) {
      title.innerHTML = `${practiceRoundNames[round] || "完整模拟"} <span class="highlight blue">${type === "multi" ? "多选刷题" : "基础练习"}</span>`;
    }
    if (description) {
      description.textContent = type === "multi"
        ? "本次 50 道多选题，重点训练范围拆分、工具组合、项目风险和综合判断。"
        : "本次 100 道单选+填空题，覆盖软件基础、测试基础、工具平台、日常流程和项目知识。";
    }
    if (countBox) {
      countBox.textContent = `${practiceRoundNames[round] || "完整模拟"} · ${type === "multi" ? "多选" : "单选+填空"} · 本次 ${questions.length} 题`;
    }
    if (scoreBox) {
      scoreBox.textContent = "未提交";
    }
    const mistakes = getPracticeMistakes();
    const boostCount = Object.values(mistakes).reduce((sum, value) => sum + Number(value || 0), 0);
    if (boostBox) {
      boostBox.textContent = boostCount ? `错题加权：已记录 ${boostCount} 次薄弱类型` : "错题加权：暂无记录";
    }
  };

  if (page.dataset.practiceEvents !== "true") {
    page.dataset.practiceEvents = "true";
    roundSelect.addEventListener("change", render);
    typeSelect.addEventListener("change", render);
    regenerateButton?.addEventListener("click", render);
    clearButton?.addEventListener("click", () => {
      localStorage.removeItem(PRACTICE_MISTAKE_KEY);
      render();
    });
    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mark-unknown]");
      if (!button) {
        return;
      }
      const card = button.closest("[data-practice-question]");
      const question = page.practiceQuestions?.[Number(card?.dataset.practiceQuestion)];
      if (!card || !question) {
        return;
      }
      card.dataset.unknown = "true";
      card.classList.add("is-unknown");
      savePracticeMistake(question.category, 1);
      button.textContent = "已加入下次重点";
      button.disabled = true;
    });
    submitButton?.addEventListener("click", () => {
      const questions = page.practiceQuestions || [];
      let rightCount = 0;
      list.querySelectorAll("[data-practice-question]").forEach((card) => {
        const question = questions[Number(card.dataset.practiceQuestion)];
        const isRight = evaluatePracticeCard(card, question);
        const isUnknown = card.dataset.unknown === "true";
        card.classList.remove("is-right", "is-wrong");
        card.classList.add(isRight && !isUnknown ? "is-right" : "is-wrong");
        if (isRight && !isUnknown) {
          rightCount += 1;
        } else if (question) {
          savePracticeMistake(question.category, isUnknown ? 2 : 1);
        }
        const explanation = card.querySelector(".practice-explanation");
        if (explanation) {
          explanation.hidden = false;
        }
      });
      list.dataset.submitted = "true";
      const score = questions.length ? Math.round((rightCount / questions.length) * 100) : 0;
      const level = score >= 90 ? "优秀" : score >= 80 ? "通过" : score >= 60 ? "需复盘" : "建议重刷";
      if (scoreBox) {
        scoreBox.textContent = `${score} 分 · 答对 ${rightCount}/${questions.length} · ${level}`;
      }
      const mistakes = getPracticeMistakes();
      const boostCount = Object.values(mistakes).reduce((sum, value) => sum + Number(value || 0), 0);
      if (boostBox) {
        boostBox.textContent = `错题加权：已记录 ${boostCount} 次薄弱类型，下次会提高占比`;
      }
    });
    wrongButton?.addEventListener("click", () => {
      list.classList.toggle("show-wrong-only");
      wrongButton.textContent = list.classList.contains("show-wrong-only") ? "显示全部题目" : "只看错题/不会题";
    });
  }

  render();
}

function setupInterviewTraining(training = currentTrainingData) {
  renderRoundPracticeBoard(training);
  setupInterviewQuiz();
  setupInterviewScenarioExam(training);
  renderInterviewExtendGrid(training);
  setupInterviewPracticePage(training);
}

async function initArticles() {
  await loadArticleData();

  const featuredArticleList = document.querySelector("[data-featured-article-list]");
  if (featuredArticleList) {
    renderArticleCards(featuredArticleList, getArticles().slice(0, 3));
  }

  const articleList = document.querySelector("[data-article-list]");
  if (articleList) {
    const articles = getArticles();
    renderArticleCards(articleList, articles);
    const endOfList = document.querySelector(".end-of-list");
    const updateEndMessage = setupListEndMessage(articleList, endOfList, articles.length);

    const articleSearchInput = document.querySelector("#articleSearchInput");
    setupListingSearch(
      articleList,
      articleSearchInput,
      document.querySelector("[data-empty-search]"),
      endOfList,
      updateEndMessage
    );
  }

renderArticleDetail();
}

setupInterviewTraining();
setupInterviewListingPages();
initManagedContent();
initArticles();
