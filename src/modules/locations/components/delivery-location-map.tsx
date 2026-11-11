"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { LatLng } from "@/modules/locations/coordinates";

import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "commerceos-delivery-pin",
  html: `<span style="display:block;font-size:28px;line-height:28px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">📍</span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

type DeliveryLocationMapProps = {
  point: LatLng;
  onPointChange: (point: LatLng) => void;
};

function Recenter({ point }: { point: LatLng }) {
  const map = useMap();
  useEffect(() => {
    const zoom = map.getZoom();
    map.setView([point.latitude, point.longitude], zoom < 15 ? 17 : zoom, {
      animate: true,
    });
  }, [map, point.latitude, point.longitude]);
  return null;
}

function MapClickHandler({ onPointChange }: { onPointChange: (point: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onPointChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });
  return null;
}

export function DeliveryLocationMap({ point, onPointChange }: DeliveryLocationMapProps) {
  return (
    <MapContainer
      center={[point.latitude, point.longitude]}
      zoom={17}
      scrollWheelZoom={false}
      className="z-0 h-52 w-full"
      style={{ touchAction: "pan-x pan-y" }}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter point={point} />
      <MapClickHandler onPointChange={onPointChange} />
      <Marker
        draggable
        icon={pinIcon}
        position={[point.latitude, point.longitude]}
        eventHandlers={{
          dragend: (event) => {
            const { lat, lng } = event.target.getLatLng();
            onPointChange({ latitude: lat, longitude: lng });
          },
        }}
      />
    </MapContainer>
  );
}
