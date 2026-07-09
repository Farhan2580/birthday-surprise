// ==========================================================================
// CORE MOBILE-FIRST ENGINE (IPHONE & ADAPTIVE MOOD STATES HANDLERS)
// Fixed for smoothness: single persistent animation loops (no duplicate
// rAF/interval/listener stacking on resize), touch-aware dodge buttons,
// non-blocking toast instead of alert(), capped confetti interval.
// ==========================================================================

// Real dates — Nadia's birthday (July 10, 2001) and the day you two first met.
const NADIA_BIRTH_YEAR = 2001;
const NADIA_BIRTHDAY_MONTH = 7; // July
const NADIA_BIRTHDAY_DAY = 10;

// Always returns the NEXT time July 10 occurs from "fromDate" — this year
// if it hasn't happened yet, otherwise next year. This is what makes the
// birthday countdown recurring/lifetime instead of a one-time hardcoded date.
function getNextBirthdayDate(fromDate) {
    const now = fromDate || new Date();
    const year = now.getFullYear();
    let candidate = new Date(year, NADIA_BIRTHDAY_MONTH - 1, NADIA_BIRTHDAY_DAY, 0, 0, 0);
    if (candidate <= now) {
        candidate = new Date(year + 1, NADIA_BIRTHDAY_MONTH - 1, NADIA_BIRTHDAY_DAY, 0, 0, 0);
    }
    return candidate;
}

function ordinalSuffix(n) {
    const v = n % 100;
    if (v >= 11 && v <= 13) return `${n}th`;
    switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
    }
}

const appState = {
    mood: 'pink',
    secretClicks: 0,
    gameScore: 0,
    gameUnlocked: false,
    togetherDate: new Date('2021-08-01T00:00:00'),
    galleryItems: [
    {
        url: "image/1.jpg",
        caption: "Our Beautiful Memory ❤️"
    },
    {
        url: "image/2.jpg",
        caption: "My Princess 👑"
    },
    {
        url: "image/3.jpg",
        caption: "Forever Together 💕"
    },
    {
        url: "image/4.jpg",
        caption: "Best Moment 🌸"
    },
    {
        url: "image/5.jpg",
        caption: "My Everything 🥰"
    },
    {
        url: "image/6.jpg",
        caption: "Happy Birthday My Love 🎂"
    }
]
};

// Internal engine handles kept outside the functions so re-inits (resize,
// orientation change) never spawn a second copy of the same loop/listener.
const engineState = {
    glitterCanvas: null,
    glitterCtx: null,
    glitterParticles: [],
    glitterStarted: false,

    heartsCanvas: null,
    heartsCtx: null,
    heartsPoints: [],
    heartsStarted: false
};

document.addEventListener('DOMContentLoaded', () => {
    initCanvases();
    initTimers();
    buildGalleryDOM();
    initScratchCard();
    initDodgeTouchSupport();
    initLifetimeCountdown();
    buildMemoryGame();

    // Only resizes the canvas surfaces — does NOT restart the draw loops
    // or re-attach listeners, which is what used to cause things to get
    // janky the longer the page stayed open on iPhone.
    window.addEventListener('resize', initCanvases);
    window.addEventListener('orientationchange', () => setTimeout(initCanvases, 200));
});

// Structural Multi-Mood Core Router
function changeMood(selectedMood) {
    document.body.className = ''; // Wipe past traces
    document.body.classList.add(`mood-${selectedMood}`);
    appState.mood = selectedMood;
    // No need to rebuild the canvases/engines — they read appState.mood
    // live on every frame, so the palette updates instantly on its own.
}

