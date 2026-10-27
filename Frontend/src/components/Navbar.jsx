import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Split, User, Car, LogOut, LogIn, Shield, Activity } from 'lucide-react';

export default function Navbar({ onOpenAuth }) {
  const { rider, captain, activeRole, setActiveRole, logoutRider, logoutCaptain } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="h-16 border-b border-dark-800 bg-dark-950/90 backdrop-blur-md px-5 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Connection State */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-zinc-100 text-black font-black rounded-lg flex items-center justify-center text-sm tracking-tighter shadow-md">
            UB
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-zinc-100 tracking-wide uppercase">
              Uber Core <span className="text-[10px] text-emerald-400 font-mono font-normal">v1.0</span>
            </h1>
            <p className="text-[10px] text-zinc-400 leading-none">Flagship Distributed System</p>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-dark-800 hidden sm:block mx-1"></div>

        {/* Real-Time WebSocket Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-dark-900 border border-dark-800 text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-rose-500'
            }`}
          ></span>
          <span className="font-mono text-zinc-300">
            {isConnected ? 'Gateway: 4000 (Active)' : 'Gateway: Offline'}
          </span>
        </div>
      </div>

      {/* Role View Switcher */}
      <div className="flex items-center bg-dark-900 border border-dark-800 rounded-xl p-1">
        <button
          onClick={() => setActiveRole('dual')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            activeRole === 'dual'
              ? 'bg-zinc-100 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Split className="w-3.5 h-3.5" /> Dual Simulator
        </button>
        <button
          onClick={() => setActiveRole('rider')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            activeRole === 'rider'
              ? 'bg-emerald-500 text-black shadow-sm font-extrabold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Rider View
        </button>
        <button
          onClick={() => setActiveRole('captain')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            activeRole === 'captain'
              ? 'bg-amber-500 text-black shadow-sm font-extrabold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Car className="w-3.5 h-3.5" /> Captain View
        </button>
      </div>

      {/* Active Session Badges & Sign In */}
      <div className="flex items-center gap-3">
        {/* Rider Badge */}
        {rider ? (
          <div className="flex items-center gap-2 bg-dark-900 border border-emerald-900/40 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-zinc-200 font-medium hidden md:inline">
              {rider.user?.fullname?.firstname}
            </span>
            <button
              onClick={logoutRider}
              title="Sign out Rider"
              className="text-zinc-400 hover:text-rose-400 transition ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenAuth('rider')}
            className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-900/40 transition flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" /> Rider Sign In
          </button>
        )}

        {/* Captain Badge */}
        {captain ? (
          <div className="flex items-center gap-2 bg-dark-900 border border-amber-900/40 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-xs text-zinc-200 font-medium hidden md:inline">
              Captain {captain.captain?.fullname?.firstname}
            </span>
            <button
              onClick={logoutCaptain}
              title="Sign out Captain"
              className="text-zinc-400 hover:text-rose-400 transition ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenAuth('captain')}
            className="text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-900/40 transition flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" /> Captain Sign In
          </button>
        )}
      </div>
    </header>
  );
}
