let existingHandles = [];
let existingHandleSet = new Set();
let existingLeadDataByHandle = new Map();
let visitedHandleSet = new Set();
let handlesLoadStatus = {
  ok: false,
  error: "Not loaded yet",
  debug: null
};

// Edit these selectors if Instagram changes its suggested-accounts markup.
const IG_LEAD_SELECTORS = {
  suggestedSection: "section.xqui205.x172qv1o",
  suggestedList: "ul",
  suggestedCard: "li",
  // Use [class*="…"] for obfuscated IG classes (underscore-prefixed names break some .class selectors).
  suggestedUsernameLink: 'a.notranslate[class*="_a6hd"][href^="/"]',
  suggestedProfileLink: 'a[class*="_a6hd"][href^="/"]',
  suggestedProfileLinkFallback: 'a[role="link"][href^="/"]',
  suggestedProfileImage: 'img[alt*="profile picture"]',
  suggestedDismissButton: '[aria-label="Dismiss"]',
  suggestedFollowButton: 'div[role="button"]'
};

const IG_LEAD_CLASSES = {
  visitedSuggestionCard: "ig-lead-suggested-visited",
  visitedOverlay: "ig-lead-suggested-visited-overlay"
};

let suggestedGreyDebounce = null;
let suggestedRafId = null;
let suggestedVisitedObserver = null;
let suggestedSectionObservers = new WeakSet();
let suggestedMutationRefreshCount = 0;
let suggestedGreyInProgress = false;
let suggestedRetryTimers = [];


/* ---------------- INIT ---------------- */

(async function init() {

  if (!isProfilePage()) {
    return;
  }

  const auth = await chrome.runtime.sendMessage({ type: "gc-auth-status" }).catch(() => null);
  if (!auth?.loggedIn) {
    injectAuthRequiredWidget(auth);
    return;
  }

  await loadExistingHandles();

  const data = extractProfileData();
  const profileValues = {
    website: data.website || "",
    phone: data.phone || ""
  };

  data.hasWebsite = !!data.website;
  data.score = scoreLead(data);

  const normalizedCurrentHandle = normalizeHandle(data.handle);
  const exists = existingHandleSet.has(normalizedCurrentHandle);

  const existingRecord = existingLeadDataByHandle.get(normalizedCurrentHandle);
  if (existingRecord) {
    data.website = existingRecord.website ?? "";
    data.phone = existingRecord.phone ?? "";
    data.visited = !!existingRecord.visited;
    data.prospectId = existingRecord.id || null;
    data.hasWebsite = !!data.website;
    data.score = scoreLead(data);
  } else {
    data.visited = false;
    data.prospectId = null;
  }

  console.log("[IG Lead] Duplicate check", {
    rawHandle: data.handle,
    normalizedHandle: normalizedCurrentHandle,
    exists,
    knownHandleCount: existingHandleSet.size
  });

  injectWidget(data, exists, {
    rawHandle: data.handle,
    normalizedHandle: normalizedCurrentHandle,
    knownHandleCount: existingHandleSet.size,
    exists,
    loadStatus: handlesLoadStatus,
    authEmail: auth.email || ""
  }, profileValues, await getPanelVisible());

  initSuggestedVisitedHighlighting();

})();

/* ---------------- DETECTION ---------------- */

function isProfilePage() {
  const path = location.pathname.split("/").filter(Boolean);
  return path.length === 1;
}

/* ---------------- EXTRACTION ---------------- */

function extractProfileData() {
  const handle = location.pathname.split("/")[1] || "";
  const name = extractProfileName(handle);

  const website = extractWebsite();
  const bioText = extractBioText();
  const phone = extractPhoneFromText(bioText);

  const links = extractLinks();

  return {
    handle,
    name,
    website,
    phone,
    links,
    sourceUrl: location.href
  };
}

function extractProfileName(handle) {
  const header = getProfileHeader();
  if (!header) return "";

  const normalizedHandle = normalizeHandle(handle);

  const nearUsernameName = extractDisplayNameNearUsername(header, normalizedHandle);
  if (nearUsernameName) {
    return nearUsernameName;
  }

  const selectors = [
    "header section span[dir='auto']",
    "header section div[dir='auto']",
    "header h1",
    "header h2",
    "header section span"
  ];

  for (const selector of selectors) {
    const candidates = [...header.querySelectorAll(selector)]
      .map(el => (el.innerText || "").trim().replace(/\s+/g, " "))
      .filter(text => isLikelyProfileName(text, normalizedHandle));

    if (candidates.length) {
      return candidates[0];
    }
  }

  return "";
}

function extractDisplayNameNearUsername(header, normalizedHandle) {
  const usernameHeading = header.querySelector("h2[dir='auto'], h1[dir='auto']");
  if (!usernameHeading) return "";

  let cursor = usernameHeading.closest("div");
  while (cursor && cursor !== header) {
    let sibling = cursor.nextElementSibling;
    while (sibling) {
      const candidates = [
        ...sibling.querySelectorAll("span[dir='auto'], div[dir='auto']")
      ]
        .map(el => (el.innerText || "").trim().replace(/\s+/g, " "))
        .filter(text => isLikelyProfileName(text, normalizedHandle));

      if (candidates.length) {
        return candidates[0];
      }

      sibling = sibling.nextElementSibling;
    }

    cursor = cursor.parentElement;
  }

  return "";
}

