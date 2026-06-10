/**
 * Mode Toggle System
 * Three modes: Default, Low Stim, Tin Foil Hat (Privacy)
 * Toggles stored in localStorage, reflected immediately in UI
 */

const MODES = {
  DEFAULT: 'default',
  LOW_STIM: 'low-stim',
  TIN_FOIL_HAT: 'tin-foil-hat'
};

class ModeManager {
  constructor() {
    this.currentMode = this.loadMode();
    this.init();
  }

  init() {
    this.createToggleBar();
    this.applyMode(this.currentMode);
    this.setupEventListeners();
  }

  /**
   * Create toggle bar at top of page
   * Three buttons: Default | Low Stim | Tin Foil Hat
   */
  createToggleBar() {
    const bar = document.createElement('div');
    bar.id = 'mode-toggle-bar';
    bar.className = 'mode-toggle-bar';
    bar.innerHTML = `
      <div class="mode-toggles">
        <button class="mode-btn" data-mode="default" title="Standard experience">
          <span>Default</span>
        </button>
        <button class="mode-btn" data-mode="low-stim" title="Reduced visual stimulation">
          <span>Low Stim</span>
        </button>
        <button class="mode-btn" data-mode="tin-foil-hat" title="Privacy mode: everything local, nothing stored">
          <span>Tin Foil Hat</span>
        </button>
      </div>
      <div class="mode-status">
        <small id="mode-status-text"></small>
      </div>
    `;
    document.body.insertBefore(bar, document.body.firstChild);
  }

  setupEventListeners() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.setMode(mode);
      });
    });
  }

  /**
   * Apply mode: update colors, animations, data handling
   */
  applyMode(mode) {
    // Remove all mode classes
    document.documentElement.classList.remove('mode-default', 'mode-low-stim', 'mode-tin-foil-hat');
    
    // Add current mode class
    document.documentElement.classList.add(`mode-${mode}`);

    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update status text
    const statusText = {
      default: 'Default mode',
      'low-stim': 'Low Stim mode: reduced animations, muted colors',
      'tin-foil-hat': 'Tin Foil Hat mode: privacy-first, everything local'
    };
    document.getElementById('mode-status-text').textContent = statusText[mode];

    // Apply CSS variables for color shifts
    this.updateColorScheme(mode);

    // Disable/enable analytics based on mode
    this.updatePrivacySettings(mode);
  }

  /**
   * Update color scheme based on mode
   * Default: full colors | Low Stim: muted | Tin Foil Hat: minimal
   */
  updateColorScheme(mode) {
    const root = document.documentElement;
    
    if (mode === 'low-stim') {
      // Muted colors: reduce contrast
      root.style.setProperty('--color-text', '#a8a8a8');
      root.style.setProperty('--color-text-muted', '#7a7a7a');
      root.style.setProperty('--color-link', '#9a8a6a');
      root.style.setProperty('--color-border', 'rgba(123, 140, 222, 0.05)');
      root.style.setProperty('--color-surface', 'rgba(123, 140, 222, 0.03)');
    } else if (mode === 'tin-foil-hat') {
      // Minimal: very muted, privacy-focused
      root.style.setProperty('--color-text', '#9a9a9a');
      root.style.setProperty('--color-text-muted', '#6a6a6a');
      root.style.setProperty('--color-link', '#7a7a5a');
      root.style.setProperty('--color-border', 'rgba(123, 140, 222, 0.02)');
      root.style.setProperty('--color-surface', 'rgba(123, 140, 222, 0.01)');
    } else {
      // Default: full brand colors
      root.style.setProperty('--color-text', '#e8e6e1');
      root.style.setProperty('--color-text-muted', '#9ca3af');
      root.style.setProperty('--color-link', '#d4a853');
      root.style.setProperty('--color-border', 'rgba(123, 140, 222, 0.10)');
      root.style.setProperty('--color-surface', 'rgba(123, 140, 222, 0.06)');
    }
  }

  /**
   * Privacy settings based on mode
   * Tin Foil Hat: no tracking, no external requests
   * Low Stim: minimal tracking
   * Default: standard
   */
  updatePrivacySettings(mode) {
    if (mode === 'tin-foil-hat') {
      // Disable all analytics, tracking, external requests
      window.disableAnalytics = true;
      window.disableTracking = true;
      console.log('🧢 Tin Foil Hat mode: All tracking disabled. Everything stays local.');
    } else if (mode === 'low-stim') {
      window.disableAnalytics = false;
      window.disableTracking = true;
      console.log('🧠 Low Stim mode: Minimal tracking, local-first experience.');
    } else {
      window.disableAnalytics = false;
      window.disableTracking = false;
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    this.saveMode(mode);
    this.applyMode(mode);
  }

  saveMode(mode) {
    localStorage.setItem('divergify-mode', mode);
  }

  loadMode() {
    return localStorage.getItem('divergify-mode') || MODES.DEFAULT;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new ModeManager();
});
