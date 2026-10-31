import { divIcon } from 'leaflet';

export const ICONE_IGREJA_NT = divIcon({
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -15],
  html: '<span style="display:grid;width:34px;height:34px;place-items:center;border:3px solid white;border-radius:9999px;background:#059669;box-shadow:0 3px 10px rgba(15,23,42,.35)"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v5M9.5 4.5h5M4 22V10l8-4 8 4v12M9 22v-7h6v7M4 12h16"/></svg></span>',
});

export const ICONE_ACEITE_NT = divIcon({
  className: '',
  iconSize: [34, 42],
  iconAnchor: [17, 38],
  popupAnchor: [0, -36],
  html: '<span style="display:grid;width:34px;height:34px;place-items:center;border:3px solid white;border-radius:9999px 9999px 9999px 4px;background:#7c3aed;color:white;font-size:20px;font-weight:900;line-height:1;box-shadow:0 4px 12px rgba(76,29,149,.45);transform:rotate(-45deg)"><span style="transform:rotate(45deg)">✓</span></span>',
});
