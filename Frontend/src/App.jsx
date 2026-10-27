import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Map from './components/Map';
import RiderPanel from './components/RiderPanel';
import DriverPanel from './components/DriverPanel';

function Dashboard() {
  const { activeRole } = useAuth();

  // Auth Modal State
  const [authModal, setAuthModal] = useState({ isOpen: false, role: 'rider' });

  // Map Coordinates (New Delhi defaults)
  const [pickupCoord, setPickupCoord] = useState([28.6315, 77.2167]); // Connaught Place
  const [destinationCoord, setDestinationCoord] = useState([28.6129, 77.2295]); // India Gate
  const [driverCoord, setDriverCoord] = useState([28.6129, 77.2295]); // India Gate

  // Handle map clicks to set captain GPS location interactively
  const handleMapClick = (latlng) => {
    setDriverCoord(latlng);
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col font-sans text-zinc-100 selection:bg-emerald-500 selection:text-black">
      {/* Top Navbar with Sessions & Role Switcher */}
      <Navbar onOpenAuth={(role) => setAuthModal({ isOpen: true, role })} />

      {/* Auth Modal for Rider & Captain login/register */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialRole={authModal.role}
        onClose={() => setAuthModal({ isOpen: false, role: 'rider' })}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 max-w-[1720px] w-full mx-auto">
        {/* Rider Column */}
        {(activeRole === 'dual' || activeRole === 'rider') && (
          <div className={activeRole === 'dual' ? 'col-span-12 lg:col-span-4' : 'col-span-12 md:col-span-4'}>
            <RiderPanel
              onCoordinatesChange={({ pickup, destination }) => {
                if (pickup) setPickupCoord(pickup);
                if (destination) setDestinationCoord(destination);
              }}
              onOpenAuth={(role) => setAuthModal({ isOpen: true, role })}
            />
          </div>
        )}

        {/* Center/Full Interactive Dark Leaflet Map */}
        <div
          className={
            activeRole === 'dual'
              ? 'col-span-12 lg:col-span-4 h-[550px] lg:h-auto'
              : 'col-span-12 md:col-span-8 h-[650px]'
          }
        >
          <Map
            pickupCoord={pickupCoord}
            destinationCoord={destinationCoord}
            driverCoord={driverCoord}
            onMapClick={handleMapClick}
          />
        </div>

        {/* Captain Column */}
        {(activeRole === 'dual' || activeRole === 'captain') && (
          <div className={activeRole === 'dual' ? 'col-span-12 lg:col-span-4' : 'col-span-12 md:col-span-4'}>
            <DriverPanel
              onDriverLocationChange={(coord) => setDriverCoord(coord)}
              onOpenAuth={(role) => setAuthModal({ isOpen: true, role })}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Dashboard />
      </SocketProvider>
    </AuthProvider>
  );
}
