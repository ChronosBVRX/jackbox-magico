(() => {
  function getRoomFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    return room ? room.trim().toUpperCase() : "";
  }

  function getRoomFromStorage() {
    return (localStorage.getItem("jackbox_magico_room") || "").trim().toUpperCase();
  }

  function getNameFromStorage() {
    return (localStorage.getItem("jackbox_magico_name") || "").trim();
  }

  function getHouseFromStorage() {
    return (localStorage.getItem("jackbox_magico_house") || "").trim();
  }

  function syncMobileIdentity() {
    const roomFromUrl = getRoomFromUrl();
    const roomFromStorage = getRoomFromStorage();
    const finalRoom = roomFromUrl || roomFromStorage;

    const roomInput = document.getElementById("m-room");
    const nameInput = document.getElementById("m-name");
    const houseSelect = document.getElementById("m-house");

    if (finalRoom) {
      localStorage.setItem("jackbox_magico_room", finalRoom);

      if (roomInput) {
        roomInput.value = finalRoom;
        roomInput.disabled = Boolean(roomFromUrl);
      }
    }

    const storedName = getNameFromStorage();
    if (storedName && nameInput && !nameInput.value.trim()) {
      nameInput.value = storedName;
    }

    const storedHouse = getHouseFromStorage();
    if (storedHouse && houseSelect && !houseSelect.value) {
      houseSelect.value = storedHouse;
    }
  }

  function getSafeRoomCode() {
    const fromInput = document.getElementById("m-room")?.value?.trim().toUpperCase() || "";
    const fromUrl = getRoomFromUrl();
    const fromStorage = getRoomFromStorage();
    return fromInput || fromUrl || fromStorage;
  }

  function getSafePlayerName() {
    const fromInput = document.getElementById("m-name")?.value?.trim() || "";
    const fromStorage = getNameFromStorage();
    return fromInput || fromStorage;
  }

  function getSafeHouse() {
    const fromInput = document.getElementById("m-house")?.value || "";
    const fromStorage = getHouseFromStorage();
    return fromInput || fromStorage || "Gryffindor";
  }

  function loadScriptOnce(id, src) {
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function loadLifecycleCleanup() {
    loadScriptOnce("room-lifecycle-mobile-script", "/assets/js/room-lifecycle-mobile.js?v=lifecycle-1");
  }

  function loadStoryAutopilot() {
    loadScriptOnce("story-autopilot-script", "/assets/js/story-autopilot.js?v=story-auto-2");
  }

  function loadStoryReadyButton() {
    loadScriptOnce("story-ready-mobile-script", "/assets/js/story-ready-mobile.js?v=story-ready-2");
  }

  function loadStoryBetControls() {
    loadScriptOnce("story-bet-mobile-script", "/assets/js/story-bet-mobile.js?v=story-bet-1");
  }

  window.MobileRoomGuard = {
    syncMobileIdentity,
    getSafeRoomCode,
    getSafePlayerName,
    getSafeHouse,
    loadLifecycleCleanup,
    loadStoryAutopilot,
    loadStoryReadyButton,
    loadStoryBetControls,
  };

  syncMobileIdentity();

  document.addEventListener("DOMContentLoaded", () => {
    syncMobileIdentity();
    loadLifecycleCleanup();
    loadStoryAutopilot();
    loadStoryReadyButton();
    loadStoryBetControls();
  });
})();