function navigateTo(flowId) {
    document.querySelectorAll('.flow-section').forEach(section => {
        section.classList.remove('active');
    });
    const activeRoute = document.getElementById(flowId);
    if (activeRoute) {
        activeRoute.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (flowId === 'flow-gallery') {
        setTimeout(initSwiperModule, 150);
    }
}

function toggleMusic() {
    const musicTrack = document.getElementById('bgMusic');
    const musicBtn = document.getElementById('musicBtn');
    if (musicTrack.paused) {
        musicTrack.play().catch(e => console.log("Audio pipeline muted"));
        musicBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        musicTrack.pause();
        musicBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function verifyPassword() {
    const inputPass = document.getElementById('secretPass').value.trim().toLowerCase();
    const feedbackText = document.getElementById('passwordFeedback');

    if (inputPass === '1 august' || inputPass === 'love') {
        feedbackText.style.color = '#34c759';
        feedbackText.innerText = "Access Granted! Unlocking... 🥰";
        setTimeout(() => {
            navigateTo('flow-wish');
            triggerConfettiExplosion();
        }, 600);
    } else {
        feedbackText.style.color = '#ff3b30';
        feedbackText.innerText = "Incorrect key! Try again, my princess. 🥹";
    }
}

function initTimers() {
    setInterval(() => {
        const now = new Date();

        let diffMs = now - appState.togetherDate;
        let totalSecs = Math.floor(diffMs / 1000);
        let totalMins = Math.floor(totalSecs / 60);
        let totalHours = Math.floor(totalMins / 60);
        let totalDays = Math.floor(totalHours / 24);

        let years = Math.floor(totalDays / 365);
        let remDays = totalDays % 365;
        let months = Math.floor(remDays / 30);
        let days = remDays % 30;

        document.getElementById('count-years').innerText = years;
        document.getElementById('count-months').innerText = months;
        document.getElementById('count-days').innerText = days;

        let bdayDiffMs = getNextBirthdayDate(now) - now;
        if (bdayDiffMs < 0) return;

        let cdDays = Math.floor(bdayDiffMs / (1000 * 60 * 60 * 24));
        let cdHours = Math.floor((bdayDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let cdMins = Math.floor((bdayDiffMs % (1000 * 60 * 60)) / (1000 * 60));

        document.getElementById('cd-days').innerText = cdDays;
        document.getElementById('cd-hours').innerText = cdHours;
        document.getElementById('cd-mins').innerText = cdMins;
    }, 1000);
}

function blowCandle() {
    const flameNode = document.getElementById('candleFlame');
    if (flameNode) {
        flameNode.style.display = 'none';
        triggerConfettiExplosion();
        // Swapped the blocking alert() for a non-blocking toast — alert()
        // freezes Safari's render thread on iPhone and looks very dated.
        showToast("Make a wish! Your candle has been blown out. 🎂✨");
    }
}

// Adaptive Mobile Dodge Configuration Mechanics
function dodgeButtonAction() {
    const btn = document.getElementById('dodgeBtn');
    const container = btn.parentElement;

    const maxX = container.clientWidth - btn.clientWidth;
    const maxY = container.clientHeight - btn.clientHeight;

    const randomX = Math.abs(Math.floor(Math.random() * maxX - 10));
    const randomY = Math.abs(Math.floor(Math.random() * maxY - 10));

    btn.style.left = `${randomX}px`;
    btn.style.top = `${randomY}px`;
    btn.style.transform = 'none';
}

// iPhone has no hover, so the "dodge on hover" trick never fired on touch.
// This wires the same dodge behavior to a tap, so the catch game actually
// works on a phone instead of being caught on the very first tap.
function initDodgeTouchSupport() {
    const dodgeBtn = document.getElementById('dodgeBtn');
    if (dodgeBtn) {
        dodgeBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            dodgeButtonAction();
        }, { passive: false });
    }
}

function catchTheDodgeHeart() {
    const resp = document.getElementById('dodgeResponse');
    resp.classList.remove('hidden');
    resp.innerText = "Wow, your fingers are so fast! You caught my heart! 💖";
    triggerConfettiExplosion();
}

function triggerLoveRepeater() {
    const countVal = Math.min(parseInt(document.getElementById('loveCountInput').value) || 10, 500);
    const outputBox = document.getElementById('loveRepeaterOutput');
    outputBox.classList.remove('hidden');

    let generatedStr = "";
    for (let i = 1; i <= countVal; i++) {
        generatedStr += `${i}. I Love You Princess... ❤️<br>`;
    }
    outputBox.innerHTML = generatedStr;
}

function processHeartGameCatch(event) {
    const targetHeart = document.getElementById('gameTargetHeart');
    const scoreValSpan = document.getElementById('gameScoreVal');
    const feedbackNode = document.getElementById('gameFeedbackText');
    const badgeNode = document.getElementById('lockedMemoryState');

    appState.gameScore++;
    scoreValSpan.innerText = appState.gameScore;

    const arena = document.getElementById('gameArena');
    const maxX = arena.clientWidth - targetHeart.clientWidth;
    const maxY = arena.clientHeight - targetHeart.clientHeight;
    targetHeart.style.left = `${Math.abs(Math.floor(Math.random() * maxX))}px`;
    targetHeart.style.top = `${Math.abs(Math.floor(Math.random() * maxY))}px`;

    if (appState.gameScore >= 5 && !appState.gameUnlocked) {
        appState.gameUnlocked = true;
        badgeNode.className = "lock-indicator-badge unlocked";
        badgeNode.innerHTML = '<i class="fas fa-lock-open"></i> Unlocked';
        feedbackNode.innerText = "Amazing! You have successfully unlocked the secret validation layer.";
        triggerConfettiExplosion();
    }
}

function triggerOpenWhen(mode) {
    const outputBox = document.getElementById('openWhenOutput');
    outputBox.classList.remove('hidden');

    const messages = {
        sad: "Close your eyes and remember my voice. I am right here holding your hand. Eat a sweet piece of chocolate, it helps! 🍫",
        miss: "I am missing you even more! Look at our gallery, pick a favorite picture, and send it to me right now. 🥹",
        angry: "Take a deep breath. I apologize for whatever made you upset. You look incredibly cute even when you're angry. ❤️",
        lonely: "You are never alone. My thoughts and heart are completely with you every minute of the day. 🕊️",
        bday: "Today is your day! Be happy, eat a big slice of cake, and know you mean the absolute world to me. 🎂",
        sleep: "Sleep well, dream of us, and rest comfortably. Tomorrow will be a bright, beautiful day. Goodnight! 🌙"
    };
    outputBox.innerText = messages[mode] || "";
}

let currentRotation = 0;

const wheelPrizes = [
    "Hug 🤗",
    "Kiss 💋",
    "Movie 🎬",
    "Ice Cream 🍦",
    "Gift 🎁",
    "Drive 🚗",
    "Cuddles ❤️",
    "Date 🌹"
];

function spinLoveWheel() {

    const wheel = document.getElementById("loveWheelNode");
    const result = document.getElementById("wheelResultText");

    const total = wheelPrizes.length;
    const segment = 360 / total;

    const winner = Math.floor(Math.random() * total);

    // Pointer is at top (270° in CSS wheel)
    const targetAngle = 360 - (winner * segment + segment / 2);

    const spins = 5 + Math.floor(Math.random() * 3);

    currentRotation += spins * 360 + targetAngle;

    wheel.style.transition =
        "transform 5s cubic-bezier(.17,.67,.15,1)";

    wheel.style.transform =
        `rotate(${currentRotation}deg)`;

    result.innerHTML = "Spinning... ❤️";

    setTimeout(() => {

        result.innerHTML =
            `🎉 Result: <b>${wheelPrizes[winner]}</b>`;

        triggerConfettiExplosion();

    }, 5000);

}


function runLoveMeter() {
    const fillBar = document.getElementById('meterProgressFill');
    const statusText = document.getElementById('meterStatusOutput');

    fillBar.style.width = '100%';
    statusText.innerText = "Calculating Infinite Quantums...";

    setTimeout(() => {
        statusText.innerText = "Love Capacity: INFINITE % ❤️♾️";
        document.getElementById('infinityLoveOverlay').classList.remove('hidden');
    }, 1500);
}

function generateFuturePrediction() {
    const outputBox = document.getElementById('predictionOutputBox');
    outputBox.classList.remove('hidden');
    const variants = [
        "A beautiful trip to a cozy hill station together very soon! 🏔️",
        "A peaceful evening walk holding hands under a perfect twilight sky. 🌆",
        "An unexpected sweet gift arriving at your doorstep real soon! 🎁",
        "Success in your upcoming milestones with flying colors! 🎓"
    ];
    outputBox.innerText = variants[Math.floor(Math.random() * variants.length)];
}

function crackFortuneCookie() {
    const out = document.getElementById('fortuneCookieOutputText');
    out.classList.remove('hidden');
    const lines = [
        "Your smile is the literal secret source of my daily happiness. 😊",
        "A beautiful chapter of life is currently waiting to unfold for you.",
        "Patience yields the sweetest paths. You are doing fantastic! ✨"
    ];
    out.innerText = lines[Math.floor(Math.random() * lines.length)];
}

function triggerRandomCompliment() {
    const out = document.getElementById('complimentMachineOutput');
    out.classList.remove('hidden');
    const comps = [
        "Your heart is just as incredibly beautiful as your smile. 💖",
        "You possess this rare ability to make everyone around you genuinely happy.",
        "You have the most supportive and wonderful personality in the entire universe. 🌟"
    ];
    out.innerText = comps[Math.floor(Math.random() * comps.length)];
}

function detectMood(mood) {
    const out = document.getElementById('moodResponseText');
    out.classList.remove('hidden');
    const res = {
        happy: "Yay! Seeing you happy completely makes my day perfect. Keep smiling! 😁",
        sad: "Don't be sad. Let me know what happened or just take a nice little rest. I love you. 🥺",
        miss: "I am counting the moments until we talk again. Sending you virtual hugs right now! 🥹",
        angry: "Uh oh, let me hear what went wrong. Don't stress your beautiful mind. 🍫"
    };
    out.innerText = res[mood] || "";
}

function triggerVirtualHug() {
    document.getElementById('comfortFeedbackText').innerText = "Sending the warmest, coziest virtual hug ever... 🤗❤️ Keep holding it!";
}

function triggerVirtualKiss(e) {
    document.getElementById('comfortFeedbackText').innerText = "Virtual kiss dispatched! 💋 Landed perfectly on your cheek.";
    triggerConfettiExplosion();
}

function processLoveBankWithdrawal() {
    const amt = document.getElementById('loveBankWithdrawAmount').value || 10;
    const dock = document.getElementById('loveBankReceiptDock');
    dock.classList.remove('hidden');
    dock.innerHTML = `
        <strong>--- LOVE TRANSACTION RECEIPT ---</strong><br>
        Status: Dispatched Successfully ✅<br>
        Amount: ${amt} Units of Love<br>
        Remaining Balance: <strong>∞ (Infinite Reserve)</strong><br>
        Message: Sent with total care from Farhan!
    `;
    triggerConfettiExplosion();
}

function initScratchCard() {
    const canvas = document.getElementById('scratchCanvasSurface');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#555';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, Arial';
    ctx.fillText('Scratch Here with Finger', 50, 65);

    let isDrawing = false;
    let revealed = false;

    function scratch(e) {
        if (!isDrawing || revealed) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();

        checkScratchProgress();
    }

    // Once enough of the surface is cleared, fade the rest away automatically
    // so people don't have to painstakingly scratch every last pixel.
    function checkScratchProgress() {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let clearedSamples = 0;
        let totalSamples = 0;
        for (let i = 3; i < data.length; i += 4 * 15) {
            totalSamples++;
            if (data[i] === 0) clearedSamples++;
        }
        if (totalSamples > 0 && clearedSamples / totalSamples > 0.5) {
            revealed = true;
            canvas.style.transition = 'opacity 0.5s ease';
            canvas.style.opacity = '0';
            canvas.style.pointerEvents = 'none';
        }
    }

    canvas.addEventListener('mousedown', () => isDrawing = true);
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mousemove', scratch);

    canvas.addEventListener('touchstart', () => isDrawing = true);
    canvas.addEventListener('touchend', () => isDrawing = false);
    canvas.addEventListener('touchmove', scratch, { passive: false });
}

function buildGalleryDOM() {
    const wrapper = document.getElementById('dynamic-gallery-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = "";
    appState.galleryItems.forEach((item, index) => {
        wrapper.innerHTML += `
<div class="swiper-slide">

    <div class="memory-card"
         onclick="openLightbox('${item.url}','${item.caption}')">

        <img src="${item.url}" alt="Memory ${index+1}">

        <div class="memory-caption">
            ${item.caption}
        </div>

    </div>

</div>
`;
    });
}

function initSwiperModule() {

    if (window.memorySwiperInstance) {
        window.memorySwiperInstance.destroy(true, true);
    }

    window.memorySwiperInstance = new Swiper(".memory-swiper", {

        loop: true,
        centeredSlides: true,
        slidesPerView: 1.2,
        spaceBetween: 20,
        speed: 900,
        grabCursor: true,

        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },

        effect: "coverflow",

        coverflowEffect: {
            rotate: 0,
            stretch: 0,
            depth: 150,
            modifier: 1,
            scale: 0.9,
            slideShadows: false,
        },

        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },

        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        }

    });

}

function openLightbox(url, caption) {
    const box = document.getElementById('galleryLightbox');
    document.getElementById('lightboxImg').src = url;
    document.getElementById('lightboxCaption').innerText = caption;
    box.classList.add('active');
}

function closeLightbox() {
    document.getElementById('galleryLightbox').classList.remove('active');
}

function processFinalPromiseYes() {
    const out = document.getElementById('promiseFinalOutput');
    out.classList.remove('hidden');
    out.innerHTML = "<strong>YES! ❤️ You made me the happiest person ever! I promise to hold your hand through thick and thin forever.</strong>";
    triggerConfettiExplosion();

    // Capped instead of an endless setInterval — a few celebratory bursts
    // feel just as special without leaving a background timer running
    // forever if she stays on this screen or the app tab stays open.
    let bursts = 0;
    const maxBursts = 5;
    const burstTimer = setInterval(() => {
        triggerConfettiExplosion();
        bursts++;
        if (bursts >= maxBursts) clearInterval(burstTimer);
    }, 2000);
}

function dodgePromiseNoButton() {
    const btn = document.getElementById('promiseNoBtn');
    const container = btn.parentElement;

    const maxX = container.clientWidth - btn.clientWidth;
    const maxY = container.clientHeight - btn.clientHeight;

    const randomX = Math.abs(Math.floor(Math.random() * maxX - 5));
    const randomY = Math.abs(Math.floor(Math.random() * maxY - 5));

    btn.style.left = `${randomX}px`;
    btn.style.top = `${randomY}px`;
    btn.style.transform = 'none';
}

// ==========================================================================
// LIFETIME BIRTHDAY COUNTDOWN — recomputes the target itself every tick,
// so the instant one birthday passes it silently starts counting toward
// the next one. There's no end date to run out of.
// ==========================================================================
function initLifetimeCountdown() {
    function tick() {
        const now = new Date();
        const target = getNextBirthdayDate(now);
        let diffMs = Math.max(0, target - now);

        const totalSecs = Math.floor(diffMs / 1000);
        const SEC_YEAR = 365.25 * 24 * 3600;
        const SEC_MONTH = 30 * 24 * 3600;
        const SEC_WEEK = 7 * 24 * 3600;
        const SEC_DAY = 24 * 3600;

        let remaining = totalSecs;
        const years = Math.floor(remaining / SEC_YEAR); remaining -= years * SEC_YEAR;
        const months = Math.floor(remaining / SEC_MONTH); remaining -= months * SEC_MONTH;
        const weeks = Math.floor(remaining / SEC_WEEK); remaining -= weeks * SEC_WEEK;
        const days = Math.floor(remaining / SEC_DAY); remaining -= days * SEC_DAY;
        const hours = Math.floor(remaining / 3600); remaining -= hours * 3600;
        const mins = Math.floor(remaining / 60); remaining -= mins * 60;
        const secs = Math.floor(remaining);

        setLifetimeUnit('life-years', years);
        setLifetimeUnit('life-months', months);
        setLifetimeUnit('life-weeks', weeks);
        setLifetimeUnit('life-days', days);
        setLifetimeUnit('life-hours', hours);
        setLifetimeUnit('life-mins', mins);
        setLifetimeUnit('life-secs', secs);

        const label = document.getElementById('lifetimeCountdownLabel');
        if (label) {
            const turningAge = target.getFullYear() - NADIA_BIRTH_YEAR;
            label.innerText = `Counting down to Nadia's ${ordinalSuffix(turningAge)} birthday 🎂`;
        }
    }

    tick();
    setInterval(tick, 1000);
}

function setLifetimeUnit(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

// ==========================================================================
// MATCH OUR HEARTS — a small flip-card memory game to replace the timeline
// ==========================================================================
const memoryEmojis = ['❤️', '🌸', '🎂', '💍', '🥰', '🎁'];
let memoryState = { first: null, second: null, lock: false, moves: 0, matched: 0 };

function buildMemoryGame() {
    const grid = document.getElementById('memoryGameGrid');
    if (!grid) return;

    const cards = [...memoryEmojis, ...memoryEmojis].sort(() => Math.random() - 0.5);
    memoryState = { first: null, second: null, lock: false, moves: 0, matched: 0 };

    setLifetimeUnit('memoryMoves', 0);
    setLifetimeUnit('memoryMatched', 0);
    const winText = document.getElementById('memoryWinText');
    if (winText) winText.classList.add('hidden');

    grid.innerHTML = '';
    cards.forEach((emoji) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'memory-card';
        card.dataset.emoji = emoji;
        card.innerHTML = `
            <span class="memory-card-inner">
                <span class="memory-card-face memory-card-front">❓</span>
                <span class="memory-card-face memory-card-back">${emoji}</span>
            </span>
        `;
        card.addEventListener('click', () => flipMemoryCard(card));
        grid.appendChild(card);
    });
}

function flipMemoryCard(card) {
    if (memoryState.lock) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

    card.classList.add('flipped');

    if (!memoryState.first) {
        memoryState.first = card;
        return;
    }

    memoryState.second = card;
    memoryState.lock = true;
    memoryState.moves++;
    setLifetimeUnit('memoryMoves', memoryState.moves);

    const isMatch = memoryState.first.dataset.emoji === memoryState.second.dataset.emoji;

    setTimeout(() => {
        if (isMatch) {
            memoryState.first.classList.add('matched');
            memoryState.second.classList.add('matched');
            memoryState.matched++;
            setLifetimeUnit('memoryMatched', memoryState.matched);

            if (memoryState.matched === memoryEmojis.length) {
                const winText = document.getElementById('memoryWinText');
                if (winText) {
                    winText.classList.remove('hidden');
                    winText.innerText = `You matched everything in ${memoryState.moves} moves! You're amazing, Nadia! 🎉`;
                }
                triggerConfettiExplosion();
            }
        } else {
            memoryState.first.classList.remove('flipped');
            memoryState.second.classList.remove('flipped');
        }
        memoryState.first = null;
        memoryState.second = null;
        memoryState.lock = false;
    }, 700);
}

function restartMemoryGame() {
    buildMemoryGame();
}

function hitSecret() {
    appState.secretClicks++;
    document.getElementById('secretClickCount').innerText = appState.secretClicks;
    if (appState.secretClicks >= 10) {
        navigateTo('flow-secret');
        triggerConfettiExplosion();
    }
}

// ==========================================================================
// CANVAS ENGINES — sized on init/resize, but the draw loops and input
// listeners are started exactly once and simply read the live canvas
// size + appState.mood every frame. This is the core smoothness fix:
// the old version restarted an rAF loop and added a brand-new touchmove
// listener on every resize/orientation change, so the longer the page
// stayed open the more loops were running at once.
// ==========================================================================

function initCanvases() {
    const gc = document.getElementById('glitterCanvas');
    const cc = document.getElementById('cursorHeartsCanvas');
    if (!gc || !cc) return;

    gc.width = window.innerWidth; gc.height = window.innerHeight;
    cc.width = window.innerWidth; cc.height = window.innerHeight;

    if (!engineState.glitterStarted) {
        engineState.glitterCanvas = gc;
        engineState.glitterCtx = gc.getContext('2d');
        seedGlitterParticles(gc);
        engineState.glitterStarted = true;
        requestAnimationFrame(glitterFrame);
    }

    if (!engineState.heartsStarted) {
        engineState.heartsCanvas = cc;
        engineState.heartsCtx = cc.getContext('2d');
        attachCursorHeartsInput();
        engineState.heartsStarted = true;
        requestAnimationFrame(heartsFrame);
    }
}

function seedGlitterParticles(canvas) {
    engineState.glitterParticles = [];
    for (let i = 0; i < 20; i++) {
        engineState.glitterParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 1,
            d: Math.random() * 10
        });
    }
}

