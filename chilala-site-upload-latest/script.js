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

initManagedContent();
initArticles();
