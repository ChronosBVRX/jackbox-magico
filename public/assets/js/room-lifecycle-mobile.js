(() => {
  let lastKnownRoom = "";
  let closedHandled = false;

  function getRoomFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    return room ? room.trim().toUpperCase() : "";
  }

  function getRoom() {
    try {
      if (typeof myRoom !== "undefined" && myRoom) {
        lastKnownRoom = String(myRoom).toUpperCase();
        return lastKnownRoom;
      }
    } catch (error) {}

    const inputRoom = document.getElementById("m-room")?.value?.trim().toUpperCase() || "";
    const urlRoom = getRoomFromUrl();
    const storedRoom = (localStorage.getItem("jackbox_magico_room") || "").trim().toUpperCase();
    const room = inputRoom || urlRoom || storedRoom || lastKnownRoom;

    if (room) lastKnownRoom = room;
    return room;
  }

  function clearRoomSession(room) {
    if (!room) room = getRoom();

    localStorage.removeItem("jackbox_magico_room");
    if (room) localStorage.removeItem(`jackbox_magico_host_token_${room}`);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    } catch (error) {}

    try {
      if (typeof myRoom !== "undefined") myRoom = "";
      if (typeof myHostToken !== "undefined") myHostToken = "";
      if (typeof myIsHost !== "undefined") myIsHost = false;
    } catch (error) {}
  }

  function showClosedScreen(data = {}) {
    const reason = data.closed_reason || data.reason || "La partida terminó.";

    let view = document.getElementById("room-closed-mobile-view");
    if (!view) {
      view = document.createElement("div");
      view.id = "room-closed-mobile-view";
      view.className = "screen visible";
      document.body.appendChild(view);
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("visible");
    });

    view.classList.add("visible");
    view.innerHTML = `
      <section class="card room-closed-mobile-card">
        <div class="pill">🔒 Sala cerrada</div>
        <h1>La partida terminó</h1>
        <p>Tu sesión anterior fue limpiada para que puedas entrar a una nueva sala sin quedarte atrapado.</p>
        <p class="room-closed-reason">${String(reason)}</p>
        <button class="join-btn" type="button" id="room-closed-back-btn">Volver al inicio</button>
      </section>
    `;

    document.getElementById("room-closed-back-btn")?.addEventListener("click", () => {
      location.href = "/mobile/index.html";
    });
  }

  function handleClosedRoom(data = {}) {
    if (closedHandled) return;
    closedHandled = true;

    const room = getRoom();
    clearRoomSession(room);
    showClosedScreen(data);
  }

  async function pollLifecycle() {
    const room = getRoom();
    if (!room || closedHandled) return;

    try {
      const res = await fetch(`/api/room-lifecycle/status/${room}?mobileTs=${Date.now()}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.closed || data.expired || data.status === "closed" || data.status === "expired") {
        handleClosedRoom(data);
      }
    } catch (error) {}
  }

  function injectStyles() {
    if (document.getElementById("room-lifecycle-mobile-style")) return;

    const style = document.createElement("style");
    style.id = "room-lifecycle-mobile-style";
    style.textContent = `
      .room-closed-mobile-card {
        border: 1px solid rgba(255,216,121,.26);
      }
      .room-closed-reason {
        padding: 10px;
        border-radius: 14px;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.10);
        color: rgba(255,248,221,.72);
        font-size: .88rem;
      }
    `;

    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(pollLifecycle, 3500);
    setTimeout(pollLifecycle, 800);
  });

  window.RoomLifecycleMobile = {
    pollLifecycle,
    clearRoomSession,
    handleClosedRoom,
  };
})();
