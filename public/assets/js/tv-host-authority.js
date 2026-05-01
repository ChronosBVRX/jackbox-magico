(() => {
  const TV_HOST_COPY = "La TV controla la partida. Los celulares solo serán controles de jugador.";
  let lastClaimedRoom = "";
  let claimInFlight = false;

  function uuidLike() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `tv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getTvToken() {
    if (window.RoomLifecycleTv?.getTvToken) return window.RoomLifecycleTv.getTvToken();

    let token = localStorage.getItem("jackbox_magico_tv_token");
    if (!token) {
      token = uuidLike();
      localStorage.setItem("jackbox_magico_tv_token", token);
    }
    return token;
  }

  function getRoomCode() {
    const domCode = document.getElementById("tv-code")?.textContent?.trim();
    if (domCode && domCode !== "----") return domCode.toUpperCase();

    try {
      if (typeof currentRoom !== "undefined" && currentRoom) {
        return String(currentRoom).toUpperCase();
      }
    } catch (error) {}

    return "";
  }

  function normalizeCopy() {
    const hostStatus = document.getElementById("host-status");
    if (hostStatus) hostStatus.textContent = TV_HOST_COPY;

    document.querySelectorAll(".host-status, .host-help").forEach((el) => {
      const text = (el.textContent || "").toLowerCase();
      if (
        text.includes("primer celular") ||
        text.includes("será el host") ||
        text.includes("sera el host") ||
        text.includes("host inicie") ||
        text.includes("celular host")
      ) {
        el.textContent = TV_HOST_COPY;
      }
    });
  }

  async function claimTvHost(force = false) {
    const room = getRoomCode();
    if (!room || claimInFlight) return;
    if (!force && lastClaimedRoom === room) return;

    claimInFlight = true;

    try {
      const res = await fetch(`/api/story-tv/${room}/claim-host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_token: getTvToken() }),
        keepalive: true,
      });

      if (res.ok) {
        lastClaimedRoom = room;
        normalizeCopy();
      }
    } catch (error) {
      // Silencioso: el radar normal de TV seguirá funcionando aunque este reclamo falle momentáneamente.
    } finally {
      claimInFlight = false;
    }
  }

  function tick() {
    normalizeCopy();
    claimTvHost(false);
  }

  document.addEventListener("DOMContentLoaded", () => {
    tick();
    setTimeout(() => claimTvHost(true), 500);
    setInterval(tick, 1200);
    setInterval(() => claimTvHost(true), 10000);
  });

  window.TvHostAuthority = {
    claimTvHost,
    getTvToken,
  };
})();
