/* Haven design: everything you see. This file (and style.css next to it) can be edited
 * on Home Assistant at /config/www/haven/design/ and the TV picks the change up by itself.
 *
 * Rules for this file:
 *  - Plain ES5 (the TV runs an old Chromium): no arrow functions, let/const, classes, `?.`.
 *  - Use window.Haven for anything TV-specific (launching apps, storage, Home Assistant).
 *  - Call Haven.ready() once the screen is drawn, or the shell rolls the change back.
 *  - Never display or log Haven.ha().token.
 */
(function () {
    'use strict';

    var H = window.Haven;

    // ------------------------------------------------------------------ dock apps
    // The dock holds the apps you pick with the "+" tile (stored as Tizen app IDs, in order).
    // These two are the defaults; they keep their own glyphs and are found by name if their
    // usual ID differs on your TV. Press Yellow on the TV to see installed apps and their IDs.
    var APPS = {
        youtube: { name: 'YouTube', ids: ['9Ur5IzDKqV.TizenYouTube'], match: /youtube/i, glyph: 'play' },
        internet: { name: 'Internet', ids: ['org.tizen.browser', 'com.samsung.tv.browser'], match: /^(internet|web ?browser|browser)$/i, glyph: 'globe' }
    };
    var SELF_ID = /^HavenHome1\./;          // never offer Haven itself in the app picker

    var GLYPHS = {
        play: '<svg class="glyph" viewBox="0 0 100 100"><path d="M38 28 L74 50 L38 72 Z" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/></svg>',
        globe: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5"><circle cx="50" cy="50" r="30"/><ellipse cx="50" cy="50" rx="13" ry="30"/><path d="M20 50 H80 M25 35 H75 M25 65 H75"/></svg>',
        gear: '<svg class="glyph" viewBox="0 0 100 100"><path fill="currentColor" fill-rule="evenodd" stroke="currentColor" stroke-width="3" stroke-linejoin="round" d="M43.7 23.7 L44.4 14.4 L55.6 14.4 L56.3 23.7 L64.1 27.0 L71.2 20.9 L79.1 28.8 L73.0 35.9 L76.3 43.7 L85.6 44.4 L85.6 55.6 L76.3 56.3 L73.0 64.1 L79.1 71.2 L71.2 79.1 L64.1 73.0 L56.3 76.3 L55.6 85.6 L44.4 85.6 L43.7 76.3 L35.9 73.0 L28.8 79.1 L20.9 71.2 L27.0 64.1 L23.7 56.3 L14.4 55.6 L14.4 44.4 L23.7 43.7 L27.0 35.9 L20.9 28.8 L28.8 20.9 L35.9 27.0 Z M39 50 A11 11 0 1 0 61 50 A11 11 0 1 0 39 50 Z"/></svg>',
        bulb: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M50 16 C34 16 24 28 24 41 C24 51 30 57 35 62 C38 65 39 68 39 72 H61 C61 68 62 65 65 62 C70 57 76 51 76 41 C76 28 66 16 50 16 Z"/><path d="M40 81 H60 M43 89 H57"/></svg>',
        power: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M50 16 V48"/><path d="M33 27 A30 30 0 1 0 67 27"/></svg>',
        camera: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"><rect x="12" y="30" width="54" height="40" rx="9"/><path d="M66 45 L88 33 V67 L66 55 Z"/></svg>',
        fan: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"><circle cx="50" cy="50" r="7"/><path d="M50 43 C46 26 52 16 62 18 C70 20 66 36 50 43 Z M57 50 C74 46 84 52 82 62 C80 70 64 66 57 50 Z M50 57 C54 74 48 84 38 82 C30 80 34 64 50 57 Z M43 50 C26 54 16 48 18 38 C20 30 36 34 43 50 Z"/></svg>',
        plus: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M50 24 V76 M24 50 H76"/></svg>'
    };

    var KEY = {
        LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
        BACK: 10009, YELLOW: 405, IME_DONE: 65376, IME_CANCEL: 65385,
        ESC: 27, BACKSPACE: 8, Y: 89, EXIT: 10182,
        CH_UP: 427, CH_DOWN: 428, PAGE_UP: 33, PAGE_DOWN: 34   // CH +/- on the remote; Page Up/Down in preview
    };

    var MAX_SENSORS = 15, MAX_BUTTONS = 48, MAX_CAMERAS = 9;

    // ------------------------------------------------------------------ settings

    var SETTINGS_DEF = [
        { key: 'interval', label: 'Change wallpaper',
          options: [[30, 'Every 30 seconds'], [60, 'Every minute'], [300, 'Every 5 minutes'], [1800, 'Every 30 minutes'], [0, 'Never']] },
        { key: 'source', label: 'Wallpapers',
          options: [['both', 'Built-in + Home Assistant'], ['ha', 'Home Assistant'], ['builtin', 'Built-in']] },
        { key: 'motion', label: 'Slow wallpaper motion', options: [[false, 'Off (fastest)'], [true, 'On']] },
        { key: 'season', label: 'Seasonal effects', options: [] },     // filled in by fxOptions()
        { key: 'wxStyle', label: 'Weather style', options: [['a', 'Today and week'], ['b', 'Next 24 hours and week']] },
        { key: 'theme', label: 'Theme', options: [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto (light by day)']] },
        { key: 'clock24', label: 'Clock', options: [[true, '24-hour'], [false, '12-hour']] },
        { key: 'icons', label: 'Tile icons', options: [['simple', 'Simple'], ['original', 'App icons']] },
        { key: 'captions', label: 'Wallpaper names', options: [[true, 'Show'], [false, 'Hide']] },
        { key: '_apps', label: 'Apps in the dock', action: 'apps' },
        { key: '_widgets', label: 'Home Assistant widgets', action: 'widgets' },
        { key: '_address', label: 'Home Assistant address', action: 'address' },
        { key: '_update', label: 'Check for design update', action: 'update' },
        { key: '_diag', label: 'Installed apps and status', action: 'diag' }
    ];

    // widgets: entity IDs in display order; null = never chosen, so suggestions get picked.
    // dockApps: app IDs in dock order; null = never chosen, so YouTube and Internet are used.
    var DEFAULTS = { interval: 60, source: 'both', motion: false, season: 'auto', wxStyle: 'a', theme: 'dark', clock24: true,
        icons: 'simple', captions: true, focus: 0, widgets: null, dockApps: null };
    var cfg = {};
    (function () {
        for (var k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { cfg[k] = H.get(k, DEFAULTS[k]); } }
    }());

    function save(key) { H.set(key, cfg[key]); }

    // ------------------------------------------------------------------ helpers

    function $(id) { return document.getElementById(id); }
    function each(list, fn) { for (var i = 0; i < list.length; i++) { fn(list[i], i); } }
    function keys(obj) { var out = [], k; for (k in obj) { if (obj.hasOwnProperty(k)) { out.push(k); } } return out; }
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function setFocused(el, on) { el.className = el.className.replace(/\s*focused/g, '') + (on ? ' focused' : ''); }
    function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var toastTimer = null;
    function toast(msg, ms) {
        var el = $('toast');
        el.textContent = msg;
        el.className = 'show';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.className = ''; }, ms || 2600);
    }

    // ------------------------------------------------------------------ markup

    function build() {
        $('stage').innerHTML =
            '<div id="bg"><div class="wall" id="wallA"></div><div class="wall" id="wallB"></div></div>' +
            '<div id="shade"></div>' +
            '<div id="fxTint"></div>' +
            '<div id="fx"></div><style id="fxStyle"></style>' +
            '<div id="veil"></div>' +
            '<div id="pages">' +
                '<section class="page" id="pageHome">' +
                    '<section id="sensors" hidden></section>' +
                    '<nav id="dock"><div id="dockTrack"></div></nav>' +
                    '<div id="dockMoreL" class="dockMore">&lsaquo;</div><div id="dockMoreR" class="dockMore">&rsaquo;</div>' +
                    '<div id="caption"></div>' +
                '</section>' +
                '<section class="page" id="pageControls">' +
                    '<section id="ctlArea"><div id="ctlTrack"></div></section>' +
                    '<div id="ctlMoreU" class="dockMore vmore">&lsaquo;</div><div id="ctlMoreD" class="dockMore vmore">&rsaquo;</div>' +
                '</section>' +
                '<section class="page" id="pageWeather"><section id="wxArea"></section></section>' +     // pages in PAGES order
                '<section class="page" id="pageCameras"><section id="camArea"></section></section>' +
            '</div>' +
            '<div id="tabs"></div>' +
            '<header id="clock"><div id="time">--:--</div><div id="date"></div></header>' +
            '<div id="haStatus"></div>' +
            '<div id="edgeL" class="edge l"></div><div id="edgeR" class="edge r"></div>' +
            '<div id="dots"></div>' +
            '<section id="player" hidden>' +
                '<img id="camSnap" alt="">' +
                '<video id="camVideo" hidden></video>' +
                '<div id="camBar"><span id="camLive" hidden></span><span id="camName"></span></div>' +
                '<div id="camStatus"></div>' +
                '<div id="camHint"></div>' +
            '</section>' +
            '<section id="settings" class="overlay" hidden><div class="panel">' +
                '<h2>Haven settings</h2><ul id="settingsRows"></ul>' +
                '<p class="hint">Up / Down to choose &middot; Left / Right to change &middot; Back to close</p></div></section>' +
            '<section id="picker" class="overlay" hidden><div class="panel wide">' +
                '<h2>Home Assistant widgets</h2><p id="pickCount" class="hint left"></p><ul id="pickList" class="picklist"></ul>' +
                '<p class="hint">OK to show or hide &middot; Sensors on Home, lights and switches on Controls, cameras on Cameras &middot; Back to close</p></div></section>' +
            '<section id="apps" class="overlay" hidden><div class="panel wide">' +
                '<h2>Apps in the dock</h2><p id="appsCount" class="hint left"></p><ul id="appsList" class="picklist"></ul>' +
                '<p id="appsHint" class="hint"></p></div></section>' +
            '<section id="editor" class="overlay" hidden><div class="panel">' +
                '<h2>Home Assistant address</h2>' +
                '<p class="hint left">The IP is enough, for example 192.168.1.10. Haven adds :8123/local/haven/ itself.</p>' +
                '<input id="addr" type="text" autocomplete="off" spellcheck="false">' +
                '<p class="hint">OK or Done to save &middot; Back to cancel</p></div></section>' +
            '<section id="diag" class="overlay" hidden><div class="panel wide">' +
                '<h2>Installed apps and status</h2><div id="diagStatus"></div><ul id="diagList"></ul>' +
                '<p class="hint">Up / Down to scroll &middot; Back or Yellow to close</p></div></section>' +
            '<div id="toast"></div>' +
            '<div id="fps"></div>' +
            '<div id="countdown"></div>';
    }

    // ------------------------------------------------------------------ theme

    function applyTheme() {
        var dark = cfg.theme === 'dark';
        if (cfg.theme === 'auto') {
            var sun = ha.states['sun.sun'];
            if (sun && (sun.state === 'below_horizon' || sun.state === 'above_horizon')) {
                dark = sun.state === 'below_horizon';
            } else {
                var h = new Date().getHours();
                dark = h < 7 || h >= 19;
            }
        }
        var stage = $('stage');
        var want = 'theme-' + (dark ? 'dark' : 'light') + (/avplay-on/.test(stage.className) ? ' avplay-on' : '');
        if (stage.className !== want) { stage.className = want; }
    }

    // ------------------------------------------------------------------ clock

    var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    var clockTimer = null;

    function tickClock() {
        var d = new Date(), h = d.getHours();
        $('time').textContent = cfg.clock24 ? pad(h) + ':' + pad(d.getMinutes())
            : ((h + 11) % 12 + 1) + ':' + pad(d.getMinutes()) + (h < 12 ? ' AM' : ' PM');
        $('date').textContent = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
        applyTheme();
        updateFx();
        clearTimeout(clockTimer);
        clockTimer = setTimeout(tickClock, 60500 - d.getSeconds() * 1000 - d.getMilliseconds());
    }

    // ------------------------------------------------------------------ seasonal effects
    //
    // Weather and holiday effects: snow, rain, storms, fog, stars, golden hour, autumn leaves,
    // Halloween, Valentine's, St. Patrick's, spring blossoms, fireworks, birthdays.
    //
    // Every particle is a small element drawn once and moved only by CSS keyframes (transform and
    // opacity). The TV's compositor animates those by itself, so the effect keeps running evenly while
    // the page's JavaScript is busy, and each particle costs only a few pixels. No canvas, no blur
    // filters, no JavaScript animation loop. Keyframes are generated for the effect in use only.
    // Everything sits over the wallpaper and behind the cards, and is switched off on the Cameras page,
    // in the camera player and while Haven is in the background.
    //
    // What runs, highest first: fireworks (New Year, Fourth of July evening) > a birthday in a Home
    // Assistant calendar > real weather (snow, sleet, rain, storm, fog) > holidays > seasons >
    // clear-night stars. Wind from the weather entity blows falling things sideways, and a warm tint
    // fades in around sunset.

    var FX_LABEL = {
        snow: 'Snow', christmas: 'Christmas snow', sleet: 'Sleet', rain: 'Rain', pouring: 'Heavy rain',
        storm: 'Thunderstorm', fog: 'Fog', stars: 'Clear night', golden: 'Golden hour', windy: 'Windy (leaves)',
        autumn: 'Autumn leaves', thanksgiving: 'Thanksgiving', halloween: 'Halloween', valentine: 'Valentine\'s Day',
        stpatrick: 'St. Patrick\'s Day', spring: 'Spring blossoms', newyear: 'New Year\'s fireworks',
        july4: 'Fourth of July', birthday: 'Birthday'
    };
    var FX_PREVIEWS = ['snow', 'sleet', 'rain', 'pouring', 'storm', 'fog', 'stars', 'golden', 'windy', 'autumn',
        'thanksgiving', 'halloween', 'valentine', 'stpatrick', 'spring', 'newyear', 'july4', 'birthday'];
    var FX_WEATHER = { snowy: 'snow', 'snowy-rainy': 'sleet', hail: 'sleet', rainy: 'rain', pouring: 'pouring',
        'lightning-rainy': 'storm', lightning: 'storm', fog: 'fog' };
    var FX_STOPS = 24;

    each(SETTINGS_DEF, function (def) { if (def.key === 'season') { def.options = fxOptions(); } });
    if (cfg.season === 'on') { cfg.season = 'p:snow'; save('season'); }   // the first test build's "Snow"

    var fx = { sig: '', on: false, name: null, why: '', count: 0, plan: null, fps: null, kf: 0, bdayToast: '' };

    // The Settings options: three modes, a test mode with a frame-rate counter, Off, then a preview of
    // every effect (previews also show the counter).
    function fxOptions() {
        var o = [['auto', 'Holidays, seasons and weather'], ['holidays', 'Holidays and seasons'], ['weather', 'Weather only'],
            ['fps', 'All + frame rate'], ['off', 'Off']];
        each(FX_PREVIEWS, function (n) { o.push(['p:' + n, 'Preview: ' + FX_LABEL[n]]); });
        return o;
    }

    // A weather entity: the one on Home if there is one, otherwise the first one in HA.
    function weatherEid() {
        var list = selected(), i;
        for (i = 0; i < list.length; i++) { if (domainOf(list[i]) === 'weather') { return list[i]; } }
        for (i = 0; i < ha.all.length; i++) { if (domainOf(ha.all[i].entity_id) === 'weather') { return ha.all[i].entity_id; } }
        return null;
    }

    function calendarEids() {
        var out = [];
        each(ha.all, function (s) { if (domainOf(s.entity_id) === 'calendar' && out.length < 12) { out.push(s.entity_id); } });
        return out;
    }

    // 4th Thursday of November
    function thanksgivingDay(year) { return 1 + (4 - new Date(year, 10, 1).getDay() + 7) % 7 + 21; }

    function calendarFx(d) {
        var m = d.getMonth() + 1, day = d.getDate(), h = d.getHours(), min = d.getMinutes(), md = m * 100 + day;
        if ((md === 1231 && h === 23 && min >= 50) || (md === 101 && h === 0 && min < 30)) { return 'newyear'; }
        if (md === 704) { return h >= 20 ? 'july4' : null; }
        if (md === 214) { return 'valentine'; }
        if (md === 317) { return 'stpatrick'; }
        if (md >= 1024 && md <= 1031) { return 'halloween'; }
        if (m === 11 && day === thanksgivingDay(d.getFullYear())) { return 'thanksgiving'; }
        if (md >= 1201 || md <= 106) { return 'christmas'; }
        if (md >= 922 && md <= 1130) { return 'autumn'; }
        if (md >= 320 && md <= 515) { return 'spring'; }
        return null;
    }

    // An all-day (or current) calendar event with "birthday" in its title.
    function birthdayEvent() {
        var cals = calendarEids();
        for (var i = 0; i < cals.length; i++) {
            var st = ha.states[cals[i]], msg = st && st.attributes && st.attributes.message;
            if (st && st.state === 'on' && /birthday|bday/i.test(msg || '')) { return String(msg); }
        }
        return null;
    }

    // Wind from the weather entity: level 0 calm, 1 breezy, 2 windy; dir +1 blows to the right.
    function windNow() {
        var w = weatherEid(), st = w && ha.states[w], a = (st && st.attributes) || {};
        var unit = String(a.wind_speed_unit || 'km/h'), v = parseFloat(a.wind_speed);
        var kmh = isNaN(v) ? 0 : unit === 'mph' ? v * 1.609 : unit === 'm/s' ? v * 3.6 : unit === 'kn' ? v * 1.852 : v;
        var level = kmh >= 35 ? 2 : kmh >= 15 ? 1 : 0;
        if (st && /^windy/.test(st.state)) { level = Math.max(level, 2); }
        var bearing = parseFloat(a.wind_bearing);          // where the wind comes FROM, degrees from north
        var dir = isNaN(bearing) ? 1 : (-Math.sin(bearing * Math.PI / 180) < 0 ? -1 : 1);
        return { level: level, dir: dir };
    }

    // Sunset glow: the sun just above or below the horizon in the evening, and not overcast.
    function goldenHour(weatherState) {
        var sun = ha.states['sun.sun'], a = sun && sun.attributes;
        if (!a || typeof a.elevation !== 'number' || a.rising) { return false; }
        return a.elevation > -2 && a.elevation < 8 && !FX_WEATHER[weatherState] && weatherState !== 'cloudy';
    }

    function fxPlanNow() {
        var mode = cfg.season === 'on' ? 'p:snow' : cfg.season, calm = { level: 0, dir: 1 };
        var plan = { name: null, why: '', wind: calm, tint: false, meter: mode === 'fps' || mode.indexOf('p:') === 0 };
        if (mode === 'off') { return plan; }
        if (mode.indexOf('p:') === 0) {
            var p = mode.slice(2);
            plan.why = 'preview';
            if (p === 'golden') { plan.tint = true; return plan; }
            plan.name = p === 'windy' ? 'autumn' : p;
            if (p === 'windy') { plan.wind = { level: 2, dir: 1 }; }
            return plan;
        }
        var useCal = mode !== 'weather', useWx = mode !== 'holidays';
        var w = weatherEid(), wstate = w && ha.states[w] ? ha.states[w].state : '';
        var cal = useCal ? calendarFx(new Date()) : null;
        var wx = useWx ? FX_WEATHER[wstate] || null : null;
        if (cal === 'newyear' || cal === 'july4') { plan.name = cal; plan.why = 'calendar'; }
        else if (useCal && birthdayEvent()) { plan.name = 'birthday'; plan.why = 'calendar'; }
        else if (wx) { plan.name = wx; plan.why = 'weather'; }
        else if (cal) { plan.name = cal; plan.why = 'calendar'; }
        else if (useWx && wstate === 'clear-night') { plan.name = 'stars'; plan.why = 'weather'; }
        plan.wind = useWx ? windNow() : calm;
        plan.tint = useWx && goldenHour(wstate);
        return plan;
    }

    // ---------------------------------------------------- keyframes

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function n1(v) { return (Math.round(v * 10) / 10).toString(); }

    function kfName() { fx.kf++; return 'fx' + fx.kf; }

    // falling: sine sway, wind drift, optional spin and a confetti-style flip
    function kfFall(css, amp, waves, drift, rot, flip) {
        var name = kfName(), s = '@keyframes ' + name + '{';
        for (var k = 0; k <= FX_STOPS; k++) {
            var t = k / FX_STOPS, x = drift * t + amp * Math.sin(2 * Math.PI * waves * t);
            s += (t * 100).toFixed(2) + '%{transform:translate3d(' + n1(x) + 'px,' + Math.round(-70 + 1200 * t) + 'px,0)' +
                (rot ? ' rotate(' + Math.round(rot * t) + 'deg)' : '') +
                (flip ? ' scale(' + Math.cos(2 * Math.PI * flip * t).toFixed(2) + ',1)' : '') + '}';
        }
        css.push(s + '}');
        return name;
    }

    // rising (embers, hearts): fades in at the bottom and out near the top
    function kfRise(css, amp, waves, op) {
        var name = kfName(), s = '@keyframes ' + name + '{';
        for (var k = 0; k <= FX_STOPS; k++) {
            var t = k / FX_STOPS, o = t < 0.12 ? op * t / 0.12 : t > 0.7 ? op * (1 - t) / 0.3 : op;
            s += (t * 100).toFixed(2) + '%{transform:translate3d(' + n1(amp * Math.sin(2 * Math.PI * waves * t)) + 'px,' +
                Math.round(1150 - 1220 * t) + 'px,0);opacity:' + o.toFixed(2) + '}';
        }
        css.push(s + '}');
        return name;
    }

    // rain: a straight slanted line
    function kfRain(css, angle) {
        var name = kfName(), dx = Math.round(Math.tan(angle * Math.PI / 180) * 1260);
        css.push('@keyframes ' + name + '{0%{transform:translate3d(0,-110px,0) rotate(' + (-angle) + 'deg)}' +
            '100%{transform:translate3d(' + dx + 'px,1150px,0) rotate(' + (-angle) + 'deg)}}');
        return name;
    }

    // bats: cross the screen in the first part of the cycle, then wait off screen
    function kfGlide(css, dir, bob) {
        var name = kfName(), s = '@keyframes ' + name + '{', STEPS = 16, from = dir > 0 ? -160 : 2080, to = dir > 0 ? 2080 : -160;
        for (var k = 0; k <= STEPS; k++) {
            var t = k / STEPS;
            s += (t * 45).toFixed(2) + '%{transform:translate3d(' + Math.round(from + (to - from) * t) + 'px,' +
                n1(bob * Math.sin(2 * Math.PI * 2 * t)) + 'px,0)' + (dir < 0 ? ' scale(-1,1)' : '') + '}';
        }
        css.push(s + '100%{transform:translate3d(' + to + 'px,0,0)}}');
        return name;
    }

    // fireworks: one keyframe per spark direction, shared by every burst
    function kfSparks(css, count) {
        var names = [];
        for (var i = 0; i < count; i++) {
            var name = kfName(), a = 2 * Math.PI * i / count, r = 170, cx = Math.cos(a), cy = Math.sin(a);
            css.push('@keyframes ' + name + '{0%{transform:translate3d(0,0,0) scale(.5);opacity:0}' +
                '3%{transform:translate3d(' + n1(cx * 14) + 'px,' + n1(cy * 14) + 'px,0) scale(1);opacity:1}' +
                '28%{transform:translate3d(' + n1(cx * r) + 'px,' + n1(cy * r + 34) + 'px,0) scale(.9);opacity:.9}' +
                '40%{transform:translate3d(' + n1(cx * r * 1.12) + 'px,' + n1(cy * r * 1.12 + 110) + 'px,0) scale(.6);opacity:0}' +
                '100%{transform:translate3d(' + n1(cx * r * 1.12) + 'px,' + n1(cy * r * 1.12 + 110) + 'px,0);opacity:0}}');
            names.push(name);
        }
        return names;
    }

    // ---------------------------------------------------- building an effect

    function particle(cls, style, anim) {
        return '<i class="fxp ' + cls + '" style="' + style + ';animation:' + anim + '"></i>';
    }

    // n particles that fall with sway (and optional spin); returns html
    function fallers(css, n, cls, size, dur, opacity, sway, drift, spin, colors, flip, aspect) {
        var paths = [], html = '';
        for (var v = 0; v < 3; v++) {
            var amp = sway[0] + (sway[1] - sway[0]) * v / 2, rot = spin ? (v === 1 ? -1 : 1) * spin : 0;
            paths.push(kfFall(css, amp, [2, 3, 2][v], drift, rot, flip));
        }
        for (var i = 0; i < n; i++) {
            var w = Math.round(rnd(size[0], size[1])), d = rnd(dur[1], dur[0]);
            var bg = colors ? ';background-color:' + colors[i % colors.length] : '';
            html += particle(cls, 'left:' + rnd(-4, 100).toFixed(2) + '%;width:' + w + 'px;height:' + Math.round(w * (aspect || 1)) +
                'px;opacity:' + opacity + bg, paths[i % 3] + ' ' + n1(d) + 's linear -' + n1(rnd(0, d)) + 's infinite');
        }
        return html;
    }

    function risers(css, n, cls, size, dur, opacity, sway) {
        var paths = [], html = '';
        for (var v = 0; v < 3; v++) { paths.push(kfRise(css, sway * (0.6 + 0.4 * v), [1, 2, 1][v], opacity)); }
        for (var i = 0; i < n; i++) {
            var w = Math.round(rnd(size[0], size[1])), d = rnd(dur[1], dur[0]);
            html += particle(cls + (cls === 'heart' ? ' h' + (i % 3) : ''), 'left:' + rnd(0, 98).toFixed(2) + '%;width:' + w + 'px;height:' + w + 'px',
                paths[i % 3] + ' ' + n1(d) + 's linear -' + n1(rnd(0, d)) + 's infinite');
        }
        return html;
    }

    function rainHtml(css, n, dur, opacity, wind) {
        var angle = [4, 10, 20][wind.level] * wind.dir, path = kfRain(css, angle), html = '';
        for (var i = 0; i < n; i++) {
            var d = rnd(dur[1], dur[0]), len = Math.round(rnd(38, 72));
            html += particle('drop', 'left:' + rnd(-12, 104).toFixed(2) + '%;height:' + len + 'px;opacity:' + n1(opacity * rnd(0.6, 1)),
                path + ' ' + d.toFixed(2) + 's linear -' + (d * rnd(0, 1)).toFixed(2) + 's infinite');
        }
        return html;
    }

    function snowHtml(css, scale, drift) {
        var html = '';
        each([[30, 5, 8, 24, 17, 0.55], [24, 9, 13, 16, 12, 0.75], [12, 15, 21, 11, 8, 0.9]], function (L, i) {
            html += fallers(css, Math.round(L[0] * scale), 'flake', [L[1], L[2]], [L[3], L[4]], L[5], [10 + 8 * i, 24 + 12 * i], drift, 0);
        });
        return html;
    }

    function fireworksHtml(css, colors) {
        var sparks = kfSparks(css, 24), html = '';
        for (var b = 0; b < 4; b++) {
            var cycle = rnd(3.4, 5.8), delay = rnd(0, cycle);
            html += '<div class="burst" style="left:' + (8 + b * 22 + rnd(0, 14)).toFixed(1) + '%;top:' + rnd(14, 50).toFixed(1) + '%;--c:' + colors[b % colors.length] + '">';
            for (var s = 0; s < sparks.length; s++) {
                html += particle('spark', 'left:0;top:0', sparks[s] + ' ' + n1(cycle) + 's ease-out -' + n1(delay) + 's infinite');
            }
            html += '</div>';
        }
        return html;
    }

    var LEAVES = ['#d9622b', '#e8a33d', '#b8452a', '#f0c75e', '#8f3b1b', '#c97b2a'];
    var CONFETTI = ['#ff5c8a', '#ffd36b', '#5cc8ff', '#7be07b', '#c69bff', '#ff9f43'];

    // Builds the particles for one effect; returns [html, count].
    function fxBuild(name, wind) {
        var css = [], html = '', drift = [0, 150, 380][wind.level] * wind.dir;
        fx.kf = 0;
        if (name === 'snow' || name === 'christmas') { html = snowHtml(css, 1, drift); }
        else if (name === 'sleet') { html = snowHtml(css, 0.5, drift) + rainHtml(css, 40, [1.1, 0.8], 0.35, wind); }
        else if (name === 'rain') { html = rainHtml(css, 70, [1.1, 0.7], 0.45, wind); }
        else if (name === 'pouring') { html = rainHtml(css, 115, [0.8, 0.5], 0.55, wind); }
        else if (name === 'storm') {
            html = rainHtml(css, 100, [0.8, 0.5], 0.55, wind) +
                '<i class="flash" style="animation:fxflash ' + n1(rnd(11, 16)) + 's linear -' + n1(rnd(2, 6)) + 's infinite"></i>';
        } else if (name === 'fog') {
            each([[420, 70], [700, 55]], function (b, i) {          // two wide bands: fog is the heaviest effect
                html += '<i class="fogband" style="top:' + b[0] + 'px;animation:fxfog ' + b[1] + 's ease-in-out -' + (i * 13) +
                    's infinite alternate"></i>';
            });
        } else if (name === 'stars') {
            for (var i = 0; i < 45; i++) {
                var sz = Math.round(rnd(3, 5)), d = rnd(2.2, 5.5);
                html += particle('star', 'left:' + rnd(1, 99).toFixed(2) + '%;top:' + rnd(1, 40).toFixed(2) + '%;width:' + sz + 'px;height:' + sz + 'px',
                    'fxtwinkle ' + n1(d) + 's ease-in-out -' + n1(rnd(0, d)) + 's infinite alternate');
            }
            html += particle('shoot', 'left:72%;top:8%', 'fxshoot 23s linear -4s infinite') +
                particle('shoot', 'left:38%;top:4%', 'fxshoot 37s linear -21s infinite');
        } else if (name === 'autumn' || name === 'thanksgiving') {
            html = fallers(css, name === 'thanksgiving' ? 38 : 24, 'leaf', [18, 34], [15, 9], 0.92, [30, 70], drift, 540, LEAVES);
        } else if (name === 'halloween') {
            for (var b = 0; b < 6; b++) {
                var dir = b % 2 ? -1 : 1, cyc = rnd(14, 26), size = Math.round(rnd(56, 96));
                html += '<i class="fxp bat" style="top:' + rnd(6, 46).toFixed(1) + '%;width:' + size + 'px;height:' + Math.round(size * 0.75) +
                    'px;animation:' + kfGlide(css, dir, rnd(16, 40)) + ' ' + n1(cyc) + 's linear -' + n1(rnd(0, cyc)) + 's infinite"><b></b></i>';
            }
            html += risers(css, 30, 'ember', [9, 16], [16, 10], 0.95, 26);
        } else if (name === 'valentine') { html = risers(css, 22, 'heart', [18, 34], [17, 11], 0.85, 40); }
        else if (name === 'stpatrick') { html = fallers(css, 22, 'clover', [20, 34], [16, 10], 0.9, [20, 50], drift, 300); }
        else if (name === 'spring') { html = fallers(css, 30, 'petal', [12, 22], [17, 11], 0.9, [40, 90], drift, 420); }
        else if (name === 'newyear') { html = fireworksHtml(css, ['#ffd36b', '#ffffff', '#ff7ab6', '#7fe3ff', '#c69bff']); }
        else if (name === 'july4') { html = fireworksHtml(css, ['#ff4b4b', '#ffffff', '#4b7bff', '#ff4b4b', '#ffffff']); }
        else if (name === 'birthday') { html = fallers(css, 50, 'confetti', [8, 12], [11, 7], 0.95, [20, 50], drift, 720, CONFETTI, 3, 1.6); }
        $('fxStyle').textContent = css.join('\n');
        $('fx').className = name === 'newyear' || name === 'july4' ? 'top' : '';   // fireworks show above the cards
        $('fx').innerHTML = html;
        return $('fx').querySelectorAll('.fxp, .flash, .fogband').length;
    }

    // Called whenever something that affects the effects changes; cheap when nothing does.
    function updateFx() {
        var plan = fxPlanNow(), visible = !document.hidden && mode !== 'camera' && page !== P_CAM;
        fx.plan = plan;
        var sig = plan.name ? plan.name + '|' + plan.wind.level + '|' + plan.wind.dir : '';
        if (sig !== fx.sig) {
            fx.sig = sig;
            fx.name = plan.name;
            fx.why = plan.why;
            fx.count = plan.name ? fxBuild(plan.name, plan.wind) : 0;
            if (!plan.name) { $('fx').innerHTML = ''; $('fxStyle').textContent = ''; }
            if (plan.name === 'birthday') { birthdayToast(); }
        }
        var show = !!plan.name && visible;
        if (show !== fx.on) {
            fx.on = show;
            $('fx').style.display = show ? 'block' : 'none';   // display:none stops the animations and frees the layers
        }
        $('fxTint').className = plan.tint && visible ? 'on' : '';
        var meter = plan.meter && visible;
        if (meter && !fx.fps) { startFps(); }
        else if (!meter && fx.fps) { stopFps(); }
        checkCountdown(false);
    }

    function birthdayToast() {
        var msg = fx.plan && fx.plan.why === 'preview' ? 'Happy birthday!' : birthdayEvent(), today = new Date().toDateString();
        if (!msg || fx.bdayToast === today + msg) { return; }
        fx.bdayToast = today + msg;
        toast(msg.length > 60 ? msg.slice(0, 58) + '...' : msg, 6000);
    }

    // ---------------------------------------------------- New Year countdown (last minute of the year)

    var countdown = { timer: null, end: 0 };

    function checkCountdown(demo) {
        var d = new Date();
        var live = cfg.season !== 'off' && cfg.season !== 'weather' &&
            d.getMonth() === 11 && d.getDate() === 31 && d.getHours() === 23 && d.getMinutes() === 59;
        if (countdown.timer || !(live || demo)) { return; }
        countdown.end = demo ? Date.now() + 10000 : new Date(d.getFullYear() + 1, 0, 1).getTime();
        tickCountdown();
        countdown.timer = setInterval(tickCountdown, 250);
    }

    function tickCountdown() {
        var el = $('countdown'), left = Math.ceil((countdown.end - Date.now()) / 1000);
        var hidden = document.hidden || mode === 'camera';
        if (left > 0) {
            el.textContent = String(left);
            el.className = hidden ? '' : 'on' + (left <= 10 ? ' big' : '');
        } else if (left > -8) {
            el.textContent = 'Happy New Year!';
            el.className = hidden ? '' : 'on cheer';
        } else {
            el.className = '';
            clearInterval(countdown.timer);
            countdown.timer = null;
        }
    }

    // ---------------------------------------------------- frame-rate counter (testing on the TV)

    function startFps() {
        var el = $('fps'), f = { n: 0, t0: 0, hist: [] };
        fx.fps = f;
        el.textContent = 'Measuring...';
        el.style.display = 'block';
        function frame(t) {
            if (fx.fps !== f) { return; }
            if (!f.t0) { f.t0 = t; }
            f.n++;
            if (t - f.t0 >= 1000) {
                var v = Math.round(f.n * 1000 / (t - f.t0));
                f.hist.push(v);
                if (f.hist.length > 10) { f.hist.shift(); }
                el.textContent = (fx.on ? FX_LABEL[fx.name] : fx.plan && fx.plan.tint ? 'Golden hour' : 'No effect now') +
                    ' · ' + v + ' fps · lowest ' + Math.min.apply(null, f.hist) + ' (10 s)';
                f.n = 0;
                f.t0 = t;
            }
            window.requestAnimationFrame(frame);
        }
        window.requestAnimationFrame(frame);
    }

    function stopFps() {
        fx.fps = null;
        $('fps').style.display = 'none';
    }

    function fxStatus() {
        var p = fx.plan;
        if (cfg.season === 'off') { return 'off'; }
        if (fx.on) { return FX_LABEL[fx.name] + ' (' + fx.why + ') · ' + fx.count + ' particles' + (p && p.tint ? ' · golden hour' : ''); }
        if (p && p.name) { return FX_LABEL[p.name] + ', paused here'; }
        return p && p.tint ? 'golden hour' : 'nothing right now';
    }

    // ------------------------------------------------------------------ wallpapers

    var builtinWalls = [];
    each(window.HAVEN_WALLS || [], function (w) { builtinWalls.push({ src: w.src, caption: w.caption, builtin: true }); });
    var haWalls = [];
    var brokenUntil = {};          // src -> time; images that failed to load are skipped for a while
    var wallPos = Math.floor(Math.random() * 1000);
    var wallFront = 0, wallTimer = null, haListAt = 0;

    function playlist() {
        var list = [], now = Date.now(), usable = [];
        if (cfg.source !== 'ha') { list = list.concat(builtinWalls); }
        if (cfg.source !== 'builtin') { list = list.concat(haWalls); }
        each(list, function (w) { if (!(brokenUntil[w.src] > now)) { usable.push(w); } });
        return usable.length ? usable : builtinWalls;
    }

    function prettify(file) {
        return file.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/^\s+|\s+$/g, '');
    }

    function refreshHaWalls() {
        var b = H.base();
        if (cfg.source === 'builtin' || !b) { return; }
        haListAt = Date.now();
        H.fetchText(b + 'wallpapers/list.json?t=' + haListAt, 4000, function (text) {
            var data, list = [];
            try { data = JSON.parse(text); } catch (e) { return; }
            each(data || [], function (item) {
                var file = typeof item === 'string' ? item : item.file;
                if (!file) { return; }
                list.push({
                    src: b + 'wallpapers/' + encodeURIComponent(file),
                    caption: (item && item.caption) || prettify(file)
                });
            });
            var wasEmpty = !haWalls.length;
            haWalls = list;
            if (wasEmpty && list.length && cfg.source === 'ha') { nextWall(); }
        }, function () { /* keep the last list; broken images fall back to built-in */ });
    }

    function showWall(w, attemptsLeft) {
        var layers = [$('wallA'), $('wallB')];
        var next = layers[1 - wallFront], prev = layers[wallFront];
        var img = new Image();
        img.onload = function () {
            next.style.backgroundImage = 'url("' + w.src + '")';
            next.className = 'wall';
            void next.offsetWidth; // restart the drift animation
            next.className = 'wall on' + (cfg.motion ? ' drift' : '');
            prev.className = 'wall' + (cfg.motion ? ' drift' : '');
            wallFront = 1 - wallFront;
            $('caption').textContent = cfg.captions ? w.caption : '';
        };
        img.onerror = function () {
            brokenUntil[w.src] = Date.now() + 10 * 60000;
            if (attemptsLeft > 0) { nextWall(attemptsLeft - 1); }
        };
        img.src = w.src;
    }

    function nextWall(attemptsLeft) {
        var list = playlist();
        if (!list.length) { return; }
        wallPos = (wallPos + 1) % list.length;
        showWall(list[wallPos], attemptsLeft === undefined ? 5 : attemptsLeft);
    }

    function scheduleWalls() {
        clearInterval(wallTimer);
        wallTimer = null;
        if (cfg.interval > 0 && !document.hidden) {
            wallTimer = setInterval(function () {
                if (Date.now() - haListAt > 30 * 60000) { refreshHaWalls(); }
                nextWall();
            }, cfg.interval * 1000);
        }
    }

    // ================================================================== Home Assistant widgets
    //
    // One WebSocket to Home Assistant. Discovery (states, areas, energy prefs) runs once per
    // launch; after that HA pushes changes only for the entities on screen
    // (subscribe_entities with entity_ids), so the TV does almost no work.

    var BUTTON_DOMAINS = { light: 1, 'switch': 1, input_boolean: 1, fan: 1 };
    var SENSOR_DOMAINS = { sensor: 1, binary_sensor: 1, weather: 1, climate: 1 };
    // Camera names often end in the stream they are: drop that on the tile.
    var CAMERA_SUFFIX = /[\s\-:_]*(live ?view|live|stream|fluent|clear|sub ?stream|main ?stream|sd|hd|low|high)$/i;
    var CAMERA_SUBSTREAM = /fluent|sub|\bsd\b|_sd|low|live ?view|minor/i;   // light streams suit the TV best
    var CAMERA_MAINSTREAM = /clear|main|\bhd\b|_hd|high|major/i;
    var NOT_ROOM_TEMP = /cpu|processor|battery|chip|soc|core|disk|nvme|ssd|gpu|board|system|device temp|internal/i;
    var SOLAR = /solar|\bpv\b|pv_|inverter|photovolt|zonne|yield/i;

    var ha = {
        ws: null, connected: false, authFailed: false, status: '', nextId: 1, pending: {}, subId: null,
        retryMs: 2000, retryTimer: null,
        discovered: false, all: [], states: {}, areaName: {}, entityArea: {}, entityDevice: {}, hidden: {},
        solarEnergy: [], solarPower: [], suggested: []
    };

    // Last known values so widgets can show (dimmed) while Home Assistant is unreachable.
    (function () {
        var cache = H.get('haCache', null);
        if (cache) { ha.states = cache.states || {}; ha.areaName = cache.areaName || {}; ha.entityArea = cache.entityArea || {}; }
    }());

    var cacheTimer = null;
    function saveCacheSoon() {
        if (cacheTimer) { return; }
        cacheTimer = setTimeout(function () {
            cacheTimer = null;
            var states = {}, areas = {}, entityArea = {};
            each(selected(), function (eid) {
                var st = ha.states[eid];
                if (!st) { return; }
                var a = st.attributes || {}, keep = {};
                each(['friendly_name', 'unit_of_measurement', 'device_class', 'temperature', 'current_temperature', 'hvac_action', 'entity_picture',
                    'brightness', 'supported_color_modes'],
                    function (k) { if (a[k] !== undefined) { keep[k] = a[k]; } });
                states[eid] = { state: st.state, attributes: keep };
                if (ha.entityArea[eid]) { entityArea[eid] = ha.entityArea[eid]; areas[ha.entityArea[eid]] = ha.areaName[ha.entityArea[eid]]; }
            });
            H.set('haCache', { states: states, areaName: areas, entityArea: entityArea });
        }, 30000);
    }

    function domainOf(eid) { return eid.split('.')[0]; }
    function kindOf(eid) {
        var d = domainOf(eid);
        if (d === 'camera') { return 'camera'; }
        return BUTTON_DOMAINS[d] ? 'button' : (SENSOR_DOMAINS[d] ? 'sensor' : null);
    }
    function selected() { return cfg.widgets || []; }
    function selectedOf(kind) {
        var out = [];
        each(selected(), function (eid) { if (kindOf(eid) === kind) { out.push(eid); } });
        return out;
    }

    // ---------------------------------------------------- connection

    function haSend(type, payload, cb) {
        if (!ha.ws || !ha.connected) { if (cb) { cb(false, null, { message: 'not connected' }); } return null; }
        payload = payload || {};
        payload.id = ha.nextId++;
        payload.type = type;
        if (cb) { ha.pending[payload.id] = cb; }
        try { ha.ws.send(JSON.stringify(payload)); } catch (e) { if (cb) { delete ha.pending[payload.id]; cb(false, null, { message: e.message }); } }
        return payload.id;
    }

    function haScheduleRetry() {
        clearTimeout(ha.retryTimer);
        ha.retryTimer = setTimeout(haConnect, ha.retryMs);
        ha.retryMs = Math.min(ha.retryMs * 2, 60000);
    }

    function haConnect() {
        clearTimeout(ha.retryTimer);
        var info = H.ha();
        if (!info.token) { ha.status = 'no token in shell-config.js'; renderWidgets(); return; }
        if (!info.url) { ha.status = 'no Home Assistant address'; renderWidgets(); return; }
        if (ha.ws || ha.authFailed) { return; }
        var ws;
        try {
            ws = new WebSocket(info.url.replace(/^http/i, 'ws') + '/api/websocket');
        } catch (e) {
            ha.status = 'cannot connect (' + e.message + ')';
            haScheduleRetry();
            return;
        }
        ha.ws = ws;
        ha.status = 'connecting';

        ws.onmessage = function (ev) {
            var msg;
            try { msg = JSON.parse(ev.data); } catch (e) { return; }
            if (msg instanceof Array) { each(msg, haOnMessage); } else { haOnMessage(msg); }
        };
        ws.onclose = function () {
            if (ha.ws !== ws) { return; }
            var was = ha.connected;
            ha.ws = null;
            ha.connected = false;
            ha.subId = null;
            wx.subDaily = wx.subHourly = null;        // forecast subscriptions end with the connection
            var pend = ha.pending;
            ha.pending = {};
            each(keys(pend), function (id) { pend[id](false, null, { message: 'connection closed' }); });
            if (!ha.authFailed) {
                ha.status = was ? 'connection lost, retrying' : 'unreachable, retrying';
                haScheduleRetry();
            }
            renderWidgets();
        };
        ws.onerror = function () { /* onclose follows */ };
    }

    function haReconnect() {
        ha.authFailed = false;
        ha.retryMs = 2000;
        if (ha.ws) {
            var ws = ha.ws;
            ha.ws = null;
            ha.connected = false;
            try { ws.close(); } catch (e) { /* already closed */ }
        }
        ha.discovered = false;
        haConnect();
    }

    function haOnMessage(msg) {
        if (msg.type === 'auth_required') {
            ha.ws.send(JSON.stringify({ type: 'auth', access_token: H.ha().token }));
        } else if (msg.type === 'auth_ok') {
            ha.connected = true;
            ha.retryMs = 2000;
            ha.status = 'connected';
            if (ha.discovered) { haSubscribe(); } else { haDiscover(); }
        } else if (msg.type === 'auth_invalid') {
            ha.authFailed = true;
            ha.status = 'token rejected, check haToken in shell-config.js';
            try { ha.ws.close(); } catch (e) { /* closing anyway */ }
            renderWidgets();
        } else if (msg.type === 'event' && msg.id === ha.subId) {
            haApplyEvent(msg.event || {});
        } else if (msg.type === 'event' && msg.id && (msg.id === wx.subDaily || msg.id === wx.subHourly)) {
            wxEvent(msg);
        } else if (msg.type === 'result' && ha.pending[msg.id]) {
            var cb = ha.pending[msg.id];
            delete ha.pending[msg.id];
            cb(msg.success, msg.result, msg.error);
        }
    }

    // ---------------------------------------------------- discovery

    function haDiscover(done) {
        var left = 5, devArea = {}, reg = [];
        function step() {
            if (--left > 0) { return; }
            each(reg, function (e) {
                ha.entityArea[e.entity_id] = e.area_id || devArea[e.device_id] || null;
                if (e.device_id) { ha.entityDevice[e.entity_id] = e.device_id; }
                if (e.hidden_by || e.disabled_by || e.entity_category) { ha.hidden[e.entity_id] = true; }
            });
            if (!ha.all.length) { if (done) { done(); } return; }   // connection dropped mid-way; retry later
            ha.discovered = true;
            buildSuggestions();
            if (cfg.widgets === null) {
                cfg.widgets = defaultPicks();
                save('widgets');
            }
            haSubscribe();
            renderWidgets();
            if (mode === 'picker') { renderPicker(); }
            if (done) { done(); }
        }
        haSend('get_states', {}, function (ok, result) {
            if (ok && result) {
                ha.all = result;
                each(result, function (s) { ha.states[s.entity_id] = { state: s.state, attributes: s.attributes || {} }; });
            }
            step();
        });
        haSend('config/area_registry/list', {}, function (ok, result) {
            if (ok && result) { each(result, function (a) { ha.areaName[a.area_id] = a.name; }); }
            step();
        });
        haSend('config/device_registry/list', {}, function (ok, result) {
            if (ok && result) { each(result, function (d) { if (d.area_id) { devArea[d.id] = d.area_id; } }); }
            step();
        });
        haSend('config/entity_registry/list', {}, function (ok, result) {
            if (ok && result) { reg = result; }
            step();
        });
        // The Energy dashboard knows exactly which sensors are your solar panels.
        haSend('energy/get_prefs', {}, function (ok, result) {
            ha.solarEnergy = [];
            ha.solarPower = [];
            if (ok && result && result.energy_sources) {
                each(result.energy_sources, function (src) {
                    if (src.type !== 'solar') { return; }
                    if (src.stat_rate) { ha.solarPower.push(src.stat_rate); }
                    if (src.stat_energy_from) { ha.solarEnergy.push(src.stat_energy_from); }
                });
            }
            step();
        });
    }

    function areaOf(eid) { var a = ha.entityArea[eid]; return a ? ha.areaName[a] || '' : ''; }

    function buildSuggestions() {
        var weather = [], temps = [], humid = [], lights = [], switches = [];
        var solarPower = ha.solarPower.slice(0), solarEnergy = ha.solarEnergy.slice(0);
        each(ha.all, function (s) {
            var eid = s.entity_id, d = domainOf(eid), a = s.attributes || {};
            var text = (a.friendly_name || '') + ' ' + eid;
            if (ha.hidden[eid] || !kindOf(eid)) { return; }
            if (d === 'weather') { weather.push(eid); }
            else if (d === 'sensor' && a.device_class === 'temperature' && !NOT_ROOM_TEMP.test(text)) { temps.push(eid); }
            else if (d === 'sensor' && a.device_class === 'humidity' && !NOT_ROOM_TEMP.test(text)) { humid.push(eid); }
            else if (d === 'sensor' && a.device_class === 'power' && SOLAR.test(text) && solarPower.indexOf(eid) < 0) { solarPower.push(eid); }
            else if (d === 'sensor' && a.device_class === 'energy' && SOLAR.test(text) && solarEnergy.indexOf(eid) < 0) { solarEnergy.push(eid); }
            else if (d === 'light') { lights.push(eid); }
            else if (d === 'switch' || d === 'input_boolean') { switches.push(eid); }
        });
        function withAreaFirst(list) {
            return list.sort(function (x, y) {
                var ax = areaOf(x) ? 0 : 1, ay = areaOf(y) ? 0 : 1;
                return ax - ay || (areaOf(x) + x < areaOf(y) + y ? -1 : 1);
            });
        }
        withAreaFirst(temps); withAreaFirst(humid); withAreaFirst(lights); withAreaFirst(switches);

        // Cameras: one per physical camera, preferring its light sub-stream; skip snapshot-only entities.
        var bestPerDevice = {}, cameras = [];
        each(ha.all, function (s) {
            var eid = s.entity_id, a = s.attributes || {};
            if (domainOf(eid) !== 'camera' || ha.hidden[eid]) { return; }
            var text = (a.friendly_name || '') + ' ' + eid;
            if (/snapshot/i.test(text)) { return; }
            var score = CAMERA_SUBSTREAM.test(text) ? 0 : (CAMERA_MAINSTREAM.test(text) ? 2 : 1);
            var dev = ha.entityDevice[eid] || eid;
            if (!bestPerDevice[dev] || score < bestPerDevice[dev].score) { bestPerDevice[dev] = { eid: eid, score: score }; }
        });
        each(keys(bestPerDevice), function (dev) { cameras.push(bestPerDevice[dev].eid); });
        withAreaFirst(cameras);

        ha.groups = { weather: weather, temps: temps, humid: humid, solarPower: solarPower,
            solarEnergy: solarEnergy, lights: lights, switches: switches, cameras: cameras };
        ha.suggested = [].concat(weather.slice(0, 1), temps.slice(0, 4), solarPower.slice(0, 2),
            solarEnergy.slice(0, 1), humid.slice(0, 2), cameras.slice(0, 4), lights.slice(0, 8), switches.slice(0, 6));
    }

    function defaultPicks() {
        // A first set for each page: sensors on Home, lights on Controls, every camera.
        var g = ha.groups, sensors = [];
        sensors = sensors.concat(g.weather.slice(0, 1), g.temps.slice(0, 4),
            g.solarPower.slice(0, 1), g.solarEnergy.slice(0, 1), g.humid.slice(0, 2));
        return sensors.slice(0, MAX_SENSORS).concat(g.lights.slice(0, 12), g.cameras.slice(0, MAX_CAMERAS));
    }

    function haSubscribe() {
        if (!ha.connected) { return; }
        var ids = selected().slice(0);
        if (cfg.theme === 'auto' && ids.indexOf('sun.sun') < 0) { ids.push('sun.sun'); }
        // the Weather page and the effects follow the weather entity and the sun; effects also read calendars
        each([weatherEid(), 'sun.sun'].concat(cfg.season !== 'off' ? calendarEids() : []), function (e) { if (e && ids.indexOf(e) < 0) { ids.push(e); } });
        wxSubscribe();
        if (ha.subId) {
            haSend('unsubscribe_events', { subscription: ha.subId });
            ha.subId = null;
        }
        if (!ids.length) { return; }
        var id = haSend('subscribe_entities', { entity_ids: ids }, function (ok, r, err) {
            if (!ok) { ha.status = 'subscribe failed: ' + (err && err.message); renderWidgets(); }
        });
        ha.subId = id;
    }

    // subscribe_entities sends compressed states: a = added, c = changed (+ / -), r = removed
    function haApplyEvent(ev) {
        var eid, k;
        if (ev.a) {
            for (eid in ev.a) {
                if (ev.a.hasOwnProperty(eid)) { ha.states[eid] = { state: ev.a[eid].s, attributes: ev.a[eid].a || {} }; }
            }
        }
        if (ev.c) {
            for (eid in ev.c) {
                if (!ev.c.hasOwnProperty(eid) || !ha.states[eid]) { continue; }
                var cur = ha.states[eid], diff = ev.c[eid];
                if (diff['+']) {
                    if (diff['+'].s !== undefined) { cur.state = diff['+'].s; }
                    if (diff['+'].a) { for (k in diff['+'].a) { if (diff['+'].a.hasOwnProperty(k)) { cur.attributes[k] = diff['+'].a[k]; } } }
                }
                if (diff['-'] && diff['-'].a) { each(diff['-'].a, function (name) { delete cur.attributes[name]; }); }
            }
        }
        if (ev.r) { each(ev.r, function (gone) { delete ha.states[gone]; }); }
        renderWidgets();
        if (ev.a && selectedOf('camera').length) { refreshCamStills(); }
        if (cfg.season !== 'off') { updateFx(); }
        if (cfg.theme === 'auto') { applyTheme(); }
        saveCacheSoon();
    }

    // ---------------------------------------------------- formatting

    var WEATHER = {
        'clear-night': 'Clear', cloudy: 'Cloudy', exceptional: 'Alert', fog: 'Fog', hail: 'Hail',
        lightning: 'Storm', 'lightning-rainy': 'Storm', partlycloudy: 'Partly cloudy', pouring: 'Heavy rain',
        rainy: 'Rain', snowy: 'Snow', 'snowy-rainy': 'Sleet', sunny: 'Sunny', windy: 'Windy', 'windy-variant': 'Windy'
    };

    function num(n, unit) {
        var a = Math.abs(n), d;
        if (unit === '°C' || unit === '°F' || unit === '°') { d = 1; }
        else if (/^(%|W|Wh|lx|ppm|dB|dBm)$/.test(unit)) { d = 0; }
        else { d = a >= 100 ? 0 : (a >= 1 ? 1 : 2); }
        var s = n.toFixed(d);
        if (d > 0 && unit !== '°C' && unit !== '°F' && unit !== '°') { s = s.replace(/\.?0+$/, ''); }
        return s;
    }

    // -> {value, unit, note, dim}
    function formatState(eid) {
        var st = ha.states[eid];
        if (!st) { return { value: '–', unit: '', note: '', dim: true }; }
        var s = st.state, a = st.attributes || {}, d = domainOf(eid), u, n;
        if (s === 'unavailable' || s === 'unknown') { return { value: '–', unit: '', note: '', dim: true }; }
        if (d === 'weather') {
            return { value: a.temperature !== undefined ? num(+a.temperature, '°') : '', unit: '°',
                note: WEATHER[s] || cap(s.replace(/-/g, ' ')) };
        }
        if (d === 'climate') {
            return { value: a.current_temperature !== undefined ? num(+a.current_temperature, '°') : '–', unit: '°',
                note: a.hvac_action ? cap(String(a.hvac_action).replace(/_/g, ' ')) : '' };
        }
        if (d === 'binary_sensor') {
            var on = s === 'on', dc = a.device_class;
            var pair = /door|window|opening|garage/.test(dc || '') ? ['Open', 'Closed']
                : /motion|occupancy|presence/.test(dc || '') ? ['Detected', 'Clear']
                : dc === 'moisture' ? ['Wet', 'Dry'] : ['On', 'Off'];
            return { value: on ? pair[0] : pair[1], unit: '', note: '', text: true };
        }
        n = parseFloat(s);
        u = a.unit_of_measurement || '';
        if (isNaN(n) || !/^-?[\d.]+(e[-+]?\d+)?$/i.test(s)) { return { value: cap(s), unit: '', note: '', text: true }; }
        if (u === 'W' && Math.abs(n) >= 1000) { n = n / 1000; u = 'kW'; }
        if (u === 'Wh' && Math.abs(n) >= 1000) { n = n / 1000; u = 'kWh'; }
        if (u === '°C' || u === '°F') { return { value: num(n, u), unit: '°', note: '' }; }
        return { value: num(n, u), unit: u, note: '' };
    }

    var GENERIC = /^(temperature|temp|sensor|thermometer|climate|thermostat|lights?|switch|plug|socket)$/i;   // "humidity" stays, so it isn't mistaken for the temperature

    function displayName(eid) {
        var st = ha.states[eid];
        var name = (st && st.attributes && st.attributes.friendly_name) || cap(eid.split('.')[1].replace(/_/g, ' '));
        var area = areaOf(eid);
        // the default name of HA's weather integrations says nothing on a TV
        if (domainOf(eid) === 'weather' && /^(forecast\b.*|home|weather)$/i.test(name)) { return 'Outside'; }
        if (domainOf(eid) === 'camera') { return name.replace(CAMERA_SUFFIX, '') || area || name; }
        if (area && name.toLowerCase().indexOf(area.toLowerCase()) === 0) {
            var rest = name.slice(area.length).replace(/^[\s\-:]+/, '');
            if (!rest || GENERIC.test(rest)) { return area; }
            if (kindOf(eid) === 'button') { return rest; }
        }
        if (area && GENERIC.test(name)) { return area; }
        return name;
    }

    function isOn(eid) {
        var st = ha.states[eid];
        return !!st && st.state === 'on';
    }

    // A light can be dimmed unless Home Assistant says it only does on/off.
    function isDimmable(eid) {
        if (domainOf(eid) !== 'light') { return false; }
        var st = ha.states[eid], a = (st && st.attributes) || {};
        var modes = a.supported_color_modes;
        if (modes && modes.length) { return !(modes.length === 1 && modes[0] === 'onoff'); }
        return a.brightness !== undefined && a.brightness !== null;
    }

    // 0 to 100; 0 when off.
    function brightnessPct(eid) {
        var st = ha.states[eid];
        if (!st || st.state !== 'on') { return 0; }
        var b = st.attributes && st.attributes.brightness;
        return (b === undefined || b === null) ? 100 : Math.max(1, Math.round(b / 2.55));
    }

    // ================================================================== pages
    //
    // Three pages side by side that slide: Home (sensor cards + app dock), Controls (lights
    // and switches as tiles, grouped by room) and Cameras (stills in a grid that adapts to
    // how many there are). Right on the last item, Left on the first, or OK on the round
    // arrows at the screen edges, slides to the next page.

    var PAGES = ['Home', 'Controls', 'Weather', 'Cameras'];
    var P_CTL = 1, P_WX = 2, P_CAM = 3;           // page numbers by name, so the order is set in one place
    var page = 0;
    var sel = ['dock', null, null, null];     // focus per page: 'dock', 'edge:l', 'edge:r', 'eid:<id>', 'cam:<id>', 'day:<n>'
    var selBeforeEdge = [null, null, null, null];
    var pageTimer = null;

    function hasSide(p, side) { return side === 'l' ? p > 0 : p < PAGES.length - 1; }

    function showPage(p) {
        if (p < 0 || p >= PAGES.length || p === page) { return; }
        var dir = p > page ? 1 : -1;
        page = p;
        var s = sel[p];
        if (!s || s.indexOf('edge:') === 0 || (p > 0 && !itemByKey(p, s))) {
            var items = itemsOf(p);
            sel[p] = p === 0 ? 'dock'
                : (items.length ? items[0].key : 'edge:' + (hasSide(p, dir > 0 ? 'r' : 'l') ? (dir > 0 ? 'r' : 'l') : (dir > 0 ? 'l' : 'r')));
        }
        if (p === 0 && dir < 0 && sel[0] === 'dock') { focus = tiles.length - 1; }   // back from Controls: the dock's last tile
        each(document.querySelectorAll('#pages .page'), function (el) { el.style.visibility = 'visible'; });
        $('pages').style.transform = 'translate3d(' + (-1920 * p) + 'px,0,0)';
        clearTimeout(pageTimer);
        pageTimer = setTimeout(function () {       // only the visible page stays drawn
            each(document.querySelectorAll('#pages .page'), function (el, i) { el.style.visibility = i === page ? 'visible' : 'hidden'; });
        }, 450);
        renderChrome();
        renderWidgets();
        refreshCamStills();
        updateFx();
    }

    // Tabs, dots, edge arrows and the darker veil behind Controls and Cameras.
    function renderChrome() {
        var t = '', d = '';
        each(PAGES, function (name, i) {
            t += '<div class="tab' + (i === page ? ' on' : '') + '">' + name + '</div>';
            d += '<i' + (i === page ? ' class="on"' : '') + '></i>';
        });
        $('tabs').innerHTML = t;
        $('dots').innerHTML = d;
        $('veil').className = page ? 'on' : '';
        $('edgeL').innerHTML = '<span class="chev">&lsaquo;</span><span class="lbl">' + (PAGES[page - 1] || '') + '</span>';
        $('edgeR').innerHTML = '<span class="lbl">' + (PAGES[page + 1] || '') + '</span><span class="chev">&rsaquo;</span>';
    }

    // Focusable items of a page, in the page's own coordinates (unaffected by scrolling).
    function itemsOf(p) {
        var out = [];
        var nodes = p === P_CTL ? document.querySelectorAll('#ctlTrack .ctl') : p === P_CAM ? document.querySelectorAll('#camArea .camtile')
            : p === P_WX ? document.querySelectorAll('#wxArea .wday') : [];
        each(nodes, function (el) {
            out.push({ key: el.getAttribute('data-key'), el: el, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
        });
        return out;
    }

    function itemByKey(p, key) {
        var items = itemsOf(p);
        for (var i = 0; i < items.length; i++) { if (items[i].key === key) { return items[i]; } }
        return null;
    }

    function applyFocus() {
        var s = sel[page];
        renderDock();
        $('edgeL').className = 'edge l' + (hasSide(page, 'l') ? '' : ' off') + (s === 'edge:l' ? ' focused' : '');
        $('edgeR').className = 'edge r' + (hasSide(page, 'r') ? '' : ' off') + (s === 'edge:r' ? ' focused' : '');
        each(document.querySelectorAll('#ctlTrack .ctl'), function (el) { setFocused(el, page === 1 && el.getAttribute('data-key') === sel[1]); });
        each(document.querySelectorAll('#camArea .camtile'), function (el) { setFocused(el, page === P_CAM && el.getAttribute('data-key') === sel[P_CAM]); });
        each(document.querySelectorAll('#wxArea .wday'), function (el) { setFocused(el, page === P_WX && el.getAttribute('data-key') === sel[P_WX]); });
        if (page === 1) { scrollControls(); maybeDimHint(); }
        if (page === P_WX) { wxFollowFocus(); }
    }

    function toEdge(side) {
        if (!hasSide(page, side)) { return; }
        if (sel[page] && sel[page].indexOf('edge:') !== 0) { selBeforeEdge[page] = sel[page]; }
        sel[page] = 'edge:' + side;
        applyFocus();
    }

    // Arrow keys on Controls and Cameras: the nearest item in that direction. Left / Right
    // stay in the same row; past the end of a row they go to the round arrow at the edge.
    function moveSpatial(dx, dy) {
        var items = itemsOf(page), cur = null, best = null, bestScore = 1e9;
        each(items, function (it) { if (it.key === sel[page]) { cur = it; } });
        if (!cur) {
            if (items.length) { sel[page] = items[0].key; applyFocus(); }
            else if (dx) { toEdge(dx > 0 ? 'r' : 'l'); }
            return;
        }
        var cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
        each(items, function (it) {
            if (it === cur) { return; }
            var ix = it.x + it.w / 2, iy = it.y + it.h / 2, score;
            if (dx) {
                if ((ix - cx) * dx <= 4) { return; }
                if (!(it.y < cur.y + cur.h - 4 && it.y + it.h > cur.y + 4)) { return; }   // same row only
                score = Math.abs(ix - cx);
            } else {
                if ((iy - cy) * dy <= 4) { return; }
                var sameColumn = it.x < cur.x + cur.w - 4 && it.x + it.w > cur.x + 4;
                score = Math.abs(iy - cy) + (sameColumn ? 0 : 1000) + Math.abs(ix - cx) * 0.5;
            }
            if (score < bestScore) { bestScore = score; best = it; }
        });
        if (best) { sel[page] = best.key; applyFocus(); }
        else if (dx) { toEdge(dx > 0 ? 'r' : 'l'); }
    }

    // Keys while the pages are showing (no panel open). Returns false if not used.
    function onPageKey(k) {
        var s = sel[page] || '';
        if (s.indexOf('edge:') === 0) {
            var right = s === 'edge:r';
            if (k === KEY.ENTER || (right && k === KEY.RIGHT) || (!right && k === KEY.LEFT)) { showPage(page + (right ? 1 : -1)); }
            else if ((right && k === KEY.LEFT) || (!right && k === KEY.RIGHT)) {
                sel[page] = selBeforeEdge[page] && (page === 0 || itemByKey(page, selBeforeEdge[page])) ? selBeforeEdge[page]
                    : (page === 0 ? 'dock' : (itemsOf(page)[0] || {}).key || s);
                applyFocus();
            } else if (isBack(k) && page > 0) { showPage(0); }
            else if (k !== KEY.UP && k !== KEY.DOWN) { return false; }
            return true;
        }
        if (page === 0) {
            if (k === KEY.LEFT) { if (focus > 0) { focus--; renderDock(); } }
            else if (k === KEY.RIGHT) { if (focus < tiles.length - 1) { focus++; renderDock(); } else { toEdge('r'); } }
            else if (k === KEY.ENTER) { activateTile(tiles[focus]); }
            else if (isBack(k)) { /* home screen: Back does nothing; Home and Exit still work */ }
            else { return false; }
            return true;
        }
        if (k === KEY.LEFT) { moveSpatial(-1, 0); }
        else if (k === KEY.RIGHT) { moveSpatial(1, 0); }
        else if (k === KEY.UP) { moveSpatial(0, -1); }
        else if (k === KEY.DOWN) { moveSpatial(0, 1); }
        else if (isBack(k)) { showPage(0); }
        else if (page === 1 && k === KEY.ENTER) { if (s.indexOf('eid:') === 0) { toggleEid(s.slice(4)); } }
        else if (page === 1 && (k === KEY.CH_UP || k === KEY.PAGE_UP)) { nudgeBrightness(1); }
        else if (page === 1 && (k === KEY.CH_DOWN || k === KEY.PAGE_DOWN)) { nudgeBrightness(-1); }
        else if (page === P_CAM && k === KEY.ENTER) { if (s.indexOf('cam:') === 0) { openCamera(s.slice(4)); } }
        else { return false; }
        return true;
    }

    function emptyHtml(what, where) {
        var why = !H.ha().token ? 'Add a long-lived access token to shell-config.js (see the README) to use Home Assistant.'
            : 'Choose ' + what + ' in Settings &gt; Home Assistant widgets. They appear on this page' + where + '.';
        return '<div class="empty">' + why + '</div>';
    }

    // ---------------------------------------------------- rendering

    function renderWidgets() {
        var stale = !ha.connected;
        $('haStatus').textContent = stale && H.ha().token ? (ha.authFailed ? 'Home Assistant token rejected' : 'Home Assistant offline') : '';
        $('haStatus').className = $('haStatus').textContent ? 'show' : '';
        renderHome(stale);
        renderControls(stale);
        renderCameras(stale);
        renderWeather(stale);
        applyFocus();
        buildDock();
    }

    // Home: up to 15 sensor cards, five to a row.
    function renderHome(stale) {
        var sensors = selectedOf('sensor').slice(0, MAX_SENSORS), html = '', anyKnown = false;
        each(sensors, function (eid) {
            var f = formatState(eid);
            if (ha.states[eid]) { anyKnown = true; }
            html += '<div class="scard' + (f.dim ? ' dim' : '') + (f.text ? ' text' : '') + '">' +
                '<div class="val">' + esc(f.value) + (f.unit === '°' ? '°' : (f.unit ? '<span class="unit">' + esc(f.unit) + '</span>' : '')) + '</div>' +
                '<div class="name">' + esc(displayName(eid)) + (f.note ? ' <span class="note">' + esc(f.note) + '</span>' : '') + '</div></div>';
        });
        var box = $('sensors');
        box.innerHTML = html;
        box.hidden = !sensors.length || !anyKnown;
        box.className = stale ? 'stale' : '';
    }

    // ---------------------------------------------------- Controls page

    function ctlIcon(eid) {
        var d = domainOf(eid);
        return d === 'light' ? 'bulb' : d === 'fan' ? 'fan' : 'power';
    }

    function ctlState(eid) {
        var st = ha.states[eid];
        if (!st) { return '–'; }
        if (st.state === 'unavailable' || st.state === 'unknown') { return 'Unavailable'; }
        if (st.state === 'on') { return isDimmable(eid) ? 'On · ' + brightnessPct(eid) + '%' : 'On'; }
        if (st.state === 'off') { return 'Off'; }
        return cap(st.state);
    }

    // Rooms A to Z (no room last, as "Other"), buttons in the order you picked them.
    function roomsOf(eids) {
        var byArea = {}, names = [];
        each(eids, function (eid) {
            var a = areaOf(eid) || '';
            if (!byArea[a]) { byArea[a] = []; names.push(a); }
            byArea[a].push(eid);
        });
        names.sort(function (x, y) {
            if (!x) { return 1; }
            if (!y) { return -1; }
            return x.toLowerCase() < y.toLowerCase() ? -1 : 1;
        });
        var out = [];
        each(names, function (a) { out.push({ name: a || 'Other', eids: byArea[a] }); });
        return out;
    }

    function renderControls(stale) {
        var buttons = selectedOf('button').slice(0, MAX_BUTTONS), html = '';
        if (!buttons.length) {
            html = emptyHtml('lights and switches', '');
        } else {
            each(roomsOf(buttons), function (room) {
                html += '<div class="room"><h3>' + esc(room.name) + '</h3><div class="ts">';
                each(room.eids, function (eid) {
                    var st = ha.states[eid];
                    var unav = !st || st.state === 'unavailable';
                    var on = isOn(eid), dimmable = !unav && isDimmable(eid);
                    html += '<div class="ctl' + (on ? ' on' : '') + (unav ? ' unav' : '') + (dimmable ? ' dimmable' : '') +
                        '" data-key="eid:' + esc(eid) + '"><div class="ic">' + GLYPHS[ctlIcon(eid)] + '</div>' +
                        '<div class="txt"><div class="nm">' + esc(displayName(eid)) + '</div><div class="st">' + esc(ctlState(eid)) + '</div></div>' +
                        (dimmable && on ? '<div class="bar"><b style="width:' + brightnessPct(eid) + '%"></b></div>' : '') + '</div>';
                });
                html += '</div></div>';
            });
        }
        $('ctlTrack').innerHTML = html;
        $('ctlArea').className = stale ? 'stale' : '';
        var s = sel[1];
        if (s && s.indexOf('eid:') === 0 && !itemByKey(1, s)) { sel[1] = null; }
        if (!sel[1] && page === 1) {
            var items = itemsOf(1);
            sel[1] = items.length ? items[0].key : 'edge:r';
        }
    }

    // Keeps the focused tile (and its room title) in view; fades the edge where more rows continue.
    function scrollControls() {
        var box = $('ctlArea'), track = $('ctlTrack');
        var boxH = box.clientHeight, trackH = track.offsetHeight, y = 0;
        var it = sel[1] && sel[1].indexOf('eid:') === 0 ? itemByKey(1, sel[1]) : null;
        if (trackH > boxH && it) {
            var room = it.el.parentNode.parentNode;
            var top = it.y - room.offsetTop < 80 ? room.offsetTop : it.y;
            y = Math.round(boxH / 2 - (top + (it.y + it.h - top) / 2));
            y = Math.max(boxH - trackH, Math.min(0, y));
        } else if (trackH > boxH) {
            y = parseInt((track.style.transform.match(/,\s*(-?\d+)px/) || [0, 0])[1], 10) || 0;
        }
        track.style.transform = 'translate3d(0,' + y + 'px,0)';
        var above = y < 0, below = y + trackH > boxH + 1;
        $('ctlMoreU').className = 'dockMore vmore' + (above ? ' show' : '');
        $('ctlMoreD').className = 'dockMore vmore' + (below ? ' show' : '');
        box.className = box.className.replace(/\s*fade-[tb]/g, '') + (above ? ' fade-t' : '') + (below ? ' fade-b' : '');
    }

    // One-time tip the first time a dimmable light is focused on Controls.
    function maybeDimHint() {
        if (mode !== 'dock' || H.get('dimHintShownCtl', false)) { return; }
        var s = sel[1];
        if (s && s.indexOf('eid:') === 0 && isDimmable(s.slice(4))) {
            H.set('dimHintShownCtl', true);
            toast('Press CH + / CH - to change the brightness', 4500);
        }
    }

    // ---------------------------------------------------- weather page
    //
    // The 4th page: the weather entity's forecast from Home Assistant (weather/subscribe_forecast:
    // daily, plus hourly for style B). Settings > Weather style:
    //   A  a large card for now or the focused day, and seven day columns
    //   B  now or the focused day on top, the next 24 hours as a chart, and the week as a strip
    // Left / Right move along the days and the large card follows. Units come from Home Assistant.

    var wx = { eid: null, daily: null, hourly: null, subDaily: null, subHourly: null, hourlyFailed: false, dailyError: '', html: '', heroDay: -1 };

    function wxSubscribe() {
        var eid = weatherEid();
        if (eid !== wx.eid) {
            wxUnsubscribe();
            wx.eid = eid;
            wx.daily = wx.hourly = null;
            wx.hourlyFailed = false;
            wx.dailyError = '';
            renderWeather(!ha.connected);
        }
        if (!eid || !ha.connected) { return; }
        if (!wx.subDaily && !wx.dailyError) { wx.subDaily = wxSub(eid, 'daily'); }
        if (cfg.wxStyle === 'b' && !wx.subHourly && !wx.hourlyFailed) { wx.subHourly = wxSub(eid, 'hourly'); }
        if (cfg.wxStyle !== 'b' && wx.subHourly) {
            haSend('unsubscribe_events', { subscription: wx.subHourly });
            wx.subHourly = null;
            wx.hourly = null;
        }
    }

    function wxSub(eid, type) {
        return haSend('weather/subscribe_forecast', { entity_id: eid, forecast_type: type }, function (ok, r, err) {
            if (ok || !ha.connected) { return; }                    // a dropped connection is not "no forecast"
            if (type === 'hourly') { wx.hourlyFailed = true; wx.subHourly = null; }
            else { wx.dailyError = (err && err.message) || 'no forecast'; wx.subDaily = null; }
            renderWeather(false);
        });
    }

    function wxUnsubscribe() {
        each([wx.subDaily, wx.subHourly], function (id) { if (id && ha.connected) { haSend('unsubscribe_events', { subscription: id }); } });
        wx.subDaily = wx.subHourly = null;
    }

    function wxEvent(msg) {
        var list = (msg.event && msg.event.forecast) || [];
        if (msg.id === wx.subDaily) { wx.daily = list; } else { wx.hourly = list; }
        renderWeather(!ha.connected);
    }

    // ---------------------------------------------------- icons (classes carry the colours, per theme)

    function wxSunSvg(cx, cy, r) {
        var s = '<circle class="wi-sun" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
        for (var i = 0; i < 8; i++) {
            var a = i * Math.PI / 4, c = Math.cos(a), si = Math.sin(a);
            s += '<line class="wi-ray" x1="' + n1(cx + c * (r + 6)) + '" y1="' + n1(cy + si * (r + 6)) + '" x2="' + n1(cx + c * (r + 13)) +
                '" y2="' + n1(cy + si * (r + 13)) + '"/>';
        }
        return s;
    }

    function wxCloudSvg(x, y, s, cls) {
        return '<path class="' + (cls || 'wi-cloud') + '" transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M14 40h44a14 14 0 0 0 1-28 20 20 0 0 0-38-4A16 16 0 0 0 14 40z"/>';
    }

    function wxLinesSvg(n, x0, y0, len, slant) {
        var s = '';
        for (var i = 0; i < n; i++) {
            var x = x0 + i * (n > 3 ? 11 : 15);
            s += '<line class="wi-rain" x1="' + x + '" y1="' + y0 + '" x2="' + (x - slant) + '" y2="' + (y0 + len) + '"/>';
        }
        return s;
    }

    function wxIcon(cond) {
        var b;
        if (cond === 'sunny') { b = wxSunSvg(50, 50, 20); }
        else if (cond === 'clear-night') { b = '<path class="wi-sun" d="M62 18a30 30 0 1 0 22 46A26 26 0 0 1 62 18z"/>'; }
        else if (cond === 'partlycloudy') { b = wxSunSvg(36, 36, 15) + wxCloudSvg(18, 38, 0.95); }
        else if (cond === 'rainy') { b = wxCloudSvg(12, 14, 1) + wxLinesSvg(3, 34, 64, 16, 5); }
        else if (cond === 'pouring') { b = wxCloudSvg(12, 14, 1) + wxLinesSvg(5, 28, 62, 22, 6); }
        else if (cond === 'lightning' || cond === 'lightning-rainy') {
            b = wxCloudSvg(12, 14, 1) + '<path class="wi-sun" d="M50 56h12l-8 14h10L46 92l6-16h-9z"/>' + (cond === 'lightning-rainy' ? wxLinesSvg(2, 30, 64, 14, 4) : '');
        } else if (cond === 'snowy' || cond === 'snowy-rainy' || cond === 'hail') {
            b = wxCloudSvg(12, 14, 1) + '<circle class="wi-snow" cx="34" cy="72" r="4"/><circle class="wi-snow" cx="50" cy="80" r="4"/><circle class="wi-snow" cx="66" cy="72" r="4"/>' +
                (cond === 'snowy-rainy' ? wxLinesSvg(1, 58, 76, 12, 3) : '');
        } else if (cond === 'fog') {
            b = '<line class="wi-fog" x1="18" y1="40" x2="82" y2="40"/><line class="wi-fog" x1="26" y1="56" x2="90" y2="56"/><line class="wi-fog" x1="12" y1="72" x2="70" y2="72"/>';
        } else if (cond === 'windy' || cond === 'windy-variant') {
            b = '<path class="wi-fog" d="M14 40h48a10 10 0 1 0-10-10M14 58h62a10 10 0 1 1-10 10M20 76h30"/>';
        } else { b = wxCloudSvg(30, 20, 0.8, 'wi-cloud2') + wxCloudSvg(10, 36, 1); }   // cloudy, exceptional, unknown
        return '<svg class="wi" viewBox="0 0 100 100">' + b + '</svg>';
    }

    var DROP_SVG = '<svg class="drp" viewBox="0 0 18 22"><path d="M9 1C6 6 2 10 2 14a7 7 0 0 0 14 0c0-4-4-8-7-13z"/></svg>';

    // ---------------------------------------------------- formatting

    function compass(b) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((+b) % 360) + 360) % 360 / 45) % 8]; }
    function rnum(v) { return v === undefined || v === null || isNaN(+v) ? null : Math.round(+v); }
    function hhmm(d) {
        var h = d.getHours();
        return cfg.clock24 ? pad(h) + ':' + pad(d.getMinutes()) : ((h + 11) % 12 + 1) + (d.getMinutes() ? ':' + pad(d.getMinutes()) : '') + (h < 12 ? ' AM' : ' PM');
    }

    function wxDayLabel(f, i) {
        var d = new Date(f.datetime), today = new Date();
        var isToday = d.toDateString() === today.toDateString();
        return { name: isToday ? 'Today' : DAYS[d.getDay()].slice(0, 3), date: d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3),
            long: isToday ? 'Today' : DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3), today: isToday, idx: i };
    }

    function wxAttrs() { var st = wx.eid && ha.states[wx.eid]; return (st && st.attributes) || {}; }

    function wxUnits() {
        var a = wxAttrs();
        return { wind: a.wind_speed_unit || 'km/h', rain: a.precipitation_unit || 'mm' };
    }

    // Details for the large card: index 0 that is today shows the current conditions.
    function wxDetail(i) {
        var days = (wx.daily || []).slice(0, 7), f = days[i] || {}, a = wxAttrs(), u = wxUnits(), lab = days[i] ? wxDayLabel(f, i) : { today: true, long: 'Now' };
        var now = i === 0 && lab.today, st = ha.states[wx.eid] || {}, rows = [];
        var hi = rnum(f.temperature), lo = rnum(f.templow);
        var cond = now ? st.state : f.condition;
        if (hi !== null) { rows.push(['High / low', hi + '°' + (lo !== null ? ' / ' + lo + '°' : '')]); }
        var pp = rnum(f.precipitation_probability);
        if (pp !== null || f.precipitation) {
            rows.push(['Rain', (pp !== null ? pp + '%' : '') + (f.precipitation ? (pp !== null ? ' · ' : '') + f.precipitation + ' ' + u.rain : '')]);
        }
        var ws = rnum(now ? a.wind_speed : f.wind_speed), wb = now ? a.wind_bearing : f.wind_bearing;
        if (ws !== null) { rows.push(['Wind', ws + ' ' + u.wind + (wb !== undefined && wb !== null ? ' ' + compass(wb) : '')]); }
        var hum = rnum(now ? a.humidity : f.humidity);
        if (hum !== null) { rows.push(['Humidity', hum + '%']); }
        var sun = ha.states['sun.sun'], sa = (sun && sun.attributes) || {};
        if (now && sa.next_rising && sa.next_setting) { rows.push(['Sunrise / sunset', hhmm(new Date(sa.next_rising)) + ' / ' + hhmm(new Date(sa.next_setting))]); }
        if (now && rnum(a.uv_index) !== null) { rows.push(['UV index', rnum(a.uv_index)]); }
        var feels = rnum(a.apparent_temperature);
        return {
            title: now ? 'Now' : lab.long, cond: cond, label: WEATHER[cond] || cap(cond || ''),
            temp: now ? rnum(a.temperature) : hi,
            sub: now ? (feels !== null ? 'Feels like ' + feels + '°' : (hi !== null ? 'High ' + hi + '° · Low ' + lo + '°' : ''))
                : (hi !== null ? 'High ' + hi + '°' + (lo !== null ? ' · Low ' + lo + '°' : '') : ''),
            rows: rows
        };
    }

    function wxFocusedDay() {
        var s = sel[P_WX] || '';
        return s.indexOf('day:') === 0 ? +s.slice(4) : 0;
    }

    // ---------------------------------------------------- rendering

    function wxHeroHtml(i, style) {
        var d = wxDetail(i), rows = '';
        each(d.rows, function (r) { rows += '<div class="wrow"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; });
        if (style === 'b') {
            return '<div class="wnowIc">' + wxIcon(d.cond) + '</div><div class="wnowT">' + (d.temp !== null ? d.temp + '°' : '–') + '</div>' +
                '<div class="wnowC"><div class="wwhen">' + esc(d.title) + '</div><div class="wcond">' + esc(d.label) + '</div><div class="wsub">' + esc(d.sub) + '</div></div>' +
                '<div class="wnowRows">' + rows + '</div>';
        }
        return '<div class="wwhen">' + esc(d.title) + '</div><div class="wbig">' + wxIcon(d.cond) + '<div class="wtemp">' + (d.temp !== null ? d.temp + '°' : '–') + '</div></div>' +
            '<div class="wcond">' + esc(d.label) + '</div><div class="wsub">' + esc(d.sub) + '</div><div class="wrows">' + rows + '</div>';
    }

    function wxWeekA(days) {
        var lo = 1e9, hi = -1e9, html = '';
        each(days, function (f) { lo = Math.min(lo, rnum(f.templow) !== null ? +f.templow : +f.temperature); hi = Math.max(hi, +f.temperature); });
        var span = Math.max(1, hi - lo), u = wxUnits();
        each(days, function (f, i) {
            var lab = wxDayLabel(f, i), t = rnum(f.temperature), l = rnum(f.templow), pp = rnum(f.precipitation_probability), ws = rnum(f.wind_speed);
            var top = (hi - f.temperature) / span * 100, bot = ((l !== null ? f.templow : f.temperature) - lo) / span * 100;
            html += '<div class="wday wcol" data-key="day:' + i + '"><div class="dn">' + lab.name + '</div><div class="dd">' + lab.date + '</div>' +
                wxIcon(f.condition) + '<div class="hi">' + (t !== null ? t + '°' : '–') + '</div>' +
                '<div class="range"><b style="top:' + n1(top) + '%;bottom:' + n1(bot) + '%"></b></div>' +
                '<div class="lo">' + (l !== null ? l + '°' : '') + '</div>' +
                '<div class="pp">' + (pp !== null ? DROP_SVG + pp + '%' : '') + '</div><div class="wind">' + (ws !== null ? ws + ' ' + u.wind : '') + '</div></div>';
        });
        return html;
    }

    function wxStripB(days) {
        var html = '';
        each(days, function (f, i) {
            var lab = wxDayLabel(f, i), t = rnum(f.temperature), l = rnum(f.templow), pp = rnum(f.precipitation_probability);
            html += '<div class="wday wcard" data-key="day:' + i + '"><div class="dn">' + lab.name + '</div>' + wxIcon(f.condition) +
                '<div class="t">' + (t !== null ? t + '°' : '–') + (l !== null ? ' <span>' + l + '°</span>' : '') + '</div>' +
                '<div class="pp">' + (pp !== null ? pp + '% rain' : '') + '</div></div>';
        });
        return html;
    }

    // Next 24 hours: temperature line with labels and icons every 3 hours, rain chance as bars.
    function wxHoursSvg() {
        var now = Date.now() - 3600000, list = [];
        each(wx.hourly || [], function (f) { if (list.length < 24 && new Date(f.datetime).getTime() >= now) { list.push(f); } });
        if (list.length < 4) { return '<div class="wnote">' + (wx.hourlyFailed ? 'This weather service has no hourly forecast.' : 'Loading the hourly forecast...') + '</div>'; }
        var W = 1620, x0 = 30, step = (W - 60) / (list.length - 1), lo = 1e9, hi = -1e9;
        each(list, function (f) { lo = Math.min(lo, +f.temperature); hi = Math.max(hi, +f.temperature); });
        var span = Math.max(4, hi - lo);
        function y(t) { return 178 - (t - lo) / span * 84; }
        var path = '', svg = '<svg class="whours" width="' + W + '" height="250" viewBox="0 0 ' + W + ' 250">';
        each(list, function (f, i) { path += (i ? 'L' : 'M') + n1(x0 + i * step) + ' ' + n1(y(+f.temperature)); });
        svg += '<path class="wfill" d="' + path + 'L' + n1(x0 + (list.length - 1) * step) + ' 190 L' + x0 + ' 190 Z"/><path class="wline" d="' + path + '"/>';
        each(list, function (f, i) {
            var pp = rnum(f.precipitation_probability);
            if (pp !== null) { var h = Math.max(4, pp * 0.36); svg += '<rect class="wbar" x="' + n1(x0 + i * step - 9) + '" y="' + n1(250 - h) + '" width="18" height="' + n1(h) + '" rx="4"/>'; }
        });
        each(list, function (f, i) {
            if (i % 3) { return; }
            var x = x0 + i * step, yy = y(+f.temperature);
            svg += '<text class="wtt" x="' + n1(x) + '" y="' + n1(yy - 16) + '">' + rnum(f.temperature) + '°</text>' +
                '<text class="wht" x="' + n1(x) + '" y="214">' + (i === 0 ? 'Now' : hhmm(new Date(f.datetime))) + '</text>' +
                '<g transform="translate(' + n1(x + 22) + ' ' + n1(yy - 52) + ') scale(.4)">' + wxIcon(f.condition).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</g>';
        });
        return svg + '</svg>';
    }

    function renderWeather(stale) {
        var area = $('wxArea'), html, style = cfg.wxStyle === 'b' ? 'b' : 'a';
        var days = (wx.daily || []).slice(0, 7);
        if (!H.ha().token) { html = emptyHtml('', ''); }
        else if (!wx.eid) {
            html = '<div class="empty">' + (ha.connected ? 'No weather entity in Home Assistant. Add a weather integration (Met.no works well) to see the forecast here.'
                : 'Waiting for Home Assistant...') + '</div>';
        } else if (wx.dailyError) { html = '<div class="empty">' + esc(wx.eid) + ' has no daily forecast (' + esc(wx.dailyError) + ').</div>'; }
        else if (!days.length) { html = '<div class="empty">Loading the forecast...</div>'; }
        else {
            var i = Math.min(wxFocusedDay(), days.length - 1);
            wx.heroDay = i;
            html = style === 'a'
                ? '<div class="wxA"><div class="wcard2 whero" id="wxHero">' + wxHeroHtml(i, 'a') + '</div><div class="wweek">' + wxWeekA(days) + '</div></div>'
                : '<div class="wxB"><div class="wcard2 wnow" id="wxHero">' + wxHeroHtml(i, 'b') + '</div>' +
                  '<div class="wcard2 whrs"><h4>Next 24 hours</h4>' + wxHoursSvg() + '</div><div class="wstrip">' + wxStripB(days) + '</div></div>';
        }
        html += '<div class="wsrc">' + esc(wx.eid || '') + '</div>';
        area.className = stale ? 'stale' : '';
        if (html !== wx.html) {
            wx.html = html;
            area.innerHTML = html;
            var s = sel[P_WX];
            if (s && s.indexOf('day:') === 0 && !itemByKey(P_WX, s)) { sel[P_WX] = null; }
            if (!sel[P_WX] && page === P_WX) { var items = itemsOf(P_WX); sel[P_WX] = items.length ? items[0].key : 'edge:l'; }
            if (page === P_WX) { applyFocus(); }
        }
    }

    // The large card follows the focused day.
    function wxFollowFocus() {
        var hero = $('wxHero'), i = wxFocusedDay();
        if (!hero || i === wx.heroDay) { return; }
        wx.heroDay = i;
        hero.innerHTML = wxHeroHtml(i, cfg.wxStyle === 'b' ? 'b' : 'a');
    }

    function wxStatus() {
        if (!wx.eid) { return 'no weather entity'; }
        return wx.eid + ' · ' + (wx.daily ? wx.daily.length + ' days' : wx.dailyError ? 'no forecast' : 'waiting for the forecast') +
            (cfg.wxStyle === 'b' ? (wx.hourly ? ' · ' + wx.hourly.length + ' hours' : wx.hourlyFailed ? ' · no hourly forecast' : '') : '');
    }

    // ---------------------------------------------------- brightness
    //
    // CH + / CH - on a dimmable light: 10 % steps, down to 1 %, then off. The tile shows the
    // level as you press; HA gets one update 350 ms after the last press.

    var dim = { eid: null, pct: 0, timer: null, idle: null };

    function canDim(eid) {
        if (!eid) { return false; }
        if (!isDimmable(eid)) { toast(displayName(eid) + ' can only be switched on and off'); return false; }
        if (!ha.connected) { toast(ha.authFailed ? 'Home Assistant rejected the token' : 'Home Assistant is not connected'); return false; }
        return true;
    }

    function nudgeBrightness(dir) {
        var s = sel[1] || '';
        if (s.indexOf('eid:') !== 0) { return; }
        var eid = s.slice(4);
        if (!canDim(eid)) { return; }
        if (dim.eid !== eid) { flushDimmer(); dim.eid = eid; dim.pct = brightnessPct(eid); }
        stepDimmer(dir);
        clearTimeout(dim.idle);
        dim.idle = setTimeout(function () { flushDimmer(); dim.eid = null; }, 2500);
    }

    function flushDimmer() {
        if (dim.timer) { clearTimeout(dim.timer); dim.timer = null; sendDimmer(); }
    }

    function stepDimmer(dir) {
        var p = dim.pct;
        if (dir > 0) { p = p < 10 ? 10 : Math.min(100, Math.floor(p / 10) * 10 + 10); }
        else { p = p <= 10 ? (p > 1 ? 1 : 0) : Math.ceil(p / 10) * 10 - 10; }
        dim.pct = p;
        var st = ha.states[dim.eid];
        if (st) {                                       // optimistic, so the tile follows at once
            st.state = p ? 'on' : 'off';
            if (p) { st.attributes.brightness = Math.round(p * 2.55); }
        }
        clearTimeout(dim.timer);
        dim.timer = setTimeout(function () { dim.timer = null; sendDimmer(); }, 350);
        renderWidgets();
    }

    function sendDimmer() {
        var eid = dim.eid, p = dim.pct;
        if (!eid) { return; }
        var req = p ? { domain: 'light', service: 'turn_on', service_data: { brightness_pct: p }, target: { entity_id: eid } }
            : { domain: 'light', service: 'turn_off', target: { entity_id: eid } };
        haSend('call_service', req, function (ok, r, err) {
            if (!ok) { toast('Could not dim ' + displayName(eid) + ': ' + ((err && err.message) || 'error'), 4000); }
        });
    }

    function toggleEid(eid) {
        if (!eid) { return; }
        if (!ha.connected) { toast(ha.authFailed ? 'Home Assistant rejected the token' : 'Home Assistant is not connected'); return; }
        var st = ha.states[eid];
        if (!st || st.state === 'unavailable') { toast(displayName(eid) + ' is unavailable'); return; }
        var was = st.state, turnOn = was !== 'on';
        st.state = turnOn ? 'on' : 'off';          // optimistic; HA pushes the real state
        renderWidgets();
        haSend('call_service', { domain: domainOf(eid), service: turnOn ? 'turn_on' : 'turn_off', target: { entity_id: eid } },
            function (ok, r, err) {
                if (ok) { return; }
                st.state = was;
                renderWidgets();
                toast('Could not switch ' + displayName(eid) + ': ' + ((err && err.message) || 'error'), 4000);
            });
    }

    // ---------------------------------------------------- Cameras page
    //
    // Up to 9, laid out to use the screen: 1 fills it, 2 side by side, 3 as one large and two
    // stacked, then 2 x 2, 3 x 2, 3 x 3. Every tile keeps the camera's 16:9 shape.

    var CAM_GAP = 24, CAM_RATIO = 16 / 9;
    var camSig = '';

    function camLayout(n, W, H) {
        var G = CAM_GAP, R = CAM_RATIO, i;
        if (n === 3) {
            var s = Math.min((W - G) / R / 3 - G / 3, (H - G) / 2);
            var big = 2 * s + G, bw = big * R, sw = s * R, x0 = (W - (bw + G + sw)) / 2, y0 = (H - big) / 2;
            return [{ x: x0, y: y0, w: bw, h: big }, { x: x0 + bw + G, y: y0, w: sw, h: s }, { x: x0 + bw + G, y: y0 + s + G, w: sw, h: s }];
        }
        var best = null, c;
        for (c = 1; c <= 3; c++) {
            var r = Math.ceil(n / c);
            var w = Math.min((W - (c - 1) * G) / c, ((H - (r - 1) * G) / r) * R);
            if (!best || w > best.w + 0.5) { best = { c: c, w: w }; }
        }
        var cols = best.c, tw = best.w, th = tw / R, rows = Math.ceil(n / cols), rects = [];
        var ox = (W - (cols * tw + (cols - 1) * G)) / 2, oy = (H - (rows * th + (rows - 1) * G)) / 2;
        for (i = 0; i < n; i++) {
            var row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, n - row * cols);
            rects.push({ x: ox + (cols - inRow) * (tw + G) / 2 + col * (tw + G), y: oy + row * (th + G), w: tw, h: th });
        }
        return rects;
    }

    function renderCameras(stale) {
        var cams = selectedOf('camera').slice(0, MAX_CAMERAS), area = $('camArea');
        // the area's size is part of the signature: if the stylesheet wasn't applied yet on the first
        // render, the grid is rebuilt as soon as the real size is known
        var sig = cams.join(',') + '|' + (stale ? 1 : 0) + '|' + area.clientWidth + 'x' + area.clientHeight;
        each(cams, function (eid) { sig += '|' + displayName(eid) + '/' + areaOf(eid); });
        if (sig === camSig) { return; }
        camSig = sig;
        if (!cams.length) {
            area.innerHTML = emptyHtml('cameras', '');
        } else {
            var html = '', rects = camLayout(cams.length, area.clientWidth || 1700, area.clientHeight || 856);
            each(cams, function (eid, i) {
                var r = rects[i], url = camStill.url[eid];
                html += '<div class="camtile' + (r.w < 600 ? ' s' : '') + '" data-key="cam:' + esc(eid) + '" style="left:' + Math.round(r.x) +
                    'px;top:' + Math.round(r.y) + 'px;width:' + Math.round(r.w) + 'px;height:' + Math.round(r.h) + 'px;' +
                    (url ? 'background-image:url(&quot;' + esc(url) + '&quot;)' : '') + '">' +
                    '<div class="ago"></div>' +
                    '<div class="play"><svg viewBox="0 0 100 100"><path d="M38 26 L76 50 L38 74 Z" fill="currentColor"/></svg></div>' +
                    '<div class="lbl"><span class="nm">' + esc(displayName(eid)) + '</span><span class="rm">' + esc(areaOf(eid)) + '</span></div></div>';
            });
            area.innerHTML = html;
        }
        area.className = stale ? 'stale' : '';
        var s = sel[P_CAM];
        if (s && s.indexOf('cam:') === 0 && !itemByKey(P_CAM, s)) { sel[P_CAM] = null; }
        if (!sel[P_CAM] && page === P_CAM) {
            var items = itemsOf(P_CAM);
            sel[P_CAM] = items.length ? items[0].key : 'edge:l';
        }
        updateCamAges();
    }

    // Stills refresh only while the Cameras page shows: every 4 s with up to 4 cameras; with
    // more, the focused one every 3 s and the rest every 12 s, so the TV isn't overloaded.
    var camStill = { timer: null, last: {}, url: {}, loading: {} };

    function refreshCamStills() {
        clearTimeout(camStill.timer);
        if (page !== P_CAM || mode === 'camera' || document.hidden || !ha.connected) { return; }
        var cams = selectedOf('camera').slice(0, MAX_CAMERAS), now = Date.now(), many = cams.length > 4;
        each(cams, function (eid) {
            var every = many ? (sel[P_CAM] === 'cam:' + eid ? 3000 : 12000) : 4000;
            if (camStill.loading[eid] || (camStill.last[eid] && now - camStill.last[eid] < every - 250)) { return; }
            var url = snapshotUrl(eid);
            if (!url) { return; }
            camStill.loading[eid] = true;
            var img = new Image();
            img.onload = function () {
                camStill.loading[eid] = false;
                camStill.last[eid] = Date.now();
                camStill.url[eid] = url;
                var el = document.querySelector('#camArea .camtile[data-key="cam:' + eid + '"]');
                if (el) { el.style.backgroundImage = 'url("' + url + '")'; }
                updateCamAges();
            };
            img.onerror = function () { camStill.loading[eid] = false; camStill.last[eid] = Date.now(); };
            img.src = url;
        });
        updateCamAges();
        camStill.timer = setTimeout(refreshCamStills, 1000);
    }

    function updateCamAges() {
        var now = Date.now();
        each(document.querySelectorAll('#camArea .camtile'), function (el) {
            var eid = el.getAttribute('data-key').slice(4), t = camStill.last[eid], a = el.querySelector('.ago');
            var s = t ? Math.max(0, Math.round((now - t) / 1000)) : -1;
            a.textContent = s < 0 ? 'Loading…' : s < 60 ? s + ' s ago' : Math.round(s / 60) + ' min ago';
        });
    }

    // ---------------------------------------------------- picker

    var pickRow = 0, pickItems = [];

    function openPicker() {
        mode = 'picker';
        pickRow = 0;
        $('settings').hidden = true;
        $('picker').hidden = false;
        renderPicker();
        if (ha.connected) { haDiscover(); }   // refresh the list each time the picker opens
    }

    function closePicker() {
        $('picker').hidden = true;
        $('settings').hidden = false;
        mode = 'settings';
        haSubscribe();
        renderWidgets();
        renderSettings();
        saveCacheSoon();
    }

    function renderPicker() {
        var ul = $('pickList');
        var focusedEid = pickItems[pickRow];
        ul.innerHTML = '';
        pickItems = [];
        $('pickCount').textContent = pickCountText();
        if (!ha.connected || !ha.all.length) {
            var li = document.createElement('li');
            li.className = 'message';
            li.textContent = !H.ha().token
                ? 'Add a long-lived access token to shell-config.js (see the README) to use Home Assistant widgets.'
                : 'Home Assistant: ' + (ha.status || 'connecting') + '. The list appears once Haven is connected.';
            ul.appendChild(li);
            return;
        }
        var sections = [['Suggested', ha.suggested]];
        var listed = {}, byArea = {}, areaNames = [];
        each(ha.suggested, function (eid) { listed[eid] = true; });
        each(selected(), function (eid) {        // chosen items that are not suggestions come first in their area
            if (!listed[eid] && ha.states[eid]) { var a = areaOf(eid) || 'No area'; (byArea[a] = byArea[a] || []).push(eid); listed[eid] = true; }
        });
        each(ha.all, function (s) {
            var eid = s.entity_id;
            if (listed[eid] || ha.hidden[eid] || !kindOf(eid) || eid === 'sun.sun') { return; }
            var a = areaOf(eid) || 'No area';
            (byArea[a] = byArea[a] || []).push(eid);
        });
        areaNames = keys(byArea).sort(function (x, y) {
            if (x === 'No area') { return 1; }
            if (y === 'No area') { return -1; }
            return x < y ? -1 : 1;
        });
        var ORDER = { sensor: 0, camera: 1, button: 2 };
        each(areaNames, function (a) {
            byArea[a].sort(function (x, y) {
                return ORDER[kindOf(x)] - ORDER[kindOf(y)] || (displayName(x) < displayName(y) ? -1 : 1);
            });
            sections.push([a, byArea[a]]);
        });
        var frag = document.createDocumentFragment();
        each(sections, function (sec) {
            if (!sec[1].length) { return; }
            var h = document.createElement('li');
            h.className = 'section';
            h.textContent = sec[0];
            frag.appendChild(h);
            each(sec[1], function (eid) {
                var li = document.createElement('li');
                var on = selected().indexOf(eid) >= 0;
                var f = formatState(eid);
                li.className = 'item' + (on ? ' checked' : '');
                li.setAttribute('data-eid', eid);
                li.innerHTML = '<span class="box"></span><span class="name"></span><span class="where"></span><span class="val"></span>';
                li.children[1].textContent = displayName(eid);
                var kind = kindOf(eid);
                li.children[2].textContent = (kind === 'button' ? (isDimmable(eid) ? 'Dimmable light' : eid.indexOf('light.') === 0 ? 'Light' : 'Switch')
                    : kind === 'camera' ? 'Camera' : 'Sensor') + ' · ' + eid;
                li.children[3].textContent = kind === 'camera' ? (f.dim ? '–' : cap((ha.states[eid] || {}).state || ''))
                    : f.value + (f.unit ? (f.unit === '°' ? '°' : ' ' + f.unit) : '');
                frag.appendChild(li);
                pickItems.push(eid);
            });
        });
        ul.appendChild(frag);
        var keep = pickItems.indexOf(focusedEid);
        pickRow = keep >= 0 ? keep : Math.min(pickRow, pickItems.length - 1);
        movePicker(0);
    }

    function movePicker(dir) {
        var items = $('pickList').querySelectorAll('li.item');
        if (!items.length) { return; }
        pickRow = Math.max(0, Math.min(items.length - 1, pickRow + dir));
        var prev = $('pickList').querySelector('li.item.focused');
        if (prev) { setFocused(prev, false); }
        var row = items[pickRow];
        setFocused(row, true);
        var box = $('pickList');
        var top = row.offsetTop - box.offsetTop;
        if (pickRow === 0) { box.scrollTop = 0; }
        else if (top - 60 < box.scrollTop) { box.scrollTop = top - 60; }
        else if (top + row.offsetHeight > box.scrollTop + box.clientHeight) { box.scrollTop = top + row.offsetHeight - box.clientHeight; }
    }

    function togglePick() {
        var eid = pickItems[pickRow];
        if (!eid) { return; }
        var list = selected().slice(0), i = list.indexOf(eid), kind = kindOf(eid);
        if (i >= 0) {
            list.splice(i, 1);
        } else {
            if (kind === 'sensor' && selectedOf('sensor').length >= MAX_SENSORS) { toast('Up to ' + MAX_SENSORS + ' sensors. Hide one first.'); return; }
            if (kind === 'button' && selectedOf('button').length >= MAX_BUTTONS) {
                toast('Up to ' + MAX_BUTTONS + ' lights and switches. Hide one first.', 4000);
                return;
            }
            if (kind === 'camera' && selectedOf('camera').length >= MAX_CAMERAS) { toast('Up to ' + MAX_CAMERAS + ' cameras in the dock. Hide one first.'); return; }
            list.push(eid);
        }
        cfg.widgets = list;
        save('widgets');
        var items = $('pickList').querySelectorAll('li.item');
        each(items, function (li) {
            var on = list.indexOf(li.getAttribute('data-eid')) >= 0;
            li.className = li.className.replace(/\s*checked/g, '') + (on ? ' checked' : '');
        });
        $('pickCount').textContent = pickCountText();
        renderWidgets();
    }

    function pickCountText() {
        return 'Sensors ' + selectedOf('sensor').length + ' of ' + MAX_SENSORS +
            ' · Lights and switches ' + selectedOf('button').length + ' of ' + MAX_BUTTONS +
            ' · Cameras ' + selectedOf('camera').length + ' of ' + MAX_CAMERAS;
    }

    // ================================================================== dock

    var tiles = [], focus = 0;
    var dockSignature = '';
    var installedApps = null;   // Tizen ApplicationInformation[] once listed

    function dockApps() { return cfg.dockApps || ['youtube', 'internet']; }

    function installedInfo(id) {
        if (!installedApps) { return null; }
        for (var i = 0; i < installedApps.length; i++) { if (installedApps[i].id === id) { return installedApps[i]; } }
        return null;
    }

    // An entry is either a built-in alias (youtube, internet) or a Tizen app ID.
    function appDef(entry) {
        if (APPS[entry]) { return APPS[entry]; }
        var info = installedInfo(entry);
        return { name: info ? info.name : entry, ids: [entry], glyph: null };
    }

    function appInfo(entry) {
        return APPS[entry] ? H.apps.resolve(APPS[entry]) : installedInfo(entry);
    }

    function renderDock() {
        each(tiles, function (t, i) { setFocused(t, page === 0 && sel[0] === 'dock' && i === focus); });
        scrollDock();
    }

    // Keeps the focused tile in view when the dock is wider than the screen.
    function scrollDock() {
        var dock = $('dock'), track = $('dockTrack');
        if (!track || !tiles.length) { return; }
        var dockW = dock.clientWidth, trackW = track.offsetWidth, x;
        if (trackW <= dockW) {
            x = Math.round((dockW - trackW) / 2);
        } else {
            var t = tiles[Math.max(0, Math.min(focus, tiles.length - 1))];
            x = Math.round(dockW / 2 - (t.offsetLeft + t.offsetWidth / 2));
            x = Math.max(dockW - trackW, Math.min(0, x));
        }
        track.style.transform = 'translate3d(' + x + 'px,0,0)';
        $('dockMoreL').className = 'dockMore' + (x < 0 ? ' show' : '');
        $('dockMoreR').className = 'dockMore' + (x + trackW > dockW + 1 ? ' show' : '');
    }

    // Your apps in order, the "+" tile, then Settings.
    // Rebuilt only when that list changes.
    function buildDock() {
        var items = [];
        each(dockApps(), function (entry) {
            var def = appDef(entry);
            items.push({ app: entry, label: def.name, glyph: def.glyph });
        });
        items.push({ action: 'settings', label: 'Settings', glyph: 'gear' });
        var sig = cfg.icons + '|';
        each(items, function (d) { sig += (d.app || d.action || d.camera) + '=' + d.label + ';'; });
        if (sig === dockSignature) { return; }
        dockSignature = sig;
        var html = '';
        each(items, function (d) {
            var attr = d.app ? ' data-app="' + esc(d.app) + '"' : (d.camera ? ' data-camera="' + esc(d.camera) + '"' : ' data-action="' + d.action + '"');
            var face = d.glyph ? GLYPHS[d.glyph] : '<span class="glyph mono">' + esc(monogram(d.label)) + '</span>';
            html += '<div class="tile big' + (d.camera ? ' cam' : '') + '"' + attr + '>' +
                '<div class="face">' + face + '</div><div class="label">' + esc(d.label) + '</div></div>';
        });
        $('dockTrack').innerHTML = html;
        $('dock').className = items.length >= 5 ? 'compact' : '';
        tiles = document.querySelectorAll('#dock .tile');
        focus = Math.max(0, Math.min(focus, tiles.length - 1));
        renderDock();
        applyIcons();
    }

    function monogram(name) {
        var words = String(name).replace(/[^A-Za-z0-9 ]/g, ' ').replace(/^\s+|\s+$/g, '').split(/\s+/);
        if (!words[0]) { return '?'; }
        return (words.length > 1 ? words[0].charAt(0) + words[1].charAt(0) : words[0].slice(0, 2)).toUpperCase();
    }

    // ------------------------------------------------------------------ camera snapshots

    function snapshotUrl(eid) {
        var st = ha.states[eid], info = H.ha();
        var pic = st && st.attributes && st.attributes.entity_picture;
        if (!pic) { return null; }
        var u = /^https?:/i.test(pic) ? pic : info.url + pic;
        return u + (u.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
    }

    // ------------------------------------------------------------------ camera player
    //
    // HA turns the camera's RTSP feed into HLS (camera/stream). The TV plays HLS with its
    // normal video element, or with Samsung's AVPlay if that fails. If neither shows a
    // picture, snapshots refresh every 2 seconds instead. The player that worked is
    // remembered and tried first next time.

    var cam = { eid: null, token: 0, player: null, snapTimer: null, hintTimer: null, lastError: '' };

    var PLAYERS = {
        video: {
            available: function () { return true; },
            start: function (url, ok, fail) {
                var v = $('camVideo');
                v.hidden = false;
                v.onplaying = function () { ok(); };
                v.onerror = function () { fail('video error ' + (v.error ? v.error.code : '')); };
                v.src = url;
                var p = v.play();
                if (p && p.then) {
                    p.then(null, function (e) { if (!e || e.name !== 'AbortError') { fail((e && (e.message || e.name)) || 'play refused'); } });
                }
            },
            stop: function () {
                var v = $('camVideo');
                v.onplaying = v.onerror = null;
                try { v.pause(); } catch (e) { /* not playing */ }
                v.removeAttribute('src');
                try { v.load(); } catch (e) { /* nothing loaded */ }
                v.hidden = true;
            }
        },
        avplay: {
            available: function () { return !!(window.webapis && window.webapis.avplay); },
            start: function (url, ok, fail) {
                var av = window.webapis.avplay;
                // AVPlay draws on a video plane behind the page, so the page must be see-through there.
                if (!$('avplayer')) {
                    var obj = document.createElement('object');
                    obj.id = 'avplayer';
                    obj.type = 'application/avplayer';
                    $('player').insertBefore(obj, $('player').firstChild);
                }
                setAvplayMode(true);
                try {
                    av.open(url);
                    av.setDisplayRect(0, 0, 1920, 1080);
                    av.setListener({
                        onerror: function (e) { fail('AVPlay ' + e); },
                        onstreamcompleted: function () { setCamStatus('The camera stream ended. Press Back and try again.'); }
                    });
                    av.prepareAsync(function () {
                        try { av.play(); ok(); } catch (e) { fail(e.message || String(e)); }
                    }, function (e) { fail('AVPlay could not open the stream (' + ((e && (e.name || e.message)) || e) + ')'); });
                } catch (e) {
                    fail(e.message || String(e));
                }
            },
            stop: function () {
                var av = window.webapis && window.webapis.avplay;
                if (av) {
                    try { av.stop(); } catch (e) { /* not started */ }
                    try { av.close(); } catch (e) { /* not opened */ }
                }
                setAvplayMode(false);
            }
        }
    };

    function setAvplayMode(on) {
        var stage = $('stage');
        stage.className = stage.className.replace(/\s*avplay-on/g, '') + (on ? ' avplay-on' : '');
        document.documentElement.style.background = on ? 'transparent' : '';
        document.body.style.background = on ? 'transparent' : '';
    }

    function setCamStatus(msg) {
        $('camStatus').textContent = msg || '';
        $('camStatus').style.display = msg ? '' : 'none';
    }

    function showCamHint() {
        var cams = selectedOf('camera');
        $('camHint').textContent = 'Back to close' + (cams.length > 1 ? ' · Left / Right for the other camera' : '');
        $('camHint').className = 'show';
        clearTimeout(cam.hintTimer);
        cam.hintTimer = setTimeout(function () { $('camHint').className = ''; }, 5000);
    }

    function stopCamPlayback() {
        cam.token++;
        clearInterval(cam.snapTimer);
        cam.snapTimer = null;
        cam.player = null;
        PLAYERS.video.stop();
        // AVPlay is open (or opening) whenever the page is in see-through mode
        if (/avplay-on/.test($('stage').className)) { PLAYERS.avplay.stop(); }
        $('camLive').hidden = true;
    }

    function openCamera(eid) {
        stopCamPlayback();
        var tok = cam.token;
        mode = 'camera';
        updateFx();
        cam.eid = eid;
        clearInterval(wallTimer);
        wallTimer = null;
        $('player').hidden = false;
        $('camName').textContent = displayName(eid);
        var snap = snapshotUrl(eid);
        $('camSnap').style.visibility = 'hidden';
        $('camSnap').onload = function () { $('camSnap').style.visibility = 'visible'; };
        if (snap) { $('camSnap').src = snap; }
        showCamHint();
        if (!ha.connected) { setCamStatus('Home Assistant is not connected.'); return; }
        setCamStatus('Connecting to the camera…');
        haSend('camera/stream', { entity_id: eid, format: 'hls' }, function (ok, res, err) {
            if (tok !== cam.token) { return; }
            if (!ok || !res || !res.url) {
                snapshotMode((err && err.message) || 'Home Assistant has no stream for this camera');
                return;
            }
            var url = /^https?:/i.test(res.url) ? res.url : H.ha().url + res.url;
            var order = H.get('camPlayer', 'video') === 'avplay' ? ['avplay', 'video'] : ['video', 'avplay'];
            tryPlayers(order, 0, url, tok);
        });
    }

    function tryPlayers(order, i, url, tok) {
        if (tok !== cam.token) { return; }
        if (i >= order.length) { snapshotMode('the TV could not play the live stream'); return; }
        var name = order[i], player = PLAYERS[name], settled = false;
        if (!player.available()) { tryPlayers(order, i + 1, url, tok); return; }
        var timer = setTimeout(function () {
            if (settled) { return; }
            settled = true;
            player.stop();
            cam.lastError = name + ': no picture within ' + Math.round(H.get('camStartTimeout', 20000) / 1000) + ' s';
            tryPlayers(order, i + 1, url, tok);
        }, H.get('camStartTimeout', 20000));
        player.start(url, function () {
            if (settled || tok !== cam.token) { return; }
            settled = true;
            clearTimeout(timer);
            cam.player = name;
            H.set('camPlayer', name);
            setCamStatus('');
            $('camSnap').style.visibility = 'hidden';
            $('camLive').hidden = false;
        }, function (reason) {
            if (settled || tok !== cam.token) { return; }
            settled = true;
            clearTimeout(timer);
            player.stop();
            cam.lastError = name + ': ' + reason;
            tryPlayers(order, i + 1, url, tok);
        });
    }

    function snapshotMode(reason) {
        cam.lastError = cam.lastError || reason;
        setCamStatus('Live view unavailable (' + reason + '). Showing snapshots.');
        var eid = cam.eid, tok = cam.token;
        function refresh() {
            if (tok !== cam.token) { return; }
            var url = snapshotUrl(eid);
            if (!url) { return; }
            var img = new Image();
            img.onload = function () {
                if (tok !== cam.token) { return; }
                $('camSnap').src = url;
                $('camSnap').style.visibility = 'visible';
            };
            img.src = url;
        }
        refresh();
        cam.snapTimer = setInterval(refresh, 2000);
    }

    function closeCamera() {
        stopCamPlayback();
        $('player').hidden = true;
        setCamStatus('');
        cam.eid = null;
        mode = 'dock';
        scheduleWalls();
        applyFocus();
        refreshCamStills();
        updateFx();
    }

    function switchCamera(dir) {
        var list = selectedOf('camera').slice(0, MAX_CAMERAS);
        if (list.length < 2) { return; }
        var i = list.indexOf(cam.eid);
        openCamera(list[(i + dir + list.length) % list.length]);
    }

    // YouTube and Internet use simple glyphs unless "Tile icons" is set to App icons.
    // Every other app shows its own icon, or its initials if it has none.
    function applyIcons() {
        each(tiles, function (tile) {
            var key = tile.getAttribute('data-app');
            if (!key) { return; }
            var face = tile.querySelector('.face');
            var glyph = face.querySelector('.glyph');
            var old = face.querySelector('img');
            var info = appInfo(key);
            if (old) { face.removeChild(old); }
            glyph.style.visibility = 'visible';
            if ((APPS[key] && cfg.icons !== 'original') || !info || !info.iconPath) { return; }
            var img = new Image();
            img.onload = function () { glyph.style.visibility = 'hidden'; };
            img.onerror = function () { if (img.parentNode) { face.removeChild(img); } };
            img.src = info.iconPath.charAt(0) === '/' ? 'file://' + info.iconPath : info.iconPath;
            face.appendChild(img);
        });
    }

    function activateTile(t) {
        t.className += ' pressed';
        setTimeout(function () { t.className = t.className.replace(/\s*pressed/g, ''); }, 160);
        if (t.getAttribute('data-action') === 'settings') { openSettings(); return; }
        cfg.focus = focus;
        save('focus');
        if (t.getAttribute('data-camera')) { openCamera(t.getAttribute('data-camera')); return; }
        var app = appDef(t.getAttribute('data-app'));
        H.apps.launch(app, function (ok, why) {
            if (ok) { return; }
            toast(why === 'preview mode' ? 'Preview mode: this would open ' + app.name
                : app.name + ' not found. Press Yellow to see installed apps.', 4000);
        });
    }

    // ------------------------------------------------------------------ app picker
    //
    // "In the dock" lists your apps in dock order, "Other apps" everything else installed.
    // OK adds or removes. Right on a dock app picks it up, Up / Down moves it, OK drops it.

    var appsRow = 0, appsItems = [], appsMoving = null, appsReturn = 'dock';

    // The dock entry for an installed app: the built-in alias if it is YouTube or Internet.
    function entryFor(info) {
        for (var k in APPS) {
            if (APPS.hasOwnProperty(k)) {
                var r = H.apps.resolve(APPS[k]);
                if (r && r.id === info.id) { return k; }
            }
        }
        return info.id;
    }

    function openApps() {
        appsReturn = mode === 'settings' ? 'settings' : 'dock';
        mode = 'apps';
        appsRow = 0;
        appsMoving = null;
        $('settings').hidden = true;
        $('apps').hidden = false;
        renderApps();
        H.apps.list(function (list) {
            if (list) { installedApps = list; }
            if (mode === 'apps') { renderApps(); }
        });
    }

    function closeApps() {
        appsMoving = null;
        $('apps').hidden = true;
        if (appsReturn === 'settings') {
            $('settings').hidden = false;
            mode = 'settings';
            renderSettings();
        } else {
            mode = 'dock';
            renderDock();
        }
    }

    // focusEntry: the item to focus after re-rendering (default: the one focused now).
    function renderApps(focusEntry) {
        var ul = $('appsList'), keep = focusEntry !== undefined ? focusEntry : appsItems[appsRow];
        var inDock = dockApps();
        ul.innerHTML = '';
        appsItems = [];
        $('appsCount').textContent = inDock.length + (inDock.length === 1 ? ' app' : ' apps') + ' in the dock';
        $('appsHint').innerHTML = appsMoving
            ? 'Up / Down to move &middot; OK to drop it here'
            : 'OK to add or remove &middot; Right on an app in the dock to move it &middot; Back to close';

        function section(title) {
            var h = document.createElement('li');
            h.className = 'section';
            h.textContent = title;
            ul.appendChild(h);
        }
        function item(entry, info, checked, pos) {
            var li = document.createElement('li');
            li.className = 'item' + (checked ? ' checked' : '') + (appsMoving === entry ? ' moving' : '');
            li.setAttribute('data-entry', entry);
            li.innerHTML = '<span class="box"></span><span class="name"></span><span class="where"></span><span class="val"></span>';
            li.children[1].textContent = info ? info.name : appDef(entry).name;
            li.children[2].textContent = info ? info.id : (H.isTV ? 'not installed' : '');
            li.children[3].textContent = pos ? (appsMoving === entry ? '↕ ' : '') + pos : '';
            ul.appendChild(li);
            appsItems.push(entry);
        }

        section('In the dock');
        if (!inDock.length) {
            var none = document.createElement('li');
            none.className = 'message';
            none.textContent = 'No apps yet. Add some from the list below.';
            ul.appendChild(none);
        }
        each(inDock, function (entry, i) { item(entry, appInfo(entry), true, String(i + 1)); });

        if (!installedApps) {
            var msg = document.createElement('li');
            msg.className = 'message';
            msg.textContent = H.isTV ? 'Loading installed apps…' : 'Preview mode: the list of installed apps only exists on the TV.';
            ul.appendChild(msg);
        } else {
            var used = {}, others = [];
            each(inDock, function (entry) { var inf = appInfo(entry); used[inf ? inf.id : entry] = true; });
            each(installedApps, function (inf) {
                if (inf.show === false || SELF_ID.test(inf.id) || used[inf.id]) { return; }
                others.push(inf);
            });
            others.sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
            section('Other apps');
            each(others, function (inf) { item(entryFor(inf), inf, false, ''); });
        }

        var k = appsItems.indexOf(keep);
        appsRow = k >= 0 ? k : Math.max(0, Math.min(appsRow, appsItems.length - 1));
        moveApps(0);
    }

    function moveApps(dir) {
        var items = $('appsList').querySelectorAll('li.item');
        if (!items.length) { return; }
        appsRow = Math.max(0, Math.min(items.length - 1, appsRow + dir));
        each(items, function (li, i) { setFocused(li, i === appsRow); });
        var box = $('appsList'), r = items[appsRow];
        var top = r.offsetTop - box.offsetTop;
        if (appsRow === 0) { box.scrollTop = 0; }
        else if (top - 60 < box.scrollTop) { box.scrollTop = top - 60; }
        else if (top + r.offsetHeight > box.scrollTop + box.clientHeight) { box.scrollTop = top + r.offsetHeight - box.clientHeight; }
    }

    function saveDockApps(list) {
        cfg.dockApps = list;
        save('dockApps');
        buildDock();
    }

    function toggleApp() {
        var entry = appsItems[appsRow];
        if (!entry) { return; }
        var list = dockApps().slice(0), i = list.indexOf(entry);
        // The app moves to the other section; keep the focus where you were instead of
        // following it, so several apps can be ticked in a row.
        var inDock = i >= 0, next = null, k;
        for (k = appsRow + 1; k < appsItems.length && next === null; k++) {
            if ((list.indexOf(appsItems[k]) >= 0) === inDock) { next = appsItems[k]; }
        }
        for (k = appsRow - 1; k >= 0 && next === null; k--) {
            if ((list.indexOf(appsItems[k]) >= 0) === inDock) { next = appsItems[k]; }
        }
        if (inDock) { list.splice(i, 1); } else { list.push(entry); }
        saveDockApps(list);
        renderApps(next !== null ? next : entry);
    }

    function shiftApp(dir) {
        var list = dockApps().slice(0), i = list.indexOf(appsMoving), j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) { return; }
        list[i] = list[j];
        list[j] = appsMoving;
        appsRow += dir;
        saveDockApps(list);
        renderApps();
    }

    function onAppsKey(k) {
        if (appsMoving) {
            if (k === KEY.UP) { shiftApp(-1); }
            else if (k === KEY.DOWN) { shiftApp(1); }
            else if (k === KEY.ENTER || k === KEY.LEFT || isBack(k)) { appsMoving = null; renderApps(); }
            return true;
        }
        if (k === KEY.UP) { moveApps(-1); }
        else if (k === KEY.DOWN) { moveApps(1); }
        else if (k === KEY.ENTER) { toggleApp(); }
        else if (k === KEY.RIGHT) {
            var entry = appsItems[appsRow];
            if (entry && dockApps().indexOf(entry) >= 0 && dockApps().length > 1) { appsMoving = entry; renderApps(); }
        } else if (isBack(k)) { closeApps(); }
        else { return false; }
        return true;
    }

    // ------------------------------------------------------------------ settings panel

    var mode = 'dock';      // dock | settings | picker | apps | dim | editor | diag | camera
    var setRow = 0;
    var updateText = '';

    function optionIndex(def) {
        for (var i = 0; i < def.options.length; i++) { if (def.options[i][0] === cfg[def.key]) { return i; } }
        return 0;
    }

    function shortBase() {
        var b = H.base();
        return b ? b.replace(/^https?:\/\//, '').replace(/:8123\/local\/haven\/$/, '') : 'not set';
    }

    function valueText(def) {
        if (def.action === 'widgets') {
            if (!H.ha().token) { return 'No token'; }
            if (!ha.connected) { return ha.authFailed ? 'Token rejected' : 'Not connected'; }
            return selectedOf('sensor').length + ' sensors, ' + selectedOf('button').length + ' controls, ' + selectedOf('camera').length + ' cameras';
        }
        if (def.action === 'apps') { return dockApps().length + (dockApps().length === 1 ? ' app' : ' apps'); }
        if (def.action === 'address') { return shortBase(); }
        if (def.action === 'update') { return updateText || 'Check now'; }
        if (def.action === 'diag') { return 'Open'; }
        return def.options[optionIndex(def)][1];
    }

    function renderSettings() {
        var ul = $('settingsRows');
        ul.innerHTML = '';
        each(SETTINGS_DEF, function (def, i) {
            var li = document.createElement('li');
            li.innerHTML = '<span class="label"></span><span class="value' + (def.action ? ' action' : '') + '"></span>';
            li.firstChild.textContent = def.label;
            li.lastChild.textContent = valueText(def);
            if (i === setRow) { li.className = 'focused'; }
            ul.appendChild(li);
        });
    }

    function openSettings() {
        mode = 'settings';
        setRow = 0;
        renderSettings();
        $('settings').hidden = false;
    }

    function closeOverlays() {
        each(['settings', 'picker', 'apps', 'editor', 'diag'], function (id) { $(id).hidden = true; });
        var input = $('addr');
        if (input) { input.blur(); }
        mode = 'dock';
        applyFocus();
    }

    function changeSetting(dir) {
        var def = SETTINGS_DEF[setRow];
        if (def.action) { return; }
        var i = (optionIndex(def) + dir + def.options.length) % def.options.length;
        var before = cfg[def.key];
        cfg[def.key] = def.options[i][0];
        save(def.key);
        if (def.key === 'interval') { scheduleWalls(); }
        if (def.key === 'source') { refreshHaWalls(); nextWall(); }
        if (def.key === 'motion' || def.key === 'captions') { wallPos = (wallPos + playlist().length - 1) % Math.max(1, playlist().length); nextWall(); }
        if (def.key === 'clock24') { tickClock(); renderWeather(!ha.connected); }
        if (def.key === 'wxStyle') { wxSubscribe(); renderWeather(!ha.connected); }
        if (def.key === 'season') {
            updateFx();
            if (cfg.season === 'p:newyear') { checkCountdown(true); }      // the preview shows a 10 s countdown
            if (before === 'off' || cfg.season === 'off') { haSubscribe(); }
        }
        if (def.key === 'icons') { applyIcons(); }
        if (def.key === 'theme') {
            applyTheme();
            if (before === 'auto' || cfg.theme === 'auto') { haSubscribe(); }
        }
        renderSettings();
    }

    function runAction(action) {
        if (action === 'widgets') { openPicker(); }
        else if (action === 'apps') { openApps(); }
        else if (action === 'address') { openEditor(); }
        else if (action === 'diag') { openDiag(); }
        else if (action === 'update') {
            updateText = 'Checking...';
            renderSettings();
            H.checkNow(function (result) {
                updateText = result.length > 34 ? result.slice(0, 32) + '...' : result;
                if (mode === 'settings') { renderSettings(); }
                toast(result === 'update downloaded' ? 'Update downloaded. Haven reloads when you stop pressing keys.' : 'Design: ' + result, 4500);
            });
        }
    }

    // ------------------------------------------------------------------ address editor

    function openEditor() {
        mode = 'editor';
        $('settings').hidden = true;
        $('editor').hidden = false;
        var input = $('addr');
        input.value = H.base() || '';
        setTimeout(function () { input.focus(); }, 50);
    }

    function closeEditor(saveIt) {
        var input = $('addr');
        if (saveIt) {
            var b = H.setBase(input.value);
            haWalls = [];
            refreshHaWalls();
            haReconnect();
            toast(b ? 'Saved: ' + b : 'Home Assistant address cleared', 4000);
        }
        input.blur();
        $('editor').hidden = true;
        $('settings').hidden = false;
        mode = 'settings';
        renderSettings();
    }

    // ------------------------------------------------------------------ diagnostics

    var diagRow = 0;

    function openDiag() {
        mode = 'diag';
        diagRow = 0;
        var st = H.status();
        var lines = [
            ['Design', st.source],
            ['Home Assistant', st.base || 'not set'],
            ['Last update check', st.lastCheck + ' · ' + st.lastResult],
            ['Home Assistant widgets', (ha.status || 'not started') + (ha.connected ? ' · ' + ha.all.length + ' entities' : '')],
            ['Home Assistant wallpapers', haWalls.length + (cfg.source === 'builtin' ? ' (not in use)' : '')],
            ['Seasonal effects', fxStatus()],
            ['Weather page', wxStatus()],
            ['Camera player', (H.get('camPlayer', null) ? H.get('camPlayer', null) + ' (worked last time)' : 'not used yet') +
                (cam.lastError ? ' · last problem: ' + cam.lastError : '')]
        ];
        if (st.lastError) { lines.push(['Last error', st.lastError]); }
        var box = $('diagStatus');
        box.innerHTML = '';
        each(lines, function (l) {
            var r = document.createElement('div');
            r.className = 'statusRow';
            r.innerHTML = '<span class="k"></span><span class="v"></span>';
            r.firstChild.textContent = l[0];
            r.lastChild.textContent = l[1];
            box.appendChild(r);
        });

        var ul = $('diagList');
        ul.innerHTML = '';
        H.apps.list(function (installed, err) {
            if (!installed) {
                var li = document.createElement('li');
                li.textContent = err === 'preview mode' ? 'Preview mode: the installed-app list only exists on the TV.'
                    : 'Could not list apps: ' + err;
                ul.appendChild(li);
                return;
            }
            var used = {}, key, info;
            for (key in APPS) {
                if (APPS.hasOwnProperty(key)) { info = H.apps.resolve(APPS[key]); if (info) { used[info.id] = true; } }
            }
            var list = installed.slice(0).sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
            each(list, function (app) {
                var li = document.createElement('li');
                li.innerHTML = '<span class="name"></span><span class="id"></span>';
                li.firstChild.textContent = app.name + (app.show === false ? ' (hidden)' : '');
                li.lastChild.textContent = app.id;
                if (used[app.id]) { li.className = 'used'; }
                ul.appendChild(li);
            });
            moveDiag(0);
        });
        $('settings').hidden = true;
        $('diag').hidden = false;
    }

    function moveDiag(dir) {
        var items = $('diagList').children;
        if (!items.length) { return; }
        diagRow = Math.max(0, Math.min(items.length - 1, diagRow + dir));
        each(items, function (li, i) { setFocused(li, i === diagRow); });
        var box = $('diagList'), r = items[diagRow];
        var top = r.offsetTop - box.offsetTop;
        if (top < box.scrollTop) { box.scrollTop = top; }
        else if (top + r.offsetHeight > box.scrollTop + box.clientHeight) { box.scrollTop = top + r.offsetHeight - box.clientHeight; }
    }

    // ------------------------------------------------------------------ keys

    function isBack(k) { return k === KEY.BACK || k === KEY.ESC || (k === KEY.BACKSPACE && mode !== 'editor'); }

    function onKey(e) {
        var k = e.keyCode, handled = true;

        if (mode === 'camera') {
            if (isBack(k) || k === KEY.EXIT) { closeCamera(); }
            else if (k === KEY.LEFT) { switchCamera(-1); }
            else if (k === KEY.RIGHT) { switchCamera(1); }
            else { showCamHint(); }
        } else if (mode === 'editor') {
            if (k === KEY.ENTER || k === KEY.IME_DONE) { closeEditor(true); }
            else if (k === KEY.IME_CANCEL || isBack(k)) { closeEditor(false); }
            else { handled = false; } // let the keyboard type
        } else if (mode === 'apps') {
            handled = onAppsKey(k);
        } else if (k === KEY.YELLOW || k === KEY.Y) {
            if (mode === 'diag') { closeOverlays(); } else { openDiag(); }
        } else if (mode === 'dock') {
            handled = onPageKey(k);
        } else if (mode === 'settings') {
            if (k === KEY.UP) { setRow = Math.max(0, setRow - 1); renderSettings(); }
            else if (k === KEY.DOWN) { setRow = Math.min(SETTINGS_DEF.length - 1, setRow + 1); renderSettings(); }
            else if (k === KEY.LEFT) { changeSetting(-1); }
            else if (k === KEY.RIGHT) { changeSetting(1); }
            else if (k === KEY.ENTER) {
                if (SETTINGS_DEF[setRow].action) { runAction(SETTINGS_DEF[setRow].action); } else { changeSetting(1); }
            } else if (isBack(k)) { closeOverlays(); }
            else { handled = false; }
        } else if (mode === 'picker') {
            if (k === KEY.UP) { movePicker(-1); }
            else if (k === KEY.DOWN) { movePicker(1); }
            else if (k === KEY.ENTER) { togglePick(); }
            else if (isBack(k)) { closePicker(); }
            else { handled = false; }
        } else if (mode === 'diag') {
            if (k === KEY.UP) { moveDiag(-1); }
            else if (k === KEY.DOWN) { moveDiag(1); }
            else if (isBack(k)) { closeOverlays(); }
            else { handled = false; }
        }

        if (handled && e.preventDefault) { e.preventDefault(); }
    }

    // ------------------------------------------------------------------ lifecycle

    function onVisibility() {
        if (document.hidden) {
            if (mode === 'camera') { closeCamera(); }
            clearInterval(wallTimer);
            clearTimeout(clockTimer);
            clearTimeout(camStill.timer);
            wallTimer = null;
            updateFx();
        } else {
            refreshCamStills();
            tickClock();                                           // also restarts the effects
            if (Date.now() - haListAt > 5 * 60000) { refreshHaWalls(); }
            scheduleWalls();
            if (!ha.ws && !ha.authFailed) { ha.retryMs = 2000; haConnect(); }
        }
    }

    function init() {
        build();
        focus = cfg.focus || 0;
        renderChrome();
        buildDock();
        H.registerKey('ColorF2Yellow');
        H.registerKey('ChannelUp');
        H.registerKey('ChannelDown');
        document.addEventListener('keydown', onKey);
        document.addEventListener('visibilitychange', onVisibility);
        tickClock();
        renderDock();
        // Built-in wallpaper first so the screen is never empty, Home Assistant ones join the rotation.
        if (cfg.source === 'ha' && builtinWalls.length) {
            showWall(builtinWalls[wallPos % builtinWalls.length], 0);
        } else {
            nextWall();
        }
        refreshHaWalls();
        scheduleWalls();
        renderWidgets();
        H.apps.list(function (list) {
            if (list) { installedApps = list; }
            dockSignature = '';      // app names and icons are known now
            buildDock();
        });
        H.ready();
        haConnect();
    }

    init();
}());