function glitterFrame() {
    const canvas = engineState.glitterCanvas;
    const ctx = engineState.glitterCtx;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = appState.mood === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 82, 123, 0.25)';
    ctx.beginPath();
    engineState.glitterParticles.forEach(p => {
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
    });
    ctx.fill();

    engineState.glitterParticles.forEach(p => {
        p.y += Math.cos(p.d) + 0.4;
        p.x += Math.sin(p.d) * 0.4;
        if (p.y > canvas.height) {
            p.y = -10; p.x = Math.random() * canvas.width;
        }
    });

    requestAnimationFrame(glitterFrame);
}

function attachCursorHeartsInput() {
    const inputEvent = 'ontouchstart' in window ? 'touchmove' : 'mousemove';
    window.addEventListener(inputEvent, (e) => {
        if (Math.random() > 0.85) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            engineState.heartsPoints.push({ x: clientX, y: clientY, alpha: 1, size: Math.random() * 8 + 8 });
        }
    }, { passive: true });
}

function heartsFrame() {
    const canvas = engineState.heartsCanvas;
    const ctx = engineState.heartsCtx;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    engineState.heartsPoints.forEach((p, idx) => {
        p.y -= 0.8; p.alpha -= 0.025;
        if (p.alpha <= 0) engineState.heartsPoints.splice(idx, 1);

        ctx.fillStyle = appState.mood === 'dark' ? `rgba(255, 117, 151, ${p.alpha})` : `rgba(255, 82, 123, ${p.alpha})`;
        ctx.font = `${p.size}px Arial`;
        ctx.fillText('❤️', p.x, p.y);
    });

    requestAnimationFrame(heartsFrame);
}

