const list = document.getElementById("list");
const q = document.getElementById("q");
const count = document.getElementById("count");

async function render() {
  const { bookmarks = {} } = await chrome.storage.local.get("bookmarks");
  const all = Object.values(bookmarks).sort((a, b) => b.createdAt - a.createdAt);
  const term = q.value.trim().toLowerCase();
  const items = term
    ? all.filter((b) => (b.name + " " + b.reason).toLowerCase().includes(term))
    : all;

  count.textContent = `(${all.length})`;
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = `<div class="empty">${all.length ? "No matches." : "Nothing yet. Open a LinkedIn profile and click “+ Note why”."}</div>`;
    return;
  }

  for (const b of items) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="top"><a target="_blank"></a><span class="date"></span></div>
      <div class="reason"></div>
      <button>Delete</button>`;
    const a = div.querySelector("a");
    a.href = b.url;
    a.textContent = b.name || b.slug;
    div.querySelector(".date").textContent = new Date(b.createdAt).toLocaleDateString();
    div.querySelector(".reason").textContent = b.reason;
    div.querySelector("button").onclick = async () => {
      if (!confirm(`Delete note for ${b.name || b.slug}?`)) return;
      delete bookmarks[b.slug];
      await chrome.storage.local.set({ bookmarks });
    };
    list.appendChild(div);
  }
}

q.addEventListener("input", render);
chrome.storage.onChanged.addListener(render);
render();
