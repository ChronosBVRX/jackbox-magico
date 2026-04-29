(() => {
  let lastReadyKey = "";
  let lastReadySentKey = "";

  function getRoom() {
    try {
      if (typeof myRoom !== "undefined" && myRoom) return String(myRoom).toUpperCase();
    } catch (error) {}
    return (localStorage.getItem("jackbox_magico_room") || "").toUpperCase();
  }

  function getPlayerName() {
    try {
      if (typeof myName !== "undefined" && myName) return String(myName);
    } catch (error) {}
    return localStorage.getItem("jackbox_magico_name") || "";
  }

  function isReadyMoment(data) {
    const state = data?.game_state || {};
    const phase = state.phase || "";
    if (state.mode !== "story") return false;
    if (phase === "lobby") return false;
    return String(phase).startsWith("results_");
  }

  async function fetchStatus() {
    const room = getRoom();
    if (!room) return null;
    try {
      const res = await fetch(`/api/room/${room}/status?storyReadyMobileTs=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  async function fetchReadyStatus() {
    const room = getRoom();
    if (!room) return null;
    try {
      const res = await fetch(`/api/story-ready/${room}/status?ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  async function sendReady() {
    const room = getRoom();
    const playerName = getPlayerName();
    if (!room || !playerName) return;

    const box = ensureReadyBox();
    const button = box.querySelector("button");
    if (button) {
      button.disabled = true;
      button.textContent = "Listo enviado ✨";
    }

    try {
      const res = await fetch(`/api/story-ready/${room}/player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: playerName, ready: true }),
      });
      const data = await res.json();
      if (data?.ready_key) lastReadySentKey = data.ready_key;
      renderReadyBox(data, true);
    } catch (error) {
      if (button) {
        button.disabled = false;
        button.textContent = "Estoy listo";
      }
    }
  }

  function ensureReadyBox() {
    let box = document.getElementById("story-ready-mobile-box");
    if (box) return box;

    box = document.createElement("div");
    box.id = "story-ready-mobile-box";
    box.className = "story-ready-mobile-box";
    box.innerHTML = `
      <div class="story-ready-title">¿Listo para continuar?</div>
      <p>Cuando todos confirmen, la TV avanzará automáticamente.</p>
      <button type="button">Estoy listo</button>
      <small></small>
    `;
    box.querySelector("button")?.addEventListener("click", sendReady);

    const waitCard = document.querySelector("#view-wait .card");
    const gameCard = document.querySelector("#view-game .card");
    const target = document.getElementById("view-game")?.classList.contains("visible") ? gameCard : waitCard || gameCard;
    target?.appendChild(box);

    return box;
  }

  function renderReadyBox(readyData, sent = false) {
    const box = ensureReadyBox();
    const button = box.querySelector("button");
    const small = box.querySelector("small");

    const readyKey = readyData?.ready_key || lastReadyKey;
    const sentForThisKey = sent || (readyKey && readyKey === lastReadySentKey);

    if (button) {
      button.disabled = Boolean(sentForThisKey);
      button.textContent = sentForThisKey ? "Listo enviado ✨" : "Estoy listo";
    }

    if (small) {
      const count = Number(readyData?.ready_count || 0);
      const total = Number(readyData?.total_players || 0);
      small.textContent = total ? `${count}/${total} jugadores listos` : "Esperando jugadores...";
    }
  }

  function hideReadyBox() {
    const box = document.getElementById("story-ready-mobile-box");
    if (box) box.classList.remove("visible");
  }

  function showReadyBox() {
    const box = ensureReadyBox();
    box.classList.add("visible");
  }

  function injectStyles() {
    if (document.getElementById("story-ready-mobile-style")) return;
    const style = document.createElement("style");
    style.id = "story-ready-mobile-style";
    style.textContent = `
      .story-ready-mobile-box {
        display: none;
        margin-top: 18px;
        padding: 18px;
        border-radius: 24px;
        color: #fff7dc;
        background:
          radial-gradient(circle at 20% 0%, rgba(255,216,121,.22), transparent 34%),
          rgba(255,255,255,.08);
        border: 1px solid rgba(255,216,121,.28);
        box-shadow: 0 18px 42px rgba(0,0,0,.22);
        text-align: center;
      }
      .story-ready-mobile-box.visible { display: block; }
      .story-ready-title {
        color: #ffe7a3;
        font-size: 1.35rem;
        font-weight: 1000;
        margin-bottom: 6px;
      }
      .story-ready-mobile-box p {
        margin: 0 0 12px;
        color: rgba(255,248,221,.76);
        line-height: 1.25;
      }
      .story-ready-mobile-box button {
        width: 100%;
        border: 0;
        border-radius: 20px;
        padding: 17px 18px;
        color: #271600;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-size: 1.15rem;
        font-weight: 1000;
      }
      .story-ready-mobile-box button:disabled {
        opacity: .72;
      }
      .story-ready-mobile-box small {
        display: block;
        margin-top: 10px;
        color: rgba(255,248,221,.70);
        font-weight: 850;
      }
    `;
    document.head.appendChild(style);
  }

  async function tick() {
    injectStyles();
    const status = await fetchStatus();
    if (!status || !isReadyMoment(status)) {
      hideReadyBox();
      return;
    }

    const readyData = await fetchReadyStatus();
    if (!readyData) return;

    if (readyData.ready_key !== lastReadyKey) {
      lastReadyKey = readyData.ready_key;
      if (lastReadySentKey !== lastReadyKey) lastReadySentKey = "";
    }

    showReadyBox();
    renderReadyBox(readyData, false);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(tick, 900);
    setTimeout(tick, 700);
  });
})();