function isLikelyProfileName(text, normalizedHandle) {
  if (!text) return false;

  const value = text.trim();
  if (!value) return false;

  const normalizedText = value.toLowerCase();
  if (normalizedText === normalizedHandle) return false;
  if (normalizedText === `@${normalizedHandle}`) return false;
  if (/^[\d\s.,]+$/.test(value)) return false;
  if (value.length > 60) return false;
  if (/,/.test(value) && /\d/.test(value)) return false;

  const blockedPhrases = [
    "posts",
    "followers",
    "following",
    "message",
    "follow",
    "edit profile",
    "view archive",
    "ad tools",
    "professional dashboard",
    "contact",
    "threads"
  ];

  return !blockedPhrases.some(phrase => normalizedText.includes(phrase));
}

function extractWebsite() {
  const header = getProfileHeader();
  if (!header) return "";

  const websiteAnchor = [...header.querySelectorAll('a[href^="http"]')]
    .map(a => a.href)
    .map(normalizeInstagramRedirect)
    .find(url => !shouldIgnoreLink(url));

  return websiteAnchor || "";
}

function extractBioText() {
  const header = getProfileHeader();
  if (!header) return "";
  return header.innerText || "";
}

function getProfileHeader() {
  return document.querySelector("header") || document.querySelector("main");
}

function extractLinks() {
  const header = getProfileHeader();
  if (!header) return [];

  const anchors = [...header.querySelectorAll('a[href^="http"]')];
  const anchorLinks = anchors
    .map(a => a.href)
    .map(normalizeInstagramRedirect)
    .filter(url => !shouldIgnoreLink(url));

  const bioText = extractBioText();
  const regex = /(https?:\/\/[^\s]+)/g;
  const textLinks = (bioText.match(regex) || [])
    .map(normalizeInstagramRedirect)
    .filter(url => !shouldIgnoreLink(url));

  return [...new Set([...anchorLinks, ...textLinks])];
}

function normalizeInstagramRedirect(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "l.instagram.com") {
      const target = parsed.searchParams.get("u");
      if (target) {
        return decodeURIComponent(target);
      }
    }

    return parsed.href;
  } catch (e) {
    return url;
  }
}

function shouldIgnoreLink(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    const blockedHosts = new Set([
      "instagram.com",
      "about.instagram.com",
      "help.instagram.com",
      "developers.facebook.com",
      "facebook.com",
      "meta.com",
      "meta.ai",
      "threads.com",
      "indonesia.fb.com"
    ]);

    if (blockedHosts.has(host)) return true;
    if (host.endsWith(".instagram.com")) return true;
    if (host.endsWith(".facebook.com")) return true;
    if (host.endsWith(".meta.com")) return true;

    return false;
  } catch (e) {
    return true;
  }
}

function extractPhoneFromText(text) {
  if (!text) return "";

  const matches = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [];
  if (!matches.length) return "";

  return matches[0].trim();
}

function sanitizePhone(phone) {
  return (phone || "").replace(/[+\s\-]/g, "").trim();
}

/* ---------------- SCORING ---------------- */

function scoreLead(data) {
  let score = 0;

  if (!data.website) score += 50;
  if (data.links.length > 0) score += 10;
  if (data.name) score += 5;

  if ((data.website || "").includes("linktr.ee")) score -= 10;

  return score;
}

/* ---------------- GROOVCRM ---------------- */

async function loadExistingHandles() {
  try {
    console.log("[IG Lead] loadExistingHandles start");

    const res = await chrome.runtime.sendMessage({ type: "ig-lead-get-handles" });
    if (!res?.ok) {
      handlesLoadStatus = {
        ok: false,
        error: res?.error || "Failed to load leads from GroovCRM",
        debug: res?.debug || null
      };

      console.log("[IG Lead] loadExistingHandles failed", handlesLoadStatus);
      throw new Error(handlesLoadStatus.error);
    }

    const rawData = res?.ok ? res.data : [];
    const leadRecords = extractLeadRecords(rawData);
    existingLeadDataByHandle = new Map(
      leadRecords
        .map(r => ({
          id: r.id || null,
          handle: normalizeHandle(r.handle),
          website: String(r.website || "").trim(),
          phone: String(r.phone || "").trim(),
          visited: parseVisitedValue(r.visited)
        }))
        .filter(r => r.handle)
        .map(r => [r.handle, { id: r.id, website: r.website, phone: r.phone, visited: r.visited }])
    );

    const extractedHandles = extractHandlesFromPayload(rawData);

    existingHandles = extractedHandles;
    existingHandleSet = new Set(extractedHandles.map(normalizeHandle).filter(Boolean));
    handlesLoadStatus = {
      ok: true,
      error: "",
      debug: res?.debug || null
    };

    const normalizedHandles = extractedHandles.map(normalizeHandle).filter(Boolean);

    console.log("[IG Lead] All found handles (raw)", extractedHandles);
    console.log("[IG Lead] All found handles (normalized)", normalizedHandles);
    console.log("[IG Lead] Existing lead data by handle", Object.fromEntries(existingLeadDataByHandle.entries()));

    console.log("[IG Lead] Handles loaded", {
      extractedCount: extractedHandles.length,
      normalizedCount: existingHandleSet.size,
      visitedCount: visitedHandleSet.size,
      sample: [...existingHandleSet].slice(0, 10)
    });
  } catch (e) {
    console.log("[IG Lead] Failed to load existing handles", e?.message || e);
  } finally {
    rebuildVisitedHandleSet();
  }
}

function extractHandlesFromPayload(payload) {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.flatMap(item => extractHandlesFromPayload(item));
  }

  if (typeof payload === "string" || typeof payload === "number") {
    return [String(payload)];
  }

  if (typeof payload !== "object") {
    return [];
  }

  const nestedKeys = ["data", "rows", "values", "handles", "result", "items", "leads"];
  for (const key of nestedKeys) {
    if (payload[key] != null) {
      return extractHandlesFromPayload(payload[key]);
    }
  }

  const handleValue = getHandleValue(payload);
  return handleValue ? [handleValue] : [];
}