function triggerConfettiExplosion() {
    if (typeof confetti !== 'undefined') {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.75 } });
    }
}

// ==========================================================================
// LIGHTWEIGHT TOAST — replaces the old blocking alert() so nothing freezes
// the page while a message is shown. Self-contained, no CSS file needed.
// ==========================================================================
function showToast(message) {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: calc(88px + env(safe-area-inset-bottom));
            transform: translateX(-50%) translateY(16px);
            background: rgba(20, 16, 18, 0.92);
            color: #fff;
            padding: 12px 20px;
            border-radius: 16px;
            font-size: 0.92rem;
            font-weight: 600;
            z-index: 200;
            opacity: 0;
            max-width: 84vw;
            text-align: center;
            -webkit-backdrop-filter: blur(12px);
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 26px rgba(0,0,0,0.3);
            transition: opacity 0.35s ease, transform 0.35s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(toast._hideTimeout);
    toast._hideTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(16px)';
    }, 2600);
}

// ==========================================================================
// VOICE MESSAGE CONTROLLER
// ==========================================================================
function toggleVoiceMessage() {
    const audio = document.getElementById('loveAudio');
    const btn = document.getElementById('voiceBtn');

    if (!audio || !btn) return;

    if (audio.paused) {
        audio.play();
        btn.innerHTML = 'Pause Message ⏸️';
        btn.style.background = '#ff758f';
    } else {
        audio.pause();
        btn.innerHTML = 'Play Voice Message 🎵';
        btn.style.background = '';
    }

    audio.onended = function () {
        btn.innerHTML = 'Play Voice Message 🎵';
        btn.style.background = '';
    };
}

/* ==========================================
   MEMORY GALLERY
========================================== */
const galleryImages = [
    {
        img: "images/photo1.jpg",
        caption: "The day I met my princess ❤️"
    },
    {
        img: "images/photo2.jpg",
        caption: "Our sweetest memory 🥹"
    },
    {
        img: "images/photo3.jpg",
        caption: "Forever together 💖"
    },
    {
        img: "images/photo4.jpg",
        caption: "My favourite smile 😊"
    },
    {
        img: "images/photo5.jpg",
        caption: "You are my happiness 🌸"
    }
];

const wrapper = document.getElementById("dynamic-gallery-wrapper");

galleryImages.forEach(item => {
    wrapper.innerHTML += `
        <div class="swiper-slide">
            <div class="memory-card">
                <img src="${item.img}" alt="">
                <p>${item.caption}</p>
            </div>
        </div>
    `;
});

new Swiper(".memory-swiper", {
    loop: true,
    centeredSlides: true,
    slidesPerView: 1,
    spaceBetween: 20,

    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },

    navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
    },
});