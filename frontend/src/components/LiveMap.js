import { useEffect, useRef } from 'react';
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

// Create custom icons
const createTechnicianIcon = () => {
  return L.divIcon({
    className: 'custom-technician-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 20px;
          font-weight: bold;
        ">📍</div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: rotate(-45deg) scale(1); }
          50% { transform: rotate(-45deg) scale(1.1); }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

const createPathIcon = (index) => {
  return L.divIcon({
    className: 'path-marker',
    html: `
      <div style="
        background: ${index === 0 ? '#10b981' : '#94a3b8'};
        width: ${index === 0 ? '12px' : '8px'};
        height: ${index === 0 ? '12px' : '8px'};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

// Component to update map view
function MapUpdater({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15, { animate: true });
    }
  }, [center, map]);
  
  return null;
}

const LiveMap = ({ locations = [], technicianName = "الموظف" }) => {
  const mapRef = useRef(null);
  
  if (locations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-gray-600">لا توجد بيانات موقع متاحة</p>
          <p className="text-gray-400 text-sm mt-2">سيتم عرض المسار عند بدء الحركة</p>
        </div>
      </div>
    );
  }

  const latestLocation = locations[0];
  const center = [latestLocation.latitude, latestLocation.longitude];
  
  // Create path coordinates (reverse to show oldest to newest)
  const pathCoordinates = [...locations].reverse().map(loc => [loc.latitude, loc.longitude]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-lg">
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={center} />
        
        {/* Draw path */}
        {pathCoordinates.length > 1 && (
          <Polyline
            positions={pathCoordinates}
            pathOptions={{
              color: '#667eea',
              weight: 4,
              opacity: 0.7,
              dashArray: '10, 10',
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}
        
        {/* Show all location points */}
        {locations.slice(0, 20).map((loc, index) => (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={index === 0 ? createTechnicianIcon() : createPathIcon(index)}
          >
            <Popup>
              <div className="text-center" dir="rtl">
                <p className="font-bold text-purple-700 mb-1">
                  {index === 0 ? `📍 ${technicianName}` : `نقطة ${locations.length - index}`}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(loc.timestamp).toLocaleTimeString('ar-IQ')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Live indicator overlay */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-bold text-gray-800">مباشر</span>
        </div>
      </div>
      
      {/* Speed/Info overlay */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg">
        <div className="text-right">
          <p className="text-xs text-gray-600 mb-1">المسافة المقطوعة</p>
          <p className="text-lg font-bold text-purple-700">{locations.length} نقطة</p>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
