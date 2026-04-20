import React, { useState } from 'react';
import './BantaydalanScreen.css';
import { HomeIcon, StatsIcon, AlertIcon, MenuIcon, PlusIcon, SearchIcon, FilterIcon, AppLogo } from './icons.jsx';

// Mock Map Component
const MockMap = () => (
    <div className="mock-map-container">
        <div className="map-placeholder">
            <p>Map Area</p>
        </div>
        <div className="map-controls">
            <button className="map-control-button">+</button>
            <button className="map-control-button">–</button>
            <button className="map-control-button">⤢</button>
        </div>
    </div>
);

const BantaydalanScreen = () => {
    const [activeTab, setActiveTab] = useState('alerts');
    const [activeNav, setActiveNav] = useState('home');

    const searchChips = ['Kabankalan', 'Bacolod', 'Silay', 'Talisay'];

    return (
        <div className="bantaydalan-container">
            <div className="bantaydalan-screen">
                {/* Header */}
                <header className="app-header">
                    <AppLogo />
                    <h1 className="app-title">BANTAYDALAN</h1>
                </header>

                <main className="app-main-content">
                    {/* Search Section */}
                    <section className="search-section">
                        <div className="search-bar">
                            <span className="search-icon-wrapper"><SearchIcon /></span>
                            <input type="text" placeholder="Search location…" />
                            <span className="filter-icon-wrapper"><FilterIcon /></span>
                        </div>
                        <div className="search-chips">
                            {searchChips.map(chip => (
                                <button key={chip} className="chip">{chip}</button>
                            ))}
                        </div>
                    </section>

                    {/* Segmented Control */}
                    <section className="segmented-control">
                        <button 
                            className={`segment-button ${activeTab === 'alerts' ? 'active' : ''}`}
                            onClick={() => setActiveTab('alerts')}
                        >
                            Alerts <span className="segment-count">4</span>
                        </button>
                        <button 
                            className={`segment-button ${activeTab === 'resolved' ? 'active' : ''}`}
                            onClick={() => setActiveTab('resolved')}
                        >
                            Resolved <span className="segment-count">2</span>
                        </button>
                        <button 
                            className={`segment-button ${activeTab === 'news' ? 'active' : ''}`}
                            onClick={() => setActiveTab('news')}
                        >
                            News <span className="segment-count">3</span>
                        </button>
                    </section>

                    {/* Map Section */}
                    <section className="map-section">
                        <div className="map-header">
                            <h2 className="map-title">Live Map</h2>
                            <p className="map-subtitle">4 active alerts</p>
                        </div>
                        <div className="map-view">
                            <MockMap />
                        </div>
                    </section>
                </main>

                {/* Bottom Navigation */}
                <footer className="bottom-navigation">
                    <div className="nav-item-container">
                        <button className={`nav-item ${activeNav === 'home' ? 'active' : ''}`} onClick={() => setActiveNav('home')}>
                            <HomeIcon />
                        </button>
                        <button className={`nav-item ${activeNav === 'stats' ? 'active' : ''}`} onClick={() => setActiveNav('stats')}>
                            <StatsIcon />
                        </button>
                    </div>
                    <button className="fab">
                        <PlusIcon />
                    </button>
                    <div className="nav-item-container">
                        <button className={`nav-item ${activeNav === 'alerts' ? 'active' : ''}`} onClick={() => setActiveNav('alerts')}>
                            <AlertIcon />
                        </button>
                        <button className={`nav-item ${activeNav === 'menu' ? 'active' : ''}`} onClick={() => setActiveNav('menu')}>
                            <MenuIcon />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default BantaydalanScreen;
