(() => {
  const WIZARD = "\u{1F9D9}\u200D\u2642\uFE0F";
  const WITCH = "\u{1F9D9}\u200D\u2640\uFE0F";
  const SPARKLES = "\u2728";

  function normalizeGender(value) {
    const gender = String(value || "wizard").toLowerCase().trim();
    return gender === "witch" || gender === "maga" || gender === "female" ? "witch" : "wizard";
  }

  function iconForGender(value) {
    return normalizeGender(value) === "witch" ? WITCH : WIZARD;
  }

  function looksCorrupted(text) {
    return /[Ââð�§™□€�œ‡Š]/.test(String(text || ""));
  }

  function cleanKnownMojibakeText(text) {
    return String(text || "")
      .replaceAll("Â¡", "¡")
      .replaceAll("âœ¨", SPARKLES)
      .replaceAll("ðŸ¦�", "🦁")
      .replaceAll("ðŸ��", "🐍")
      .replaceAll("ðŸ¦…", "🦅")
      .replaceAll("ðŸ¦¡", "🦡");
  }

  function patchAudioButtons() {
    const mute = document.getElementById("btn-mute-instruction");
    if (mute && looksCorrupted(mute.textContent)) {
      mute.textContent = "🔊";
    }

    const repeat = document.getElementById("btn-repeat-instruction");
    if (repeat && looksCorrupted(repeat.textContent)) {
      repeat.textContent = "🔁";
    }
  }

  function patchExistingLobbyCards(players = []) {
    const grid = document.getElementById("lista-jugadores");
    if (!grid || !players.length) return;

    const cards = Array.from(grid.children);

    cards.forEach((card, index) => {
      const player = players[index];
      if (!player) return;

      const icon = iconForGender(player.gender);
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      const nodes = [];

      while (walker.nextNode()) {
        nodes.push(walker.currentNode);
      }

      nodes.forEach((node) => {
        if (looksCorrupted(node.nodeValue)) {
          node.nodeValue = icon;
        } else {
          node.nodeValue = cleanKnownMojibakeText(node.nodeValue);
        }
      });
    });
  }

  function patchPlayerPayload(payload) {
    const players = payload?.players || [];
    setTimeout(() => patchExistingLobbyCards(players), 0);
    setTimeout(() => patchExistingLobbyCards(players), 80);
    setTimeout(() => patchExistingLobbyCards(players), 220);
  }

  function patchFetch() {
    const originalFetch = window.fetch;
    if (!originalFetch || originalFetch.__playerEmojiFixPatched) return;

    function patchedFetch(resource, options) {
      return originalFetch.apply(this, arguments).then((response) => {
        try {
          const url = typeof resource === "string" ? resource : resource?.url;
          if (url && url.includes("/api/room/") && url.includes("/status")) {
            response.clone().json().then(patchPlayerPayload).catch(() => {});
          }
        } catch (error) {}

        return response;
      });
    }

    patchedFetch.__playerEmojiFixPatched = true;
    window.fetch = patchedFetch;
  }

  function patchDomLoop() {
    patchAudioButtons();

    const grid = document.getElementById("lista-jugadores");
    if (grid) {
      const cards = Array.from(grid.children);
      cards.forEach((card) => {
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => {
          if (looksCorrupted(node.nodeValue)) {
            node.nodeValue = WIZARD;
          } else {
            node.nodeValue = cleanKnownMojibakeText(node.nodeValue);
          }
        });
      });
    }
  }

  patchFetch();
  patchDomLoop();
  document.addEventListener("DOMContentLoaded", patchDomLoop);
  window.addEventListener("load", patchDomLoop);
  setInterval(patchDomLoop, 1000);

  window.PlayerEmojiFix = {
    iconForGender,
    patchExistingLobbyCards,
    patchAudioButtons,
  };
})();
