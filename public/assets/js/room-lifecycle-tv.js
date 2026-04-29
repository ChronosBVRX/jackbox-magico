(() => {
  const TV_TOKEN_KEY = "jackbox_magico_tv_token";
  let currentTrackedRoom = "";
  let heartbeatTimer = null;
  let statusTimer = null;

  function uuidLike() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `tv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getTvToken() {
    let token = localStorage.getItem(TV_TOKEN_KEY);
    if (!token) {
      token = uuidLike();
      localStorage.setItem(TV_TOKEN_KEY, token);
    }
    return token;
  }

  function getRoomCode() {
    const domCode = document.getElementById("tv-code")?.textContent?.trim();
    if (domCode && domCode !== "----") {
      currentTrackedRoom = domCode.toUpperCase();
      return currentTrackedRoom;
    }

    try {
      if (typeof currentRoom !== "undefined" && currentRoom) {
        currentTrackedRoom = String(currentRoom).toUpperCase();
        return currentTrackedRoom;
      }
    } catch (error) {}

    return currentTrackedRoom;
  }

  async function sendHeartbeat() {
    const room = getRoomCode();
    if (!room) return;

    try {
      const res = await fetch(`/api/room-lifecycle/tv/${room}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_token: getTvToken() }),
        keepalive: true,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.closed || data.expired) showClosedNotice(data);
      }
    } catch (error) {}
  }

  async function closeRoom(reason = "tv_closed") {
    const room = getRoomCode();
    if (!room) return;

    try {
      await fetch(`/api/room-lifecycle/tv/${room}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_token: getTvToken(), reason }),
        keepalive: true,
      });
      showClosedNotice({ status: "closed", closed_reason: reason });
    } catch (error) {
      showClosedNotice({ status: "closed", closed_reason: reason });
    }
  }

  async function pollLifecycle() {
    const room = getRoomCode();
    if (!room) return;

    try {
      const res = await fetch(`/api/room-lifecycle/status/${room}?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.closed || data.expired) showClosedNotice(data);
    } catch (error) {}
  }

  function ensureCloseButton() {
    if (document.getElementById("room-lifecycle-close-btn")) return;

    const btn = document.createElement("button");
    btn.id = "room-lifecycle-close-btn";
    btn.type = "button";
    btn.textContent = "Cerrar sala";
    btn.addEventListener("click", async () => {
      const ok = confirm("¿Cerrar esta sala para todos los celulares?");
      if (ok) await closeRoom("tv_manual_close");
    });
    document.body.appendChild(btn);
  }

  function injectStyles() {
    if (document.getElementById("room-lifecycle-tv-style")) return;

    const style = document.createElement("style");
    style.id = "room-lifecycle-tv-style";
    style.textContent = `
      #room-lifecycle-close-btn {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 10002;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 999px;
        padding: 10px 14px;
        color: rgba(255,248,221,.88);
        background: rgba(8,17,34,.76);
        backdrop-filter: blur(14px);
        font-weight: 900;
        cursor: pointer;
      }
      #room-lifecycle-close-btn:hover {
        background: rgba(127,29,29,.80);
        color: #fff;
      }
      .room-closed-overlay {
        position: fixed;
        inset: 0;
        z-index: 10001;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 50% 0%, rgba(255,216,121,.16), transparent 34%),
          rgba(3,7,18,.94);
        color: #fff7dc;
      }
      .room-closed-card {
        width: min(780px, 94vw);
        padding: 28px;
        border-radius: 32px;
        text-align: center;
        border: 1px solid rgba(255,216,121,.26);
        background: rgba(255,255,255,.07);
        box-shadow: 0 36px 120px rgba(0,0,0,.60);
      }
      .room-closed-card h2 {
        margin: 0 0 10px;
        color: #fff;
        font-size: clamp(2rem, 5vw, 4rem);
        line-height: .92;
        letter-spacing: -.06em;
      }
      .room-closed-card p {
        margin: 0 0 18px;
        color: rgba(255,248,221,.72);
        font-size: 1.08rem;
      }
      .room-closed-card button {
        border: 0;
        border-radius: 18px;
        padding: 13px 18px;
        color: #271600;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-weight: 1000;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function showClosedNotice(data = {}) {
    clearInterval(heartbeatTimer);
    clearInterval(statusTimer);

    let overlay = document.getElementById("room-closed-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "room-closed-overlay";
      overlay.className = "room-closed-overlay";
      document.body.appendChild(overlay);
    }

    const reason = data.closed_reason || data.reason || "room_closed";

    overlay.innerHTML = `
      <div class="room-closed-card">
        <h2>Sala cerrada</h2>
        <p>La partida terminó y los celulares serán enviados al inicio. Motivo: ${String(reason)}</p>
        <button type="button" onclick="location.reload()">Crear nueva sala</button>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    ensureCloseButton();
    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, 15000);
    statusTimer = setInterval(pollLifecycle, 5000);
  });

  window.addEventListener("beforeunload", () => {
    const room = getRoomCode();
    if (!room) return;

    try {
      navigator.sendBeacon(
        `/api/room-lifecycle/tv/${room}/close`,
        new Blob([JSON.stringify({ tv_token: getTvToken(), reason: "tv_window_unload" })], {
          type: "application/json",
        })
      );
    } catch (error) {}
  });

  window.RoomLifecycleTv = {
    closeRoom,
    sendHeartbeat,
    pollLifecycle,
  };
})();
