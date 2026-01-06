// ===== DOM Elements =====
const landingPage = document.getElementById('landing-page');
const dashboardPage = document.getElementById('dashboard-page');
const playerModal = document.getElementById('player-modal');
const videoGrid = document.getElementById('video-grid');
const iframePlayer = document.getElementById('iframe-player');
const videoPlayer = document.getElementById('video-player');
const playerTitle = document.getElementById('player-title');
const playerDescription = document.getElementById('player-description');
const playerDuration = document.getElementById('player-duration');
const playerYear = document.getElementById('player-year');
const loadingSpinner = document.getElementById('loading-spinner');
const enterDashboardBtn = document.getElementById('enter-dashboard');
const closePlayerBtn = document.getElementById('close-player');
const searchInput = document.getElementById('search-input');
const modeEmbedBtn = document.getElementById('mode-embed');
const modeStreamBtn = document.getElementById('mode-stream');

// ===== State =====
let videos = {};
let currentVideoId = null;
let currentMode = 'embed'; // 'embed' or 'stream'

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    fetchVideos();
    setupEventListeners();
});

// ===== Fetch Videos from API =====
async function fetchVideos() {
    try {
        const response = await fetch('/api/videos');
        videos = await response.json();
        renderVideoGrid(Object.values(videos));
    } catch (error) {
        console.error('Error fetching videos:', error);
        showError('Failed to load videos');
    }
}

