// Reports, list view, dialogs, and admin controls
(function () {
  const D = DW, $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toLocaleDateString("en", { month: "short", day: "numeric" });
  const sheet = $("#sheet"); let filter = "All"; const seen = new Set();
  const onboarding = $("#onboarding"), onboardingKey = "drainwatch-onboarding-seen";
  onboarding.addEventListener("close", () => {
    try {
      localStorage.setItem(onboardingKey, "true");
    } catch (error) {
      console.error("Unable to save the DrainWatch welcome guide preference:", error);
    }
  });
  $("#dismiss-onboarding").addEventListener("click", () => onboarding.close());
  try {
    if (localStorage.getItem(onboardingKey) !== "true") onboarding.showModal();
  } catch (error) {
    console.error("Unable to read the DrainWatch welcome guide preference:", error);
    onboarding.showModal();
  }
  const groupPhoto = $("#group-photo");
  const updateGroupPhoto = () => groupPhoto.closest("figure").classList.toggle("has-photo", groupPhoto.naturalWidth > 0);
  groupPhoto.addEventListener("load", updateGroupPhoto);
  groupPhoto.addEventListener("error", updateGroupPhoto);
  if (groupPhoto.complete) updateGroupPhoto();

  D.reports = [];
  D.isAdmin = false;
  const official = () => D.isAdmin;
  const flag = (s, className = "status-flag") => {
    const f = D.FLAG[s];
    return `<img class="${className}" src="${f.src}" style="--pole-x:${f.ax / D.FLAG_VIEWBOX_WIDTH * 100}%" alt="" aria-hidden="true">`;
  };
  const photo = r => `<div class="ph">${r.photo ? `<img src="${esc(r.photo)}" alt="">` : "No photo"}</div>`;

  D.toast = msg => { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => t.hidden = true, 3500); };
  D.setPlacing = on => { D.placing = on; $("#hint").hidden = !on; $("#report").textContent = on ? "Cancel" : "Report a drain +"; };

  function render({ animateIds = [] } = {}) {
    D.drawPins(animateIds);
    $("#legend").innerHTML = D.STATUS.map(s => `<span>${flag(s)}${s}</span>`).join("");
    $("#filters").innerHTML = ["All", ...D.STATUS].map(s => `<button class="${s === filter ? "on" : ""}" data-f="${s}">${s}</button>`).join("");
    const rows = D.reports.filter(r => filter === "All" || r.status === filter).slice().reverse();
    $("#grid").innerHTML = rows.length ? rows.map(r => `<button class="card" data-id="${r.id}">${photo(r)}<p class="desc">${esc(r.desc)}</p><p class="meta">${flag(r.status)}${r.status} · ${r.seen} seen</p></button>`).join("") : `<p class="empty">No reports with this status yet.</p>`;
    const n = s => D.reports.filter(r => r.status === s).length;
    $("#stats").hidden = !official();
    $("#stats").innerHTML = `<span><b>${D.reports.length}</b>total</span><span><b>${D.reports.length - n("Resolved")}</b>open</span><span><b>${n("In progress")}</b>in progress</span><span><b>${n("Resolved")}</b>resolved</span><span><b>${D.reports.filter(r => r.danger && r.status !== "Resolved").length}</b>open hazards</span>${official() ? `<button class="ghost" id="clear-reports" ${D.reports.length ? "" : "disabled"}>Clear all reports</button>` : ""}`;
  }

  let reportsReady = false;
  const pendingReportEvents = [];
  const applyReportEvent = event => {
    const id = event.new?.id || event.old?.id;
    const index = D.reports.findIndex(report => report.id === id);
    if (event.eventType === "DELETE") {
      if (index !== -1) D.reports.splice(index, 1);
    } else {
      const report = D.reportFromRow(event.new);
      if (index === -1) D.reports.push(report);
      else D.reports[index] = report;
    }
    render({ animateIds: event.eventType === "INSERT" ? [id] : [] });
    if (sheet.open && sheet.dataset.reportId) {
      if (event.eventType === "DELETE" && sheet.dataset.reportId === id) sheet.close();
      else if (event.eventType !== "DELETE" && sheet.dataset.reportId === id) D.openDetail(id);
    }
  };
  D.watchReports(event => {
    if (!reportsReady) pendingReportEvents.push(event);
    else applyReportEvent(event);
  });

  D.openForm = ll => {
    sheet.dataset.reportId = "";
    sheet.innerHTML = `<h2>Report a drain +</h2><form id="f">
      <div class="field"><span>Photo <span class="optional">(optional)</span></span>
        <div class="photo-picker">
          <button type="button" class="photo-action" id="take-photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Take photo</button>
          <button type="button" class="photo-action" id="choose-photo"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m20 15-5-5L5 19"/></svg>Choose photo</button>
          <input id="camera-photo" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" tabindex="-1" aria-hidden="true">
          <input id="library-photo" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" tabindex="-1" aria-hidden="true">
        </div>
        <div id="photo-preview" class="photo-preview" hidden>
          <img id="photo-thumbnail" alt="Selected drain photo preview">
          <span id="photo-name"></span>
          <button type="button" class="remove-photo" id="remove-photo" aria-label="Remove selected photo">Remove</button>
        </div>
      </div>
      <div class="field"><label for="s">How blocked is it?</label><select id="s"><option>Partially blocked</option><option>Fully blocked</option><option>Overflowing</option></select></div>
      <label class="check"><input id="d" type="checkbox"> Dangerous (open or missing cover)</label>
      <div class="field"><label for="t">Details</label><textarea id="t" maxlength="1000" required placeholder="Street, landmark, what you see"></textarea></div>
      <div class="row"><button type="button" class="ghost" id="x">Cancel</button><button class="primary">Submit report</button></div></form>`;
    sheet.showModal();
    $("#x").onclick = () => sheet.close();
    const cameraInput = $("#camera-photo"), libraryInput = $("#library-photo");
    const preview = $("#photo-preview"), thumbnail = $("#photo-thumbnail");
    const setPhoto = (input, other) => {
      const file = input.files[0];
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024) {
        input.value = "";
        D.toast("Choose a JPG, PNG, WebP, or GIF image no larger than 5 MB.");
        return;
      }
      other.value = "";
      if (thumbnail.src.startsWith("blob:")) URL.revokeObjectURL(thumbnail.src);
      thumbnail.src = URL.createObjectURL(file);
      $("#photo-name").textContent = file.name;
      preview.hidden = false;
    };
    $("#take-photo").onclick = () => cameraInput.click();
    $("#choose-photo").onclick = () => libraryInput.click();
    cameraInput.onchange = () => setPhoto(cameraInput, libraryInput);
    libraryInput.onchange = () => setPhoto(libraryInput, cameraInput);
    $("#remove-photo").onclick = () => {
      cameraInput.value = ""; libraryInput.value = "";
      if (thumbnail.src.startsWith("blob:")) URL.revokeObjectURL(thumbnail.src);
      thumbnail.removeAttribute("src"); preview.hidden = true;
    };
    $("#f").onsubmit = async e => {
      e.preventDefault();
      const submit = $("#f button.primary");
      submit.disabled = true;
      submit.textContent = "Submitting…";
      try {
        const report = await D.submitReport({
          lat: ll.lat,
          lng: ll.lng,
          desc: $("#t").value.trim(),
          sev: $("#s").value,
          danger: $("#d").checked,
          reportedOn: today()
        }, cameraInput.files[0] || libraryInput.files[0]);
        D.reports.push(report);
        sheet.close(); render({ animateIds: [report.id] }); D.toast("Report submitted. Status: Reported.");
      } catch (error) {
        console.error("Unable to submit DrainWatch report:", error);
        D.toast(`Report could not be submitted: ${error.message}`);
        submit.disabled = false;
        submit.textContent = "Submit report";
      }
    };
  };

  D.openDetail = id => {
    const r = D.reports.find(x => x.id === id); if (!r) return;
    sheet.dataset.reportId = id;
    const adm = official() ? `<div class="field"><label for="st">Update status</label><select id="st">${D.STATUS.map(s => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>` : "";
    sheet.innerHTML = `${photo(r)}<h2 style="margin-top:12px">${flag(r.status)}${r.status}</h2>
      <span class="tag">${esc(r.sev)}</span>${r.danger ? `<span class="tag" style="color:var(--reported);font-weight:600">Hazard</span>` : ""}
      <p>${esc(r.desc)}</p>
      <ul class="log">${r.log.map(l => `<li>${esc(l[1])} · ${esc(l[0])}</li>`).join("")}</ul>${adm}
      <div class="row"><button class="ghost" id="x">Close</button>
      <button class="ghost" id="see" ${seen.has(id) ? "disabled" : ""}>I see this too (${r.seen})</button>
      ${official() ? `<button class="ghost" id="delete-report">Delete report</button><button class="primary" id="up">Save status</button>` : ""}</div>`;
    if (!sheet.open) sheet.showModal();
    $("#x").onclick = () => sheet.close();
    $("#see").onclick = async () => {
      try {
        r.seen = await D.incrementSeen(id);
        seen.add(id); render(); D.openDetail(id);
      } catch (error) {
        console.error("Unable to record community support:", error);
        D.toast(`Could not update the seen count: ${error.message}`);
      }
    };
    if (official()) $("#up").onclick = async () => {
      const s = $("#st").value;
      const changed = s !== r.status;
      try {
        if (changed) {
          const updated = await D.updateReportStatus(r, s, [...r.log, [s, today()]]);
          Object.assign(r, updated);
        }
        sheet.close(); render({ animateIds: changed ? [r.id] : [] }); D.toast("Status updated to " + s + ".");
      } catch (error) {
        console.error("Unable to update report status:", error);
        D.toast(`Status could not be updated: ${error.message}`);
      }
    };
    if (official()) $("#delete-report").onclick = async () => {
      if (!confirm("Delete this report and its photo? This cannot be undone.")) return;
      try {
        await D.deleteReport(r);
        D.reports = D.reports.filter(report => report.id !== id);
        sheet.close(); render(); D.toast("Report deleted.");
      } catch (error) {
        console.error("Unable to delete report:", error);
        D.reports = await D.loadReports().catch(loadError => {
          console.error("Unable to refresh reports after delete:", loadError);
          return D.reports;
        });
        render();
        D.toast(`Could not fully delete report: ${error.message}`);
      }
    };
  };

  sheet.addEventListener("click", e => { if (e.target === sheet) sheet.close(); });
  $("#grid").addEventListener("click", e => { const c = e.target.closest(".card"); if (c) D.openDetail(c.dataset.id); });
  $("#filters").addEventListener("click", e => { if (e.target.dataset.f) { filter = e.target.dataset.f; render(); } });
  $("#admin-login").addEventListener("click", async () => {
    if (D.isAdmin) {
      try {
        await D.signOutAdmin();
        $("#admin-login").textContent = "Admin login";
        render();
        D.toast("Admin signed out.");
      } catch (error) {
        console.error("Unable to sign out admin:", error);
        D.toast(`Could not sign out: ${error.message}`);
      }
      return;
    }
    sheet.dataset.reportId = "";
    sheet.innerHTML = `<h2>Admin login</h2><form id="admin-form">
      <div class="field"><label for="admin-email">Email</label><input id="admin-email" type="email" autocomplete="username" required></div>
      <div class="field"><label for="admin-password">Password</label><input id="admin-password" type="password" autocomplete="current-password" required></div>
      <div class="row"><button type="button" class="ghost" id="x">Cancel</button><button class="primary">Sign in</button></div>
    </form>`;
    sheet.showModal();
    $("#x").onclick = () => sheet.close();
    $("#admin-form").onsubmit = async event => {
      event.preventDefault();
      const button = $("#admin-form button.primary");
      button.disabled = true;
      button.textContent = "Signing in…";
      try {
        await D.signInAdmin($("#admin-email").value.trim(), $("#admin-password").value);
        $("#admin-login").textContent = "Admin · Sign out";
        sheet.close(); render(); D.toast("Signed in as admin.");
      } catch (error) {
        console.error("Unable to sign in as admin:", error);
        D.toast(`Admin sign-in failed: ${error.message}`);
        button.disabled = false;
        button.textContent = "Sign in";
      }
    };
  });
  $("#stats").addEventListener("click", async event => {
    if (event.target.id !== "clear-reports" || !D.isAdmin) return;
    if (!confirm(`Delete all ${D.reports.length} reports and their photos? This cannot be undone.`)) return;
    const button = event.target;
    button.disabled = true;
    try {
      await D.clearReports(D.reports);
      D.reports = [];
      render();
      D.toast("All reports cleared.");
    } catch (error) {
      console.error("Unable to clear reports:", error);
      try {
        D.reports = await D.loadReports();
        render();
      } catch (loadError) {
        console.error("Unable to refresh reports after clear:", loadError);
      }
      D.toast(`Could not fully clear reports: ${error.message}`);
      button.disabled = false;
    }
  });
  $("#report").addEventListener("click", () => D.setPlacing(!D.placing));
  const main = $("main"), mapView = $("#view-map"), listView = $("#view-list"), aboutView = $("#view-about");
  let activeView = "map", viewTimer, touchStart;
  const setView = view => {
    const views = { map: mapView, list: listView, about: aboutView };
    if (!views[view] || view === activeView) return;
    const next = views[view];
    next.hidden = false;
    next.getBoundingClientRect();
    activeView = view;
    main.classList.toggle("reports-active", view === "list");
    main.classList.toggle("about-active", view === "about");
    document.querySelectorAll("#tabs button").forEach(b => {
      const selected = b.dataset.view === view;
      b.classList.toggle("on", selected);
      b.setAttribute("aria-pressed", String(selected));
    });
    Object.entries(views).forEach(([name, section]) => section.setAttribute("aria-hidden", String(name !== view)));
    clearTimeout(viewTimer);
    viewTimer = setTimeout(() => {
      Object.entries(views).forEach(([name, section]) => { section.hidden = name !== view; });
      if (view === "map") D.map.invalidateSize();
    }, 300);
  };
  $("#tabs").addEventListener("click", e => {
    const v = e.target.dataset.view; if (!v) return;
    setView(v);
  });
  main.addEventListener("touchstart", e => {
    if (e.touches.length !== 1 || e.target.closest("#tabs,#report,a,input,textarea,select,.leaflet-control,.filters")) {
      touchStart = null;
      return;
    }
    const touch = e.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY, horizontal: false };
  }, { passive: true });
  main.addEventListener("touchmove", e => {
    if (!touchStart || e.touches.length !== 1) return;
    const touch = e.touches[0], dx = touch.clientX - touchStart.x, dy = touch.clientY - touchStart.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) touchStart.horizontal = true;
    if (touchStart.horizontal) e.preventDefault();
  }, { passive: false });
  main.addEventListener("touchend", e => {
    if (!touchStart) return;
    if (touchStart.horizontal && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const threshold = Math.max(64, Math.min(96, main.clientWidth * 0.18));
      const order = ["map", "list", "about"], nextIndex = order.indexOf(activeView) + (dx < 0 ? 1 : -1);
      if (Math.abs(dx) >= threshold && nextIndex >= 0 && nextIndex < order.length) setView(order[nextIndex]);
    }
    touchStart = null;
  });
  main.addEventListener("touchcancel", () => { touchStart = null; });
  render();
  (async () => {
    try {
      const [reports] = await Promise.all([D.loadReports(), D.refreshAdmin()]);
      D.reports = reports;
      reportsReady = true;
      pendingReportEvents.forEach(applyReportEvent);
      pendingReportEvents.length = 0;
      if (D.isAdmin) $("#admin-login").textContent = "Admin · Sign out";
      render({ animateIds: reports.map(r => r.id) });
    } catch (error) {
      console.error("Unable to load DrainWatch from Supabase:", error);
      reportsReady = true;
      pendingReportEvents.forEach(applyReportEvent);
      pendingReportEvents.length = 0;
      D.toast(`Could not connect to the report database: ${error.message}`);
    }
  })();
})();
