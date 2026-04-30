(() => {
  const TV_HOST_COPY = "La TV controla la partida. Los celulares solo serán controles de jugador.";
  let lastClaimedRoom = "";
  let claimInFlight = false;
  let lastClaimAt = 0;

  function uuidLike() {
    if (crypto?.randomUUID) return crypto.randomUUID();
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
    if (hostStatus && hostStatus.textContent !== TV_HOST_COPY) hostStatus.textContent = TV_HOST_COPY;
  }

  async function claimTvHost(force = false) {
    const room = getRoomCode();
    if (!room || claimInFlight) return;

    const now = Date.now();
    if (!force && lastClaimedRoom === room) return;
    if (now - lastClaimAt < 15000) return;
    lastClaimAt = now;

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
      // Silencioso.
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
    setTimeout(() => claimTvHost(true), 1200);
    setInterval(tick, 5000);
  });

  window.TvHostAuthority = {
    claimTvHost,
    getTvToken,
  };
})();
