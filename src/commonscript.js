/* file: tools/src/commonscript.js */

/**
 * Verticon Common Script
 * Handles global loading states and shared interactions.
 */

(function() {
    
    // 1. GLOBAL LOADER LOGIC [cite: 15, 18]
    // Waits for the entire window (including images/scripts) to load
    window.addEventListener('load', () => {
        const loader = document.getElementById('global-loader');
        
        if (loader) {
            // Add a small delay for smoothness
            setTimeout(() => {
                // Fade out
                loader.style.opacity = '0';
                
                // Remove from display flow after transition (0.5s matches CSS)
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 500);
            }, 300);
        }
    });

    // 2. FADE-IN ELEMENT HANDLING
    // Ensures elements with .fade-in class run their animation
    document.addEventListener('DOMContentLoaded', () => {
        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach((el, index) => {
            // Stagger animations slightly if there are multiple
            el.style.animationDelay = `${index * 0.1}s`;
            el.style.animationPlayState = 'running';
        });
    });

    // 3. UTILITY: PREVENT DRAG-DROP DEFAULTS
    // (Prevents browser from opening files dropped outside dropzones)
    window.addEventListener("dragover", function(e) {
        e = e || event;
        e.preventDefault();
    }, false);
    
    window.addEventListener("drop", function(e) {
        e = e || event;
        e.preventDefault();
    }, false);

    // 4. INDEXED DB MANAGER
    window.VerticonDB = {
        dbName: 'VerticonToolsDB',
        version: 2,
        db: null,

        async open() {
            if (this.db) return this.db;
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('files')) {
                        db.createObjectStore('files', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('settings')) {
                        db.createObjectStore('settings', { keyPath: 'key' });
                    }
                };
                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };
                request.onerror = (e) => reject(e.target.error);
            });
        },

        async saveFile(id, file) {
            await this.open();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('files', 'readwrite');
                const store = tx.objectStore('files');
                const request = store.put({ id, file, timestamp: Date.now() });
                request.onsuccess = () => resolve(id);
                request.onerror = () => reject(request.error);
            });
        },

        async getFile(id) {
            await this.open();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('files', 'readonly');
                const store = tx.objectStore('files');
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result ? request.result.file : null);
                request.onerror = () => reject(request.error);
            });
        },

        async deleteFile(id) {
            await this.open();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('files', 'readwrite');
                const store = tx.objectStore('files');
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },

        async clearStore() {
            await this.open();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('files', 'readwrite');
                const store = tx.objectStore('files');
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },

        async setSetting(key, value) {
            await this.open();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('settings', 'readwrite');
                const store = tx.objectStore('settings');
                const request = store.put({ key, value });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },

        async getSetting(key) {
            await this.open();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('settings', 'readonly');
                const store = tx.objectStore('settings');
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result ? request.result.value : null);
                request.onerror = () => reject(request.error);
            });
        }
    };

    // 5. UTILITIES: shared helpers for the app
    window.VerticonUtils = window.VerticonUtils || {};

    // Detect mobile devices (useful across tools to avoid auto-opening file pickers)
    window.VerticonUtils.isMobileDevice = function() {
        return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(
            navigator.userAgent || navigator.vendor || window.opera || ''
        );
    };

})();