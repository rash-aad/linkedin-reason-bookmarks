// Clicking the toolbar icon opens the bookmarks list page.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("bookmarks.html") });
});