function getHandleValue(item) {
  if (typeof item === "string") return item;
  if (typeof item === "number") return String(item);
  if (Array.isArray(item)) {
    const firstNonEmpty = item.find(v => String(v || "").trim());
    return firstNonEmpty ? String(firstNonEmpty) : "";
  }
  if (!item || typeof item !== "object") return "";

  const direct = item.handle || item.username || item.igHandle || item.ig_handle;
  if (direct) return String(direct);

  for (const [key, value] of Object.entries(item)) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.includes("handle") ||
      normalizedKey.includes("username") ||
      normalizedKey === "ig" ||
      normalizedKey.includes("instagram")
    ) {
      if (value != null && String(value).trim()) {
        return String(value);
      }
    }
  }

  return "";
}

function normalizeHandle(handle) {
  let value = String(handle || "").trim();
  if (!value) return "";

  value = normalizeInstagramRedirect(value);

  if (!/^https?:\/\//i.test(value) && /instagram\.com/i.test(value)) {
    value = `https://${value.replace(/^\/\//, "")}`;
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host.endsWith("instagram.com")) {
      value = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else {
      value = parsed.pathname.split("/").filter(Boolean)[0] || value;
    }
  } catch (e) {
    // Relative paths like "/username/" are not valid absolute URLs.
    // Strip path segments carefully — do NOT run [/?#].*$ while a leading
    // "/" remains, or the whole string is wiped to "".
    if (value.startsWith("/")) {
      value = value.split("/").filter(Boolean)[0] || "";
    }
  }

  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/[/?#].*$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

async function saveLead(data, successMessage = "Saved to GroovCRM ✅") {

  try {
    const res = await chrome.runtime.sendMessage({
      type: "ig-lead-save",
      payload: data
    });


    if (!res?.ok) {
      throw new Error(res?.error || "Save failed");
    }

    const normalizedHandle = normalizeHandle(data.handle);
    if (normalizedHandle) {
      existingHandleSet.add(normalizedHandle);
      const prev = existingLeadDataByHandle.get(normalizedHandle) || {};
      existingLeadDataByHandle.set(normalizedHandle, {
        id: res?.data?.prospect?.id || prev.id || null,
        website: data.website ?? prev.website ?? "",
        phone: data.phone ?? prev.phone ?? "",
        visited: data.visited != null ? !!data.visited : !!prev.visited
      });
      rebuildVisitedHandleSet();
      scheduleSuggestedVisitedRefresh("saveLead");
    }

    showToast(successMessage);

  } catch (e) {
    console.error("[IG Lead][Save] saveLead failed", e);
    showToast("Failed to save ❌");
    throw e;
  }
}

/* ---------------- SUGGESTED ACCOUNTS ---------------- */

function rebuildVisitedHandleSet() {
  visitedHandleSet = new Set(
    [...existingLeadDataByHandle.entries()]
      .filter(([, record]) => record.visited)
      .map(([handle]) => handle)
  );
}

function getSuggestedCardSkipReason(card) {
  // Prefer nodeType over instanceof — safer across extension worlds.
  if (!card || card.nodeType !== 1) return "not-an-element";

  const inlineStyle = card.getAttribute("style") || "";
  if (/width:\s*1px/i.test(inlineStyle)) return "spacer-li";

  const handle = extractHandleFromSuggestedCard(card);
  if (!handle) return "no-profile-handle";

  return "";
}

function extractHandleFromProfileImage(card) {
  const img = card.querySelector(IG_LEAD_SELECTORS.suggestedProfileImage);
  const alt = img?.getAttribute("alt") || "";
  const match = alt.match(/^(.+?)['’]s profile picture$/i);
  return match ? normalizeHandle(match[1]) : "";
}

function isSuggestedProfileHref(href) {
  const match = String(href || "").match(/^\/([^/?#]+)\/?$/);
  if (!match) return false;

  const segment = match[1].toLowerCase();
  const blocked = new Set([
    "p",
    "reels",
    "stories",
    "explore",
    "direct",
    "accounts",
    "about",
    "legal",
    "privacy",
    "terms"
  ]);

  return !blocked.has(segment);
}

function getSuggestedProfileLink(card) {
  for (const link of card.querySelectorAll('a[href^="/"]')) {
    const href = link.getAttribute("href") || "";
    if (isSuggestedProfileHref(href)) {
      return link;
    }
  }

  const selectorOrder = [
    IG_LEAD_SELECTORS.suggestedUsernameLink,
    IG_LEAD_SELECTORS.suggestedProfileLink,
    IG_LEAD_SELECTORS.suggestedProfileLinkFallback
  ];

  for (const selector of selectorOrder) {
    const link = card.querySelector(selector);
    if (!link) continue;
    const href = link.getAttribute("href") || "";
    if (isSuggestedProfileHref(href)) {
      return link;
    }
  }

  return null;
}

function extractHandleFromSuggestedCard(card) {
  const profileLink = getSuggestedProfileLink(card);
  if (profileLink) {
    return normalizeHandle(profileLink.getAttribute("href") || "");
  }

  return extractHandleFromProfileImage(card);
}

function isSuggestedCardElement(card) {
  return !getSuggestedCardSkipReason(card);
}

function getSuggestedCardsFromSection(section) {
  return [...section.querySelectorAll(IG_LEAD_SELECTORS.suggestedCard)];
}

function observeSuggestedSection(section) {
  if (!(section instanceof HTMLElement) || suggestedSectionObservers.has(section)) {
    return;
  }

  suggestedSectionObservers.add(section);

  // Only watch structure changes. Do NOT watch attributes — our own style/class
  // updates would otherwise re-trigger this observer in a loop.
  const sectionObserver = new MutationObserver(mutations => {
    if (suggestedGreyInProgress) return;
    if (!mutationsHaveRelevantDomChange(mutations)) return;
    scheduleSuggestedVisitedRefresh("section-mutation");
  });

  sectionObserver.observe(section, {
    childList: true,
    subtree: true
  });

}

function isOurSuggestedMutationTarget(node) {
  if (!(node instanceof Element)) return false;
  return (
    node.classList?.contains(IG_LEAD_CLASSES.visitedSuggestionCard) ||
    node.classList?.contains(IG_LEAD_CLASSES.visitedOverlay) ||
    node.hasAttribute?.("data-ig-lead-visited") ||
    node.hasAttribute?.("data-ig-lead-overlay") ||
    node.hasAttribute?.("data-ig-lead-handle") ||
    node.id === "ig-lead-suggested-styles" ||
    node.id === "ig-lead-widget" ||
    node.id === "ig-lead-widget-tab"
  );
}

function mutationsHaveRelevantDomChange(mutations) {
  for (const mutation of mutations) {
    if (mutation.type !== "childList") continue;

    for (const node of mutation.addedNodes) {
      if (isOurSuggestedMutationTarget(node)) continue;
      if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
        return true;
      }
    }

    for (const node of mutation.removedNodes) {
      if (isOurSuggestedMutationTarget(node)) continue;
      if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
        return true;
      }
    }
  }

  return false;
}

function getSuggestedScanTargets() {
  const sections = [...document.querySelectorAll(IG_LEAD_SELECTORS.suggestedSection)];
  const cards = [];
  const lists = [];

  for (const section of sections) {
    observeSuggestedSection(section);
    const sectionCards = getSuggestedCardsFromSection(section);
    if (sectionCards.length) {
      cards.push(...sectionCards);
    }
    section.querySelectorAll(IG_LEAD_SELECTORS.suggestedList).forEach(list => lists.push(list));
  }

  if (cards.length) {
    return { sections, lists, cards, source: "section-li" };
  }


  const main = document.querySelector("main") || document.body;
  const fallbackCards = [];

  for (const list of main.querySelectorAll("ul")) {
    const listCards = [...list.querySelectorAll(IG_LEAD_SELECTORS.suggestedCard)];
    const suggestedCards = listCards.filter(isSuggestedCardElement);
    if (suggestedCards.length) {
      lists.push(list);
      fallbackCards.push(...listCards);
    }
  }

  return {
    sections,
    lists,
    cards: fallbackCards,
    source: fallbackCards.length ? "fallback-ul" : "none"
  };
}

function ensureSuggestedVisitedStyles() {
  if (document.getElementById("ig-lead-suggested-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "ig-lead-suggested-styles";
  style.textContent = `
    li.${IG_LEAD_CLASSES.visitedSuggestionCard},
    li.${IG_LEAD_CLASSES.visitedSuggestionCard} > div,
    li.${IG_LEAD_CLASSES.visitedSuggestionCard} > div > div {
      opacity: 0.45 !important;
      filter: grayscale(0.92) !important;
      transition: opacity 0.2s ease, filter 0.2s ease;
    }

    li.${IG_LEAD_CLASSES.visitedSuggestionCard} > div {
      position: relative !important;
    }

    .${IG_LEAD_CLASSES.visitedOverlay} {
      position: absolute;
      inset: 0;
      z-index: 50;
      pointer-events: none;
      border-radius: 12px;
      background: rgba(100, 116, 139, 0.35);
      box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.45);
    }

    .${IG_LEAD_CLASSES.visitedOverlay}::before {
      content: "Visited";
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 51;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.92);
      color: #e2e8f0;
      font-family: Segoe UI, Tahoma, sans-serif;
    }
  `;
  document.head.appendChild(style);
}

function getSuggestedCardWrapper(card) {
  return card.querySelector('div[style*="--x-width"]') || card.firstElementChild || card;
}

function ensureVisitedOverlay(wrapper) {
  let overlay = wrapper.querySelector(`.${IG_LEAD_CLASSES.visitedOverlay}`);
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.className = IG_LEAD_CLASSES.visitedOverlay;
  overlay.setAttribute("data-ig-lead-overlay", "true");
  wrapper.appendChild(overlay);
  return overlay;
}

function removeVisitedOverlay(wrapper) {
  wrapper?.querySelector(`.${IG_LEAD_CLASSES.visitedOverlay}`)?.remove();
}

function applyVisitedStyleToSuggestedCard(card, isVisited) {
  const className = IG_LEAD_CLASSES.visitedSuggestionCard;
  const handle = extractHandleFromSuggestedCard(card);
  const wrapper = getSuggestedCardWrapper(card);
  const hadClass = card.classList.contains(className);
  const alreadyVisited = card.getAttribute("data-ig-lead-visited") === "true";
  const hasOverlay = !!wrapper?.querySelector(`.${IG_LEAD_CLASSES.visitedOverlay}`);

  if (isVisited) {
    // Avoid re-writing the same DOM state (prevents observer feedback loops).
    if (alreadyVisited && hadClass && hasOverlay && card.getAttribute("data-ig-lead-handle") === (handle || "")) {
      return;
    }

    card.classList.add(className);
    card.setAttribute("data-ig-lead-visited", "true");
    card.setAttribute("data-ig-lead-handle", handle || "");
    if (wrapper && !hasOverlay) {
      wrapper.style.setProperty("position", "relative", "important");
      wrapper.style.setProperty("opacity", "0.45", "important");
      wrapper.style.setProperty("filter", "grayscale(0.92)", "important");
      ensureVisitedOverlay(wrapper);
    }
    return;
  }

  if (!hadClass && !alreadyVisited && !hasOverlay) {
    return;
  }


  card.classList.remove(className);
  card.removeAttribute("data-ig-lead-visited");
  card.removeAttribute("data-ig-lead-handle");
  wrapper?.style.removeProperty("opacity");
  wrapper?.style.removeProperty("filter");
  wrapper?.style.removeProperty("position");
  if (wrapper) removeVisitedOverlay(wrapper);
}

function clearSuggestedRetryTimers() {
  for (const timer of suggestedRetryTimers) {
    clearTimeout(timer);
  }
  suggestedRetryTimers = [];
}

function greySuggestedVisitedCards(trigger = "manual") {
  if (suggestedGreyInProgress) {
    return;
  }

  suggestedGreyInProgress = true;

  try {

    if (!visitedHandleSet.size) {
      const styledCards = document.querySelectorAll(`li.${IG_LEAD_CLASSES.visitedSuggestionCard}`);

      for (const card of styledCards) {
        applyVisitedStyleToSuggestedCard(card, false);
      }
      return;
    }

    ensureSuggestedVisitedStyles();

    const scanTargets = getSuggestedScanTargets();

    if (!scanTargets.cards.length) {
      scheduleSuggestedRetry(trigger);
      return;
    }

    let suggestedCards = 0;

    for (const card of scanTargets.cards) {
      if (!isSuggestedCardElement(card)) {
        applyVisitedStyleToSuggestedCard(card, false);
        continue;
      }

      suggestedCards += 1;
      const handle = extractHandleFromSuggestedCard(card);
      applyVisitedStyleToSuggestedCard(card, !!handle && visitedHandleSet.has(handle));
    }

    if (scanTargets.cards.length > 1 && suggestedCards === 0) {
      scheduleSuggestedRetry(trigger);
    }
  } finally {
    // Release after current call stack so observers see our DOM writes as "in progress".
    queueMicrotask(() => {
      suggestedGreyInProgress = false;
    });
  }
}

const SUGGESTED_RETRY_DELAYS_MS = [400, 900, 1800];

function scheduleSuggestedRetry(trigger) {
  if (String(trigger).includes("retry")) return;

  clearSuggestedRetryTimers();

  SUGGESTED_RETRY_DELAYS_MS.forEach((delay, attemptIndex) => {
    const timer = setTimeout(() => {
      greySuggestedVisitedCards(`retry${attemptIndex + 1}:${trigger}`);
    }, delay);
    suggestedRetryTimers.push(timer);
  });
}

function scheduleSuggestedVisitedRefresh(trigger = "unknown") {
  if (suggestedGreyInProgress) return;

  clearTimeout(suggestedGreyDebounce);
  if (suggestedRafId != null) {
    cancelAnimationFrame(suggestedRafId);
    suggestedRafId = null;
  }


  // Single debounced pass only — never stack uncancellable rAF chains.
  suggestedGreyDebounce = setTimeout(() => {
    suggestedGreyDebounce = null;
    greySuggestedVisitedCards(`debounced:${trigger}`);
  }, 200);
}

function initSuggestedVisitedHighlighting() {
  ensureSuggestedVisitedStyles();
  greySuggestedVisitedCards("init");

  if (suggestedVisitedObserver) {
    return;
  }

  suggestedVisitedObserver = new MutationObserver(mutations => {
    if (suggestedGreyInProgress) return;
    if (!mutationsHaveRelevantDomChange(mutations)) return;

    suggestedMutationRefreshCount += 1;
    scheduleSuggestedVisitedRefresh("mutation");
  });

  const observeRoot = document.querySelector("main") || document.body;
  suggestedVisitedObserver.observe(observeRoot, {
    childList: true,
    subtree: true
  });
}

/* ---------------- UI ---------------- */

const PANEL_VISIBLE_KEY = "ig-lead-panel-visible";

function injectAuthRequiredWidget(auth) {
  if (document.getElementById("ig-lead-widget")) return;

  const div = document.createElement("div");
  div.id = "ig-lead-widget";
  div.style = `
    position: fixed;
    top: 84px;
    right: 20px;
    z-index: 999999;
    width: 320px;
    max-width: calc(100vw - 24px);
    background: linear-gradient(165deg, #0d1f18, #111827);
    color: #f8fafc;
    padding: 16px;
    border-radius: 16px;
    font-size: 12px;
    line-height: 1.5;
    font-family: Segoe UI, Tahoma, sans-serif;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 16px 40px rgba(0,0,0,0.55);
  `;

  div.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">IG Lead → GroovCRM</div>
    <div style="color:#94a3b8;margin-bottom:12px;">
      Sign in to GroovCRM in the extension options so leads can be saved without Google Sheets.
      ${auth?.error ? `<div style="margin-top:8px;color:#fca5a5;">${escapeHtml(auth.error)}</div>` : ""}
    </div>
    <button id="ig-open-options" type="button" style="
      width:100%;
      padding:11px;
      border:none;
      background:linear-gradient(135deg,#16a34a,#22c55e);
      color:white;
      border-radius:10px;
      cursor:pointer;
      font-weight:700;
      font-size:13px;
    ">Open settings</button>
  `;

  document.body.appendChild(div);
  document.getElementById("ig-open-options")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "gc-open-options" });
  });
}

async function getPanelVisible() {
  try {
    const result = await chrome.storage.local.get(PANEL_VISIBLE_KEY);
    return result[PANEL_VISIBLE_KEY] !== false;
  } catch (e) {
    return true;
  }
}

async function setPanelVisible(visible) {
  try {
    await chrome.storage.local.set({ [PANEL_VISIBLE_KEY]: visible });
  } catch (e) {
    // Ignore storage errors.
  }
}

function setPanelVisibility(widget, tab, visible) {
  if (widget) widget.style.display = visible ? "block" : "none";
  if (tab) tab.style.display = visible ? "none" : "flex";
}

function updateVisitedButtons(markBtn, unmarkBtn, visited) {
  if (markBtn) {
    markBtn.style.display = visited ? "none" : "flex";
    markBtn.disabled = !!visited;
  }
  if (unmarkBtn) {
    unmarkBtn.style.display = visited ? "flex" : "none";
    unmarkBtn.disabled = !visited;
  }
}

function injectWidget(data, exists, debugInfo, profileValues, panelVisible = true) {
  if (document.getElementById("ig-lead-widget")) return;

  const div = document.createElement("div");
  div.id = "ig-lead-widget";

  div.style = `
    position: fixed;
    top: 84px;
    right: 20px;
    z-index: 999999;
    width: 320px;
    max-width: calc(100vw - 24px);
    background: linear-gradient(165deg, #0d1f18, #111827);
    color: #f8fafc;
    padding: 16px;
    border-radius: 16px;
    font-size: 12px;
    line-height: 1.5;
    font-family: Segoe UI, Tahoma, sans-serif;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 16px 40px rgba(0,0,0,0.55);
    backdrop-filter: blur(4px);
  `;

  const statusBg = exists ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)";
  const statusColor = exists ? "#fca5a5" : "#86efac";
  const statusText = exists ? "🔴 Already Exists" : "🟢 New Lead";
  const btnBg = exists ? "linear-gradient(135deg,#b45309,#d97706)" : "linear-gradient(135deg,#16a34a,#22c55e)";
  const btnLabel = exists ? "Update Lead" : "Save Lead";

  const inputStyle = `
    flex:1;
    min-width:0;
    padding:8px 10px;
    border-radius:8px;
    border:1px solid #334155;
    background:#0f172a;
    color:#fff;
    outline:none;
    font-size:12px;
    box-sizing:border-box;
  `;

  const clearBtnStyle = `
    flex-shrink:0;
    width:28px;
    height:32px;
    padding:0;
    border:1px solid #334155;
    background:#1e293b;
    color:#94a3b8;
    border-radius:8px;
    cursor:pointer;
    font-size:14px;
    display:flex;
    align-items:center;
    justify-content:center;
    line-height:1;
  `;

  const actionBtnStyle = `
    flex:1;
    padding:9px 10px;
    border:none;
    border-radius:10px;
    cursor:pointer;
    font-weight:700;
    font-size:12px;
    letter-spacing:0.2px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:6px;
    transition:opacity 0.15s;
  `;

  let visited = !!data.visited;
  let leadExists = !!exists;

  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:12px;">
      <div style="min-width:0;">
        <div style="font-size:14px;font-weight:700;letter-spacing:0.1px;">@${escapeHtml(data.handle)}</div>
        <div style="color:#94a3b8;margin-top:2px;">${escapeHtml(data.name || "-")}</div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:6px;flex-shrink:0;">
        <div id="ig-status-badge" style="
          font-size:11px;
          padding:4px 10px;
          border-radius:999px;
          background:${statusBg};
          color:${statusColor};
          white-space:nowrap;
          margin-top:2px;
        ">${statusText}</div>
        <button id="ig-panel-hide" type="button" title="Hide panel" style="
          margin-top:1px;
          width:24px;
          height:24px;
          padding:0;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.06);
          color:#94a3b8;
          border-radius:8px;
          cursor:pointer;
          font-size:16px;
          line-height:1;
          display:flex;
          align-items:center;
          justify-content:center;
        ">−</button>
      </div>
    </div>

    <div id="ig-exists-banner" style="
      display:${exists ? "flex" : "none"};
      align-items:center;
      gap:8px;
      padding:8px 10px;
      border-radius:8px;
      background:rgba(239,68,68,0.12);
      border:1px solid rgba(239,68,68,0.3);
      color:#fca5a5;
      font-size:11px;
      margin-bottom:12px;
    ">
      <span style="font-size:14px;">⚠️</span>
      <span>This lead already exists in GroovCRM. Saving will update it.</span>
    </div>

    <label style="display:block;margin:0 0 5px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Website</label>
    <div style="display:flex;gap:6px;margin-bottom:10px;">
      <input id="ig-website-input" value="${escapeHtml(data.website || "")}" style="${inputStyle}" placeholder="https://example.com or leave blank" />
      <button id="ig-website-profile" style="${clearBtnStyle}" title="Use profile value" ${exists ? "" : "disabled"}>↻</button>
      <button id="ig-website-clear" style="${clearBtnStyle}" title="Clear">×</button>
    </div>

    <label style="display:block;margin:0 0 5px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Phone</label>
    <div style="display:flex;gap:6px;margin-bottom:12px;">
      <input id="ig-phone-input" value="${escapeHtml(data.phone || "")}" style="${inputStyle}" placeholder="e.g. +62 812 3456 7890" />
      <button id="ig-phone-profile" style="${clearBtnStyle}" title="Use profile value" ${exists ? "" : "disabled"}>↻</button>
      <button id="ig-phone-clear" style="${clearBtnStyle}" title="Clear">×</button>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:12px;">
      <button id="ig-mark-visited-btn" type="button" style="${actionBtnStyle}background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;${visited ? "display:none;" : ""}">Mark Visited</button>
      <button id="ig-unmark-visited-btn" type="button" style="${actionBtnStyle}background:linear-gradient(135deg,#475569,#64748b);color:#fff;${visited ? "" : "display:none;"}">Unmark Visited</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:12px;">
      <div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.07);text-align:center;">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:2px;">Website</div>
        <div style="font-weight:600;"><span id="ig-website-stat">${data.hasWebsite ? "✅" : "❌"}</span></div>
      </div>
      <div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.07);text-align:center;">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:2px;">Score</div>
        <div style="font-weight:600;"><span id="ig-score-value">${data.score}</span></div>
      </div>
      <div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.07);text-align:center;">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:2px;">Links</div>
        <div style="font-weight:600;">${data.links.length}</div>
      </div>
      <div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.07);text-align:center;">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:2px;">Visited</div>
        <div style="font-weight:600;"><span id="ig-visited-value">${visited ? "✅" : "❌"}</span></div>
      </div>
    </div>

    <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Links</div>
    <div style="max-height:100px;overflow:auto;padding:8px;border-radius:8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.07);margin-bottom:10px;">
      ${data.links.length ? data.links.map(l => `<a href="${l}" target="_blank" style="color:#7dd3fc;display:block;word-break:break-all;margin-bottom:4px;text-decoration:none;font-size:11px;">${escapeHtml(l)}</a>`).join("") : `<span style="color:#475569;font-size:11px;">No links found</span>`}
    </div>

    <button id="save-lead-btn" style="
      width:100%;
      padding:11px;
      border:none;
      background:${btnBg};
      color:white;
      border-radius:10px;
      cursor:pointer;
      font-weight:700;
      font-size:13px;
      letter-spacing:0.3px;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      transition:opacity 0.15s;
    ">
      <span id="save-lead-label">${btnLabel}</span>
    </button>

    <button id="ig-debug-toggle" style="
      margin-top:8px;
      width:100%;
      padding:5px;
      border:1px solid rgba(255,255,255,0.1);
      background:transparent;
      color:#475569;
      border-radius:8px;
      cursor:pointer;
      font-size:10px;
    ">Show Debug</button>

    <div id="ig-debug-panel" style="
      display:none;
      margin-top:6px;
      padding:8px;
      border-radius:8px;
      border:1px solid rgba(255,255,255,0.1);
      background:rgba(15,23,42,0.8);
      color:#cbd5e1;
      font-size:10px;
      word-break:break-word;
      line-height:1.6;
    ">
      loadOk: ${debugInfo?.loadStatus?.ok ? "true" : "false"}<br>
      loadError: ${escapeHtml(debugInfo?.loadStatus?.error || "") || "-"}<br>
      loadFinalUrl: ${escapeHtml(debugInfo?.loadStatus?.debug?.finalUrl || "") || "-"}<br>
      loadStatusCode: ${escapeHtml(String(debugInfo?.loadStatus?.debug?.status ?? "")) || "-"}<br>
      loadTextSnippet: ${escapeHtml(debugInfo?.loadStatus?.debug?.textSnippet || "") || "-"}<br>
      <br>
      knownHandleCount: ${debugInfo?.knownHandleCount ?? 0}<br>
      exists: ${debugInfo?.exists ? "true" : "false"}<br>
      visited: ${visited ? "true" : "false"}<br>
      rawHandle: ${escapeHtml(debugInfo?.rawHandle || "")}<br>
      normalizedHandle: ${escapeHtml(debugInfo?.normalizedHandle || "")}
    </div>
  `;

  const tab = document.createElement("button");
  tab.id = "ig-lead-widget-tab";
  tab.type = "button";
  tab.title = "Show IG Lead panel";
  tab.textContent = "IG Lead";
  tab.style = `
    display: none;
    position: fixed;
    top: 84px;
    right: 20px;
    z-index: 999999;
    align-items: center;
    justify-content: center;
    padding: 10px 14px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    background: linear-gradient(135deg, #0d1f18, #111827);
    color: #f8fafc;
    font-size: 12px;
    font-weight: 700;
    font-family: Segoe UI, Tahoma, sans-serif;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0,0,0,0.45);
  `;

  document.body.appendChild(div);
  document.body.appendChild(tab);

  setPanelVisibility(div, tab, panelVisible);

  const panelHideBtn = document.getElementById("ig-panel-hide");

  panelHideBtn?.addEventListener("click", async () => {
    setPanelVisibility(div, tab, false);
    await setPanelVisible(false);
  });

  tab.addEventListener("click", async () => {
    setPanelVisibility(div, tab, true);
    await setPanelVisible(true);
  });

  const websiteInput = document.getElementById("ig-website-input");
  const phoneInput = document.getElementById("ig-phone-input");
  const scoreValue = document.getElementById("ig-score-value");
  const websiteStat = document.getElementById("ig-website-stat");
  const visitedValue = document.getElementById("ig-visited-value");
  const statusBadge = document.getElementById("ig-status-badge");
  const existsBanner = document.getElementById("ig-exists-banner");
  const websiteProfileBtn = document.getElementById("ig-website-profile");
  const phoneProfileBtn = document.getElementById("ig-phone-profile");
  const markVisitedBtn = document.getElementById("ig-mark-visited-btn");
  const unmarkVisitedBtn = document.getElementById("ig-unmark-visited-btn");
  const saveBtn = document.getElementById("save-lead-btn");
  const saveLabel = document.getElementById("save-lead-label");
  const debugToggle = document.getElementById("ig-debug-toggle");
  const debugPanel = document.getElementById("ig-debug-panel");

  function refreshStatsFromInputs() {
    const editedWebsite = websiteInput?.value?.trim() || "";
    const nextScore = scoreLead({ ...data, website: editedWebsite, hasWebsite: !!editedWebsite });
    if (scoreValue) scoreValue.textContent = String(nextScore);
    if (websiteStat) websiteStat.textContent = editedWebsite ? "✅" : "❌";
  }

  function syncLeadUiState() {
    if (statusBadge) {
      statusBadge.textContent = leadExists ? "🔴 Already Exists" : "🟢 New Lead";
      statusBadge.style.background = leadExists ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)";
      statusBadge.style.color = leadExists ? "#fca5a5" : "#86efac";
    }

    if (existsBanner) {
      existsBanner.style.display = leadExists ? "flex" : "none";
    }

    if (saveBtn) {
      saveBtn.style.background = leadExists
        ? "linear-gradient(135deg,#b45309,#d97706)"
        : "linear-gradient(135deg,#16a34a,#22c55e)";
    }

    if (saveLabel) {
      saveLabel.textContent = leadExists ? "Update Lead" : "Save Lead";
    }

    if (websiteProfileBtn) websiteProfileBtn.disabled = !leadExists;
    if (phoneProfileBtn) phoneProfileBtn.disabled = !leadExists;

    if (visitedValue) visitedValue.textContent = visited ? "✅" : "❌";
    updateVisitedButtons(markVisitedBtn, unmarkVisitedBtn, visited);
    refreshStatsFromInputs();
  }

  function buildPayload(visitedOverride) {
    const editedWebsite = websiteInput?.value?.trim() || "";
    const editedPhoneRaw = phoneInput?.value?.trim() || "";
    const nextVisited = visitedOverride != null ? !!visitedOverride : visited;

    const payload = {
      ...data,
      website: editedWebsite,
      phone: sanitizePhone(editedPhoneRaw),
      hasWebsite: !!editedWebsite,
      visited: nextVisited
    };
    payload.score = scoreLead(payload);
    return payload;
  }

  function applySuccessfulSave(payload) {
    leadExists = true;
    visited = !!payload.visited;
    data.website = payload.website || "";
    data.phone = payload.phone || "";
    data.hasWebsite = !!payload.hasWebsite;
    data.score = payload.score;
    data.visited = visited;
    syncLeadUiState();
  }

  async function persistVisited(nextVisited, successMessage) {
    const btn = nextVisited ? markVisitedBtn : unmarkVisitedBtn;
    const otherBtn = nextVisited ? unmarkVisitedBtn : markVisitedBtn;

    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.65";
    }
    if (otherBtn) otherBtn.disabled = true;

    try {
      const payload = buildPayload(nextVisited);
      await saveLead(payload, successMessage);
      applySuccessfulSave(payload);
    } catch (e) {
      syncLeadUiState();
    } finally {
      if (btn) btn.style.opacity = "1";
    }
  }

  markVisitedBtn?.addEventListener("click", () => {
    persistVisited(true, "Marked as visited ✅");
  });

  unmarkVisitedBtn?.addEventListener("click", () => {
    persistVisited(false, "Unmarked visited ✅");
  });

  websiteInput?.addEventListener("input", refreshStatsFromInputs);

  document.getElementById("ig-website-clear")?.addEventListener("click", () => {
    websiteInput.value = "";
    refreshStatsFromInputs();
  });

  websiteProfileBtn?.addEventListener("click", () => {
    websiteInput.value = profileValues?.website || "";
    refreshStatsFromInputs();
  });

  document.getElementById("ig-phone-clear")?.addEventListener("click", () => {
    phoneInput.value = "";
  });

  phoneProfileBtn?.addEventListener("click", () => {
    phoneInput.value = profileValues?.phone || "";
  });

  debugToggle?.addEventListener("click", () => {
    const isHidden = debugPanel.style.display === "none";
    debugPanel.style.display = isHidden ? "block" : "none";
    debugToggle.innerText = isHidden ? "Hide Debug" : "Show Debug";
  });

  saveBtn.onclick = async () => {
    const payload = buildPayload();

    saveBtn.disabled = true;
    saveBtn.style.opacity = "0.65";
    saveLabel.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation:ig-spin 0.7s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Saving…`;

    if (!document.getElementById("ig-spin-style")) {
      const s = document.createElement("style");
      s.id = "ig-spin-style";
      s.textContent = "@keyframes ig-spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(s);
    }

    try {
      await saveLead(payload);
      applySuccessfulSave(payload);
    } catch (e) {
      syncLeadUiState();
    } finally {
      saveBtn.disabled = false;
      saveBtn.style.opacity = "1";
    }
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------------- TOAST ---------------- */

function showToast(msg) {
  const t = document.createElement("div");
  t.innerText = msg;
  t.style = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #1e293b;
    color: #f8fafc;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-family: Segoe UI, Tahoma, sans-serif;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    z-index: 9999999;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.2s, transform 0.2s;
  `;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = "1";
    t.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(6px)";
    setTimeout(() => t.remove(), 220);
  }, 2200);
}

function parseVisitedValue(value) {
  if (value === true || value === 1) return true;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "visited";
}

function extractLeadRecords(payload) {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.flatMap(item => extractLeadRecords(item));
  }

  if (typeof payload !== "object") {
    return [];
  }

  if (payload.leads != null) {
    return extractLeadRecords(payload.leads);
  }

  const handle = getHandleValue(payload);
  if (handle) {
    const website = payload.website || payload.site || payload.url || "";
    const phone = payload.phone || payload.tel || payload.mobile || payload.phoneNumber || "";
    const visited = parseVisitedValue(payload.visited);
    return [{
      id: payload.id || null,
      handle: String(handle),
      website: String(website || ""),
      phone: String(phone || ""),
      visited
    }];
  }

  return [];
}