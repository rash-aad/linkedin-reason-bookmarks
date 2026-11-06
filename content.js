// Shows a floating note panel on LinkedIn profile pages (linkedin.com/in/<slug>).
// Storage shape: { bookmarks: { [slug]: { slug, name, url, reason, createdAt, updatedAt } } }

let currentSlug = null;
let host = null;

function getSlug() {
  const m = location.pathname.match(/^\/in\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function getName() {
  // Title looks like "(3) Jane Doe | LinkedIn"
  const t = document.title.replace(/^\(\d+\)\s*/, "").split("|")[0].trim();
  if (t && t !== "LinkedIn") return t;
  const h1 = document.querySelector("main h1");
  return h1 ? h1.textContent.trim() : currentSlug;
}

async function getBookmarks() {
  const { bookmarks = {} } = await chrome.storage.local.get("bookmarks");
  return bookmarks;
}

async function saveBookmark(slug, reason) {
  const bookmarks = await getBookmarks();
  const now = Date.now();
  const existing = bookmarks[slug];
  bookmarks[slug] = {
    slug,
    name: getName(),
    url: `https://www.linkedin.com/in/${slug}/`,
    reason,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
  await chrome.storage.local.set({ bookmarks });
}

async function deleteBookmark(slug) {
  const bookmarks = await getBookmarks();
  delete bookmarks[slug];
  await chrome.storage.local.set({ bookmarks });
}

function removePanel() {
  if (host) host.remove();
  host = null;
}

const STYLE = `
  :host { all: initial; }
  .box { position: fixed; right: 20px; bottom: 80px; z-index: 2147483647;
    font: 14px/1.4 -apple-system, system-ui, sans-serif; color: #1d2226; }
  .pill { background: #0a66c2; color: #fff; border: 0; border-radius: 20px;
    padding: 8px 16px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  .card { width: 300px; background: #fffbe6; border: 1px solid #f0d36b; border-radius: 10px;
    padding: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.18); }
  .title { font-weight: 700; margin-bottom: 6px; display: flex; justify-content: space-between; }
  .reason { white-space: pre-wrap; word-break: break-word; margin-bottom: 8px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 8px; }
  textarea { width: 100%; box-sizing: border-box; min-height: 80px; font: inherit;
    border: 1px solid #ccc; border-radius: 6px; padding: 6px; resize: vertical; }
  .row { display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px; }
  button.b { border: 1px solid #0a66c2; background: #fff; color: #0a66c2; border-radius: 14px;
    padding: 4px 12px; cursor: pointer; font: inherit; }
  button.primary { background: #0a66c2; color: #fff; }
  button.danger { border-color: #c0392b; color: #c0392b; }
  .x { cursor: pointer; border: 0; background: none; font-size: 16px; color: #666; }
`;

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function render(mode) {
  const slug = currentSlug;
  if (!slug) return removePanel();
  const bm = (await getBookmarks())[slug];
  if (slug !== currentSlug) return; // navigated away while loading

  if (!host) {
    host = document.createElement("div");
    host.attachShadow({ mode: "open" });
    document.body.appendChild(host);
  }
  const root = host.shadowRoot;
  mode = mode || (bm ? "view" : "collapsed");

  let html = `<style>${STYLE}</style><div class="box">`;
  if (mode === "collapsed") {
    html += `<button class="pill" id="open">+ Note why</button>`;
  } else if (mode === "view") {
    html += `<div class="card">
      <div class="title"><span>📌 Why you saved them</span><button class="x" id="min" title="Minimize">–</button></div>
      <div class="reason">${escapeHtml(bm.reason)}</div>
      <div class="meta">Saved ${new Date(bm.createdAt).toLocaleDateString()}</div>
      <div class="row">
        <button class="b danger" id="del">Delete</button>
        <button class="b" id="edit">Edit</button>
      </div></div>`;
  } else if (mode === "min") {
    html += `<button class="pill" id="expand">📌 Saved note</button>`;
  } else if (mode === "edit") {
    html += `<div class="card">
      <div class="title"><span>Why are you connecting?</span><button class="x" id="cancel" title="Close">×</button></div>
      <textarea id="reason" placeholder="e.g. Ask about the backend role at Acme, referred by Sam">${bm ? escapeHtml(bm.reason) : ""}</textarea>
      <div class="row"><button class="b primary" id="save">Save</button></div></div>`;
  }
  html += `</div>`;
  root.innerHTML = html;

  const on = (id, fn) => { const el = root.getElementById(id); if (el) el.onclick = fn; };
  on("open", () => render("edit"));
  on("expand", () => render("view"));
  on("min", () => render("min"));
  on("edit", () => render("edit"));
  on("cancel", () => render());
  on("del", async () => { await deleteBookmark(slug); render(); });
  on("save", async () => {
    const reason = root.getElementById("reason").value.trim();
    if (!reason) return;
    await saveBookmark(slug, reason);
    render("view");
  });
  const ta = root.getElementById("reason");
  if (ta) ta.focus();
}

// LinkedIn is a single-page app, so watch for URL changes instead of relying on page loads.
function check() {
  const slug = getSlug();
  if (slug === currentSlug) return;
  currentSlug = slug;
  slug ? render() : removePanel();
}

setInterval(check, 800);
check();

// Keep the panel in sync if the note is edited or deleted from the bookmarks page.
chrome.storage.onChanged.addListener((changes) => {
  if (changes.bookmarks && currentSlug) render();
});
