(function () {
  const ROOM_LENGTH = 4;

  function cleanRoomCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, ROOM_LENGTH);
  }

  function isValidRoomCode(value) {
    return /^[A-Z]{4}$/.test(String(value || "").trim().toUpperCase());
  }

  function getRoomFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return cleanRoomCode(params.get("room"));
  }

  function clearBadSavedRoom() {
    const savedRoom = cleanRoomCode(localStorage.getItem("jackbox_magico_room"));

    if (savedRoom && !isValidRoomCode(savedRoom)) {
      localStorage.removeItem("jackbox_magico_room");
    }

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("jackbox_magico_host_token_")) {
        const roomCode = key.replace("jackbox_magico_host_token_", "");
        if (!isValidRoomCode(roomCode)) {
          localStorage.removeItem(key);
        }
      }
    });
  }

  function applyRoomToInput() {
    const input = document.getElementById("m-room");
    if (!input) return;

    const roomFromUrl = getRoomFromUrl();

    if (isValidRoomCode(roomFromUrl)) {
      input.value = roomFromUrl;
      input.disabled = true;
      localStorage.setItem("jackbox_magico_room", roomFromUrl);
      return;
    }

    const savedRoom = cleanRoomCode(localStorage.getItem("jackbox_magico_room"));

    if (isValidRoomCode(savedRoom)) {
      input.value = savedRoom;
      return;
    }

    input.value = "";
    input.disabled = false;
  }

  function patchFetchGuard() {
    const originalFetch = window.fetch;

    window.fetch = function (resource, options) {
      const url = typeof resource === "string" ? resource : resource?.url;

      if (url && url.includes("/api/room/")) {
        const match = url.match(/\/api\/room\/([^/?#]+)\/status/);

        if (match) {
          const roomCode = cleanRoomCode(match[1]);

          if (!isValidRoomCode(roomCode)) {
            console.warn("Consulta de sala bloqueada por código inválido:", match[1]);

            return Promise.resolve(
              new Response(
                JSON.stringify({
                  status: "invalid_room",
                  game_state: { phase: "lobby" },
                  players: [],
                  host: { claimed: false, name: null },
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                }
              )
            );
          }
        }
      }

      return originalFetch.apply(this, arguments);
    };
  }

  function patchJoinButton() {
    document.addEventListener("click", function (event) {
      const target = event.target;

      if (!target) return;

      if (target.id === "btn-unirse") {
        const input = document.getElementById("m-room");
        if (!input) return;

        const cleaned = cleanRoomCode(input.value);
        input.value = cleaned;

        if (!isValidRoomCode(cleaned)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          alert("Código de sala inválido. Debe ser de 4 letras, por ejemplo: ABCD.");
          return false;
        }

        localStorage.setItem("jackbox_magico_room", cleaned);
      }
    }, true);
  }

  clearBadSavedRoom();
  patchFetchGuard();
  patchJoinButton();

  document.addEventListener("DOMContentLoaded", applyRoomToInput);
  window.addEventListener("load", applyRoomToInput);

  window.RoomCodeFix = {
    cleanRoomCode,
    isValidRoomCode,
    clearBadSavedRoom,
    applyRoomToInput,
  };
})();
