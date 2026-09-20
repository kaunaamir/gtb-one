let deferredInstallPrompt = null;

function isStandaloneMode() {
  try {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  } catch (e) {
    return false;
  }
}

function detectPlatform() {
  const ua = window.navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  const isAndroid = /android/i.test(ua);
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "desktop";
}

function manualStepsFor(platform) {
  if (platform === "ios") return "Tap the Share icon in Safari, then \"Add to Home Screen\".";
  if (platform === "android") return "Open your browser menu (&#8942;) and tap \"Add to Home Screen\".";
  return "Open your browser menu and tap \"Install GTB One\" or \"Add to Home Screen\".";
}

function renderInstallBanner() {
  const banner = document.getElementById("installBanner");
  if (isStandaloneMode()) {
    banner.style.display = "none";
    return;
  }
  banner.style.display = "flex";

  const titleEl = document.getElementById("installBannerTitle");
  const subEl = document.getElementById("installBannerSub");
  const btnEl = document.getElementById("installBannerBtn");
  const platform = detectPlatform();

  if (deferredInstallPrompt) {
    titleEl.textContent = "Install GTB One";
    subEl.innerHTML = "One tap adds it to your home screen &mdash; opens like an app from then on.";
    btnEl.style.display = "";
    btnEl.textContent = "Install App";
  } else if (platform === "ios") {
    titleEl.textContent = "Add GTB One to Home Screen";
    subEl.innerHTML = manualStepsFor(platform);
    btnEl.style.display = "none";
  } else {
    titleEl.textContent = "Install GTB One";
    subEl.innerHTML = manualStepsFor(platform);
    btnEl.style.display = "";
    btnEl.textContent = "How to Install";
  }
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  renderInstallBanner();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  document.getElementById("installBanner").style.display = "none";
});

document.getElementById("installBannerBtn").onclick = async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice.outcome === "accepted") {
      document.getElementById("installBanner").style.display = "none";
    } else {
      renderInstallBanner();
    }
    return;
  }
  const subEl = document.getElementById("installBannerSub");
  subEl.innerHTML = manualStepsFor(detectPlatform());
  subEl.classList.add("install-banner-sub-highlight");
  setTimeout(() => subEl.classList.remove("install-banner-sub-highlight"), 1200);
};

renderInstallBanner();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
