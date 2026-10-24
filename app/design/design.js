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
    // ids: known Tizen app IDs (tried first). match: fallback on the installed app's name.
    // Press Yellow on the TV to see installed apps and their IDs.
    var APPS = {
        youtube: { name: 'YouTube', ids: ['9Ur5IzDKqV.TizenYouTube'], match: /youtube/i },
        internet: { name: 'Internet', ids: ['org.tizen.browser', 'com.samsung.tv.browser'], match: /^(internet|web ?browser|browser)$/i }
    };

    var GLYPHS = {
        play: '<svg class="glyph" viewBox="0 0 100 100"><path d="M38 28 L74 50 L38 72 Z" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/></svg>',
        globe: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5"><circle cx="50" cy="50" r="30"/><ellipse cx="50" cy="50" rx="13" ry="30"/><path d="M20 50 H80 M25 35 H75 M25 65 H75"/></svg>',
        gear: '<svg class="glyph" viewBox="0 0 100 100"><path fill="currentColor" fill-rule="evenodd" stroke="currentColor" stroke-width="3" stroke-linejoin="round" d="M43.7 23.7 L44.4 14.4 L55.6 14.4 L56.3 23.7 L64.1 27.0 L71.2 20.9 L79.1 28.8 L73.0 35.9 L76.3 43.7 L85.6 44.4 L85.6 55.6 L76.3 56.3 L73.0 64.1 L79.1 71.2 L71.2 79.1 L64.1 73.0 L56.3 76.3 L55.6 85.6 L44.4 85.6 L43.7 76.3 L35.9 73.0 L28.8 79.1 L20.9 71.2 L27.0 64.1 L23.7 56.3 L14.4 55.6 L14.4 44.4 L23.7 43.7 L27.0 35.9 L20.9 28.8 L28.8 20.9 L35.9 27.0 Z M39 50 A11 11 0 1 0 61 50 A11 11 0 1 0 39 50 Z"/></svg>',
        bulb: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M50 16 C34 16 24 28 24 41 C24 51 30 57 35 62 C38 65 39 68 39 72 H61 C61 68 62 65 65 62 C70 57 76 51 76 41 C76 28 66 16 50 16 Z"/><path d="M40 81 H60 M43 89 H57"/></svg>',
        power: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M50 16 V48"/><path d="M33 27 A30 30 0 1 0 67 27"/></svg>',
        camera: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"><rect x="12" y="30" width="54" height="40" rx="9"/><path d="M66 45 L88 33 V67 L66 55 Z"/></svg>'
    };

    var DOCK = [
        { app: 'youtube', label: 'YouTube', glyph: 'play', size: 'big' },
        { app: 'internet', label: 'Internet', glyph: 'globe', size: 'big' },
        { action: 'settings', label: 'Settings', glyph: 'gear', size: 'big' }
    ];

    var KEY = {
        LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
        BACK: 10009, YELLOW: 405, IME_DONE: 65376, IME_CANCEL: 65385,
        ESC: 27, BACKSPACE: 8, Y: 89, EXIT: 10182
    };

    var MAX_SENSORS = 6, MAX_BUTTONS = 8, MAX_CAMERAS = 2;

    // ------------------------------------------------------------------ settings

    var SETTINGS_DEF = [
        { key: 'interval', label: 'Change wallpaper',
          options: [[30, 'Every 30 seconds'], [60, 'Every minute'], [300, 'Every 5 minutes'], [1800, 'Every 30 minutes'], [0, 'Never']] },
        { key: 'source', label: 'Wallpapers',
          options: [['both', 'Built-in + Home Assistant'], ['ha', 'Home Assistant'], ['builtin', 'Built-in']] },
        { key: 'motion', label: 'Slow wallpaper motion', options: [[false, 'Off (fastest)'], [true, 'On']] },
        { key: 'theme', label: 'Theme', options: [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto (light by day)']] },
        { key: 'clock24', label: 'Clock', options: [[true, '24-hour'], [false, '12-hour']] },
        { key: 'icons', label: 'Tile icons', options: [['simple', 'Simple'], ['original', 'App icons']] },
        { key: 'captions', label: 'Wallpaper names', options: [[true, 'Show'], [false, 'Hide']] },
        { key: '_widgets', label: 'Home Assistant widgets', action: 'widgets' },
        { key: '_address', label: 'Home Assistant address', action: 'address' },
        { key: '_update', label: 'Check for design update', action: 'update' },
        { key: '_diag', label: 'Installed apps and status', action: 'diag' }
    ];

    // widgets: entity IDs in display order; null = never chosen, so suggestions get picked.
    var DEFAULTS = { interval: 60, source: 'both', motion: false, theme: 'dark', clock24: true,
        icons: 'simple', captions: true, focus: 0, widgets: null };
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
            '<header id="clock"><div id="time">--:--</div><div id="date"></div></header>' +
            '<section id="sensors" hidden></section>' +
            '<div id="caption"></div>' +
            '<div id="chips" hidden></div>' +
            '<nav id="dock"></nav>' +
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
                '<h2>Home Assistant widgets</h2><p id="pickCount" class="hint left"></p><ul id="pickList"></ul>' +
                '<p class="hint">OK to show or hide &middot; Sensors top left, lights and switches above the dock, cameras in the dock &middot; Back to close</p></div></section>' +
            '<section id="editor" class="overlay" hidden><div class="panel">' +
                '<h2>Home Assistant address</h2>' +
                '<p class="hint left">The IP is enough, for example 192.168.1.10. Haven adds :8123/local/haven/ itself.</p>' +
                '<input id="addr" type="text" autocomplete="off" spellcheck="false">' +
                '<p class="hint">OK or Done to save &middot; Back to cancel</p></div></section>' +
            '<section id="diag" class="overlay" hidden><div class="panel wide">' +
                '<h2>Installed apps and status</h2><div id="diagStatus"></div><ul id="diagList"></ul>' +
                '<p class="hint">Up / Down to scroll &middot; Back or Yellow to close</p></div></section>' +
            '<div id="toast"></div>';
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
        clearTimeout(clockTimer);
        clockTimer = setTimeout(tickClock, 60500 - d.getSeconds() * 1000 - d.getMilliseconds());
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
                each(['friendly_name', 'unit_of_measurement', 'device_class', 'temperature', 'current_temperature', 'hvac_action', 'entity_picture'],
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
        var g = ha.groups, sensors = [], picks;
        sensors = sensors.concat(g.weather.slice(0, 1), g.temps.slice(0, 3),
            g.solarPower.length ? g.solarPower.slice(0, 1) : g.solarEnergy.slice(0, 1));
        picks = sensors.slice(0, MAX_SENSORS).concat(g.lights.slice(0, 4), g.cameras.slice(0, MAX_CAMERAS));
        return picks;
    }

    function haSubscribe() {
        if (!ha.connected) { return; }
        var ids = selected().slice(0);
        if (cfg.theme === 'auto' && ids.indexOf('sun.sun') < 0) { ids.push('sun.sun'); }
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
        if (ev.a && selectedOf('camera').length) { refreshThumbs(); }
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

    var GENERIC = /^(temperature|temp|humidity|sensor|thermometer|climate|thermostat|lights?|switch|plug|socket)$/i;

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

    // ---------------------------------------------------- rendering

    var chipFocus = 0;

    function renderWidgets() {
        var sensors = selectedOf('sensor'), buttons = selectedOf('button');
        var stale = !ha.connected;
        var box = $('sensors');
        var html = '';
        each(sensors.slice(0, MAX_SENSORS), function (eid) {
            var f = formatState(eid);
            html += '<div class="sensor' + (f.dim ? ' dim' : '') + (f.text ? ' text' : '') + '">' +
                '<div class="val">' + esc(f.value) + (f.unit === '°' ? '°' : (f.unit ? '<span class="unit"> ' + esc(f.unit) + '</span>' : '')) + '</div>' +
                '<div class="name">' + esc(displayName(eid)) + (f.note ? ' <span class="note">' + esc(f.note) + '</span>' : '') + '</div></div>';
        });
        var anyKnown = false;
        each(sensors, function (eid) { if (ha.states[eid]) { anyKnown = true; } });
        if (stale && H.ha().token) {
            html += '<div class="offline">' + (ha.authFailed ? 'Home Assistant token rejected' : 'Home Assistant offline') + '</div>';
        }
        box.innerHTML = html;
        box.hidden = !sensors.length || !anyKnown;
        box.className = stale ? 'stale' : '';

        var chips = $('chips');
        var cHtml = '';
        buttons = buttons.slice(0, MAX_BUTTONS);
        if (chipFocus >= buttons.length) { chipFocus = Math.max(0, buttons.length - 1); }
        each(buttons, function (eid, i) {
            var st = ha.states[eid];
            var unavailable = !st || st.state === 'unavailable';
            cHtml += '<div class="chip' + (isOn(eid) ? ' on' : '') + (unavailable ? ' dim' : '') +
                (row === 'chips' && i === chipFocus ? ' focused' : '') + '" data-eid="' + esc(eid) + '">' +
                GLYPHS[domainOf(eid) === 'light' ? 'bulb' : 'power'] +
                '<span class="name">' + esc(displayName(eid)) + '</span></div>';
        });
        chips.innerHTML = cHtml;
        chips.hidden = !buttons.length;
        chips.className = stale ? 'stale' : '';
        if (!buttons.length && row === 'chips') { row = 'dock'; renderDock(); }
        buildDock();
    }

    function toggleChip(i) {
        var eid = selectedOf('button').slice(0, MAX_BUTTONS)[i];
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
                li.children[2].textContent = (kind === 'button' ? 'Button' : kind === 'camera' ? 'Camera' : 'Sensor') + ' · ' + eid;
                li.children[3].textContent = kind === 'camera' ? (f.dim ? '–' : 'Dock tile')
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
            if (kind === 'button' && selectedOf('button').length >= MAX_BUTTONS) { toast('Up to ' + MAX_BUTTONS + ' lights and switches. Hide one first.'); return; }
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
    var row = 'dock';   // dock | chips
    var dockSignature = '';

    function renderDock() { each(tiles, function (t, i) { setFocused(t, row === 'dock' && i === focus); }); }

    // YouTube, Internet, the chosen cameras, then Settings. Rebuilt only when that list changes.
    function buildDock() {
        var items = [DOCK[0], DOCK[1]];
        each(selectedOf('camera').slice(0, MAX_CAMERAS), function (eid) {
            items.push({ camera: eid, label: displayName(eid), glyph: 'camera', size: 'big' });
        });
        items.push(DOCK[2]);
        var sig = '';
        each(items, function (d) { sig += (d.app || d.action || d.camera) + '=' + d.label + ';'; });
        if (sig === dockSignature) { return; }
        dockSignature = sig;
        var html = '';
        each(items, function (d) {
            var attr = d.app ? ' data-app="' + d.app + '"' : (d.camera ? ' data-camera="' + esc(d.camera) + '"' : ' data-action="' + d.action + '"');
            html += '<div class="tile ' + d.size + (d.camera ? ' cam' : '') + '"' + attr + '>' +
                '<div class="face">' + GLYPHS[d.glyph] + '</div><div class="label">' + esc(d.label) + '</div></div>';
        });
        $('dock').innerHTML = html;
        $('dock').className = 'n' + items.length;
        tiles = document.querySelectorAll('#dock .tile');
        focus = Math.max(0, Math.min(focus, tiles.length - 1));
        renderDock();
        applyIcons();
        refreshThumbs();
    }

    // ------------------------------------------------------------------ camera snapshots

    var thumbTimer = null;

    function snapshotUrl(eid) {
        var st = ha.states[eid], info = H.ha();
        var pic = st && st.attributes && st.attributes.entity_picture;
        if (!pic) { return null; }
        var u = /^https?:/i.test(pic) ? pic : info.url + pic;
        return u + (u.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
    }

    // Small still on each camera tile, refreshed every 2 minutes while the home screen shows.
    function refreshThumbs() {
        clearTimeout(thumbTimer);
        if (document.hidden || !ha.connected) { return; }
        each(tiles, function (t) {
            var eid = t.getAttribute('data-camera');
            var url = eid && snapshotUrl(eid);
            if (!url) { return; }
            var img = new Image();
            img.onload = function () {
                var face = t.querySelector('.face');
                face.style.backgroundImage = 'url("' + url + '")';
                if (face.className.indexOf('thumb') < 0) { face.className += ' thumb'; }
            };
            img.src = url;
        });
        thumbTimer = setTimeout(refreshThumbs, 120000);
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
        refreshThumbs();
    }

    function switchCamera(dir) {
        var list = selectedOf('camera').slice(0, MAX_CAMERAS);
        if (list.length < 2) { return; }
        var i = list.indexOf(cam.eid);
        openCamera(list[(i + dir + list.length) % list.length]);
    }

    function applyIcons() {
        each(tiles, function (tile) {
            var key = tile.getAttribute('data-app');
            if (!key) { return; }
            var face = tile.querySelector('.face');
            var glyph = face.querySelector('.glyph');
            var old = face.querySelector('img');
            var info = H.apps.resolve(APPS[key]);
            if (old) { face.removeChild(old); }
            glyph.style.visibility = 'visible';
            if (cfg.icons !== 'original' || !info || !info.iconPath) { return; }
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
        var app = APPS[t.getAttribute('data-app')];
        H.apps.launch(app, function (ok, why) {
            if (ok) { return; }
            toast(why === 'preview mode' ? 'Preview mode: this would open ' + app.name
                : app.name + ' not found. Press Yellow to see installed apps.', 4000);
        });
    }

    // ------------------------------------------------------------------ settings panel

    var mode = 'dock';      // dock | settings | picker | editor | diag | camera
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
            return selectedOf('sensor').length + ' sensors, ' + selectedOf('button').length + ' buttons';
        }
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
        each(['settings', 'picker', 'editor', 'diag'], function (id) { $(id).hidden = true; });
        var input = $('addr');
        if (input) { input.blur(); }
        mode = 'dock';
        renderDock();
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
        if (def.key === 'clock24') { tickClock(); }
        if (def.key === 'icons') { applyIcons(); }
        if (def.key === 'theme') {
            applyTheme();
            if (before === 'auto' || cfg.theme === 'auto') { haSubscribe(); }
        }
        renderSettings();
    }

    function runAction(action) {
        if (action === 'widgets') { openPicker(); }
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
        } else if (k === KEY.YELLOW || k === KEY.Y) {
            if (mode === 'diag') { closeOverlays(); } else { openDiag(); }
        } else if (mode === 'dock' && row === 'chips') {
            var n = selectedOf('button').slice(0, MAX_BUTTONS).length;
            if (k === KEY.LEFT) { chipFocus = Math.max(0, chipFocus - 1); renderWidgets(); }
            else if (k === KEY.RIGHT) { chipFocus = Math.min(n - 1, chipFocus + 1); renderWidgets(); }
            else if (k === KEY.DOWN || isBack(k)) { row = 'dock'; renderWidgets(); renderDock(); }
            else if (k === KEY.ENTER) { toggleChip(chipFocus); }
            else { handled = false; }
        } else if (mode === 'dock') {
            if (k === KEY.LEFT) { focus = Math.max(0, focus - 1); renderDock(); }
            else if (k === KEY.RIGHT) { focus = Math.min(tiles.length - 1, focus + 1); renderDock(); }
            else if (k === KEY.UP && !$('chips').hidden) { row = 'chips'; renderDock(); renderWidgets(); }
            else if (k === KEY.ENTER) { activateTile(tiles[focus]); }
            else if (isBack(k)) { /* home screen: Back does nothing; Home and Exit still work */ }
            else { handled = false; }
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
            clearTimeout(thumbTimer);
            wallTimer = null;
        } else {
            refreshThumbs();
            tickClock();
            if (Date.now() - haListAt > 5 * 60000) { refreshHaWalls(); }
            scheduleWalls();
            if (!ha.ws && !ha.authFailed) { ha.retryMs = 2000; haConnect(); }
        }
    }

    function init() {
        build();
        focus = cfg.focus || 0;
        buildDock();
        H.registerKey('ColorF2Yellow');
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
        H.apps.list(function () { applyIcons(); });
        H.ready();
        haConnect();
    }

    init();
}());