// ===== Render Video Grid =====
function renderVideoGrid(videoList) {
    videoGrid.innerHTML = videoList.map((video, index) => `
        <div class="video-card" data-id="${video.id}" style="animation-delay: ${index * 0.1}s">
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x225/1a1a25/8b5cf6?text=Video'">
                <div class="play-overlay">
                    <div class="play-button">
                        <svg viewBox="0 0 24 24">
                            <polygon points="5,3 19,12 5,21" />
                        </svg>
                    </div>
                </div>
                <div class="video-duration">${video.duration || 'HD'}</div>
            </div>
            <div class="video-details">
                <h3 class="video-title">${video.title}</h3>
                <p class="video-description">${video.description}</p>
                <div class="video-meta">
                    <span class="meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12,6 12,12 16,14"/>
                        </svg>
                        ${video.duration || 'HD'}
                    </span>
                    <span class="meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        ${video.year || '2024'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => {
            const videoId = card.dataset.id;
            openPlayer(videoId);
        });
    });
}

// ===== Setup Event Listeners =====
function setupEventListeners() {
    // Enter dashboard
    enterDashboardBtn.addEventListener('click', () => {
        transitionToPage(dashboardPage);
    });

    // Close player
    closePlayerBtn.addEventListener('click', closePlayer);
    playerModal.querySelector('.player-backdrop').addEventListener('click', closePlayer);

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && playerModal.classList.contains('active')) {
            closePlayer();
        }
    });

    // Search
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = Object.values(videos).filter(video => 
            video.title.toLowerCase().includes(query) ||
            video.description.toLowerCase().includes(query)
        );
        renderVideoGrid(filtered);
    }, 300));

    // Logo click
    document.querySelectorAll('.logo').forEach(logo => {
        logo.addEventListener('click', () => {
            if (dashboardPage.classList.contains('active')) {
                transitionToPage(landingPage);
            }
        });
    });

    // Mode toggle buttons
    modeEmbedBtn.addEventListener('click', () => {
        if (currentMode !== 'embed') {
            currentMode = 'embed';
            updateModeButtons();
            if (currentVideoId) {
                loadVideo(currentVideoId);
            }
        }
    });

    modeStreamBtn.addEventListener('click', () => {
        if (currentMode !== 'stream') {
            currentMode = 'stream';
            updateModeButtons();
            if (currentVideoId) {
                loadVideo(currentVideoId);
            }
        }
    });

    // Iframe load event
    iframePlayer.addEventListener('load', () => {
        if (currentMode === 'embed' && iframePlayer.src) {
            loadingSpinner.classList.add('hidden');
        }
    });

    // Video player events
    videoPlayer.addEventListener('loadstart', () => {
        if (currentMode === 'stream') {
            loadingSpinner.classList.remove('hidden');
            updateLoadingMessage('Connecting to stream...');
        }
    });

    videoPlayer.addEventListener('loadedmetadata', () => {
        updateLoadingMessage('Buffering...');
    });

    videoPlayer.addEventListener('canplay', () => {
        loadingSpinner.classList.add('hidden');
    });

    videoPlayer.addEventListener('waiting', () => {
        if (currentMode === 'stream') {
            loadingSpinner.classList.remove('hidden');
            updateLoadingMessage('Buffering...');
        }
    });

    videoPlayer.addEventListener('playing', () => {
        loadingSpinner.classList.add('hidden');
    });

    videoPlayer.addEventListener('error', (e) => {
        console.error('Video error:', e);
        showPlayerError();
    });

    // Category cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            addRipple(card);
        });
    });
}

// ===== Update Mode Buttons =====
function updateModeButtons() {
    modeEmbedBtn.classList.toggle('active', currentMode === 'embed');
    modeStreamBtn.classList.toggle('active', currentMode === 'stream');
}

// ===== Update Loading Message =====
function updateLoadingMessage(message) {
    const msgEl = loadingSpinner.querySelector('span');
    if (msgEl) {
        msgEl.textContent = message;
    }
}

// ===== Show Player Error =====
function showPlayerError() {
    loadingSpinner.innerHTML = `
        <div class="error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>Error loading video</span>
            <p style="font-size: 0.8rem; color: #71717a;">Try switching to Embed mode</p>
            <button onclick="retryVideo()" class="retry-btn">Retry</button>
        </div>
    `;
    loadingSpinner.classList.remove('hidden');
}

// ===== Page Transition =====
function transitionToPage(targetPage) {
    const currentPage = document.querySelector('.page.active');
    
    currentPage.classList.add('fade-out');
    
    setTimeout(() => {
        currentPage.classList.remove('active', 'fade-out');
        targetPage.classList.add('active');
    }, 300);
}

// ===== Open Video Player =====
function openPlayer(videoId) {
    const video = videos[videoId];
    if (!video) return;

    currentVideoId = videoId;
    
    // Update player info
    playerTitle.textContent = video.title;
    playerDescription.textContent = video.description;
    playerDuration.textContent = video.duration || '00:00';
    playerYear.textContent = video.year || '2024';
    
    // Show modal
    playerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Load video
    loadVideo(videoId);
}

// ===== Load Video =====
function loadVideo(videoId) {
    // Reset spinner
    loadingSpinner.innerHTML = `
        <div class="spinner"></div>
        <span>Loading stream...</span>
    `;
    loadingSpinner.classList.remove('hidden');
    
    if (currentMode === 'embed') {
        // Use iframe embed - this loads the luluvid.com player directly
        videoPlayer.classList.add('hidden');
        videoPlayer.pause();
        videoPlayer.src = '';
        
        iframePlayer.classList.remove('hidden');
        // Use our embed endpoint which serves the iframe
        iframePlayer.src = `/embed/${videoId}`;
    } else {
        // Use direct stream - proxied through our server
        iframePlayer.classList.add('hidden');
        iframePlayer.src = '';
        
        videoPlayer.classList.remove('hidden');
        videoPlayer.src = `/stream?id=${videoId}&t=${Date.now()}`;
        videoPlayer.load();
        
        setTimeout(() => {
            videoPlayer.play().catch((err) => {
                console.log('Autoplay blocked:', err.message);
                loadingSpinner.classList.add('hidden');
            });
        }, 500);
    }
}

// ===== Retry Video =====
window.retryVideo = function() {
    if (currentVideoId) {
        loadVideo(currentVideoId);
    }
};

// ===== Close Video Player =====
function closePlayer() {
    videoPlayer.pause();
    videoPlayer.src = '';
    iframePlayer.src = '';
    
    playerModal.classList.remove('active');
    document.body.style.overflow = '';
    currentVideoId = null;
}

// ===== Add Ripple Effect =====
function addRipple(element) {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// ===== Utility: Debounce =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== Show Error Toast =====
function showError(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: #dc2626;
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 9999;
        animation: slideUp 0.3s ease;
        font-family: 'Inter', sans-serif;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Add CSS Animations =====
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        from { transform: scale(0); opacity: 1; }
        to { transform: scale(2); opacity: 0; }
    }
    @keyframes slideUp {
        from { transform: translate(-50%, 20px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes fadeOut {
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===== Intersection Observer for Scroll Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

setTimeout(() => {
    document.querySelectorAll('.video-card, .category-card').forEach(el => {
        observer.observe(el);
    });
}, 100);