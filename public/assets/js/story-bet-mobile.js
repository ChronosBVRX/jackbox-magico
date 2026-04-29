(() => {
  let lastBetKey = "";
  let sentBetKey = "";

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

  async function fetchBetStatus() {
    const room = getRoom();
    if (!room) return null;
    try {
      const res = await fetch(`/api/story-bet/${room}/status?ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  async function sendBet(wager) {
    const room = getRoom();
    const playerName = getPlayerName();
    if (!room || !playerName) return;

    const box = ensureBox();
    box.querySelectorAll("button").forEach((button) => button.disabled = true);

    try {
      const res = await fetch(`/api/story-bet/${room}/player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: playerName, wager }),
      });
      const data = await res.json();
      if (data?.bet_key) sentBetKey = data.bet_key;
      renderBox(data, true);
    } catch (error) {
      box.querySelectorAll("button").forEach((button) => button.disabled = false);
    }
  }

  function ensureBox() {
    let box = document.getElementById("story-bet-mobile-box");
    if (box) return box;
    box = document.createElement("div");
    box.id = "story-bet-mobile-box";
    box.className = "story-bet-mobile-box";
    box.innerHTML = `
      <div class="story-bet-title">Copa Final</div>
      <p>¿Cuánto apuestas por tu respuesta final?</p>
      <div class="story-bet-buttons">
        <button type="button" data-wager="25">25%</button>
        <button type="button" data-wager="50">50%</button>
        <button type="button" data-wager="all">Todo o nada</button>
      </div>
      <small></small>
    `;
    box.addEventListener("click", (event) => {
      const wager = event.target?.dataset?.wager;
      if (wager) sendBet(wager);
    });

    const waitCard = document.querySelector("#view-wait .card");
    const gameCard = document.querySelector("#view-game .card");
    const target = document.getElementById("view-game")?.classList.contains("visible") ? gameCard : waitCard || gameCard;
    target?.appendChild(box);
    return box;
  }

  function renderBox(data, sent = false) {
    const box = ensureBox();
    const small = box.querySelector("small");
    const sentForKey = sent || (data?.bet_key && data.bet_key === sentBetKey);
    box.querySelectorAll("button").forEach((button) => button.disabled = Boolean(sentForKey));
    if (small) {
      small.textContent = sentForKey
        ? `Apuesta enviada · ${data?.bet_count || 0}/${data?.total_players || 0}`
        : `Faltan apuestas · ${data?.bet_count || 0}/${data?.total_players || 0}`;
    }
  }

  function showBox() {
    ensureBox().classList.add("visible");
  }

  function hideBox() {
    const box = document.getElementById("story-bet-mobile-box");
    if (box) box.classList.remove("visible");
  }

  function injectStyles() {
    if (document.getElementById("story-bet-mobile-style")) return;
    const style = document.createElement("style");
    style.id = "story-bet-mobile-style";
    style.textContent = `
      .story-bet-mobile-box {
        display: none;
        margin-top: 18px;
        padding: 18px;
        border-radius: 24px;
        color: #fff7dc;
        background:
          radial-gradient(circle at 20% 0%, rgba(255,216,121,.24), transparent 34%),
          rgba(255,255,255,.08);
        border: 1px solid rgba(255,216,121,.28);
        box-shadow: 0 18px 42px rgba(0,0,0,.22);
        text-align: center;
      }
      .story-bet-mobile-box.visible { display: block; }
      .story-bet-title {
        color: #ffe7a3;
        font-size: 1.35rem;
        font-weight: 1000;
        margin-bottom: 6px;
      }
      .story-bet-mobile-box p {
        margin: 0 0 12px;
        color: rgba(255,248,221,.76);
      }
      .story-bet-buttons {
        display: grid;
        gap: 8px;
      }
      .story-bet-buttons button {
        width: 100%;
        border: 0;
        border-radius: 18px;
        padding: 15px 16px;
        color: #271600;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-size: 1.05rem;
        font-weight: 1000;
      }
      .story-bet-buttons button:last-child {
        color: #fff;
        background: linear-gradient(135deg, #7f1d1d, #f97316);
      }
      .story-bet-buttons button:disabled { opacity: .7; }
      .story-bet-mobile-box small {
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
    const data = await fetchBetStatus();
    if (!data || !data.is_final_phase) {
      hideBox();
      return;
    }
    if (data.bet_key !== lastBetKey) {
      lastBetKey = data.bet_key;
      if (sentBetKey !== lastBetKey) sentBetKey = "";
    }
    showBox();
    renderBox(data, false);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(tick, 1000);
    setTimeout(tick, 800);
  });
})();
