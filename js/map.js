// Map, city border lock, pins, pin placement
(function () {
  const D = DW;
  const map = L.map("map", { zoomControl: false, minZoom: 12 }).setView(D.CENTER, 13);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  const outline = L.polygon(D.BOUNDARY, { color: "#1c1c1c", weight: 2, fill: false, dashArray: "6 4" }).addTo(map);
  map.fitBounds(outline.getBounds());
  map.setMaxBounds(outline.getBounds().pad(0.2));
  map.options.maxBoundsViscosity = 1;
  D.map = map;

  // Ray-casting point-in-polygon check
  D.inside = (lat, lng) => {
    const p = D.BOUNDARY; let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [a, b] = p[i], [x, y] = p[j];
      if ((b > lng) !== (y > lng) && lat < ((x - a) * (lng - b)) / (y - b) + a) c = !c;
    }
    return c;
  };

  const layer = L.layerGroup().addTo(map);
  D.drawPins = (animateIds = []) => {
    const animate = new Set(animateIds);
    layer.clearLayers();
    D.reports.forEach(r => L.marker([r.lat, r.lng], {
      title: r.status,
      icon: (() => {
        const flag = D.FLAG[r.status];
        const height = 32, width = height * D.FLAG_VIEWBOX_WIDTH / 991;
        return L.divIcon({
          className: "",
          iconSize: [width, height],
          iconAnchor: [width * flag.ax / D.FLAG_VIEWBOX_WIDTH, height],
          html: `<img class="map-flag${animate.has(r.id) ? " flag-pop" : ""}" src="${flag.src}" style="--pole-x:${flag.ax / D.FLAG_VIEWBOX_WIDTH * 100}%" alt="">`
        });
      })()
    }).on("click", () => D.openDetail(r.id)).addTo(layer));
  };

  D.placing = false;
  map.on("click", e => {
    if (!D.placing) return;
    D.setPlacing(false);
    if (!D.inside(e.latlng.lat, e.latlng.lng)) return D.toast("That spot is outside Las Piñas City. Pick a point inside the dashed border.");
    D.openForm(e.latlng);
  });
})();
