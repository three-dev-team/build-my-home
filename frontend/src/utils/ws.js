// src/utils/ws.js
export function getBrokerURL() {
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProto}://${window.location.host}/ws`;
}
