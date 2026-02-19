import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create animated technician icon
const createTechnicianIcon = () => {
  return L.divIcon({
    className: 'custom-technician-marker',
    html: `
      <div style="
        position: relative;
        width: 50px;
        height: 50px;
      ">
        <!-- Pulse animation ring -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 50px;
          height: 50px;
          background: radial-gradient(circle, rgba(102,126,234,0.4) 0%, rgba(102,126,234,0) 70%);
          border-radius: 50%;
          animation: pulse-ring 2s infinite;
        "></div>
        
        <!-- Main marker -->
        <div style="
          position: absolute;
          top: 5px;
          left: 5px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: marker-bounce 1s ease-in-out infinite;
        ">
          <span style="
            color: white;
            font-size: 22px;
            font-weight: bold;
          ">🚗</span>
        </div>
      </div>
      <style>
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes marker-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
      </style>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 45],
    popupAnchor: [0, -45]
  });
};

const createPathIcon = (index) => {
  return L.divIcon({
    className: 'path-marker',
    html: `
      <div style="
        background: ${index === 0 ? '#10b981' : '#cbd5e1'};
        width: ${index === 0 ? '12px' : '6px'};
        height: ${index === 0 ? '12px' : '6px'};
        border-radius: 50%;
        border: ${index === 0 ? '3px' : '2px'} solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ${index === 0 ? 'animation: recent-point 1s ease-in-out infinite;' : ''}
      "></div>
      ${index === 0 ? `<style>
        @keyframes recent-point {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
      </style>` : ''}
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

// Component to smoothly update map view and animate marker
function MapUpdater({ center, prevCenter }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      // Smooth pan to new location
      map.panTo(center, {
        animate: true,
        duration: 1.5, // Smooth 1.5 second transition
        easeLinearity: 0.25
      });
    }
  }, [center, map]);
  
  return null;
}

const LiveMap = ({ locations = [], technicianName = "الموظف" }) => {
  const mapRef = useRef(null);
  const [prevLocation, setPrevLocation] = useState(null);
  
  useEffect(() => {
    if (locations.length > 0) {
      setPrevLocation(locations[0]);
    }
  }, [locations]);
  
  if (locations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl">
        <div className="text-center">
          <div className="text-7xl mb-4 animate-bounce">🗺️</div>
          <p className="text-gray-700 font-bold text-lg">جاري انتظار بيانات الموقع...</p>
          <p className="text-gray-500 text-sm mt-2">سيتم عرض التتبع المباشر عند بدء الحركة</p>
        </div>
      </div>
    );
  }

  const latestLocation = locations[0];
  const center = [latestLocation.latitude, latestLocation.longitude];
  const prevCenter = prevLocation ? [prevLocation.latitude, prevLocation.longitude] : center;
  
  // Create path coordinates (reverse to show oldest to newest)
  const pathCoordinates = [...locations].reverse().map(loc => [loc.latitude, loc.longitude]);
  
  // Calculate approximate speed (if we have at least 2 points)
  let speedKmh = 0;
  if (locations.length >= 2) {
    const loc1 = locations[0];
    const loc2 = locations[1];
    const timeDiff = (new Date(loc1.timestamp) - new Date(loc2.timestamp)) / 1000; // seconds
    if (timeDiff > 0) {
      // Simple distance calculation (approximate)
      const latDiff = Math.abs(loc1.latitude - loc2.latitude);
      const lngDiff = Math.abs(loc1.longitude - loc2.longitude);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // meters
      speedKmh = Math.round((distance / timeDiff) * 3.6); // km/h
    }
  }

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-2xl">
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={true}
      >
        {/* طبقة القمر الصناعي من Google */}
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          maxZoom={20}
        />
        
        {/* طبقة أسماء الشوارع والمباني */}
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}"
          maxZoom={20}
          opacity={0.8}
        />
        
        <MapUpdater center={center} prevCenter={prevCenter} />
        
        {/* Draw animated path */}
        {pathCoordinates.length > 1 && (
          <>
            {/* Shadow path */}
            <Polyline
              positions={pathCoordinates}
              pathOptions={{
                color: '#1e293b',
                weight: 6,
                opacity: 0.2,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            {/* Main path */}
            <Polyline
              positions={pathCoordinates}
              pathOptions={{
                color: '#667eea',
                weight: 5,
                opacity: 0.9,
                dashArray: '10, 8',
                dashOffset: '0',
                lineCap: 'round',
                lineJoin: 'round',
                className: 'animated-path'
              }}
            />
          </>
        )}
        
        {/* Show recent location points (last 10) */}
        {locations.slice(1, 11).map((loc, index) => (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={createPathIcon(index)}
          >
            <Popup>
              <div className="text-center" dir="rtl">
                <p className="font-bold text-gray-700 mb-1">
                  {`نقطة ${index + 1}`}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(loc.timestamp).toLocaleTimeString('ar-IQ')}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Current position marker (animated) */}
        <Marker
          position={center}
          icon={createTechnicianIcon()}
        >
          <Popup>
            <div className="text-center" dir="rtl">
              <p className="font-bold text-purple-700 text-lg mb-2">
                🚗 {technicianName}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                📍 الموقع الحالي
              </p>
              <p className="text-xs text-gray-500">
                {new Date(latestLocation.timestamp).toLocaleTimeString('ar-IQ')}
              </p>
              {speedKmh > 0 && (
                <p className="text-xs text-green-600 font-bold mt-2">
                  السرعة: ~{speedKmh} كم/ساعة
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Live indicator overlay */}
      <div className="absolute top-4 right-4 z-[1000] bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-3 rounded-full shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-bold text-white">مباشر • تحديث كل ثانيتين</span>
        </div>
      </div>
      
      {/* Speed and info overlay */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <div className="bg-white/95 backdrop-blur-sm px-5 py-4 rounded-2xl shadow-2xl">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">👤 الموظف</p>
              <p className="text-lg font-bold text-purple-700">{technicianName}</p>
            </div>
            {speedKmh > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-1">⚡ السرعة</p>
                <p className="text-2xl font-bold text-green-600">{speedKmh} كم/س</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-600 mb-1">📍 النقاط</p>
              <p className="text-xl font-bold text-blue-600">{locations.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Last update time */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg">
        <p className="text-xs text-gray-600">آخر تحديث</p>
        <p className="text-sm font-bold text-gray-800">
          {new Date(latestLocation.timestamp).toLocaleTimeString('ar-IQ')}
        </p>
      </div>
    </div>
  );
};

export default LiveMap;
