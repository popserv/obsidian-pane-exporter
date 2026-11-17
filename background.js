// 右クリックメニューの登録
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "export-pane-to-obsidian",
    title: "このPaneをObsidianに書き出し",
    contexts: ["all"]
  });
});

// メニューがクリックされた時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "export-pane-to-obsidian") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: exportClickedPane
    });
  }
});

// ブラウザのページ内で実行される関数
function exportClickedPane() {
  const vaultName = ""; // 特定の保管庫を指定したい場合は名前を入力（空欄なら最後に開いた保管庫）

  // 1. テキストが選択されている場合はそれを最優先
  let content = window.getSelection().toString().trim();

  // 2. 選択されていない場合、最後に右クリックされた要素から親の「Pane（領域）」を自動探索
  if (!content) {
    let el = window.__lastRightClickedEl;
    if (!el) {
      alert("書き出す領域が取得できませんでした。もう一度対象の領域内で右クリックしてください。");
      return;
    }

    // スクロール可能なコンテナ、または独立したセクション（aside, section, dialog等）まで遡る
    let pane = el;
    while (pane && pane !== document.body && pane !== document.documentElement) {
      const style = window.getComputedStyle(pane);
      const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll') && pane.scrollHeight > pane.clientHeight;
      const isSemanticPane = ['ASIDE', 'SECTION', 'ARTICLE', 'DIALOG', 'MAIN'].includes(pane.tagName);
      
      // 一定以上のテキスト量を持つ独立領域が見つかったら確定
      if ((isScrollable || isSemanticPane) && pane.innerText.trim().length > 50) {
        break;
      }
      pane = pane.parentElement;
    }
    content = (pane || document.body).innerText.trim();
  }

  // 3. Obsidian URIの組み立てと起動
  const title = document.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'WebClip';
  const body = `Source: ${location.href}\nDate: ${new Date().toLocaleString()}\n\n---\n\n${content}`;
  const vaultParam = vaultName ? `vault=${encodeURIComponent(vaultName)}&` : '';
  const uri = `obsidian://new?${vaultParam}file=${encodeURIComponent(title)}&content=${encodeURIComponent(body)}`;

  // 長文対応のためaタグ経由でURIを開く
  const a = document.createElement('a');
  a.href = uri;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
