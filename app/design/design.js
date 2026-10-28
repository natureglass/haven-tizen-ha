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
        plus: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M50 24 V76 M24 50 H76"/></svg>',
        // scenes, scripts and buttons on Controls (see RUN_DOMAINS)
        palette: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"><path d="M50 16 C29 16 15 31 15 50 C15 69 29 84 47 84 C54 84 57 79 55 73 C53 67 56 62 63 62 H71 C80 62 85 55 85 46 C85 28 70 16 50 16 Z"/><circle cx="33" cy="47" r="5" fill="currentColor" stroke="none"/><circle cx="44" cy="31" r="5" fill="currentColor" stroke="none"/><circle cx="62" cy="31" r="5" fill="currentColor" stroke="none"/><circle cx="72" cy="46" r="5" fill="currentColor" stroke="none"/></svg>',
        script: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><rect x="22" y="16" width="56" height="68" rx="9"/><path d="M36 36 H64 M36 50 H64 M36 64 H52"/></svg>',
        press: '<svg class="glyph" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6"><circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="15" fill="currentColor" stroke="none"/></svg>'
    };

    var KEY = {
        LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
        BACK: 10009, YELLOW: 405, IME_DONE: 65376, IME_CANCEL: 65385,
        ESC: 27, BACKSPACE: 8, Y: 89, EXIT: 10182,
        CH_UP: 427, CH_DOWN: 428, PAGE_UP: 33, PAGE_DOWN: 34,  // CH +/- on the remote; Page Up/Down in preview
        PLAY: 415, PAUSE: 19, PLAYPAUSE: 10252, STOP: 413, FF: 417, RW: 412, SPACE: 32   // media keys; Space in preview
    };

    var MAX_SENSORS = 30, MAX_BUTTONS = 48, MAX_CAMERAS = 9;

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
        { key: '_screens', label: 'Screens', action: 'screens' },
        { key: '_apps', label: 'Apps in the dock', action: 'apps' },
        { key: '_widgets', label: 'Home Assistant widgets', action: 'widgets' },
        { key: 'senLoc', label: 'Sensors location', options: [['home', 'Home'], ['controls', 'Controls']] },
        { key: '_jellyfin', label: 'Jellyfin', action: 'jellyfin' },
        { key: 'musDir', label: 'Music folder', options: [] },            // filled in by musDirOptions()
        { key: '_address', label: 'Home Assistant address', action: 'address' },
        { key: '_update', label: 'Check for design update', action: 'update' },
        { key: '_diag', label: 'Installed apps and status', action: 'diag' }
    ];

    // widgets: entity IDs in display order; null = never chosen, so suggestions get picked.
    // dockApps: app IDs in dock order; null = never chosen, so YouTube and Internet are used.
    var DEFAULTS = { interval: 60, source: 'both', motion: false, season: 'auto', wxStyle: 'a', jfConvert: 'audio', jfMaxRes: 'auto', jfLibrary: 'show', theme: 'dark', clock24: true,
        icons: 'simple', captions: true, focus: 0, widgets: null, dockApps: null, screens: null, screensOff: null,
        musDir: '', musDirName: '', musShuffle: false, musRepeat: 'all', senLoc: 'home' };
    var cfg = {};
    (function () {
        for (var k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { cfg[k] = H.get(k, DEFAULTS[k]); } }
        // Settings > Jellyfin > Library page: Hide (before Settings > Screens existed)
        if (cfg.screensOff === null && cfg.jfLibrary === 'hide') { cfg.screensOff = ['library']; }
        // Music arrives switched off, once; after that Settings > Screens decides
        if (!H.get('musIntro', false)) {
            var off = (cfg.screensOff || []).slice(0);
            if (off.indexOf('music') < 0) { off.push('music'); }
            cfg.screensOff = off;
            H.set('screensOff', off);
            H.set('musIntro', true);
        }
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
                    '<section id="senBox" hidden><div id="sensors"></div></section><div id="senBar"><b></b></div>' +
                    '<nav id="dock"><div id="dockTrack"></div></nav>' +
                    '<div id="dockMoreL" class="dockMore">&lsaquo;</div><div id="dockMoreR" class="dockMore">&rsaquo;</div>' +
                    '<div id="caption"></div>' +
                '</section>' +
                '<section class="page" id="pageControls">' +
                    '<section id="ctlArea"><div id="ctlTrack"></div></section>' +
                    '<div id="ctlMoreU" class="dockMore vmore">&lsaquo;</div><div id="ctlMoreD" class="dockMore vmore">&rsaquo;</div>' +
                '</section>' +
                '<section class="page" id="pageWeather"><section id="wxArea"></section></section>' +     // pages in id order (P_HOME .. P_LIB); where each sits on screen comes from ORDER
                '<section class="page" id="pageCameras"><section id="camArea"></section></section>' +
                '<section class="page" id="pageLibrary"><section id="libArea"></section><section id="libDetail"></section></section>' +
                '<section class="page" id="pageMusic"><section id="musArea"></section></section>' +
            '</div>' +
            '<div id="tabs"></div>' +
            '<header id="clock"><div id="time">--:--</div><div id="date"></div></header>' +
            '<div id="haStatus"></div>' +
            '<div id="musMini" hidden><span class="eq"><i></i><i></i><i></i></span><span id="musMiniText"></span><b class="mb"><i id="musMiniFill"></i></b></div>' +
            '<audio id="musAudio"></audio>' +
            '<div id="edgeL" class="edge l"></div><div id="edgeR" class="edge r"></div>' +
            '<div id="dots"></div>' +
            '<section id="player" hidden>' +
                '<img id="camSnap" alt="">' +
                '<video id="camVideo" hidden></video>' +
                '<div id="camBar"><span id="camLive" hidden></span><span id="camName"></span></div>' +
                '<div id="camStatus"></div>' +
                '<div id="camHint"></div>' +
            '</section>' +
            '<section id="vid" hidden>' +
                '<video id="vidVideo" hidden></video>' +
                '<div id="vidSub"></div><div id="vidCenter"></div><div id="vidMsg"></div>' +
                '<div id="vidOsd">' +
                    '<div class="vtop"><div><h2 id="vidTitle"></h2><div id="vidMeta"></div></div><div id="vidClock"></div></div>' +
                    '<div class="vbot">' +
                        '<div class="vbar"><div id="vidFill"></div><div id="vidMarks"></div><div id="vidThumb"><span id="vidTip"></span></div></div>' +
                        '<div class="vtimes"><span id="vidPos"></span><span id="vidDur"></span></div>' +
                        '<div class="vrow"><span id="vidTracks"></span>' +
                            '<span>OK pause  ·  Left / Right 10 s  ·  CH chapters  ·  Up audio and subtitles  ·  Back to stop</span></div>' +
                    '</div>' +
                '</div>' +
            '</section>' +
            '<section id="trk" hidden></section>' +
            '<section id="settings" class="overlay" hidden><div class="panel">' +
                '<h2>Haven settings</h2><ul id="settingsRows"></ul>' +
                '<p class="hint">Up / Down to choose &middot; Left / Right to change &middot; Back to close</p></div></section>' +
            '<section id="picker" class="overlay" hidden><div class="panel wide">' +
                '<h2>Home Assistant widgets</h2><p id="pickCount" class="hint left"></p><ul id="pickList" class="picklist"></ul>' +
                '<p class="hint" id="pickHint"></p></div></section>' +
            '<section id="screens" class="overlay" hidden><div class="panel">' +
                '<h2>Screens</h2><p class="hint left">The screens you slide between, in this order. Haven opens on the first one.</p>' +
                '<ul id="scrList" class="picklist"></ul><p id="scrHint" class="hint"></p></div></section>' +
            '<section id="apps" class="overlay" hidden><div class="panel wide">' +
                '<h2>Apps in the dock</h2><p id="appsCount" class="hint left"></p><ul id="appsList" class="picklist"></ul>' +
                '<p id="appsHint" class="hint"></p></div></section>' +
            '<section id="editor" class="overlay" hidden><div class="panel">' +
                '<h2>Home Assistant address</h2>' +
                '<p class="hint left">The IP is enough, for example 192.168.1.10. Haven adds :8123/local/haven/ itself.</p>' +
                '<input id="addr" type="text" autocomplete="off" spellcheck="false">' +
                '<p class="hint">OK or Done to save &middot; Back to cancel</p></div></section>' +
            '<section id="jf" class="overlay" hidden><div class="panel jfpanel" id="jfPanel"></div></section>' +
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

    var clockDay = '';
    function tickClock() {
        var d = new Date(), h = d.getHours();
        if (clockDay && clockDay !== d.toDateString()) { renderWidgets(); }    // "Activated 23:40" becomes a date
        clockDay = d.toDateString();
        $('time').textContent = cfg.clock24 ? pad(h) + ':' + pad(d.getMinutes())
            : ((h + 11) % 12 + 1) + ':' + pad(d.getMinutes()) + (h < 12 ? ' AM' : ' PM');
        $('date').textContent = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
        applyTheme();
        updateFx();
        clearTimeout(clockTimer);
        clockTimer = setTimeout(tickClock, 60500 - d.getSeconds() * 1000 - d.getMilliseconds());
    }

    // ------------------------------------------------------------------ Jellyfin: core
    //
    // A small Jellyfin client for the Library page, ported to ES5 from the Brewser Jellyfin
    // Client's core.js: same endpoints, the same MediaBrowser auth header, Quick Connect, and the
    // PlaybackInfo negotiation with a device profile. What differs is the target: a Samsung TV
    // plays far more natively than the Switch, so the profile is built from what this TV reports
    // it can decode (detected at startup, never assumed), and video conversion is a user choice
    // (Settings > Jellyfin > Server conversion), because a Raspberry Pi can't transcode video.
    // Needs Jellyfin 10.9 or newer.

    var JF_VERSION = '1.0.0', JF_TICKS = 10000000, JF_MIN = [10, 9];
    var jf = { url: '', token: '', userId: '', userName: '', serverName: '', version: '', deviceId: '',
               userCfg: null, state: 'off', caps: null };

    (function () {
        var s = H.get('jfSession', null);
        if (s && s.url && s.token && s.userId) {
            jf.url = s.url; jf.token = s.token; jf.userId = s.userId; jf.userName = s.userName || '';
            jf.serverName = s.serverName || ''; jf.version = s.version || ''; jf.state = 'signed-in';
        }
        jf.deviceId = H.get('jfDevice', null);
        if (!jf.deviceId) {
            jf.deviceId = '';
            for (var i = 0; i < 32; i++) { jf.deviceId += Math.floor(Math.random() * 16).toString(16); }
            H.set('jfDevice', jf.deviceId);
        }
    }());

    function jfSignedIn() { return !!(jf.token && jf.userId); }

    // "192.168.1.10" -> "http://192.168.1.10:8096"; full URLs (https, a /jellyfin path) are kept as given.
    function jfNormalize(input) {
        var s = String(input || '').replace(/^\s+|\s+$/g, '');
        if (!s) { return ''; }
        if (!/^https?:\/\//i.test(s)) { s = 'http://' + s; }
        s = s.replace(/\/+$/, '');
        if (/^http:\/\/[^\/:]+$/i.test(s)) { s += ':8096'; }          // bare host: Jellyfin's default port
        return s;
    }

    // First guess: Jellyfin next to Home Assistant (the add-on listens on 8096).
    function jfDefaultUrl() {
        var m = /^(https?:\/\/[^\/:]+)/i.exec(H.ha().url || '');
        return m ? m[1].replace(/^https:/i, 'http:') + ':8096' : '';
    }

    function jfVersionOk(v) {
        var p = String(v || '').split('.');
        var a = +p[0] || 0, b = +p[1] || 0;
        return a > JF_MIN[0] || (a === JF_MIN[0] && b >= JF_MIN[1]);
    }

    function jfDeviceName() {
        var pi = window.webapis && window.webapis.productinfo;
        try { if (pi && pi.getRealModel) { return 'Samsung ' + pi.getRealModel(); } } catch (e) { /* not on a TV */ }
        return H.isTV ? 'Samsung TV' : 'Browser';
    }

    // The auth header the official clients send: MediaBrowser Client=.., Device=.., DeviceId=.., Version=.., Token=..
    function jfAuthHeader() {
        return 'MediaBrowser Client="Haven", Device="' + encodeURIComponent(jfDeviceName()) + '", DeviceId="' + jf.deviceId +
            '", Version="' + JF_VERSION + '"' + (jf.token ? ', Token="' + jf.token + '"' : '');
    }

    function jfQuery(q) {
        var out = [], k;
        for (k in q) {
            if (q.hasOwnProperty(k) && q[k] !== undefined && q[k] !== null && q[k] !== '') {
                out.push(encodeURIComponent(k) + '=' + encodeURIComponent(q[k]));
            }
        }
        return out.length ? '?' + out.join('&') : '';
    }

    // For <img> and the player, which can't send headers: the token rides along as api_key.
    function jfMediaUrl(path, q) {
        var o = {}, k;
        for (k in (q || {})) { if (q.hasOwnProperty(k)) { o[k] = q[k]; } }
        if (jf.token) { o.api_key = jf.token; }
        return jf.url + path + jfQuery(o);
    }

    // opts: { query, body, base (a server not signed in to yet), timeout }. Resolves the parsed JSON.
    function jfRequest(method, path, opts) {
        opts = opts || {};
        var base = opts.base || jf.url;
        return new Promise(function (resolve, reject) {
            var x = new XMLHttpRequest();
            function fail(msg, status) { var e = new Error(msg); e.status = status; reject(e); }
            try { x.open(method, base + path + jfQuery(opts.query || {}), true); } catch (e) { fail('bad address ' + base, 0); return; }
            x.timeout = opts.timeout || 15000;
            x.setRequestHeader('Authorization', jfAuthHeader());
            if (opts.body !== undefined) { x.setRequestHeader('Content-Type', 'application/json'); }
            x.onload = function () {
                if (x.status >= 200 && x.status < 300) {
                    var t = x.responseText;
                    if (opts.raw) { resolve(t); return; }
                    try { resolve(t ? JSON.parse(t) : null); } catch (e) { resolve(null); }
                } else {
                    fail(method + ' ' + path + ' answered ' + x.status, x.status);
                }
            };
            x.onerror = function () { fail('no Jellyfin server answered at ' + base, 0); };
            x.ontimeout = function () { fail('no answer from ' + base + ' (timed out)', 0); };
            x.send(opts.body !== undefined ? JSON.stringify(opts.body) : null);
        });
    }

    // ---------------------------------------------------- sign in

    function jfPublicInfo(base) { return jfRequest('GET', '/System/Info/Public', { base: base, timeout: 8000 }); }

    function jfQcEnabled(base) {
        return jfRequest('GET', '/QuickConnect/Enabled', { base: base }).then(function (r) { return r === true; }, function () { return false; });
    }

    function jfAdopt(base, res, info) {
        if (!res || !res.AccessToken || !res.User || !res.User.Id) { throw new Error('Jellyfin did not return a session'); }
        jf.url = base;
        jf.token = res.AccessToken;
        jf.userId = res.User.Id;
        jf.userName = res.User.Name || '';
        jf.userCfg = null;                     // reloaded for this user
        jf.serverName = (info && info.ServerName) || jf.serverName;
        jf.version = (info && info.Version) || jf.version;
        jf.state = 'signed-in';
        H.set('jfSession', { url: jf.url, token: jf.token, userId: jf.userId, userName: jf.userName,
            serverName: jf.serverName, version: jf.version });
        return res;
    }

    function jfAuthByName(base, info, user, pass) {
        var keep = jf.token;
        jf.token = '';                       // sign in fresh, even when switching servers
        return jfRequest('POST', '/Users/AuthenticateByName', { base: base, body: { Username: user, Pw: pass } })
            .then(function (res) { return jfAdopt(base, res, info); }, function (e) { jf.token = keep; throw e; });
    }

    // Quick Connect: Initiate -> show Code -> poll Connect until Authenticated -> exchange the secret.
    function jfQcInitiate(base) {
        var keep = jf.token;
        jf.token = '';
        return jfRequest('POST', '/QuickConnect/Initiate', { base: base }).then(function (r) { jf.token = keep; return r; },
            function (e) { jf.token = keep; throw e; });
    }

    function jfQcCheck(base, secret) { return jfRequest('GET', '/QuickConnect/Connect', { base: base, query: { secret: secret } }); }

    function jfQcFinish(base, info, secret) {
        jf.token = '';
        return jfRequest('POST', '/Users/AuthenticateWithQuickConnect', { base: base, body: { Secret: secret } })
            .then(function (res) { return jfAdopt(base, res, info); });
    }

    function jfForget() {
        jf.token = jf.userId = jf.userName = '';
        jf.userCfg = null;
        jf.state = 'off';
        H.set('jfSession', null);
    }

    function jfLogout() {
        var done = function () { jfForget(); };
        return jfRequest('POST', '/Sessions/Logout', { timeout: 5000 }).then(done, done);   // a revoked token is fine: signing out anyway
    }

    // The signed-in user's settings (audio / subtitle languages); also tells us the session still works.
    function jfVerify() {
        if (!jfSignedIn()) { return Promise.resolve(null); }
        return jfRequest('GET', '/Users/' + jf.userId).then(function (u) {
            jf.userCfg = (u && u.Configuration) || {};
            jf.state = 'signed-in';
            return u;
        }, function (e) {
            if (e.status === 401 || e.status === 403) { jfForget(); jf.state = 'revoked'; }
            else { jf.state = 'unreachable'; }
            throw e;
        });
    }

    // ---------------------------------------------------- library

    var JF_FIELDS = 'PrimaryImageAspectRatio,Overview,ProductionYear,RunTimeTicks,OfficialRating,CommunityRating';

    function jfViews() { return jfRequest('GET', '/UserViews', { query: { userId: jf.userId } }); }

    // q: { parentId, startIndex, limit, sortBy, sortOrder, includeItemTypes, recursive, filters, searchTerm }
    function jfItems(q) {
        q = q || {};
        return jfRequest('GET', '/Items', { query: {
            userId: jf.userId, parentId: q.parentId, startIndex: q.startIndex || 0, limit: q.limit === undefined ? 60 : q.limit,
            sortBy: q.sortBy || 'SortName', sortOrder: q.sortOrder || 'Ascending', includeItemTypes: q.includeItemTypes,
            recursive: q.recursive, filters: q.filters, searchTerm: q.searchTerm, nameLessThan: q.nameLessThan,
            fields: JF_FIELDS + ',SortName', enableUserData: true
        } });
    }

    function jfResume(limit, types) {
        return jfRequest('GET', '/UserItems/Resume', { query: { userId: jf.userId, limit: limit || 12, mediaTypes: 'Video',
            includeItemTypes: types, fields: JF_FIELDS, enableUserData: true } });
    }

    function jfLatest(types, limit) {
        return jfRequest('GET', '/Items/Latest', { query: { userId: jf.userId, includeItemTypes: types, limit: limit || 16,
            fields: JF_FIELDS, enableUserData: true } });
    }

    function jfItem(id) { return jfRequest('GET', '/Items/' + id, { query: { userId: jf.userId, fields: 'Chapters,MediaStreams,Genres,Overview' } }); }

    function jfSimilar(id, limit) {
        return jfRequest('GET', '/Items/' + id + '/Similar', { query: { userId: jf.userId, limit: limit || 10, fields: JF_FIELDS } });
    }

    // Artwork at exactly the size drawn: the server resizes, the TV only decodes what it shows.
    // opts: { type: 'Primary' | 'Backdrop' | 'Thumb', width, height, quality }
    function jfImage(item, opts) {
        opts = opts || {};
        var type = opts.type || 'Primary', tag = type === 'Backdrop'
            ? (item.BackdropImageTags && item.BackdropImageTags[0]) : (item.ImageTags && item.ImageTags[type]);
        if (!tag || !item.Id) { return null; }
        return jfMediaUrl('/Items/' + item.Id + '/Images/' + type, { tag: tag, fillWidth: opts.width, fillHeight: opts.height,
            quality: opts.quality || 85 });
    }

    // ---------------------------------------------------- what this TV can play (detected, not assumed)

    function jfDetectCaps() {
        if (jf.caps) { return jf.caps; }
        var v = document.createElement('video'), ms = window.MediaSource, wa = window.webapis || {};
        function can(type) {
            try {
                if (ms && ms.isTypeSupported && ms.isTypeSupported(type)) { return true; }
                var r = v.canPlayType ? v.canPlayType(type) : '';
                return r === 'probably' || r === 'maybe';
            } catch (e) { return false; }
        }
        function call(obj, fn) { try { return !!(obj && obj[fn] && obj[fn]()); } catch (e) { return false; } }
        var tv = !!H.isTV, uhd = call(wa.productinfo, 'isUdPanelSupported');
        var c = {
            tv: tv, uhd: uhd,
            h264: true,
            // every Samsung UHD TV decodes HEVC; on other screens trust the probe
            hevc: (tv && uhd) || can('video/mp4; codecs="hvc1.1.6.L150.B0"') || can('video/mp4; codecs="hev1.1.6.L150.B0"'),
            vp9: can('video/webm; codecs="vp9"'),
            av1: can('video/mp4; codecs="av01.0.08M.08"'),
            hdr: call(wa.avinfo, 'isHdrTvSupport'),
            aac: true, mp3: true,
            ac3: tv || can('audio/mp4; codecs="ac-3"'),         // Samsung TVs decode Dolby Digital (Plus)
            eac3: tv || can('audio/mp4; codecs="ec-3"'),
            dts: can('audio/mp4; codecs="dtsc"') || can('audio/mp4; codecs="dtse"'),
            truehd: can('audio/mp4; codecs="mlpa"'),
            flac: can('audio/flac') || can('audio/mp4; codecs="flac"'),
            opus: can('audio/webm; codecs="opus"'),
            mkv: tv,                                              // the TV's player reads MKV; a browser doesn't
            mp4: true, ts: tv, webm: can('video/webm; codecs="vp9"'),
            model: '', platform: ''
        };
        try { if (wa.productinfo && wa.productinfo.getRealModel) { c.model = wa.productinfo.getRealModel(); } } catch (e) { /* preview */ }
        try {
            if (window.tizen && window.tizen.systeminfo) { c.platform = 'Tizen ' + window.tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version'); }
        } catch (e2) { /* preview */ }
        jf.caps = c;
        return c;
    }

    function jfMaxSize() {
        var c = jfDetectCaps(), r = cfg.jfMaxRes;
        if (r === '720') { return [1280, 720]; }
        if (r === '1080' || !c.uhd) { return [1920, 1080]; }
        return [3840, 2160];
    }

    // The DeviceProfile sent with PlaybackInfo: direct play everything this TV decodes; for the rest,
    // ask for HLS with the video copied when possible (only audio converted: light even on a Pi).
    function jfDeviceProfile() {
        var c = jfDetectCaps(), size = jfMaxSize(), v = ['h264'], a = ['aac', 'mp3'], cont = ['mp4', 'm4v', 'mov'];
        if (c.hevc) { v.push('hevc'); }
        if (c.vp9) { v.push('vp9'); }
        if (c.av1) { v.push('av1'); }
        each(['ac3', 'eac3', 'dts', 'truehd', 'flac', 'opus'], function (k) { if (c[k]) { a.push(k === 'dts' ? 'dca,dts' : k); } });
        if (c.mkv) { cont.push('mkv'); }
        if (c.ts) { cont.push('ts', 'm2ts'); }
        if (c.webm) { cont.push('webm'); }
        var tAudio = ['aac'].concat(c.ac3 ? ['ac3'] : []).concat(c.eac3 ? ['eac3'] : []);
        return {
            Name: 'Haven (' + (c.model || (c.tv ? 'Samsung TV' : 'browser')) + ')',
            MaxStreamingBitrate: 120000000,
            MaxStaticBitrate: 120000000,
            DirectPlayProfiles: [{ Container: cont.join(','), Type: 'Video', VideoCodec: v.join(','), AudioCodec: a.join(',') }],
            TranscodingProfiles: [{ Container: 'ts', Type: 'Video', Protocol: 'hls', Context: 'Streaming',
                VideoCodec: v.slice(0, c.hevc ? 2 : 1).join(','), AudioCodec: tAudio.join(','), MaxAudioChannels: '6',
                MinSegments: 1, BreakOnNonKeyFrames: true }],
            CodecProfiles: [{ Type: 'Video', Conditions: [
                { Condition: 'LessThanEqual', Property: 'Width', Value: String(size[0]), IsRequired: true },
                { Condition: 'LessThanEqual', Property: 'Height', Value: String(size[1]), IsRequired: true }
            ].concat(c.hdr ? [] : [{ Condition: 'Equals', Property: 'VideoRangeType', Value: 'SDR', IsRequired: false }]) }],
            // Haven draws text subtitles itself; picture subtitles (PGS, DVD) can only be burned in,
            // which is a full video conversion.
            SubtitleProfiles: [
                { Format: 'vtt', Method: 'External' }, { Format: 'srt', Method: 'External' },
                { Format: 'subrip', Method: 'External' }, { Format: 'ass', Method: 'External' }, { Format: 'ssa', Method: 'External' },
                { Format: 'pgssub', Method: 'Encode' }, { Format: 'dvdsub', Method: 'Encode' }
            ]
        };
    }

    // ---------------------------------------------------- playback negotiation

    // opts: { startTicks, audioIndex, subtitleIndex, mediaSourceId, noDirectPlay }
    function jfPlaybackInfo(itemId, opts) {
        opts = opts || {};
        var conv = cfg.jfConvert;
        return jfRequest('POST', '/Items/' + itemId + '/PlaybackInfo', {
            query: { userId: jf.userId, startTimeTicks: opts.startTicks || 0, maxStreamingBitrate: 120000000,
                mediaSourceId: opts.mediaSourceId, audioStreamIndex: opts.audioIndex, subtitleStreamIndex: opts.subtitleIndex,
                enableDirectPlay: !opts.noDirectPlay, enableDirectStream: true, enableTranscoding: conv !== 'off',
                allowVideoStreamCopy: true, allowAudioStreamCopy: true, autoOpenLiveStream: true },
            body: { DeviceProfile: jfDeviceProfile() }
        });
    }

    function jfReasons(source) {
        var r = source.TranscodeReasons || [];
        return typeof r === 'string' ? r.split(',') : r;
    }

    // Would the server have to re-encode the video (or burn in subtitles)? That's the heavy kind.
    function jfNeedsVideo(source) {
        var heavy = false;
        each(jfReasons(source), function (r) { if (/^Video|^SubtitleCodec|^RefFrames|^Anamorphic|^Interlaced/i.test(r)) { heavy = true; } });
        return heavy;
    }

    // PlaybackInfo -> one URL for the player, honouring Settings > Jellyfin > Server conversion.
    // returns { url, method: 'DirectPlay' | 'DirectStream' | 'Transcode', label, mediaSourceId, playSessionId, source }
    function jfResolve(itemId, info) {
        if (info && info.ErrorCode) { throw jfError('Jellyfin refused this title (' + info.ErrorCode + ')', 'refused'); }
        var s = info && info.MediaSources && info.MediaSources[0];
        if (!s || !s.Id) { throw jfError('Jellyfin returned nothing to play', 'empty'); }
        var base = { mediaSourceId: s.Id, playSessionId: info.PlaySessionId || null, source: s };
        if (s.SupportsDirectPlay) {
            base.url = jfMediaUrl('/Videos/' + itemId + '/stream.' + (s.Container || 'mkv').split(',')[0],
                { static: true, mediaSourceId: s.Id, deviceId: jf.deviceId, Tag: s.ETag });
            base.method = 'DirectPlay';
            base.label = 'Direct play';
            return base;
        }
        if (!s.TranscodingUrl) {
            throw jfError(cfg.jfConvert === 'off' ? 'This TV can\'t play this file as it is, and server conversion is off'
                : 'Jellyfin offered no way to play this file', 'unplayable');
        }
        if (jfNeedsVideo(s) && cfg.jfConvert !== 'av') {
            throw jfError('This file needs its video converted, which is off (Settings > Jellyfin > Server conversion)', 'needs-video');
        }
        var url = jf.url + s.TranscodingUrl;
        if (!/[?&]api_key=/i.test(url) && jf.token) { url += (url.indexOf('?') >= 0 ? '&' : '?') + 'api_key=' + encodeURIComponent(jf.token); }
        base.url = url;
        base.method = jfNeedsVideo(s) ? 'Transcode' : 'DirectStream';
        base.label = base.method === 'Transcode' ? 'Video converted' : (jfReasons(s).length ? 'Audio converted' : 'Remuxed');
        return base;
    }

    function jfError(msg, code) { var e = new Error(msg); e.code = code; return e; }

    // Progress reports: start once, every ~10 s and on pause / seek, stopped on exit (that saves the resume point).
    // kind: 'start' | 'progress' | 'stopped'; ctx: { itemId, mediaSourceId, playSessionId, method, audioIndex, subIndex }
    function jfReport(kind, ctx, seconds, paused) {
        var path = kind === 'start' ? '/Sessions/Playing' : kind === 'stopped' ? '/Sessions/Playing/Stopped' : '/Sessions/Playing/Progress';
        return jfRequest('POST', path, { body: { ItemId: ctx.itemId, MediaSourceId: ctx.mediaSourceId, PlaySessionId: ctx.playSessionId || undefined,
            PlayMethod: ctx.method === 'Transcode' ? 'Transcode' : ctx.method === 'DirectStream' ? 'DirectStream' : 'DirectPlay',
            AudioStreamIndex: ctx.audioIndex, SubtitleStreamIndex: ctx.subIndex === undefined ? -1 : ctx.subIndex,
            PositionTicks: Math.max(0, Math.round((seconds || 0) * JF_TICKS)), IsPaused: !!paused, CanSeek: true } });
    }

    // A conversion keeps running on the server until it's told playback ended (a Pi notices).
    function jfStopEncoding(playSessionId) {
        if (!playSessionId) { return; }
        jfRequest('DELETE', '/Videos/ActiveEncodings', { query: { deviceId: jf.deviceId, playSessionId: playSessionId } })
            .then(null, function () { /* the server ends it by itself after a while */ });
    }

    // ------------------------------------------------------------------ Jellyfin: Settings panel
    //
    // Settings > Jellyfin. Not signed in: the server address (Home Assistant's own address on
    // port 8096 is tried first), then Quick Connect (a code to approve on your phone) or a
    // password. Signed in: server conversion, highest resolution, the languages from your
    // Jellyfin profile, what this TV can play, change server, sign out.

    var jfp = { view: 'connect', row: 0, items: [], addr: '', info: null, qcOn: false, msg: '', err: false,
                code: '', secret: '', qcRun: 0, qcTimer: null, user: '', pass: '', input: null };

    var JF_LOGO = '<svg class="jflogo" viewBox="0 0 100 100"><defs><linearGradient id="jfg" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#aa5cc3"/><stop offset="1" stop-color="#00a4dc"/></linearGradient></defs>' +
        '<path d="M50 8 L92 86 H8 Z" fill="none" stroke="url(#jfg)" stroke-width="9" stroke-linejoin="round"/>' +
        '<path d="M50 44 L66 74 H34 Z" fill="url(#jfg)"/></svg>';

    var JF_CONVERT = [['audio', 'Audio only (light, good for a Raspberry Pi)'], ['av', 'Audio and video (needs a strong server)'],
        ['off', 'Off (only files this TV plays as they are)']];

    function jfShortHost(u) { return String(u || '').replace(/^https?:\/\//, ''); }

    function jfSettingsValue() {
        if (jfSignedIn()) { return (jf.userName || 'Signed in') + ' on ' + jfShortHost(jf.url); }
        return jf.state === 'revoked' ? 'Signed out (session ended)' : 'Not connected';
    }

    function jfOpen() {
        mode = 'jf';
        $('settings').hidden = true;
        $('jf').hidden = false;
        if (jfSignedIn()) { jfShowAccount(); } else { jfShowConnect(true); }
    }

    function jfClose() {
        jfStopQc();
        jfBlurInput();
        $('jf').hidden = true;
        $('settings').hidden = false;
        mode = 'settings';
        renderSettings();
    }

    // ---------------------------------------------------- views

    function jfShowConnect(probe) {
        jfStopQc();
        jfp.view = 'connect';
        jfp.addr = jfp.addr || jf.url || jfDefaultUrl();
        jfConnectItems();
        jfp.row = jfp.info && jfp.qcOn ? 1 : 0;
        if (probe) { jfProbe(); } else { jfRender(); }
    }

    function jfConnectItems() {
        var found = !!jfp.info && jfVersionOk(jfp.info.Version);
        jfp.items = [
            { type: 'input', key: 'addr', label: 'Server address', value: jfp.addr, hint: '192.168.1.10 or https://media.example.com/jellyfin',
              done: function (v) { jfp.addr = jfNormalize(v); jfp.info = null; jfProbe(); } },
            { type: 'row', label: 'Sign in with Quick Connect', value: found && !jfp.qcOn ? 'turned off on this server' : '',
              off: !found || !jfp.qcOn, act: jfStartQc },
            { type: 'row', label: 'Sign in with a password', off: !found, act: jfShowPassword },
            { type: 'row', label: 'Close', act: jfClose }
        ];
    }

    function jfProbe() {
        var addr = jfp.addr;
        jfp.info = null;
        jfp.qcOn = false;
        jfSetMsg(addr ? 'Looking for Jellyfin at ' + jfShortHost(addr) + '...' : 'Enter the address of your Jellyfin server.', false);
        jfConnectItems();
        jfRender();
        if (!addr) { return; }
        jfPublicInfo(addr).then(function (info) {
            if (addr !== jfp.addr || jfp.view !== 'connect') { return null; }
            jfp.info = info || {};
            if (!jfVersionOk(jfp.info.Version)) {
                jfSetMsg('Found Jellyfin ' + (jfp.info.Version || '(unknown version)') + ' at ' + jfShortHost(addr) +
                    ', but Haven needs 10.9 or newer.', true);
                jfConnectItems();
                jfRender();
                return null;
            }
            return jfQcEnabled(addr).then(function (on) {
                if (addr !== jfp.addr || jfp.view !== 'connect') { return; }
                jfp.qcOn = on;
                jfSetMsg('Found ' + (jfp.info.ServerName ? '"' + jfp.info.ServerName + '", ' : '') + 'Jellyfin ' + jfp.info.Version + ' at ' +
                    jfShortHost(addr) + (addr === jfDefaultUrl() ? ' (your Home Assistant)' : '') + '.', false);
                jfConnectItems();
                jfp.row = on ? 1 : 2;
                jfRender();
            });
        }, function (e) {
            if (addr !== jfp.addr || jfp.view !== 'connect') { return; }
            jfSetMsg('No Jellyfin server answered at ' + jfShortHost(addr) + '. Check the address and port (Jellyfin uses 8096), ' +
                'and that the server is running.', true);
            jfConnectItems();
            jfp.row = 0;
            jfRender();
        });
    }

    function jfStartQc() {
        var addr = jfp.addr, info = jfp.info, run = ++jfp.qcRun;
        jfSetMsg('Asking Jellyfin for a code...', false);
        jfRender();
        jfQcInitiate(addr).then(function (r) {
            if (run !== jfp.qcRun) { return; }
            jfp.view = 'qc';
            jfp.code = String((r && r.Code) || '');
            jfp.secret = (r && r.Secret) || '';
            jfp.items = [
                { type: 'row', label: 'Sign in with a password instead', act: jfShowPassword },
                { type: 'row', label: 'Change server', act: function () { jfp.qcRun++; jfShowConnect(false); jfp.row = 0; jfRender(); } },
                { type: 'row', label: 'Cancel', act: function () { jfShowConnect(false); } }
            ];
            jfp.row = 2;
            jfSetMsg('Waiting for approval. The code works for a few minutes.', false);
            jfRender();
            var until = Date.now() + 10 * 60000;
            (function poll() {
                jfp.qcTimer = setTimeout(function () {
                    if (run !== jfp.qcRun) { return; }
                    if (Date.now() > until) { jfQcFailed('The code expired. Start Quick Connect again.'); return; }
                    jfQcCheck(addr, jfp.secret).then(function (st) {
                        if (run !== jfp.qcRun) { return; }
                        if (!st || !st.Authenticated) { poll(); return; }
                        jfSetMsg('Approved, signing in...', false);
                        jfRender();
                        jfQcFinish(addr, info, jfp.secret).then(function () {
                            if (run === jfp.qcRun) { jfSignedInNow(); }
                        }, function (e) { if (run === jfp.qcRun) { jfQcFailed('Signing in failed: ' + e.message); } });
                    }, function (e) {
                        if (run !== jfp.qcRun) { return; }
                        if (e.status === 404 || e.status === 401) { jfQcFailed('The code expired. Start Quick Connect again.'); } else { poll(); }
                    });
                }, 2000);
            }());
        }, function (e) {
            if (run !== jfp.qcRun) { return; }
            jfSetMsg('Quick Connect didn\'t start: ' + e.message, true);
            jfRender();
        });
    }

    function jfQcFailed(msg) {
        jfShowConnect(false);
        jfSetMsg(msg, true);
        jfRender();
    }

    function jfStopQc() {
        jfp.qcRun++;
        clearTimeout(jfp.qcTimer);
        jfp.code = '';
    }

    function jfShowPassword() {
        jfStopQc();
        jfp.view = 'password';
        jfp.pass = '';
        jfp.items = [
            { type: 'input', key: 'user', label: 'Username', value: jfp.user, done: function (v) { jfp.user = v; } },
            { type: 'input', key: 'pass', label: 'Password', value: '', secret: true, done: function (v) { jfp.pass = v; } },
            { type: 'row', label: 'Sign in', act: jfPasswordSignIn },
            { type: 'row', label: 'Back', act: function () { jfShowConnect(false); } }
        ];
        jfp.row = 0;
        jfSetMsg('Sign in to ' + (jfp.info && jfp.info.ServerName ? '"' + jfp.info.ServerName + '"' : jfShortHost(jfp.addr)) + '.', false);
        jfRender();
    }

    function jfPasswordSignIn() {
        if (!jfp.user) { jfSetMsg('Enter your username first.', true); jfp.row = 0; jfRender(); return; }
        jfSetMsg('Signing in...', false);
        jfRender();
        jfAuthByName(jfp.addr, jfp.info, jfp.user, jfp.pass).then(jfSignedInNow, function (e) {
            jfSetMsg(e.status === 401 ? 'Wrong username or password.' : 'Signing in failed: ' + e.message, true);
            jfp.row = 1;
            jfRender();
        });
    }

    function jfSignedInNow() {
        jfp.pass = '';
        jfShowAccount();
        jfSetMsg('Signed in as ' + jf.userName + '.', false);
        jfRender();
        renderSettings();
        jfOnSessionChange();
    }

    function jfShowAccount() {
        jfStopQc();
        jfp.view = 'account';
        var c = jfDetectCaps();
        jfp.items = [
            { type: 'info', label: 'Server', value: jfShortHost(jf.url) + (jf.version ? ' · Jellyfin ' + jf.version : '') + ' · signed in as ' + jf.userName },
            { type: 'info', label: 'Library page', value: (screenOn(P_LIB) ? 'Shown' : 'Hidden') + ' · Settings > Screens to change' },
            { type: 'option', key: 'jfConvert', label: 'Server conversion', options: JF_CONVERT },
            { type: 'option', key: 'jfMaxRes', label: 'Highest resolution',
              options: [['auto', 'Auto (this TV: ' + (c.uhd ? '4K' : '1080p') + ')'], ['1080', '1080p'], ['720', '720p']] },
            { type: 'info', label: 'Audio and subtitle languages', value: jfLanguages() },
            { type: 'caps' },
            { type: 'row', label: 'Change server', act: function () { jfp.addr = jf.url; jfp.info = null; jfShowConnect(true); } },
            { type: 'row', label: 'Sign out', act: jfSignOut },
            { type: 'row', label: 'Close', act: jfClose }
        ];
        jfp.row = 2;                           // Server conversion
        jfSetMsg('', false);
        jfRender();
        if (!jf.userCfg) {
            jfVerify().then(function () {
                if (jfp.view === 'account') { jfp.items[4].value = jfLanguages(); jfRender(); }
            }, function (e) {
                if (jfp.view !== 'account') { return; }
                if (!jfSignedIn()) { jfShowConnect(true); jfSetMsg('Jellyfin ended this session. Sign in again.', true); jfRender(); }
                else { jfSetMsg('Jellyfin isn\'t answering right now (' + e.message + ').', true); jfRender(); }
            });
        }
    }

    function jfLanguages() {
        var u = jf.userCfg;
        if (!u) { return 'Loading from your Jellyfin profile...'; }
        var a = u.AudioLanguagePreference || 'default', s = u.SubtitleMode === 'None' ? 'off'
            : (u.SubtitleLanguagePreference || 'default') + (u.SubtitleMode && u.SubtitleMode !== 'Default' ? ' (' + u.SubtitleMode.toLowerCase() + ')' : '');
        return 'From your Jellyfin profile: audio ' + a + ', subtitles ' + s;
    }

    function jfSignOut() {
        jfLogout().then(function () {
            toast('Signed out of Jellyfin', 3000);
            jfp.addr = jf.url || jfp.addr;
            jfShowConnect(true);
            renderSettings();
            jfOnSessionChange();
        });
    }

    // Hook for the Library page (Phase 2): the session appeared or went away.
    function jfOnSessionChange() {
        lib.loadedAt = 0;
        lib.all = []; lib.cw = []; lib.ra = []; lib.total = -1; lib.pages = {}; lib.detail = null;
        lib.gen++;
        libPagesUpdate();
    }

    // ---------------------------------------------------- rendering

    function jfSetMsg(msg, err) { jfp.msg = msg; jfp.err = !!err; }

    function jfCapsHtml() {
        var c = jfDetectCaps(), list = [['4K panel', c.uhd], ['H.264', c.h264], ['HEVC', c.hevc], ['VP9', c.vp9], ['AV1', c.av1],
            ['HDR10', c.hdr], ['AAC', c.aac], ['AC3', c.ac3], ['E-AC3', c.eac3], ['DTS', c.dts], ['TrueHD', c.truehd],
            ['FLAC', c.flac], ['MKV', c.mkv], ['MP4', c.mp4]], html = '<div class="jfcaps">', noA = [], noV = [];
        each(list, function (x) { html += '<span class="cap' + (x[1] ? '' : ' no') + '">' + x[0] + '</span>'; });
        each([['DTS', c.dts], ['TrueHD', c.truehd]], function (x) { if (!x[1]) { noA.push(x[0]); } });
        each([['AV1', c.av1], ['VP9', c.vp9], ['HEVC', c.hevc]], function (x) { if (!x[1]) { noV.push(x[0]); } });
        html += '</div><div class="jfnote">Anything this TV can\'t play is converted on the server' +
            (noA.length ? ': ' + noA.join(' and ') + ' audio only (light)' : '') +
            (noV.length ? (noA.length ? ', ' : ': ') + noV.join(', ') + ' video needs <b>Audio and video</b> conversion' : '') + '.' +
            (c.model || c.platform ? ' ' + esc([c.model ? 'Samsung ' + c.model : '', c.platform].join(', ').replace(/^, |, $/g, '')) + '.' : '') + '</div>';
        return html;
    }

    function jfRender() {
        var titles = { connect: 'Connect to Jellyfin', qc: 'Quick Connect', password: 'Sign in to Jellyfin', account: 'Jellyfin' };
        var html = '<h2>' + JF_LOGO + titles[jfp.view] + '</h2>';
        if (jfp.msg) { html += '<p class="jfmsg' + (jfp.err ? ' err' : '') + '">' + esc(jfp.msg) + '</p>'; }
        if (jfp.view === 'qc') {
            html += '<ol class="jfsteps"><li>Open Jellyfin on your phone or computer</li><li>Go to your profile, then <b>Quick Connect</b></li>' +
                '<li>Enter this code:</li></ol><div class="jfcode">';
            each(jfp.code.split(''), function (d, i) { html += (i === 3 && jfp.code.length === 6 ? '<span class="gap"></span>' : '') + '<span>' + esc(d) + '</span>'; });
            html += '</div>';
        }
        html += '<ul id="jfRows">';
        each(jfp.items, function (it, i) {
            var f = i === jfp.row ? ' focused' : '';
            if (it.type === 'caps') { html += '<li class="jfsec">This TV can play (detected)</li><li class="jfcapsrow">' + jfCapsHtml() + '</li>'; return; }
            if (it.type === 'input') {
                html += '<li class="jfin' + f + '"><span class="label">' + esc(it.label) + '</span><input id="jfIn' + i + '" type="' +
                    (it.secret ? 'password' : 'text') + '" autocomplete="off" spellcheck="false" placeholder="' + esc(it.hint || '') + '"></li>';
                return;
            }
            var val = it.type === 'option' ? jfOptLabel(it) : (it.value || '');
            html += '<li class="' + it.type + (it.off ? ' off' : '') + f + '"><span class="label">' + esc(it.label) + '</span>' +
                '<span class="value' + (it.type === 'option' ? ' opt' : '') + '">' + esc(val) + '</span></li>';
        });
        html += '</ul><p class="hint">' + (jfp.view === 'account' ? 'Up / Down to choose &middot; Left / Right to change &middot; Back to close'
            : 'Up / Down to choose &middot; OK to type or select &middot; Back to go back') + '</p>';
        $('jfPanel').innerHTML = html;
        each(jfp.items, function (it, i) {
            var input = $('jfIn' + i);
            if (input) { input.value = it.secret ? (jfp.pass ? jfp.pass : '') : (it.value || ''); }
        });
    }

    function jfOptLabel(it) {
        for (var i = 0; i < it.options.length; i++) { if (it.options[i][0] === cfg[it.key]) { return it.options[i][1]; } }
        return it.options[0][1];
    }

    function jfFocusable(i) { var it = jfp.items[i]; return it && it.type !== 'info' && it.type !== 'caps' && !it.off; }

    function jfMove(dir) {
        var i = jfp.row;
        do { i += dir; } while (i >= 0 && i < jfp.items.length && !jfFocusable(i));
        if (i >= 0 && i < jfp.items.length) { jfp.row = i; jfRender(); }
    }

    function jfChange(dir) {
        var it = jfp.items[jfp.row];
        if (!it || it.type !== 'option') { return; }
        var idx = 0, n = it.options.length;
        for (var i = 0; i < n; i++) { if (it.options[i][0] === cfg[it.key]) { idx = i; } }
        cfg[it.key] = it.options[(idx + dir + n) % n][0];
        save(it.key);
        if (it.key === 'jfLibrary') { libPagesUpdate(); }
        if (it.key === 'jfConvert' || it.key === 'jfMaxRes') { lib.loadedAt = 0; }
        jfRender();
    }

    function jfActivate() {
        var it = jfp.items[jfp.row];
        if (!it || it.off) { return; }
        if (it.type === 'option') { jfChange(1); return; }
        if (it.type === 'input') {
            var input = $('jfIn' + jfp.row);
            jfp.input = jfp.row;
            mode = 'jfinput';
            setTimeout(function () { input.focus(); }, 50);
            return;
        }
        if (it.act) { it.act(); }
    }

    // The TV keyboard closes with Done (saves) or Cancel; OK also saves.
    function jfInputDone(saveIt) {
        var i = jfp.input, it = jfp.items[i], input = $('jfIn' + i);
        jfBlurInput();
        mode = 'jf';
        if (!it) { return; }
        if (saveIt && input) {
            if (it.secret) { jfp.pass = input.value; } else { it.value = input.value; }
            if (it.done) { it.done(input.value); }
            if (jfp.view === 'password') { jfMove(1); return; }
        }
        jfRender();
    }

    function jfBlurInput() {
        if (jfp.input === null) { return; }
        var input = $('jfIn' + jfp.input);
        if (input) { input.blur(); }
        jfp.input = null;
    }

    function jfBack() {
        if (jfp.view === 'qc' || jfp.view === 'password') { jfShowConnect(false); return; }
        jfClose();
    }

    function onJfKey(k) {
        if (k === KEY.UP) { jfMove(-1); }
        else if (k === KEY.DOWN) { jfMove(1); }
        else if (k === KEY.LEFT) { jfChange(-1); }
        else if (k === KEY.RIGHT) { jfChange(1); }
        else if (k === KEY.ENTER) { jfActivate(); }
        else if (isBack(k)) { jfBack(); }
        else { return false; }
        return true;
    }

    function jfStatus() {
        if (!jfSignedIn()) { return jf.state === 'revoked' ? 'signed out by the server' : 'not connected'; }
        return jf.userName + ' on ' + jfShortHost(jf.url) + (jf.version ? ' (Jellyfin ' + jf.version + ')' : '') +
            (jf.state === 'unreachable' ? ', not answering' : '') + ' · conversion: ' + cfg.jfConvert;
    }

    // For checking from a browser console or the tests; the token itself stays inside.
    window.HavenJF = {
        caps: jfDetectCaps, profile: jfDeviceProfile, normalize: jfNormalize, defaultUrl: jfDefaultUrl,
        session: function () { return { url: jf.url, userId: jf.userId, userName: jf.userName, state: jf.state, signedIn: jfSignedIn() }; },
        views: jfViews, items: jfItems, resume: jfResume, latest: jfLatest, item: jfItem, similar: jfSimilar, image: jfImage,
        playbackInfo: jfPlaybackInfo, resolve: jfResolve, report: jfReport,
        play: function (id, opts) { return jfPlaybackInfo(id, opts).then(function (info) { return jfResolve(id, info); }); },
        player: function () {
            return { open: mode === 'video', started: vp.started, paused: vp.paused, pos: vp.pos, dur: vp.dur, seek: vp.seek,
                     method: vp.ctx ? vp.ctx.method : null, url: null, audio: vp.audio, sub: vp.sub, burn: vp.burn,
                     subs: vp.subs ? vp.subs.length : 0, engine: vp.engine ? vp.engine.name : null, osd: vp.osd };
        },
        vtt: function (t) { return vpParseVtt(t); },
        detail: function (id) { return jfItem(id).then(function (it) { if (page === P_LIB) { libOpenDetail(it); } return !!lib.detail; }); }
    };

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
        var plan = { name: null, why: '', wind: calm, tint: false, meter: mode === 'fps' };   // the counter: only with All + frame rate
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
        var plan = fxPlanNow(), visible = !document.hidden && mode !== 'camera' && mode !== 'video' && page !== P_CAM;
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
        var hidden = document.hidden || mode === 'camera' || mode === 'video';
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

    var BUTTON_DOMAINS = { light: 1, 'switch': 1, input_boolean: 1, fan: 1, scene: 1, script: 1, button: 1, input_button: 1 };

    // Press-to-run entities on Controls: OK always runs them (never "off"), they're never shown as
    // on (a script while it runs aside, which is its real state), and their state line says when
    // they last ran. Scenes and buttons keep that time as their state; scripts in last_triggered.
    var RUN_DOMAINS = {
        scene: { service: 'turn_on', glyph: 'palette', label: 'Scene', did: 'Activated', verb: 'activate' },
        script: { service: 'turn_on', glyph: 'script', label: 'Script', did: 'Last run', verb: 'run' },
        button: { service: 'press', glyph: 'press', label: 'Button', did: 'Pressed', verb: 'press' },
        input_button: { service: 'press', glyph: 'press', label: 'Button', did: 'Pressed', verb: 'press' }
    };
    function runOf(eid) { return RUN_DOMAINS[domainOf(eid)] || null; }
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
                    'brightness', 'supported_color_modes', 'last_triggered'],
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
            musOnConnect();
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

    // A page's number is its identity (and its place in #pages); ORDER is what's shown, left to right
    // (Settings > Screens). Home is always there and always first.
    var PAGE_NAMES = ['Home', 'Controls', 'Weather', 'Cameras', 'Library', 'Music'];
    var PAGE_KEYS = ['home', 'controls', 'weather', 'cameras', 'library', 'music'];
    var P_HOME = 0, P_CTL = 1, P_WX = 2, P_CAM = 3;
    var ORDER = [0, 1, 2, 3];
    var tabFocus = null;      // the toolbar at the top has the focus: 0 = the gear, 1.. = ORDER[n - 1]
    var tabsSig = '';
    var page = 0;
    var sel = ['dock', null, null, null, null, null];   // focus per page: 'dock', 'edge:l', 'edge:r', 'eid:<id>', 'cam:<id>', 'day:<n>', 'lib', 'mus'
    var selBeforeEdge = [null, null, null, null, null, null];
    var pageTimer = null;

    function pos(p) { return ORDER.indexOf(p); }
    function hasSide(p, side) { var i = pos(p); return side === 'l' ? i > 0 : i >= 0 && i < ORDER.length - 1; }
    function neighbor(p, dir) { return ORDER[pos(p) + dir]; }

    // Every screen in the chosen order (shown or not). Home is first unless you moved it; an order
    // saved before Home could move doesn't list it, so it goes in front.
    function screensList() {
        var out = [], seen = {}, i;
        each(cfg.screens || [], function (k) { i = PAGE_KEYS.indexOf(k); if (i >= 0 && !seen[i]) { seen[i] = true; out.push(i); } });
        if (!seen[P_HOME]) { seen[P_HOME] = true; out.unshift(P_HOME); }
        for (i = 1; i < PAGE_KEYS.length; i++) { if (!seen[i]) { out.push(i); } }
        return out;
    }

    function screenOn(p) { return (cfg.screensOff || []).indexOf(PAGE_KEYS[p]) < 0; }

    // A screen that's ticked and can show now (Library needs a Jellyfin sign-in).
    function screenShows(p, off) { return (off || cfg.screensOff || []).indexOf(PAGE_KEYS[p]) < 0 && (p !== P_LIB || jfSignedIn()); }

    function computeOrder() {
        var o = [];
        each(screensList(), function (p) { if (screenShows(p)) { o.push(p); } });
        return o.length ? o : [P_HOME];       // never nothing: Home, if every screen that's ticked can't show
    }

    // The first screen: where Haven opens and where Back leads.
    function startPage() { return ORDER[0]; }

    // Puts every shown page at its slot in the strip; the others are taken out.
    function pagesUpdate() {
        ORDER = computeOrder();
        each(document.querySelectorAll('#pages .page'), function (el, i) {
            var at = pos(i);
            el.style.display = at < 0 ? 'none' : '';
            if (at >= 0) { el.style.left = (at * 1920) + 'px'; }
            el.style.visibility = i === page ? 'visible' : 'hidden';
        });
        if (pos(page) < 0) {
            page = -1;
            if (tabFocus !== null) { tabFocus = 1; }
            showPage(startPage());
        } else {
            $('pages').style.transform = 'translate3d(' + (-1920 * pos(page)) + 'px,0,0)';
            if (tabFocus !== null) { tabFocus = Math.min(tabFocus, ORDER.length); }
        }
        renderChrome();
        applyFocus();
    }

    function showPage(p) {
        if (pos(p) < 0 || p === page) { return; }
        var dir = pos(p) > pos(page) ? 1 : -1;
        page = p;
        var s = sel[p];
        if (!s || s.indexOf('edge:') === 0 || (p > 0 && !itemByKey(p, s))) {
            var items = itemsOf(p);
            sel[p] = p === 0 ? 'dock'
                : (items.length ? items[0].key : 'edge:' + (hasSide(p, dir > 0 ? 'r' : 'l') ? (dir > 0 ? 'r' : 'l') : (dir > 0 ? 'l' : 'r')));
        }
        if (p === 0 && dir < 0 && sel[0] === 'dock') { focus = tiles.length - 1; }   // back from Controls: the dock's last tile
        if (p === 0 && dir > 0 && sel[0] === 'dock' && pos(p) > 0) { focus = 0; }    // from a screen before Home: the first tile
        each(document.querySelectorAll('#pages .page'), function (el) { el.style.visibility = 'visible'; });
        $('pages').style.transform = 'translate3d(' + (-1920 * pos(p)) + 'px,0,0)';
        clearTimeout(pageTimer);
        pageTimer = setTimeout(function () {       // only the visible page stays drawn
            each(document.querySelectorAll('#pages .page'), function (el, i) { el.style.visibility = i === page ? 'visible' : 'hidden'; });
        }, 450);
        renderChrome();
        renderWidgets();
        refreshCamStills();
        updateFx();
        if (p === P_LIB) { libLoad(false); }
        if (p === P_MUS) { musLoad(false); }
    }

    // Toolbar (gear and tabs), dots, edge arrows and the darker veil behind the other pages.
    // The toolbar is rebuilt only when the screens change; focus and the current page are classes.
    function renderChrome() {
        var sig = ORDER.join(',');
        if (sig !== tabsSig) {
            tabsSig = sig;
            var t = '<div class="tab gear">' + GLYPHS.gear + '</div>', d = '';
            each(ORDER, function (p) { t += '<div class="tab">' + PAGE_NAMES[p] + '</div>'; d += '<i></i>'; });
            $('tabs').innerHTML = t;
            $('dots').innerHTML = d;
        }
        renderTabs();
        $('veil').className = page ? 'on' : '';
        $('edgeL').innerHTML = '<span class="chev">&lsaquo;</span><span class="lbl">' + (PAGE_NAMES[neighbor(page, -1)] || '') + '</span>';
        $('edgeR').innerHTML = '<span class="lbl">' + (PAGE_NAMES[neighbor(page, 1)] || '') + '</span><span class="chev">&rsaquo;</span>';
        musMini();
    }

    function renderTabs() {
        var tabs = $('tabs').children, dots = $('dots').children, i, c;
        for (i = 0; i < tabs.length; i++) {
            c = 'tab' + (i === 0 ? ' gear' : '') + (i > 0 && ORDER[i - 1] === page ? ' on' : '') + (tabFocus === i ? ' focused' : '');
            if (tabs[i].className !== c) { tabs[i].className = c; }
        }
        for (i = 0; i < dots.length; i++) { c = ORDER[i] === page ? 'on' : ''; if (dots[i].className !== c) { dots[i].className = c; } }
        c = tabFocus !== null ? 'nav' : '';
        if ($('tabs').className !== c) { $('tabs').className = c; }
    }

    // Up from the top of any page: the toolbar, on the current page's tab.
    function toTabs() {
        tabFocus = pos(page) + 1;
        applyFocus();
    }

    // Can Down / OK from the toolbar land on something on this page?
    function pageCanFocus(p) {
        if (p === P_HOME) { return dockApps().length > 0 || sensorsFocusable(); }
        if (p === P_LIB) { return !!lib.loadedAt; }
        if (p === P_MUS) { return musHasFocus(); }
        return itemsOf(p).length > 0;
    }

    function leaveTabs() {
        var p = page;
        if (!pageCanFocus(p)) { return; }
        tabFocus = null;
        if (p === P_HOME) {
            if (sel[0] === 'dock' && !dockApps().length) { sel[0] = 'dock'; senEnter(); return; }
            if (String(sel[0]).indexOf('sen:') === 0 && !itemByKey(0, sel[0])) { sel[0] = 'dock'; }
        } else if (p === P_LIB) {
            sel[p] = 'lib';
        } else if (p === P_MUS) {
            sel[p] = 'mus';
        } else if (!sel[p] || sel[p].indexOf('edge:') === 0 || !itemByKey(p, sel[p])) {
            var back = selBeforeEdge[p] && itemByKey(p, selBeforeEdge[p]) ? selBeforeEdge[p] : itemsOf(p)[0].key;
            sel[p] = back;
        }
        applyFocus();
    }

    // The focus was put on the toolbar only because the page had nothing yet: it goes into the page
    // once it has something, unless you've used the toolbar since.
    var tabParked = false;
    function unpark() {
        if (tabParked && tabFocus !== null && mode === 'dock') { tabFocus = null; }
        tabParked = false;
    }

    function onTabsKey(k) {
        var n = ORDER.length + 1;
        tabParked = false;
        if (k === KEY.LEFT || k === KEY.RIGHT) {
            var to = tabFocus + (k === KEY.LEFT ? -1 : 1);
            if (to < 0 || to >= n) { return true; }
            tabFocus = to;
            if (to > 0 && ORDER[to - 1] !== page) { showPage(ORDER[to - 1]); } else { applyFocus(); }
        } else if (k === KEY.ENTER) {
            if (tabFocus === 0) { openSettings(); } else { leaveTabs(); }
        } else if (k === KEY.DOWN) {
            leaveTabs();
        } else if (isBack(k)) {
            if (page !== startPage()) { tabFocus = 1; showPage(startPage()); } else { leaveTabs(); }
        } else if (k !== KEY.UP) {
            return false;
        }
        return true;
    }

    // Focusable items of a page, in the page's own coordinates (unaffected by scrolling).
    function itemsOf(p) {
        var out = [];
        if (p === P_LIB) { return lib.loadedAt ? [{ key: 'lib', el: $('libArea'), x: 0, y: 0, w: 1, h: 1 }] : []; }
        if (p === P_MUS) { return musHasFocus() ? [{ key: 'mus', el: $('musArea'), x: 0, y: 0, w: 1, h: 1 }] : []; }
        var nodes = p === P_CTL ? document.querySelectorAll('#ctlTrack .ctl') : p === P_CAM ? document.querySelectorAll('#camArea .camtile')
            : p === P_WX ? document.querySelectorAll('#wxArea .wday') : p === P_HOME && sensorsFocusable() ? document.querySelectorAll('#sensors .scard') : [];
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
        if (tabFocus === null && page === P_HOME && mode === 'dock' && !homeHasFocus()) { tabFocus = pos(P_HOME) + 1; }
        // an arrow toward a side that has no screen (the only screen shown, with nothing on it yet): the toolbar
        var es = String(sel[page] || '');
        if (tabFocus === null && page !== P_HOME && mode === 'dock' && es.indexOf('edge:') === 0 && !hasSide(page, es.slice(5))) {
            tabFocus = pos(page) + 1;
            tabParked = true;
        }
        var s = tabFocus === null ? sel[page] : null;   // on the toolbar, nothing on the page shows focus
        renderTabs();
        renderDock();
        $('edgeL').className = 'edge l' + (hasSide(page, 'l') ? '' : ' off') + (s === 'edge:l' ? ' focused' : '');
        $('edgeR').className = 'edge r' + (hasSide(page, 'r') ? '' : ' off') + (s === 'edge:r' ? ' focused' : '');
        each(document.querySelectorAll('#ctlTrack .ctl'), function (el) { setFocused(el, page === P_CTL && el.getAttribute('data-key') === s); });
        each(document.querySelectorAll('#camArea .camtile'), function (el) { setFocused(el, page === P_CAM && el.getAttribute('data-key') === s); });
        each(document.querySelectorAll('#wxArea .wday'), function (el) { setFocused(el, page === P_WX && el.getAttribute('data-key') === s); });
        each(document.querySelectorAll('#sensors .scard'), function (el) { setFocused(el, page === P_HOME && el.getAttribute('data-key') === s); });
        if (page === P_HOME) { scrollSensors(); }
        if (page === 1) { scrollControls(); if (s) { maybeDimHint(); } }
        if (page === P_WX) { wxFollowFocus(); }
        libApplyFocus();
        musApplyFocus();
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
        else if (dy < 0) { toTabs(); }                                  // top row: up to the toolbar
        else if (page === P_HOME && dockApps().length) { sel[0] = 'dock'; applyFocus(); }   // sensors: down to the dock
    }

    // Keys while the pages are showing (no panel open). Returns false if not used.
    function onPageKey(k) {
        if (tabFocus !== null) { return onTabsKey(k); }
        var s = sel[page] || '';
        if (s.indexOf('edge:') === 0) {
            var right = s === 'edge:r';
            if (k === KEY.ENTER || (right && k === KEY.RIGHT) || (!right && k === KEY.LEFT)) { showPage(neighbor(page, right ? 1 : -1)); }
            else if ((right && k === KEY.LEFT) || (!right && k === KEY.RIGHT)) {
                sel[page] = selBeforeEdge[page] && (page === 0 || itemByKey(page, selBeforeEdge[page])) ? selBeforeEdge[page]
                    : (page === 0 ? 'dock' : (itemsOf(page)[0] || {}).key || s);
                applyFocus();
            } else if (isBack(k) && page !== startPage()) { showPage(startPage()); }
            else if (k === KEY.UP) { toTabs(); }
            else if (k !== KEY.DOWN) { return false; }
            return true;
        }
        if (page === P_LIB) { return onLibKey(k); }
        if (page === P_MUS) { return onMusKey(k); }
        if (page === 0 && s.indexOf('sen:') === 0) {
            if (k === KEY.LEFT) { moveSpatial(-1, 0); }
            else if (k === KEY.RIGHT) { moveSpatial(1, 0); }
            else if (k === KEY.UP) { moveSpatial(0, -1); }
            else if (k === KEY.DOWN) { moveSpatial(0, 1); }
            else if (k === KEY.ENTER) { /* sensor cards only show values */ }
            else if (isBack(k)) { sel[0] = 'dock'; applyFocus(); }
            else { return false; }
            return true;
        }
        if (page === 0) {
            if (k === KEY.LEFT) { if (focus > 0) { focus--; renderDock(); } else { toEdge('l'); } }   // a screen before Home, if you moved it
            else if (k === KEY.RIGHT) { if (focus < tiles.length - 1) { focus++; renderDock(); } else { toEdge('r'); } }
            else if (k === KEY.UP) { if (sensorsFocusable()) { senEnter(); } else { toTabs(); } }
            else if (k === KEY.ENTER) { activateTile(tiles[focus]); }
            else if (isBack(k)) { showPage(startPage()); }     // as the first screen, Back does nothing; Home and Exit still work
            else { return false; }
            return true;
        }
        if (k === KEY.LEFT) { moveSpatial(-1, 0); }
        else if (k === KEY.RIGHT) { moveSpatial(1, 0); }
        else if (k === KEY.UP) { moveSpatial(0, -1); }
        else if (k === KEY.DOWN) { moveSpatial(0, 1); }
        else if (isBack(k)) { showPage(startPage()); }
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
        // arrived (at start-up, say) while the page had nothing to focus, so the focus went to the
        // arrow at the side: its first item, now that it has one
        if (page !== P_HOME && page !== P_LIB && page !== P_MUS && String(sel[page] || '').indexOf('edge:') === 0 && !selBeforeEdge[page]) {
            var first = itemsOf(page)[0];
            if (first) { sel[page] = first.key; unpark(); }
        }
        applyFocus();
        buildDock();
    }

    // Home: up to 30 sensor cards, six to a row. Without apps in the dock they fill the screen
    // (five rows, no scrolling); with the dock, three rows show and the rest scroll: Up from the
    // dock moves into the cards, and a bar at the side shows where you are.
    var SEN_COLS = 6, SEN_ROW_H = 150, homeHtml = '', senTop = 0;

    // Sensors are on Home unless Settings > Sensors location puts them on Controls.
    function homeSensors() { return cfg.senLoc === 'controls' ? [] : selectedOf('sensor').slice(0, MAX_SENSORS); }
    function ctlSensors() { return cfg.senLoc === 'controls' ? selectedOf('sensor').slice(0, MAX_SENSORS) : []; }
    function sensorRows() { return Math.ceil(homeSensors().length / SEN_COLS); }
    function sensorRowsVisible() { return dockApps().length ? 3 : 5; }
    function sensorsFocusable() { return !$('senBox').hidden && sensorRows() > sensorRowsVisible(); }

    function homeHasFocus() {
        var s = sel[0] || '';
        if (s.indexOf('sen:') === 0) { return sensorsFocusable() && !!itemByKey(0, s); }
        if (s === 'dock') { return dockApps().length > 0; }
        return s.indexOf('edge:') === 0;
    }

    // Up from the dock: the card above the focused app, in the lowest row that's showing.
    function senEnter() {
        var items = itemsOf(0);
        if (!items.length) { toTabs(); return; }
        var row = Math.min(sensorRows(), senTop + sensorRowsVisible()) - 1, best = null, x = 1e9;
        var t = tiles[focus], tx = t ? t.getBoundingClientRect().left + t.offsetWidth / 2 - $('sensors').getBoundingClientRect().left : 0;
        each(items, function (it) {
            if (Math.round(it.y / SEN_ROW_H) !== row) { return; }
            var d = Math.abs(it.x + it.w / 2 - tx);
            if (d < x) { x = d; best = it; }
        });
        sel[0] = (best || items[items.length - 1]).key;
        applyFocus();
    }

    function scrollSensors() {
        var box = $('senBox'), track = $('sensors'), rows = sensorRows(), vis = sensorRowsVisible(), maxTop = Math.max(0, rows - vis);
        var s = sel[0] || '', it = s.indexOf('sen:') === 0 && tabFocus === null ? itemByKey(0, s) : null;
        if (it) {
            var row = Math.round(it.y / SEN_ROW_H);
            if (row < senTop) { senTop = row; } else if (row > senTop + vis - 1) { senTop = row - vis + 1; }
        }
        senTop = Math.max(0, Math.min(maxTop, senTop));
        track.style.transform = 'translate3d(0,' + (-senTop * SEN_ROW_H) + 'px,0)';
        var c = (dockApps().length ? 'withdock' : 'nodock') + (/stale/.test(box.className) ? ' stale' : '') +
            (senTop > 0 ? ' fade-t' : '') + (senTop < maxTop ? ' fade-b' : '');
        if (box.className !== c) { box.className = c; }
        var bar = $('senBar');
        bar.className = (maxTop > 0 && !box.hidden ? 'show ' : '') + (dockApps().length ? 'withdock' : 'nodock');
        if (maxTop > 0) {
            var h = dockApps().length ? 340 : 732;
            bar.firstChild.style.height = Math.round(h * vis / rows) + 'px';
            bar.firstChild.style.transform = 'translate3d(0,' + Math.round(h * senTop / rows) + 'px,0)';
        }
    }

    function renderHome(stale) {
        var sensors = homeSensors(), html = '', anyKnown = false;
        var focusKey = tabFocus === null && page === P_HOME ? sel[0] : null;
        each(sensors, function (eid) {
            var f = formatState(eid);
            if (ha.states[eid]) { anyKnown = true; }
            html += '<div class="scard' + (f.dim ? ' dim' : '') + (f.text ? ' text' : '') + ('sen:' + eid === focusKey ? ' focused' : '') +
                '" data-key="sen:' + esc(eid) + '">' +
                '<div class="val">' + esc(f.value) + (f.unit === '°' ? '°' : (f.unit ? '<span class="unit">' + esc(f.unit) + '</span>' : '')) + '</div>' +
                '<div class="name">' + esc(displayName(eid)) + (f.note ? ' <span class="note">' + esc(f.note) + '</span>' : '') + '</div></div>';
        });
        if (html !== homeHtml) { homeHtml = html; $('sensors').innerHTML = html; }   // unchanged values: nothing redrawn
        var box = $('senBox');
        box.hidden = !sensors.length || !anyKnown;
        box.className = box.className.replace(/\s*stale/g, '') + (stale ? ' stale' : '');
        if (String(sel[0]).indexOf('sen:') === 0 && !sensorsFocusable()) { sel[0] = 'dock'; }
        scrollSensors();
    }

    // ---------------------------------------------------- Controls page

    function ctlIcon(eid) {
        var d = domainOf(eid);
        if (RUN_DOMAINS[d]) { return RUN_DOMAINS[d].glyph; }
        return d === 'light' ? 'bulb' : d === 'fan' ? 'fan' : 'power';
    }

    // When a scene, script or button last ran: "20:15" today, "27 Oct" before; '' if never or unreadable.
    function runWhen(iso) {
        if (!iso || iso === 'unknown') { return ''; }
        var t = Date.parse(String(iso).replace(/(\.\d{3})\d+/, '$1'));     // HA sends microseconds
        if (isNaN(t)) { return ''; }
        var d = new Date(t), now = new Date();
        return d.toDateString() === now.toDateString() ? hhmm(d) : d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3);
    }

    function runState(eid) {
        var st = ha.states[eid], r = runOf(eid);
        if (st.state === 'unavailable') { return 'Unavailable'; }
        if (domainOf(eid) === 'script' && st.state === 'on') { return 'Running'; }
        var when = runWhen(domainOf(eid) === 'script' ? (st.attributes || {}).last_triggered : st.state);
        return when ? r.did + ' ' + when : 'Not used yet';
    }

    function ctlState(eid) {
        var st = ha.states[eid];
        if (!st) { return '–'; }
        if (runOf(eid)) { return runState(eid); }
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

    // A sensor's name on Controls, where its room is the heading: "Living Room Temperature" is
    // "Temperature" there (on Home it's "Living Room").
    function ctlSensorName(eid) {
        var st = ha.states[eid], a = (st && st.attributes) || {}, area = areaOf(eid);
        var name = a.friendly_name || cap(eid.split('.')[1].replace(/_/g, ' '));
        if (domainOf(eid) === 'weather' && /^(forecast\b.*|home|weather)$/i.test(name)) { return 'Outside'; }
        if (area && name.toLowerCase().indexOf(area.toLowerCase()) === 0) {
            var rest = name.slice(area.length).replace(/^[\s\-:]+/, '');
            if (rest) { return cap(rest); }
            if (a.device_class) { return cap(String(a.device_class).replace(/_/g, ' ')); }
            return domainOf(eid) === 'climate' ? 'Thermostat' : name;
        }
        return name;
    }

    // A sensor as a Controls tile: the value large, the name and any note below. OK and CH do nothing on it.
    function ctlSensorTile(eid, focused) {
        var f = formatState(eid);
        return '<div class="ctl sen' + (f.dim ? ' unav' : '') + (f.text ? ' text' : '') + (focused ? ' focused' : '') +
            '" data-key="sen:' + esc(eid) + '"><div class="sv">' + esc(f.value) +
            (f.unit === '°' ? '°' : (f.unit ? '<span class="unit">' + esc(f.unit) + '</span>' : '')) + '</div>' +
            '<div class="txt"><div class="nm">' + esc(ctlSensorName(eid)) + '</div><div class="st">' + esc(f.note || '') + '</div></div></div>';
    }

    // Redrawn only when something on it changed, with the focused tile already marked: a fresh
    // tile without the mark would shrink and grow again (a second bounce) on every HA update.
    var ctlHtml = '';

    function renderControls(stale) {
        var buttons = selectedOf('button').slice(0, MAX_BUTTONS), sensors = ctlSensors(), html = '';
        var focusKey = tabFocus === null && page === P_CTL ? sel[1] : null, isSensor = {};
        each(sensors, function (eid) { isSensor[eid] = true; });
        if (!buttons.length && !sensors.length) {
            html = emptyHtml(cfg.senLoc === 'controls' ? 'sensors, lights and switches' : 'lights and switches', '');
        } else {
            each(roomsOf(buttons.concat(sensors)), function (room) {     // in each room: lights and switches, then sensors
                html += '<div class="room"><h3>' + esc(room.name) + '</h3><div class="ts">';
                each(room.eids, function (eid) {
                    if (isSensor[eid]) { html += ctlSensorTile(eid, 'sen:' + eid === focusKey); return; }
                    var st = ha.states[eid];
                    var unav = !st || st.state === 'unavailable';
                    var on = isOn(eid), dimmable = !unav && isDimmable(eid);
                    html += '<div class="ctl' + (on ? ' on' : '') + (unav ? ' unav' : '') + (dimmable ? ' dimmable' : '') +
                        (ranUntil[eid] > Date.now() ? ' ran' : '') +
                        ('eid:' + eid === focusKey ? ' focused' : '') +
                        '" data-key="eid:' + esc(eid) + '"><div class="ic">' + GLYPHS[ctlIcon(eid)] + '</div>' +
                        '<div class="txt"><div class="nm">' + esc(displayName(eid)) + '</div><div class="st">' + esc(ctlState(eid)) + '</div></div>' +
                        (dimmable && on ? '<div class="bar"><b style="width:' + brightnessPct(eid) + '%"></b></div>' : '') + '</div>';
                });
                html += '</div></div>';
            });
        }
        if (html !== ctlHtml) { ctlHtml = html; $('ctlTrack').innerHTML = html; }
        $('ctlArea').className = $('ctlArea').className.replace(/\s*stale/g, '') + (stale ? ' stale' : '');
        var s = sel[1];
        if (s && (s.indexOf('eid:') === 0 || s.indexOf('sen:') === 0) && !itemByKey(1, s)) { sel[1] = null; }
        if (!sel[1] && page === 1) {
            var items = itemsOf(1);
            sel[1] = items.length ? items[0].key : 'edge:r';
        }
    }

    // Keeps the focused tile (and its room title) in view; fades the edge where more rows continue.
    function scrollControls() {
        var box = $('ctlArea'), track = $('ctlTrack');
        var boxH = box.clientHeight, trackH = track.offsetHeight, y = 0;
        var it = sel[1] && (sel[1].indexOf('eid:') === 0 || sel[1].indexOf('sen:') === 0) ? itemByKey(1, sel[1]) : null;
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

    // ---------------------------------------------------- Library page (Jellyfin)
    //
    // The optional 5th page, only while signed in to Jellyfin (Settings > Jellyfin > Library page).
    // Rows for Continue watching and Recently added, then All movies as a poster grid with sort
    // chips. The grid keeps only the rows near the screen in the page (a big library stays light
    // on the TV's memory) and fetches 60 titles at a time. Posters are requested at exactly the
    // size drawn. OK opens the details view; playing comes with the player.

    var P_LIB = 4;
    var LIB_COLS = 7, LIB_CELL_W = 222, LIB_CELL_H = 388, LIB_WIDE_W = 422, LIB_PAGE = 60;
    var LIB_AREA_H = 870, LIB_STRIP_W = 1770;
    var LIB_SORTS = [['name', 'A to Z'], ['added', 'Recently added'], ['year', 'Year'], ['unwatched', 'Unwatched']];
    var lib = { loadedAt: 0, loading: false, error: '', cw: [], ra: [], all: [], total: -1, sort: 'name', pages: {},
                row: 0, col: 0, scrollY: 0, stripX: { cw: 0, ra: 0 }, wantX: 0, layout: null, gen: 0, detail: null };

    // Called when the Jellyfin session or Settings > Screens changes: the pages are laid out again,
    // and a Library that went away forgets what it had loaded.
    function libPagesUpdate() {
        var had = pos(P_LIB) >= 0;
        pagesUpdate();
        var has = pos(P_LIB) >= 0;
        if (had && !has) {
            lib.loadedAt = 0;
            lib.all = []; lib.cw = []; lib.ra = []; lib.total = -1; lib.pages = {}; lib.detail = null;
            libRenderDetail();
        } else if (!had && has) {
            sel[P_LIB] = null;
            selBeforeEdge[P_LIB] = null;
        }
    }

    // ---------------------------------------------------- data

    function libSortQuery() {
        var q = { includeItemTypes: 'Movie', recursive: true };
        if (lib.sort === 'added') { q.sortBy = 'DateCreated,SortName'; q.sortOrder = 'Descending'; }
        else if (lib.sort === 'year') { q.sortBy = 'ProductionYear,SortName'; q.sortOrder = 'Descending'; }
        else { q.sortBy = 'SortName'; q.sortOrder = 'Ascending'; }
        if (lib.sort === 'unwatched') { q.filters = 'IsUnplayed'; }
        return q;
    }

    function libLoad(force) {
        if (!jfSignedIn() || lib.loading) { return; }
        if (!force && lib.loadedAt && Date.now() - lib.loadedAt < 120000) { return; }
        lib.loading = true;
        var gen = ++lib.gen;
        if (!lib.loadedAt) { libRender(); }
        Promise.all([jfResume(12, 'Movie'), jfLatest('Movie', 16), libFetchPage(0, gen)]).then(function (r) {
            if (gen !== lib.gen) { return; }
            lib.loading = false;
            lib.error = '';
            lib.loadedAt = Date.now();
            lib.cw = (r[0] && r[0].Items) || [];
            lib.ra = r[1] || [];
            libKeepFocus();
            var arrived = page === P_LIB && String(sel[P_LIB] || '').indexOf('edge:') === 0 && !selBeforeEdge[P_LIB];
            if (arrived) { sel[P_LIB] = 'lib'; }
            if (page === P_LIB && tabParked) { unpark(); arrived = true; }
            libRender();
            if (arrived) { applyFocus(); }           // the arrow loses its highlight, the first card gets it
        }, function (e) {
            if (gen !== lib.gen) { return; }
            lib.loading = false;
            lib.error = e.status === 401 ? 'Jellyfin ended this session. Sign in again in Settings > Jellyfin.'
                : 'Jellyfin isn\'t answering (' + e.message + '). Haven tries again when you come back to this page.';
            if (e.status === 401) { jfForget(); jf.state = 'revoked'; libPagesUpdate(); return; }
            libRender();
        });
    }

    // One page of 60 titles for the grid, at its offset in the sorted list.
    function libFetchPage(start, gen) {
        start = Math.floor(start / LIB_PAGE) * LIB_PAGE;
        if (lib.pages[start]) { return lib.pages[start]; }
        var q = libSortQuery();
        q.startIndex = start;
        q.limit = LIB_PAGE;
        var pr = jfItems(q).then(function (res) {
            if (gen !== lib.gen) { return; }
            lib.total = (res && res.TotalRecordCount) || 0;
            each((res && res.Items) || [], function (it, i) { lib.all[start + i] = it; });
            if (lib.layout) { libRenderGrid(true); }
        }, function (e) { delete lib.pages[start]; throw e; });
        lib.pages[start] = pr;
        return pr;
    }

    function libSetSort(sortKey) {
        if (sortKey === lib.sort) { return; }
        lib.sort = sortKey;
        lib.all = []; lib.pages = {}; lib.total = -1;
        var gen = ++lib.gen;
        libFetchPage(0, gen).then(function () { if (gen === lib.gen) { libRender(); } }, function () { /* shown on the next load */ });
        libRender();
    }

    // ---------------------------------------------------- formatting

    function libRuntime(ticks) {
        var m = Math.round((ticks || 0) / JF_TICKS / 60);
        return !m ? '' : m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + (m % 60 ? (m % 60) + 'm' : '');
    }

    function libLeft(it) {
        var u = it.UserData || {}, left = (it.RunTimeTicks || 0) - (u.PlaybackPositionTicks || 0);
        return left > 0 ? libRuntime(left) + ' left' : '';
    }

    function libPct(it) { var u = it.UserData || {}; return Math.max(0, Math.min(100, u.PlayedPercentage || 0)); }

    // ---------------------------------------------------- layout and rendering

    function libRows() {
        var rows = [];
        if (lib.cw.length) { rows.push({ k: 'cw', n: lib.cw.length }); }
        if (lib.ra.length) { rows.push({ k: 'ra', n: lib.ra.length }); }
        rows.push({ k: 'chips', n: LIB_SORTS.length });
        var total = Math.max(0, lib.total);
        for (var r = 0; r * LIB_COLS < total; r++) { rows.push({ k: 'grid', r: r, n: Math.min(LIB_COLS, total - r * LIB_COLS) }); }
        return rows;
    }

    function libComputeLayout() {
        var y = 0, L = { cw: -1, ra: -1 };
        if (lib.cw.length) { L.cw = y; y += 327 + 30; }
        if (lib.ra.length) { L.ra = y; y += 402 + 30; }
        L.all = y;
        L.chips = y + 50;
        L.grid = y + 128;
        L.height = L.grid + Math.ceil(Math.max(0, lib.total) / LIB_COLS) * LIB_CELL_H;
        lib.layout = L;
        return L;
    }

    function libCard(it, kind, i) {
        var img, text;
        if (kind === 'cw') {
            img = jfImage(it, { type: it.ImageTags && it.ImageTags.Thumb ? 'Thumb' : 'Backdrop', width: 400, height: 225 }) ||
                jfImage(it, { width: 400, height: 225 });
            text = '<div class="nm">' + esc(it.Name || '') + '</div><div class="sub">' + esc(libLeft(it)) + '</div>';
            return '<div class="lcard wide" data-i="' + i + '"><div class="art" style="' + (img ? 'background-image:url(' + img + ')' : '') + '">' +
                '<div class="pbar"><b style="width:' + libPct(it) + '%"></b></div></div>' + text + '</div>';
        }
        img = jfImage(it, { width: 200, height: 300 });
        return '<div class="lcard" data-i="' + i + '"><div class="art" style="' + (img ? 'background-image:url(' + img + ')' : '') + '">' +
            (it.UserData && it.UserData.Played ? '<span class="tick">&#10003;</span>' : '') + (img ? '' : '<span class="noart">' + esc(it.Name || '') + '</span>') +
            '</div><div class="nm">' + esc(it.Name || '') + '</div><div class="sub">' + esc(it.ProductionYear || '') + '</div></div>';
    }

    function libRender() {
        var area = $('libArea');
        if (!area) { return; }
        if (!jfSignedIn()) { area.innerHTML = ''; return; }
        if (!lib.loadedAt) {
            area.innerHTML = '<div class="empty">' + esc(lib.error || 'Loading your library...') + '</div>';
            return;
        }
        var L = libComputeLayout(), html = '<div id="libTrack">';
        if (L.cw >= 0) {
            html += '<div class="lrow" id="libCW" style="top:' + L.cw + 'px"><h3>Continue watching</h3><div class="lstrip">';
            each(lib.cw, function (it, i) { html += libCard(it, 'cw', i); });
            html += '</div></div>';
        }
        if (L.ra >= 0) {
            html += '<div class="lrow" id="libRA" style="top:' + L.ra + 'px"><h3>Recently added</h3><div class="lstrip">';
            each(lib.ra, function (it, i) { html += libCard(it, 'ra', i); });
            html += '</div></div>';
        }
        html += '<div class="lall" style="top:' + L.all + 'px"><h3>All movies<span id="libCount"></span></h3><div class="lchips">';
        each(LIB_SORTS, function (s, i) { html += '<span class="lchip' + (s[0] === lib.sort ? ' on' : '') + '" data-i="' + i + '">' + s[1] + '</span>'; });
        html += '</div></div><div id="libGrid" style="top:' + L.grid + 'px"></div></div>';
        if (lib.error) { html += '<div class="empty">' + esc(lib.error) + '</div>'; }
        area.innerHTML = html + '<div id="libRail"></div>';
        libRenderGrid(true);
        libScroll();
        if (page === P_LIB) { libApplyFocus(); }
    }

    // Only the grid rows near the screen exist in the page; others are added and removed as you scroll.
    function libRenderGrid(force) {
        var grid = $('libGrid'), L = lib.layout;
        if (!grid || !L) { return; }
        var count = $('libCount');
        if (count) {
            count.textContent = lib.total < 0 ? '' : lib.total + (lib.total === 1 ? ' movie' : ' movies') +
                (lib.sort === 'name' ? ', A to Z' : lib.sort === 'unwatched' ? ' not watched yet' : '');
        }
        if (lib.total === 0) {
            grid.innerHTML = '<div class="lnone">' + (lib.sort === 'unwatched' ? 'You\'ve watched everything. Nice.' : 'No movies in your Jellyfin library yet.') + '</div>';
            return;
        }
        var first = Math.max(0, Math.floor((lib.scrollY - L.grid) / LIB_CELL_H) - 1);
        var last = Math.floor((lib.scrollY + LIB_AREA_H - L.grid) / LIB_CELL_H) + 1;
        var from = first * LIB_COLS, to = Math.min(Math.max(0, lib.total), (last + 1) * LIB_COLS);
        var keep = {}, i;
        each(grid.querySelectorAll('.lcard'), function (el) {
            var n = +el.getAttribute('data-i');
            if (n < from || n >= to || (force && !el.getAttribute('data-ok') && lib.all[n])) { grid.removeChild(el); } else { keep[n] = true; }
        });
        var html = '';
        for (i = from; i < to; i++) {
            if (keep[i]) { continue; }
            var it = lib.all[i], x = (i % LIB_COLS) * LIB_CELL_W, y = Math.floor(i / LIB_COLS) * LIB_CELL_H;
            html += it ? libCard(it, 'grid', i).replace('<div class="lcard"', '<div class="lcard" data-ok="1" style="left:' + x + 'px;top:' + y + 'px"')
                : '<div class="lcard wait" data-i="' + i + '" style="left:' + x + 'px;top:' + y + 'px"><div class="art"></div></div>';
            if (!it) { libFetchPage(i, lib.gen).then(null, function () { /* retried when scrolled to again */ }); }
        }
        if (html) { grid.insertAdjacentHTML('beforeend', html); }
        if (page === P_LIB) { libApplyFocus(); }
    }

    function libEl(row, col) {
        var R = libRows()[row];
        if (!R) { return null; }
        if (R.k === 'cw') { return document.querySelectorAll('#libCW .lcard')[col] || null; }
        if (R.k === 'ra') { return document.querySelectorAll('#libRA .lcard')[col] || null; }
        if (R.k === 'chips') { return document.querySelectorAll('.lchip')[col] || null; }
        return document.querySelector('#libGrid .lcard[data-i="' + (R.r * LIB_COLS + col) + '"]');
    }

    function libItemAt(row, col) {
        var R = libRows()[row];
        if (!R) { return null; }
        if (R.k === 'cw') { return lib.cw[col]; }
        if (R.k === 'ra') { return lib.ra[col]; }
        if (R.k === 'grid') { return lib.all[R.r * LIB_COLS + col] || null; }
        return null;
    }

    function libApplyFocus() {
        each(document.querySelectorAll('#libArea .focused'), function (el) { setFocused(el, false); });
        var on = page === P_LIB && sel[P_LIB] === 'lib' && !lib.detail && tabFocus === null;
        var el = on ? libEl(lib.row, lib.col) : null;
        if (el) { setFocused(el, true); }
        if (page === P_LIB && lib.detail) {       // the page arrows would sit on top of the details view
            $('edgeL').className = 'edge l off';
            $('edgeR').className = 'edge r off';
        }
        libRail();
    }

    // Keeps the focused row in view, and the focused card inside its strip.
    function libScroll() {
        var L = lib.layout, R = libRows()[lib.row];
        if (!L || !R) { return; }
        var top, bottom;
        if (R.k === 'cw') { top = L.cw; bottom = L.cw + 327; }
        else if (R.k === 'ra') { top = L.ra; bottom = L.ra + 402; }
        else if (R.k === 'chips') { top = L.all; bottom = L.grid + LIB_CELL_H; }
        else { top = R.r === 0 ? L.all : L.grid + R.r * LIB_CELL_H - 20; bottom = L.grid + (R.r + 1) * LIB_CELL_H; }
        // a row that isn't fully visible is brought in with its top at the top: no half rows above it
        if (top < lib.scrollY || bottom > lib.scrollY + LIB_AREA_H) { lib.scrollY = top; }
        lib.scrollY = Math.max(0, lib.scrollY);
        var track = $('libTrack');
        if (track) { track.style.transform = 'translate3d(0,' + (-lib.scrollY) + 'px,0)'; }
        $('libArea').className = lib.scrollY > 0 ? 'fade-t' : '';
        each(['cw', 'ra'], function (k) {
            var strip = document.querySelector('#lib' + k.toUpperCase() + ' .lstrip');
            if (!strip) { return; }
            if (R.k === k) {
                var w = k === 'cw' ? LIB_WIDE_W : LIB_CELL_W, x = lib.col * w;
                if (x - lib.stripX[k] < 0) { lib.stripX[k] = x; }
                else if (x + w - lib.stripX[k] > LIB_STRIP_W) { lib.stripX[k] = x + w - LIB_STRIP_W; }
            }
            strip.style.transform = 'translate3d(' + (-lib.stripX[k]) + 'px,0,0)';
        });
        libRenderGrid(false);
    }

    // A–Z rail: shows where you are in the alphabet while moving through the grid.
    function libRail() {
        var rail = $('libRail');
        if (!rail) { return; }
        var R = libRows()[lib.row], it = page === P_LIB && R && R.k === 'grid' ? libItemAt(lib.row, lib.col) : null;
        if (lib.sort !== 'name' || !R || R.k !== 'grid') { rail.className = ''; return; }
        var cur = libLetter(it), html = '';
        each('#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), function (c) { html += '<i' + (c === cur ? ' class="on"' : '') + '>' + c + '</i>'; });
        rail.innerHTML = html;
        rail.className = 'show';
    }

    function libLetter(it) {
        var c = it ? String(it.SortName || it.Name || '').charAt(0).toUpperCase() : '';
        return /[A-Z]/.test(c) ? c : c ? '#' : '';
    }

    // Where the focus goes when the data changes: the same row kind if it still exists.
    function libKeepFocus() {
        var rows = libRows();
        if (lib.row >= rows.length) { lib.row = 0; }
        lib.col = Math.min(lib.col, Math.max(0, (rows[lib.row] || { n: 1 }).n - 1));
    }

    // ---------------------------------------------------- keys

    function libScreenX(row, col) {
        var R = libRows()[row];
        if (!R) { return 0; }
        if (R.k === 'cw') { return col * LIB_WIDE_W - lib.stripX.cw + 200; }
        if (R.k === 'ra') { return col * LIB_CELL_W - lib.stripX.ra + 100; }
        if (R.k === 'chips') { var el = libEl(row, col); return el ? el.offsetLeft + el.offsetWidth / 2 : 0; }
        return col * LIB_CELL_W + 100;
    }

    function libMoveRow(dir) {
        var rows = libRows(), to = lib.row + dir;
        if (to < 0) { toTabs(); return; }
        if (to >= rows.length) { return; }
        var x = libScreenX(lib.row, lib.col), best = 0, bestD = 1e9;
        for (var c = 0; c < rows[to].n; c++) {
            var d = Math.abs(libScreenX(to, c) - x);
            if (d < bestD) { bestD = d; best = c; }
        }
        lib.row = to;
        lib.col = best;
        if (rows[to].k === 'chips') {            // entering the chips: land on the current sort
            for (c = 0; c < LIB_SORTS.length; c++) { if (LIB_SORTS[c][0] === lib.sort) { lib.col = c; } }
        }
        libScroll();
        libApplyFocus();
    }

    function libMoveCol(dir) {
        var R = libRows()[lib.row];
        if (!R) { return; }
        if (dir < 0 && lib.col === 0) { toEdge('l'); libApplyFocus(); return; }
        if (dir > 0 && lib.col >= R.n - 1) { toEdge('r'); libApplyFocus(); return; }   // a next page, if Library isn't last
        lib.col += dir;
        libScroll();
        libApplyFocus();
    }

    // CH + / CH -: the next / previous letter when sorted A to Z, otherwise three rows at a time.
    function libJump(dir) {
        var rows = libRows(), R = rows[lib.row];
        if (!R || R.k !== 'grid') {
            if (dir > 0) { for (var i = lib.row; i < rows.length; i++) { if (rows[i].k === 'grid') { lib.row = i; lib.col = 0; libScroll(); libApplyFocus(); return; } } }
            return;
        }
        if (lib.sort !== 'name') {
            var firstGrid = rows.length - Math.ceil(lib.total / LIB_COLS);
            lib.row = Math.max(firstGrid, Math.min(rows.length - 1, lib.row + dir * 3));
            libKeepFocus(); libScroll(); libApplyFocus();
            return;
        }
        var letters = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ', cur = libLetter(libItemAt(lib.row, lib.col)) || 'A';
        var idx = letters.indexOf(cur) + dir;
        if (idx < 0 || idx >= letters.length) { return; }
        var target = letters.charAt(idx), gen = lib.gen;
        var q = libSortQuery();
        q.limit = 0;
        q.nameLessThan = target === '#' ? '0' : target;
        jfItems(q).then(function (res) {
            if (gen !== lib.gen) { return; }
            var n = Math.min(Math.max(0, lib.total - 1), (res && res.TotalRecordCount) || 0);
            var firstGridRow = libRows().length - Math.ceil(lib.total / LIB_COLS);
            lib.row = firstGridRow + Math.floor(n / LIB_COLS);
            lib.col = n % LIB_COLS;
            libScroll();
            libFetchPage(n, gen).then(function () { if (gen === lib.gen) { libRenderGrid(true); libApplyFocus(); } });
            libApplyFocus();
        }, function () { /* stay */ });
    }

    function onLibKey(k) {
        if (lib.detail) { return onDetailKey(k); }
        if (!lib.loadedAt) {
            if (k === KEY.LEFT) { toEdge('l'); return true; }
            if (k === KEY.RIGHT) { toEdge('r'); return true; }
            if (k === KEY.UP) { toTabs(); return true; }
            if (isBack(k)) { showPage(startPage()); return true; }
            return k === KEY.DOWN || k === KEY.ENTER;
        }
        var R = libRows()[lib.row];
        if (k === KEY.LEFT) { libMoveCol(-1); }
        else if (k === KEY.RIGHT) { libMoveCol(1); }
        else if (k === KEY.UP) { libMoveRow(-1); }
        else if (k === KEY.DOWN) { libMoveRow(1); }
        else if (k === KEY.CH_UP || k === KEY.PAGE_UP) { libJump(1); }
        else if (k === KEY.CH_DOWN || k === KEY.PAGE_DOWN) { libJump(-1); }
        else if (k === KEY.ENTER) {
            if (R && R.k === 'chips') { libSetSort(LIB_SORTS[lib.col][0]); }
            else { var it = libItemAt(lib.row, lib.col); if (it) { libOpenDetail(it); } }
        } else if (isBack(k)) { showPage(startPage()); }
        else { return false; }
        return true;
    }

    // ---------------------------------------------------- details

    function libStreams(it) {
        var s = it.MediaSources && it.MediaSources[0], out = { video: null, audio: [], subs: [] };
        each((s && s.MediaStreams) || [], function (m) {
            if (m.Type === 'Video' && !out.video) { out.video = m; }
            else if (m.Type === 'Audio') { out.audio.push(m); }
            else if (m.Type === 'Subtitle') { out.subs.push(m); }
        });
        return out;
    }

    function libLang(code) {
        var L = { eng: 'English', dut: 'Dutch', nld: 'Dutch', ger: 'German', deu: 'German', fre: 'French', fra: 'French', spa: 'Spanish',
                  ita: 'Italian', por: 'Portuguese', jpn: 'Japanese', kor: 'Korean', chi: 'Chinese', zho: 'Chinese', gre: 'Greek', ell: 'Greek',
                  swe: 'Swedish', dan: 'Danish', nor: 'Norwegian', fin: 'Finnish', pol: 'Polish', rus: 'Russian', tur: 'Turkish' };
        return L[String(code || '').toLowerCase()] || (code ? String(code).toUpperCase() : '');
    }

    function libCodec(c) {
        var n = { hevc: 'HEVC', h264: 'H.264', av1: 'AV1', vp9: 'VP9', mpeg2video: 'MPEG-2', ac3: 'AC3', eac3: 'E-AC3', dts: 'DTS', dca: 'DTS',
                  truehd: 'TrueHD', aac: 'AAC', mp3: 'MP3', flac: 'FLAC', opus: 'Opus' };
        return n[String(c || '').toLowerCase()] || String(c || '').toUpperCase();
    }

    function libAudioLabel(a) { return a ? [libLang(a.Language), libCodec(a.Codec), a.Channels ? (a.Channels === 6 ? '5.1' : a.Channels === 8 ? '7.1' : a.Channels + 'ch') : ''].join(' ').replace(/\s+/g, ' ').trim() : ''; }
    function libSubLabel(s) { return s ? (libLang(s.Language) || s.DisplayTitle || 'Subtitles') + (s.IsForced ? ' (forced)' : '') : 'Off'; }

    // Defaults from the user's Jellyfin profile: preferred audio language, subtitle mode and language.
    function libDefaultTracks(st) {
        var u = jf.userCfg || {}, a = 0, s = -1, i;
        for (i = 0; i < st.audio.length; i++) { if (st.audio[i].IsDefault) { a = i; } }
        if (u.AudioLanguagePreference) { for (i = 0; i < st.audio.length; i++) { if (st.audio[i].Language === u.AudioLanguagePreference) { a = i; break; } } }
        var mode = u.SubtitleMode || 'Default';
        if (mode === 'Always' || mode === 'Smart') {
            for (i = 0; i < st.subs.length; i++) { if (!u.SubtitleLanguagePreference || st.subs[i].Language === u.SubtitleLanguagePreference) { s = i; break; } }
        } else if (mode !== 'None') {
            for (i = 0; i < st.subs.length; i++) { if (st.subs[i].IsForced || st.subs[i].IsDefault) { s = i; break; } }
        }
        return { audio: a, sub: s };
    }

    // keep: { audio, sub, full } when coming back from the player
    function libOpenDetail(base, keep) {
        var d = { item: base, full: (keep && keep.full) || null, similar: [], row: 0, col: 0, audio: 0, sub: -1, play: null, checks: 0 };
        if (keep && d.full) { d.audio = keep.audio; d.sub = keep.sub; }
        lib.detail = d;                          // every callback below checks it's still this details view
        libRenderDetail();
        jfItem(base.Id).then(function (full) {
            if (lib.detail !== d) { return; }
            d.full = full;
            if (keep) { d.audio = keep.audio; d.sub = keep.sub; }
            else { var t = libDefaultTracks(libStreams(full)); d.audio = t.audio; d.sub = t.sub; }
            libRenderDetail();
            libCheckPlay(d);
        }, function (e) { if (lib.detail === d) { d.error = e.message; libRenderDetail(); } });
        jfSimilar(base.Id, 12).then(function (r) {
            if (lib.detail !== d) { return; }
            d.similar = (r && r.Items) || [];
            libRenderDetail();
        }, function () { /* the row just stays empty */ });
        libApplyFocus();
    }

    // How this title plays with the chosen tracks (a DTS track or picture subtitles can change it).
    function libCheckPlay(d) {
        var st = libStreams(d.full), a = st.audio[d.audio], s = d.sub >= 0 ? st.subs[d.sub] : null, n = ++d.checks;
        var burn = !!s && !vpIsText(s);
        d.play = null;
        libRenderDetail();
        jfPlaybackInfo(d.full.Id, { audioIndex: a ? a.Index : undefined, subtitleIndex: burn ? s.Index : -1 }).then(function (info) {
            if (lib.detail !== d || n !== d.checks) { return; }
            try { d.play = { ok: true, label: jfResolve(d.full.Id, info).label }; }
            catch (e) { d.play = { ok: false, code: e.code, label: e.code === 'needs-video' ? 'Needs video conversion' : 'Can\'t play here', msg: e.message }; }
            libRenderDetail();
        }, function () { if (lib.detail === d && n === d.checks) { d.play = { ok: false, label: 'Check failed' }; libRenderDetail(); } });
    }

    function libDetailButtons(d) {
        var it = d.full || d.item, u = it.UserData || {}, b = [];
        if (u.PlaybackPositionTicks > 0) { b.push({ k: 'resume', html: '<span class="ic">&#9654;</span>Resume<small>from ' + libClock(u.PlaybackPositionTicks) + '</small>' }); }
        b.push({ k: 'play', html: u.PlaybackPositionTicks > 0 ? '<span class="ic">&#8634;</span>Play from start' : '<span class="ic">&#9654;</span>Play' });
        if (d.full) {
            var st = libStreams(d.full);
            if (st.audio.length) { b.push({ k: 'audio', html: 'Audio<small>' + esc(libAudioLabel(st.audio[d.audio])) + '</small>' }); }
            b.push({ k: 'subs', html: 'Subtitles<small>' + esc(d.sub < 0 ? 'Off' : libSubLabel(st.subs[d.sub])) + '</small>' });
        }
        return b;
    }

    function libClock(ticks) {
        var s = Math.round((ticks || 0) / JF_TICKS), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
        return (h ? h + ':' + pad(m) : m) + ':' + pad(x);
    }

    function libRenderDetail() {
        var box = $('libDetail'), d = lib.detail;
        if (!box) { return; }
        if (!d) { box.className = ''; box.innerHTML = ''; return; }
        var it = d.full || d.item, u = it.UserData || {}, st = d.full ? libStreams(d.full) : { video: null, audio: [], subs: [] };
        var back = jfImage(it, { type: 'Backdrop', width: 1920, height: 1080, quality: 80 }) || jfImage(it, { width: 1920, quality: 80 });
        var meta = [], badges = [], v = st.video;
        if (it.ProductionYear) { meta.push(esc(it.ProductionYear)); }
        if (it.RunTimeTicks) { meta.push(libRuntime(it.RunTimeTicks)); }
        if (it.OfficialRating) { meta.push('<span class="rate">' + esc(it.OfficialRating) + '</span>'); }
        if (it.CommunityRating) { meta.push('<span class="rstar">&#9733; ' + (Math.round(it.CommunityRating * 10) / 10) + '</span>'); }
        if (it.RunTimeTicks) { meta.push('Ends at ' + hhmm(new Date(Date.now() + ((it.RunTimeTicks || 0) - (u.PlaybackPositionTicks || 0)) / JF_TICKS * 1000))); }
        if (v) {
            badges.push(v.Width >= 3800 ? '4K' : v.Height >= 1000 || v.Width >= 1900 ? '1080p' : v.Height >= 700 ? '720p' : (v.Height || '?') + 'p');
            badges.push(libCodec(v.Codec));
            if (v.VideoRange && v.VideoRange !== 'SDR') { badges.push(esc(v.VideoRangeType || v.VideoRange)); }
        }
        if (st.audio.length) { badges.push(esc(libAudioLabel(st.audio[d.audio]).replace(/^\S+ /, ''))); }
        if (st.subs.length) {
            var langs = [];
            each(st.subs, function (s) { var l = libLang(s.Language); if (l && langs.indexOf(l) < 0) { langs.push(l); } });
            badges.push(esc(langs.slice(0, 3).join(', ') + ' subs'));
        }
        var html = '<div class="dback" style="' + (back ? 'background-image:url(' + back + ')' : '') + '"></div><div class="dshade"></div><div class="det">' +
            '<h1>' + esc(it.Name || '') + '</h1><div class="meta">' + meta.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' +
            (it.Genres && it.Genres.length ? '<div class="genres">' + esc(it.Genres.slice(0, 4).join(' · ')) + '</div>' : '') +
            '<div class="ov">' + esc(it.Overview || '') + '</div><div class="badges">';
        each(badges, function (b) { html += '<span class="badge">' + b + '</span>'; });
        if (d.play) { html += '<span class="badge ' + (d.play.ok ? 'ok' : 'warn') + '">' + esc(d.play.label) + '</span>'; }
        else if (d.full) { html += '<span class="badge">Checking...</span>'; }
        html += '</div>';
        if (d.play && !d.play.ok && d.play.msg) { html += '<div class="dwarn">' + esc(d.play.msg) + '</div>'; }
        html += '<div class="btns">';
        each(libDetailButtons(d), function (b, i) { html += '<div class="btn' + (d.row === 0 && d.col === i ? ' focused' : '') + '">' + b.html + '</div>'; });
        html += '</div>';
        if (u.PlaybackPositionTicks > 0) { html += '<div class="resbar"><b style="width:' + libPct(it) + '%"></b></div>'; }
        html += '</div>';
        if (d.similar.length) {
            html += '<div class="dsim"><h3>More like this</h3><div class="lstrip">';
            each(d.similar, function (s, i) {
                var img = jfImage(s, { width: 150, height: 225 });
                html += '<div class="lcard small' + (d.row === 1 && d.col === i ? ' focused' : '') + '"><div class="art" style="' + (img ? 'background-image:url(' + img + ')' : '') + '"></div></div>';
            });
            html += '</div></div>';
        }
        if (d.error) { html += '<div class="empty">' + esc(d.error) + '</div>'; }
        box.innerHTML = html;
        box.className = 'open';
        var strip = box.querySelector('.dsim .lstrip');
        if (strip && d.row === 1) { strip.style.transform = 'translate3d(' + (-Math.max(0, d.col - 8) * 172) + 'px,0,0)'; }
    }

    function libCloseDetail() {
        lib.detail = null;
        libRenderDetail();
        applyFocus();                            // also brings the page arrows back
    }

    function onDetailKey(k) {
        var d = lib.detail, buttons = libDetailButtons(d), n = d.row === 0 ? buttons.length : d.similar.length;
        if (k === KEY.LEFT) { if (d.col > 0) { d.col--; } }
        else if (k === KEY.RIGHT) { if (d.col < n - 1) { d.col++; } }
        else if (k === KEY.DOWN) { if (d.row === 0 && d.similar.length) { d.row = 1; d.col = 0; } }
        else if (k === KEY.UP) { if (d.row === 1) { d.row = 0; d.col = 0; } }
        else if (isBack(k)) { libCloseDetail(); return true; }
        else if (k === KEY.ENTER) {
            if (d.row === 1) { libOpenDetail(d.similar[d.col]); return true; }
            var b = buttons[d.col], st = d.full ? libStreams(d.full) : null;
            if (b.k === 'audio' && st) { trkOpen(st, d.audio, d.sub, 0, libPickTrack); return true; }
            else if (b.k === 'subs' && st) { trkOpen(st, d.audio, d.sub, 1, libPickTrack); return true; }
            else if (b.k === 'resume' || b.k === 'play') { libPlay(d, b.k === 'resume'); return true; }
        } else { return false; }
        libRenderDetail();
        return true;
    }

    // ---------------------------------------------------- audio and subtitle picker
    //
    // Two lists side by side, used by the details view and by the player (Up).

    var trk = { open: false, col: 0, rows: [0, 0], st: null, audio: 0, sub: -1, done: null };
    var TRK_ROW_H = 62, TRK_ROWS = 9;

    function trkOpen(st, audio, sub, col, done) {
        trk.open = true;
        trk.st = st;
        trk.audio = audio;
        trk.sub = sub;
        trk.done = done;
        trk.col = col === 1 || !st.audio.length ? 1 : 0;
        trk.rows = [Math.max(0, audio), sub + 1];
        trkRender();
    }

    function trkClose() {
        trk.open = false;
        trk.done = null;
        trkRender();
    }

    function trkSubNote(s) {
        if (vpIsText(s)) { return s.IsExternal ? 'file' : ''; }
        return cfg.jfConvert === 'av' ? 'picture, converted' : 'picture, needs video conversion';
    }

    function trkRender() {
        var el = $('trk');
        vpClass();                                // the player hides its subtitles while you pick
        if (!trk.open) { el.hidden = true; el.innerHTML = ''; return; }
        function list(c, rows) {
            var off = Math.max(0, trk.rows[c] - (TRK_ROWS - 1)) * TRK_ROW_H, h = '<div class="tlist"><ul style="transform:translate3d(0,' + (-off) + 'px,0)">';
            each(rows, function (r, i) {
                h += '<li class="' + (r.cur ? 'cur' : '') + (trk.rows[c] === i ? ' focused' : '') + '">' + esc(r.label) +
                    (r.note ? '<small>' + esc(r.note) + '</small>' : '') + '</li>';
            });
            return h + '</ul></div>';
        }
        var a = [], s = [{ label: 'Off', cur: trk.sub < 0 }];
        each(trk.st.audio, function (x, i) { a.push({ label: libAudioLabel(x) || 'Track ' + (i + 1), note: x.Title || '', cur: trk.audio === i }); });
        each(trk.st.subs, function (x, i) { s.push({ label: libSubLabel(x), note: trkSubNote(x), cur: trk.sub === i }); });
        el.innerHTML = '<div class="tpanel">' +
            '<div class="tcol' + (trk.col === 0 ? ' on' : '') + '"><h3>Audio</h3>' + (a.length ? list(0, a) : '<p class="tnone">No audio tracks</p>') + '</div>' +
            '<div class="tcol' + (trk.col === 1 ? ' on' : '') + '"><h3>Subtitles</h3>' + list(1, s) + '</div>' +
            '<p class="thint">Up / Down to choose &middot; Left / Right for audio or subtitles &middot; OK to pick &middot; Back to close</p></div>';
        el.hidden = false;
    }

    function trkKey(k) {
        var n = trk.col === 0 ? trk.st.audio.length : trk.st.subs.length + 1;
        if (k === KEY.UP) { trk.rows[trk.col] = Math.max(0, trk.rows[trk.col] - 1); }
        else if (k === KEY.DOWN) { trk.rows[trk.col] = Math.min(n - 1, trk.rows[trk.col] + 1); }
        else if (k === KEY.LEFT) { if (trk.st.audio.length) { trk.col = 0; } }
        else if (k === KEY.RIGHT) { trk.col = 1; }
        else if (k === KEY.ENTER) {
            var done = trk.done, c = trk.col, r = trk.rows[c];
            trkClose();
            if (done) { done(c === 0 ? 'a' : 's', c === 0 ? r : r - 1); }
            return true;
        } else if (isBack(k) || k === KEY.EXIT || k === KEY.STOP) {
            var after = trk.done;
            trkClose();
            if (after) { after(null, null); }
            return true;
        } else { return true; }            // everything else is swallowed while the picker is open
        trkRender();
        return true;
    }

    // ------------------------------------------------------------------ Jellyfin player
    //
    // Plays a Library title full screen: Samsung's AVPlay on the TV (MKV, HEVC, HDR, Dolby ...),
    // a plain video element anywhere else. Text subtitles are drawn by Haven; picture subtitles
    // are burned in by the server (a video conversion). Progress goes to Jellyfin every 10 s, on
    // pause, seek and stop, so Resume is current here and in every other Jellyfin app.

    var vp = { item: null, streams: null, ctx: null, engine: null, tok: 0, started: false, paused: false, buffering: false,
               osd: false, pos: 0, at: 0, dur: 0, audio: 0, sub: -1, burn: false, subs: null, subKey: '', subTok: 0, subHtml: '',
               seek: null, seeking: false, seekTimer: null, seekN: 0, seekAt: 0, osdTimer: null, tick: null, awake: null,
               lastReport: 0, lastSec: -1, note: '', triedConvert: false, triedResume: false, tip: '' };

    var VP_TEXT_SUBS = /^(subrip|srt|ass|ssa|vtt|webvtt|mov_text|text|sami|smi|microdvd|ttml)$/i;
    var VP_BAR_W = 1700;

    function vpIsText(s) {
        if (!s) { return false; }
        if (s.IsTextSubtitleStream === true || s.IsTextSubtitleStream === false) { return s.IsTextSubtitleStream; }
        return VP_TEXT_SUBS.test(s.Codec || '');
    }

    // AVPlay draws on a video plane behind the page through this one <object>; the camera player
    // and this player each move it into their own screen.
    function avObject(host) {
        var o = $('avplayer');
        if (!o) {
            o = document.createElement('object');
            o.id = 'avplayer';
            o.type = 'application/avplayer';
        }
        if (o.parentNode !== host) { host.insertBefore(o, host.firstChild); }
        return o;
    }

    var VP_ENGINES = {
        avplay: {
            name: 'AVPlay',
            ok: function () { return !!(window.webapis && window.webapis.avplay); },
            open: function (url, o, cb) {
                var av = window.webapis.avplay;
                avObject($('vid'));
                setAvplayMode(true);
                try {
                    av.open(url);
                    av.setDisplayRect(0, 0, 1920, 1080);
                    try { av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX'); } catch (e1) { /* older firmware: letterbox anyway */ }
                    if (o.uhd) { try { av.setStreamingProperty('SET_MODE_4K', 'TRUE'); } catch (e2) { /* not needed for this stream */ } }
                    av.setListener({
                        onbufferingstart: function () { cb.buffering(true); },
                        onbufferingprogress: function () {},
                        onbufferingcomplete: function () { cb.buffering(false); },
                        onstreamcompleted: function () { cb.ended(); },
                        oncurrentplaytime: function () {},
                        onevent: function () {},
                        onsubtitlechange: function () {},
                        ondrmevent: function () {},
                        onerror: function (e) { cb.error(String(e || 'player error')); }
                    });
                    av.prepareAsync(function () {
                        if (o.audioTrack >= 0) { VP_ENGINES.avplay.selectAudio(o.audioTrack); }
                        var went = false;
                        function go() {
                            if (went) { return; }
                            went = true;
                            try { av.play(); cb.ready(); } catch (e) { cb.error(e.message || String(e)); }
                        }
                        if (o.start > 1) {
                            try { av.seekTo(Math.round(o.start * 1000), go, go); }
                            catch (e3) {                     // this firmware can't seek before playing
                                go();
                                try { av.seekTo(Math.round(o.start * 1000)); } catch (e4) { /* starts from the beginning */ }
                            }
                        } else { go(); }
                    }, function (e) { cb.error('could not open the stream (' + ((e && (e.name || e.message)) || e) + ')'); });
                } catch (e) {
                    cb.error(e.message || String(e));
                }
            },
            play: function () { window.webapis.avplay.play(); },
            pause: function () { window.webapis.avplay.pause(); },
            seek: function (sec, done) {
                try { window.webapis.avplay.seekTo(Math.round(sec * 1000), done, done); } catch (e) { done(); }
            },
            time: function () { try { return window.webapis.avplay.getCurrentTime() / 1000; } catch (e) { return 0; } },
            duration: function () { try { return window.webapis.avplay.getDuration() / 1000; } catch (e) { return 0; } },
            audioTracks: function () {
                var out = [];
                try { each(window.webapis.avplay.getTotalTrackInfo() || [], function (t) { if (t.type === 'AUDIO') { out.push(t); } }); } catch (e) { /* not ready */ }
                out.sort(function (a, b) { return a.index - b.index; });
                return out;
            },
            // n: the n-th audio stream of the file (the same order Jellyfin lists them in)
            selectAudio: function (n) {
                var t = VP_ENGINES.avplay.audioTracks()[n];
                if (!t) { return false; }
                try { window.webapis.avplay.setSelectTrack('AUDIO', t.index); return true; } catch (e) { return false; }
            },
            stop: function () {
                var av = window.webapis && window.webapis.avplay;
                if (av) {
                    try { av.stop(); } catch (e) { /* not started */ }
                    try { av.close(); } catch (e) { /* not opened */ }
                }
                setAvplayMode(false);
            }
        },
        video: {
            name: 'video element',
            ok: function () { return true; },
            open: function (url, o, cb) {
                var v = $('vidVideo'), started = false;
                v.hidden = false;
                v.onwaiting = function () { cb.buffering(true); };
                v.onplaying = function () {
                    cb.buffering(false);
                    if (!started) { started = true; if (o.audioTrack >= 0) { VP_ENGINES.video.selectAudio(o.audioTrack); } cb.ready(); }
                };
                v.onended = function () { cb.ended(); };
                v.onerror = function () { cb.error('this ' + (H.isTV ? 'TV' : 'browser') + ' can\'t play it (video error ' + (v.error ? v.error.code : '?') + ')'); };
                v.onloadedmetadata = function () { if (o.start > 1) { try { v.currentTime = o.start; } catch (e) { /* from the start */ } } };
                v.src = url;
                var p = v.play();
                if (p && p.then) { p.then(null, function (e) { if (!e || e.name !== 'AbortError') { cb.error((e && (e.message || e.name)) || 'play refused'); } }); }
            },
            play: function () { var p = $('vidVideo').play(); if (p && p.then) { p.then(null, function () {}); } },
            pause: function () { $('vidVideo').pause(); },
            seek: function (sec, done) { try { $('vidVideo').currentTime = sec; } catch (e) { /* not seekable */ } done(); },
            time: function () { return $('vidVideo').currentTime || 0; },
            duration: function () { var d = $('vidVideo').duration; return isFinite(d) ? d : 0; },
            selectAudio: function (n) {
                var at = $('vidVideo').audioTracks, i;
                if (!at || !at[n]) { return false; }
                for (i = 0; i < at.length; i++) { at[i].enabled = i === n; }
                return true;
            },
            stop: function () {
                var v = $('vidVideo');
                v.onwaiting = v.onplaying = v.onended = v.onerror = v.onloadedmetadata = null;
                try { v.pause(); } catch (e) { /* not playing */ }
                v.removeAttribute('src');
                try { v.load(); } catch (e) { /* nothing loaded */ }
                v.hidden = true;
            }
        }
    };

    function vpEngine() { return VP_ENGINES.avplay.ok() ? VP_ENGINES.avplay : VP_ENGINES.video; }

    // item: the full item (MediaSources, Chapters); opts: { start (s), audio, sub (indexes into libStreams lists, sub -1 = off) }
    function vpOpen(item, opts) {
        opts = opts || {};
        musHold('video');
        vpStopEngine();
        var tok = ++vp.tok;
        vp.item = item;
        vp.streams = libStreams(item);
        vp.audio = opts.audio || 0;
        vp.sub = opts.sub === undefined ? -1 : opts.sub;
        vp.started = vp.paused = vp.burn = vp.triedConvert = vp.triedResume = false;
        vp.buffering = true;
        vp.ctx = null;
        vp.subs = null; vp.subKey = ''; vp.subHtml = '';
        vp.seek = null; vp.seeking = false;
        vp.pos = vp.at = Math.max(0, opts.start || 0);
        vp.dur = (item.RunTimeTicks || 0) / JF_TICKS;
        vp.note = ''; vp.tip = '';
        mode = 'video';
        clearInterval(wallTimer);
        wallTimer = null;
        updateFx();
        $('vidSub').innerHTML = '';
        $('vid').hidden = false;
        vpRenderStatic();
        vpMsg('Starting ' + (item.Name || '') + '...');
        vpShowOsd(0);
        vpScreenSaver(false);
        vpKeepAwake(true);
        vpNegotiate(vp.audio, vp.sub, false).then(function (r) {
            if (tok === vp.tok) { vpOpenEngine(r, vp.at); }
        }, function (e) {
            if (tok !== vp.tok) { return; }
            vpRemember(e.message);
            vpClose();
            toast(e.message, 7000);
        });
    }

    // Ask Jellyfin how to play the chosen tracks on this TV. Resolves jfResolve's answer plus the tracks.
    function vpNegotiate(audio, sub, noDirect) {
        var item = vp.item, a = vp.streams.audio[audio], s = sub >= 0 ? vp.streams.subs[sub] : null, burn = !!s && !vpIsText(s);
        return jfPlaybackInfo(item.Id, { audioIndex: a ? a.Index : undefined, subtitleIndex: burn ? s.Index : -1, noDirectPlay: noDirect })
            .then(function (info) {
                var r = jfResolve(item.Id, info);
                r.audio = audio;
                r.sub = sub;
                r.burn = burn;
                return r;
            });
    }

    function vpOpenEngine(r, at) {
        var tok = ++vp.tok, v = vp.streams.video, eng = vpEngine();
        var a = vp.streams.audio[r.audio], s = r.sub >= 0 ? vp.streams.subs[r.sub] : null;
        vp.audio = r.audio;
        vp.sub = r.sub;
        vp.burn = r.burn;
        vp.ctx = { itemId: vp.item.Id, mediaSourceId: r.mediaSourceId, playSessionId: r.playSessionId, method: r.method, label: r.label,
                   audioIndex: a ? a.Index : undefined, subIndex: s ? s.Index : -1 };
        vp.engine = eng;
        vp.started = false;
        vp.buffering = true;
        vp.at = vp.pos = at;
        vpRenderStatic();
        vpClass();
        eng.open(r.url, { start: at, uhd: !!(v && v.Width > 1920 && jfDetectCaps().uhd),
                          audioTrack: r.method === 'DirectPlay' && vp.streams.audio.length > 1 ? r.audio : -1 }, {
            ready: function () { if (tok === vp.tok) { vpReady(); } },
            buffering: function (b) { if (tok === vp.tok) { vp.buffering = b; vpClass(); } },
            ended: function () { if (tok === vp.tok) { vpClose({ ended: true }); } },
            error: function (m) { if (tok === vp.tok) { vpFail(m); } }
        });
    }

    function vpReady() {
        vp.started = true;
        vp.paused = false;
        vp.buffering = false;
        var d = vp.engine.duration();
        if (d > 1) { vp.dur = d; }
        vpMsg('');
        vpRemember('');
        jfReport('start', vp.ctx, vp.pos, false).then(null, function () { /* the next report retries */ });
        vp.lastReport = Date.now();
        if (!vp.tick) { vp.tick = setInterval(vpTick, 250); }
        vpLoadSubs();
        vpRenderStatic();
        vpShowOsd(5000);
        if (vp.note) { toast(vp.note, 6000); vp.note = ''; }
    }

    // A failure before the first picture of a direct play: ask Jellyfin to repackage or convert
    // instead (some files a TV claims to play, it doesn't). After the picture: pick up once more.
    function vpFail(msg) {
        var ctx = vp.ctx, tok = ++vp.tok;
        vpRemember(msg);
        vpStopEngine();
        var retry = null;
        if (!vp.started && ctx && ctx.method === 'DirectPlay' && cfg.jfConvert !== 'off' && !vp.triedConvert) {
            vp.triedConvert = true;
            vp.note = 'Direct play didn\'t work on this TV, so Jellyfin is converting this title.';
            retry = vpNegotiate(vp.audio, vp.sub, true);
        } else if (vp.started && !vp.triedResume) {
            vp.triedResume = true;
            vp.note = 'Playback was interrupted and picked up again.';
            if (ctx && ctx.method !== 'DirectPlay') { jfStopEncoding(ctx.playSessionId); }
            retry = vpNegotiate(vp.audio, vp.sub, ctx && ctx.method !== 'DirectPlay');
        }
        if (!retry) {
            vpClose();
            toast((vp.started ? 'Playback stopped: ' : 'Couldn\'t play this title: ') + msg, 7000);
            return;
        }
        vp.buffering = true;
        vpClass();
        retry.then(function (r) {
            if (tok === vp.tok) { vpOpenEngine(r, vp.pos); }
        }, function (e) {
            if (tok !== vp.tok) { return; }
            vpClose();
            toast('Couldn\'t play this title: ' + msg + ' (' + e.message + ')', 7000);
        });
    }

    function vpStopEngine() {
        if (vp.engine) { vp.engine.stop(); vp.engine = null; }
        else if (/avplay-on/.test($('stage').className) && mode === 'video') { VP_ENGINES.avplay.stop(); }
    }

    // opts: { ended } -- the end of the film saves it as watched
    function vpClose(opts) {
        opts = opts || {};
        var ctx = vp.ctx, started = vp.started, item = vp.item, tracks = { audio: vp.audio, sub: vp.sub };
        var pos = opts.ended ? vp.dur : vp.seek !== null ? vp.seek : vp.pos;
        vp.tok++;
        clearInterval(vp.tick);
        vp.tick = null;
        clearTimeout(vp.seekTimer);
        clearTimeout(vp.osdTimer);
        vp.seek = null;
        vp.seeking = false;
        vpStopEngine();
        vpKeepAwake(false);
        vpScreenSaver(true);
        trkClose();
        var report = ctx && started ? jfReport('stopped', ctx, pos, false) : null;
        if (ctx && ctx.method !== 'DirectPlay') { jfStopEncoding(ctx.playSessionId); }
        vp.ctx = null;
        vp.started = false;
        vp.subs = null;
        vp.subHtml = '';
        $('vid').hidden = true;
        $('vid').className = '';
        $('vidSub').innerHTML = '';
        mode = 'dock';
        scheduleWalls();
        updateFx();
        applyFocus();
        musUnhold('video', true);
        if (report && item) {
            var after = function () { libAfterPlay(item, tracks); };
            report.then(after, after);
        }
    }

    function vpTick() {
        if (!vp.engine || !vp.started) { return; }
        if (vp.seek === null && !vp.seeking) {
            var t = vp.engine.time();
            if (t > 0 || vp.pos < 2) { vp.pos = t; }
        }
        if (Date.now() - vp.lastReport > 10000) { vpReport(); }
        vpSubsAt(vp.pos);
        var sec = Math.floor(vp.seek !== null ? vp.seek : vp.pos);
        if (vp.osd && sec !== vp.lastSec) { vp.lastSec = sec; vpRenderBar(); }
    }

    function vpReport() {
        if (!vp.ctx || !vp.started) { return; }
        vp.lastReport = Date.now();
        jfReport('progress', vp.ctx, vp.pos, vp.paused).then(null, function () { /* the next one retries */ });
    }

    function vpTogglePause(want) {
        if (!vp.started || !vp.engine) { return; }
        var pause = want === undefined ? !vp.paused : want;
        if (pause === vp.paused) { vpShowOsd(pause ? 0 : 4000); return; }
        try { if (pause) { vp.engine.pause(); } else { vp.engine.play(); } } catch (e) { return; }
        vp.paused = pause;
        vpReport();
        vpShowOsd(pause ? 0 : 4000);
    }

    // Left / Right: 10 s a press; held down it speeds up to 30 s, then 60 s. The jump happens
    // when you let go, so the server isn't asked for every step.
    function vpSeekBy(sec) {
        if (!vp.started) { return; }
        var now = Date.now();
        vp.seekN = now - vp.seekAt < 900 ? vp.seekN + 1 : 0;
        vp.seekAt = now;
        var step = Math.abs(sec) >= 30 ? sec : sec * (vp.seekN >= 12 ? 6 : vp.seekN >= 5 ? 3 : 1);
        vpSeekTo((vp.seek !== null ? vp.seek : vp.pos) + step, 700, '');
    }

    function vpSeekTo(to, delay, tip) {
        vp.seek = Math.max(0, Math.min(to, Math.max(0, vp.dur - 3)));
        vp.tip = tip || '';
        vpShowOsd(0);
        clearTimeout(vp.seekTimer);
        vp.seekTimer = setTimeout(vpSeekCommit, delay);
    }

    function vpSeekCommit() {
        if (vp.seek === null || !vp.engine) { return; }
        var to = vp.seek, tok = vp.tok, done = false;
        vp.seeking = true;
        function finish() {
            if (done || tok !== vp.tok) { return; }
            done = true;
            vp.seeking = false;
            vp.pos = to;
            vp.seek = null;
            vp.tip = '';
            vp.subHtml = '-';                     // redraw subtitles at the new spot
            vpReport();
            vpShowOsd(vp.paused ? 0 : 3000);
        }
        vp.engine.seek(to, finish);
        setTimeout(finish, 8000);                 // a seek that never answers still ends
    }

    // CH + / CH -: next or previous chapter, or 5 minutes when the file has no chapters.
    function vpChapter(dir) {
        if (!vp.started) { return; }
        var base = vp.seek !== null ? vp.seek : vp.pos, ch = vp.item.Chapters || [], to = null, name = '', i;
        if (ch.length > 1) {
            if (dir > 0) {
                for (i = 0; i < ch.length; i++) { if (ch[i].StartPositionTicks / JF_TICKS > base + 1) { to = ch[i].StartPositionTicks / JF_TICKS; name = ch[i].Name || ''; break; } }
            } else {
                to = 0;
                name = ch[0].Name || '';
                for (i = ch.length - 1; i >= 0; i--) { if (ch[i].StartPositionTicks / JF_TICKS < base - 3) { to = ch[i].StartPositionTicks / JF_TICKS; name = ch[i].Name || ''; break; } }
            }
            if (to === null) { return; }
        } else {
            to = base + dir * 300;
        }
        vpSeekTo(to, 500, name);
    }

    function vpPickTracks(col) {
        if (!vp.started) { return; }
        vpShowOsd(0);
        trkOpen(vp.streams, vp.audio, vp.sub, col, function (type, i) {
            if (type === 'a') { vpSetAudio(i); } else if (type === 's') { vpSetSub(i); }
            vpShowOsd(vp.paused ? 0 : 3000);
        });
    }

    // Another audio track: the TV switches by itself when the file plays directly and the new
    // track does too; otherwise Jellyfin prepares a new stream from the same spot.
    function vpSetAudio(i) {
        if (i === vp.audio || !vp.ctx) { return; }
        var tok = vp.tok, label = libAudioLabel(vp.streams.audio[i]);
        vpNegotiate(i, vp.sub, false).then(function (r) {
            if (tok !== vp.tok || !vp.ctx) { return; }
            if (r.method === 'DirectPlay' && vp.ctx.method === 'DirectPlay' && vp.engine.selectAudio(i)) {
                vp.audio = i;
                vp.ctx.audioIndex = vp.streams.audio[i].Index;
                vpReport();
                vpRenderStatic();
                toast('Audio: ' + label, 2500);
                return;
            }
            vpSwitch(r, 'Audio: ' + label);
        }, function (e) {
            if (tok === vp.tok) { toast(e.message, 6000); }
        });
    }

    function vpSetSub(i) {
        if (i === vp.sub || !vp.ctx) { return; }
        var s = i >= 0 ? vp.streams.subs[i] : null, tok = vp.tok;
        if (!vp.burn && (!s || vpIsText(s))) {      // drawn by Haven: no new stream needed
            vp.sub = i;
            vp.ctx.subIndex = s ? s.Index : -1;
            vpLoadSubs();
            vpReport();
            vpRenderStatic();
            return;
        }
        vpNegotiate(vp.audio, i, false).then(function (r) {
            if (tok === vp.tok && vp.ctx) { vpSwitch(r, 'Subtitles: ' + libSubLabel(s)); }
        }, function (e) {
            if (tok === vp.tok) { toast(e.message, 6000); }
        });
    }

    function vpSwitch(r, msg) {
        var old = vp.ctx, at = vp.seek !== null ? vp.seek : vp.pos;
        vp.tok++;
        vpStopEngine();
        if (old && old.method !== 'DirectPlay') { jfStopEncoding(old.playSessionId); }
        vp.note = msg;
        vp.paused = false;
        vpOpenEngine(r, at);
    }

    // ---------------------------------------------------- subtitles (text, drawn by Haven)

    function vpLoadSubs() {
        var s = vp.sub >= 0 ? vp.streams.subs[vp.sub] : null, ctx = vp.ctx;
        if (!s || !vpIsText(s) || !ctx) { vp.subs = null; vp.subKey = ''; vpSubShow(''); return; }
        var key = ctx.mediaSourceId + '/' + s.Index;
        if (key === vp.subKey) { return; }
        vp.subKey = key;
        vp.subs = null;
        vpSubShow('');
        var tok = ++vp.subTok;
        jfRequest('GET', '/Videos/' + ctx.itemId + '/' + ctx.mediaSourceId + '/Subtitles/' + s.Index + '/0/Stream.vtt', { raw: true, timeout: 30000 })
            .then(function (t) {
                if (tok !== vp.subTok) { return; }
                vp.subs = vpParseVtt(t || '');
                vp.subHtml = '-';
                if (!vp.subs.length) { toast('These subtitles are empty', 4000); }
            }, function (e) {
                if (tok !== vp.subTok) { return; }
                vp.subKey = '';
                toast('Subtitles didn\'t load (' + e.message + ')', 5000);
            });
    }

    function vpParseVtt(t) {
        var out = [];
        each(String(t).replace(/\r/g, '').split(/\n{2,}/), function (b) {
            var lines = b.split('\n'), i = 0, m;
            while (i < lines.length && lines[i].indexOf('-->') < 0) { i++; }
            if (i >= lines.length) { return; }
            m = /([\d:.,]+)\s*-->\s*([\d:.,]+)/.exec(lines[i]);
            if (!m) { return; }
            var text = lines.slice(i + 1).join('\n').replace(/\{\\[^}]*\}/g, '').replace(/^\s+|\s+$/g, '');
            if (text) { out.push({ s: vpSecs(m[1]), e: vpSecs(m[2]), h: vpSubHtml(text) }); }
        });
        out.sort(function (a, b) { return a.s - b.s; });
        return out;
    }

    function vpSecs(x) {
        var p = x.replace(',', '.').split(':'), s = 0, i;
        for (i = 0; i < p.length; i++) { s = s * 60 + parseFloat(p[i]); }
        return s;
    }

    // Keeps italics, bold and underline; everything else becomes plain text.
    function vpSubHtml(t) {
        t = t.replace(/<(?!\/?[ibu]>)[^>]*>/gi, '');
        return esc(t).replace(/&lt;(\/?[ibu])&gt;/gi, '<$1>').replace(/\n/g, '<br>');
    }

    function vpSubsAt(t) {
        if (!vp.subs) { if (vp.subHtml) { vpSubShow(''); } return; }
        var c = vp.subs, lo = 0, hi = c.length - 1, i = -1, mid, parts = [], j;
        while (lo <= hi) { mid = (lo + hi) >> 1; if (c[mid].s <= t) { i = mid; lo = mid + 1; } else { hi = mid - 1; } }
        for (j = i; j >= 0 && j > i - 6; j--) { if (c[j].e > t) { parts.unshift(c[j].h); } }
        vpSubShow(parts.join('<br>'));
    }

    function vpSubShow(h) {
        if (h === vp.subHtml) { return; }
        vp.subHtml = h;
        $('vidSub').innerHTML = h ? '<span>' + h + '</span>' : '';
    }

    // ---------------------------------------------------- on screen

    function vpClock(s) {
        s = Math.max(0, Math.floor(s || 0));
        var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
        return h ? h + ':' + pad(m) + ':' + pad(x) : m + ':' + pad(x);
    }

    function vpClass() {
        var el = $('vid');
        if (el.hidden) { return; }
        el.className = (vp.osd || vp.paused || trk.open ? 'osd' : '') + (vp.paused ? ' paused' : '') +
            (vp.buffering || !vp.started ? ' busy' : '') + (vp.seek !== null ? ' seeking' : '') + (trk.open ? ' picking' : '');
    }

    function vpMsg(t) { $('vidMsg').textContent = t || ''; }

    // Title, details line, chapter marks and tracks: drawn when something about them changes.
    function vpRenderStatic() {
        var it = vp.item, ctx = vp.ctx, meta = [];
        if (!it) { return; }
        $('vidTitle').textContent = it.Name || '';
        if (it.ProductionYear) { meta.push(esc(it.ProductionYear)); }
        if (it.OfficialRating) { meta.push('<b class="rate">' + esc(it.OfficialRating) + '</b>'); }
        meta.push('<i id="vidEnds"></i>');
        if (ctx) { meta.push('<b class="vbadge' + (ctx.method === 'DirectPlay' ? ' ok' : '') + '">' + esc(ctx.label) + '</b>'); }
        $('vidMeta').innerHTML = meta.map(function (m) { return '<span>' + m + '</span>'; }).join('');
        var marks = '', ch = it.Chapters || [];
        if (ch.length > 1 && vp.dur > 0) {
            each(ch, function (c, i) {
                if (i) { marks += '<i style="left:' + Math.round(c.StartPositionTicks / JF_TICKS / vp.dur * VP_BAR_W) + 'px"></i>'; }
            });
        }
        $('vidMarks').innerHTML = marks;
        var a = vp.streams.audio[vp.audio], s = vp.sub >= 0 ? vp.streams.subs[vp.sub] : null;
        $('vidTracks').textContent = (a ? 'Audio: ' + libAudioLabel(a) + '   ·   ' : '') + 'Subtitles: ' + (s ? libSubLabel(s) : 'Off');
        vpRenderBar();
    }

    function vpRenderBar() {
        var t = vp.seek !== null ? vp.seek : vp.pos, d = vp.dur || 0, p = d ? Math.max(0, Math.min(1, t / d)) : 0;
        $('vidFill').style.transform = 'scaleX(' + p.toFixed(4) + ')';
        $('vidThumb').style.transform = 'translate3d(' + Math.round(p * VP_BAR_W) + 'px,0,0)';
        $('vidTip').textContent = vp.seek !== null ? vpClock(vp.seek) + (vp.tip ? '  ' + vp.tip : '') : '';
        $('vidPos').textContent = vpClock(t);
        $('vidDur').textContent = d ? vpClock(d) : '';
        var ends = $('vidEnds');
        if (ends) { ends.textContent = d ? 'Ends at ' + hhmm(new Date(Date.now() + Math.max(0, d - t) * 1000)) : ''; }
        $('vidClock').textContent = hhmm(new Date());
        vpClass();
    }

    // ms: hide again after this long (0 = stay while paused, seeking or choosing tracks)
    function vpShowOsd(ms) {
        vp.osd = true;
        clearTimeout(vp.osdTimer);
        vpRenderBar();
        if (ms) {
            vp.osdTimer = setTimeout(function () {
                if (vp.paused || vp.seek !== null || trk.open || !vp.started) { return; }
                vp.osd = false;
                vpClass();
            }, ms);
        }
    }

    // ---------------------------------------------------- staying awake

    function vpScreenSaver(allow) {
        try {
            var ac = window.webapis && window.webapis.appcommon;
            if (ac && ac.setScreenSaver) {
                ac.setScreenSaver(allow ? ac.AppCommonScreenSaverState.SCREEN_SAVER_ON : ac.AppCommonScreenSaverState.SCREEN_SAVER_OFF);
            }
        } catch (e) { /* not on a TV */ }
    }

    // The shell applies a downloaded design update after 20 s without a key press. A film has
    // long stretches without one, so while it plays Haven tells the shell it's still in use
    // (an empty keydown; onKey ignores it). The update waits until playback ends.
    function vpKeepAwake(on) {
        clearInterval(vp.awake);
        vp.awake = null;
        if (!on) { return; }
        vp.awake = setInterval(function () {
            try {
                var ev = document.createEvent('Event');
                ev.initEvent('keydown', true, true);
                document.dispatchEvent(ev);
            } catch (e) { /* nothing to do */ }
        }, 10000);
    }

    function vpRemember(err) {
        var c = vp.ctx;
        H.set('jfLastPlay', { at: Date.now(), title: vp.item ? vp.item.Name : '', label: c ? c.label : '',
            engine: vp.engine ? vp.engine.name : vpEngine().name, error: err || '' });
    }

    function vpStatus() {
        var l = H.get('jfLastPlay', null);
        if (!l) { return 'not used yet'; }
        return l.title + ': ' + (l.error ? 'failed (' + l.error + ')' : l.label) + ' with ' + l.engine + ', ' + hhmm(new Date(l.at));
    }

    function onVideoKey(k) {
        if (k === KEY.STOP || k === KEY.EXIT || isBack(k)) { vpClose(); return true; }
        if (!vp.started) { return true; }
        if (k === KEY.ENTER || k === KEY.PLAYPAUSE || k === KEY.SPACE) { vpTogglePause(); }
        else if (k === KEY.PLAY) { vpTogglePause(false); }
        else if (k === KEY.PAUSE) { vpTogglePause(true); }
        else if (k === KEY.LEFT) { vpSeekBy(-10); }
        else if (k === KEY.RIGHT) { vpSeekBy(10); }
        else if (k === KEY.RW) { vpSeekBy(-30); }
        else if (k === KEY.FF) { vpSeekBy(30); }
        else if (k === KEY.CH_UP || k === KEY.PAGE_UP) { vpChapter(1); }
        else if (k === KEY.CH_DOWN || k === KEY.PAGE_DOWN) { vpChapter(-1); }
        else if (k === KEY.UP) { vpPickTracks(0); }
        else { vpShowOsd(4000); }
        return true;
    }

    // ---------------------------------------------------- from the details view

    function libPlay(d, resume) {
        if (!d.full) { toast('Still loading this title...', 2500); return; }
        if (d.play && !d.play.ok && d.play.code) { toast(d.play.msg || d.play.label, 6000); return; }
        var u = d.full.UserData || {};
        vpOpen(d.full, { start: resume ? (u.PlaybackPositionTicks || 0) / JF_TICKS : 0, audio: d.audio, sub: d.sub });
    }

    function libPickTrack(type, i) {
        var d = lib.detail;
        if (!d || type === null) { return; }
        if (type === 'a') { d.audio = i; } else { d.sub = i; }
        libRenderDetail();
        libCheckPlay(d);
    }

    // After playing: fresh resume point and watched state in the details and the rows.
    // tracks: what was picked in the player, kept for the next Play
    function libAfterPlay(item, tracks) {
        lib.pages = {};
        libLoad(true);
        var d = lib.detail;
        if (d && d.item && d.item.Id === item.Id) { libOpenDetail(d.item, { audio: tracks.audio, sub: tracks.sub, full: d.full }); }
    }

    // ------------------------------------------------------------------ Music page
    //
    // The optional 6th page, off until you turn it on in Settings > Screens: songs from Home
    // Assistant's media folder (My media, /media on Home Assistant OS), played by the TV itself.
    // Home Assistant lists the folder over the widgets' WebSocket (media_source/browse_media) and
    // hands out a signed link per file (media_source/resolve_media, valid 24 hours), so nothing
    // needs installing on Home Assistant. A plain <audio> element plays it, which keeps AVPlay free
    // for the cameras and films; those pause the music while they're open and resume it after.
    // The music keeps playing while you move between pages: a small player at the top left shows
    // what's on, and the remote's media keys work on every page. Title, artist and cover come from
    // the MP3 tags of the song that's playing and the next one only (never the whole folder), and
    // the names and lengths learnt that way are kept, so the list shows them from then on.

    var P_MUS = 5;
    var MUS_ROOT = 'media-source://media_source';
    var MUS_ROW_H = 66, MUS_LIST_H = 470, MUS_PAGE_ROWS = 7, MUS_KEEP = 400;
    var MUS_ART = /^(cover|folder|front|album)\.(jpe?g|png)$/i;
    var MUS_FORMATS = [['MP3', 'audio/mpeg'], ['AAC', 'audio/mp4'], ['FLAC', 'audio/flac'], ['OGG', 'audio/ogg'], ['WAV', 'audio/wav']];
    var MUS_ICON = {
        play: '<svg class="glyph" viewBox="0 0 100 100"><path d="M38 26 L76 50 L38 74 Z" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/></svg>',
        pause: '<svg class="glyph" viewBox="0 0 100 100" fill="currentColor"><rect x="30" y="26" width="14" height="48" rx="4"/><rect x="56" y="26" width="14" height="48" rx="4"/></svg>',
        prev: '<svg class="glyph" viewBox="0 0 100 100"><path d="M72 28 L40 50 L72 72 Z" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/><path d="M30 28 V72" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
        next: '<svg class="glyph" viewBox="0 0 100 100"><path d="M28 28 L60 50 L28 72 Z" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/><path d="M70 28 V72" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
        note: '<svg class="glyph" viewBox="0 0 100 100"><path d="M40 70 V30 L76 22 V62" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/><circle cx="31" cy="70" r="10" fill="currentColor"/><circle cx="67" cy="62" r="10" fill="currentColor"/></svg>',
        folder: '<svg class="glyph" viewBox="0 0 100 100"><path d="M14 30 H40 L48 38 H86 V74 H14 Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/></svg>'
    };
    var MUS_HELD = { camera: 'Paused while a camera is open', video: 'Paused while a film plays', hidden: 'Paused' };

    var mus = {
        dirs: null, autoRoot: '', autoTitle: '', path: [], items: [], playable: [], dirArt: {},
        loadedAt: 0, loading: false, error: '', gen: 0, f: null, scrollY: 0, focusShown: false,
        queue: [], order: [], qi: -1, active: false, playing: false, buffering: false, tok: 0, pos: 0, dur: 0, startAt: 0,
        fails: 0, held: null, resumeAfterHold: false, urls: {}, tags: {}, tagOrder: [], art: { id: '', url: '' },
        awake: null, savedAt: 0, lastSec: -1, can: {}, persistTimer: null
    };
    var musNames = H.get('musNames', null) || {};    // { id: { t, a, b } } title, artist, album from the tags
    var musDurs = H.get('musDurs', null) || {};      // { id: seconds }
    var musSaved = H.get('musState', null);          // the last queue and position, for Resume

    // ---------------------------------------------------- Home Assistant's media folder

    function musBrowse(id) {
        return new Promise(function (ok, bad) {
            if (!ha.connected) { bad(new Error('Home Assistant is not connected')); return; }
            haSend('media_source/browse_media', { media_content_id: id }, function (s, res, err) {
                if (s && res) { ok(res); } else { bad(new Error((err && err.message) || 'no answer')); }
            });
        });
    }

    // A signed link Home Assistant serves the file on (the TV's <audio> can't send the token).
    function musResolve(id) {
        var c = mus.urls[id];
        if (c && Date.now() - c.at < 20 * 3600000) { return Promise.resolve(c.url); }
        return new Promise(function (ok, bad) {
            if (!ha.connected) { bad(new Error('Home Assistant is not connected')); return; }
            haSend('media_source/resolve_media', { media_content_id: id }, function (s, res, err) {
                if (!s || !res || !res.url) { bad(new Error((err && err.message) || 'no link for this file')); return; }
                var url = /^https?:/i.test(res.url) ? res.url : H.ha().url + res.url;
                mus.urls[id] = { url: url, at: Date.now() };
                ok(url);
            });
        });
    }

    function musCanPlay(mime) {
        if (!mime) { return false; }
        if (!mus.can.hasOwnProperty(mime)) {
            try { mus.can[mime] = !!$('musAudio').canPlayType(mime); } catch (e) { mus.can[mime] = false; }
        }
        return mus.can[mime];
    }

    function musFormats() {
        var out = [];
        each(MUS_FORMATS, function (f) { out.push(f[0] + (musCanPlay(f[1]) ? ' yes' : ' no')); });
        return out.join(', ');
    }

    // The top folders of My media: Settings > Music folder lists them, and "Automatic" picks Music.
    function musLoadDirs() {
        return musBrowse(MUS_ROOT).then(function (res) {
            var dirs = [], auto = null;
            each(res.children || [], function (c) { if (c.can_expand) { dirs.push([c.media_content_id, c.title]); } });
            each(dirs, function (d) { if (!auto && /^music$/i.test(d[1])) { auto = d; } });
            mus.dirs = dirs;
            mus.autoRoot = auto ? auto[0] : MUS_ROOT;
            mus.autoTitle = auto ? auto[1] : 'My media';
            musDirOptions();
            if (mode === 'settings') { renderSettings(); }
        });
    }

    function musDirOptions() {
        var o = [['', 'Automatic (' + (mus.dirs ? mus.autoTitle : 'a folder named Music') + ')']], have = {};
        if (mus.dirs) {
            o.push([MUS_ROOT, 'All of My media']);
            each(mus.dirs, function (d) { o.push([d[0], d[1]]); have[d[0]] = true; });
        }
        if (cfg.musDir && cfg.musDir !== MUS_ROOT && !have[cfg.musDir]) { o.push([cfg.musDir, cfg.musDirName || 'the saved folder']); }
        if (cfg.musDir === MUS_ROOT && !mus.dirs) { o.push([MUS_ROOT, 'All of My media']); }
        each(SETTINGS_DEF, function (def) { if (def.key === 'musDir') { def.options = o; } });
    }

    function musRootId() { return cfg.musDir || mus.autoRoot || MUS_ROOT; }
    function musRootTitle() {
        var id = musRootId();
        if (id === MUS_ROOT) { return 'My media'; }
        return cfg.musDir ? (cfg.musDirName || 'Music') : (mus.autoTitle || 'Music');
    }

    function musFolderChanged() {
        mus.gen++;
        mus.loading = false;
        mus.path = [];
        mus.items = [];
        mus.playable = [];
        mus.loadedAt = 0;
        mus.error = '';
        mus.f = null;
        mus.scrollY = 0;
        if (pos(P_MUS) >= 0) { musLoad(true); }
    }

    // Natural order, ignoring case: "2 Song" before "10 Song".
    function musSortKey(s) {
        return String(s || '').toLowerCase().replace(/\d+/g, function (n) { return ('0000000000' + n).slice(-10); });
    }

    function musLoad(force) {
        if (mus.loading) { return; }
        if (!force && mus.loadedAt && Date.now() - mus.loadedAt < 120000) { return; }
        if (!H.ha().token || !ha.connected) { musRender(); return; }
        mus.loading = true;
        var gen = ++mus.gen;
        if (!mus.loadedAt) { musRender(); }
        (mus.dirs ? Promise.resolve() : musLoadDirs()).then(function () {
            if (gen !== mus.gen) { return null; }
            if (!mus.path.length) { mus.path = [{ id: musRootId(), title: musRootTitle() }]; }
            return musBrowse(mus.path[mus.path.length - 1].id);
        }).then(function (res) {
            if (gen !== mus.gen || !res) { return; }
            mus.loading = false;
            mus.error = '';
            mus.loadedAt = Date.now();
            musSetItems(res);
            var arrived = page === P_MUS && String(sel[P_MUS] || '').indexOf('edge:') === 0 && !selBeforeEdge[P_MUS];
            if (arrived) { sel[P_MUS] = 'mus'; }
            if (page === P_MUS) { unpark(); }
            musRender();
            if (arrived || page === P_MUS) { applyFocus(); }
        }, function (e) {
            if (gen !== mus.gen) { return; }
            mus.loading = false;
            if (mus.path.length > 1) {          // a folder that went away: back to the music folder
                mus.path = mus.path.slice(0, 1);
                musLoad(true);
                return;
            }
            mus.loadedAt = 0;
            mus.items = [];
            mus.playable = [];
            mus.error = 'Couldn\'t open ' + musRootTitle() + ' on Home Assistant (' + e.message + '). Put your songs in /media/Music, ' +
                'or pick another folder in Settings > Music folder.';
            musRender();
        });
    }

    function musSetItems(res) {
        var dirs = [], tracks = [], art = '', here = res.media_content_id;
        each(res.children || [], function (c) {
            if (c.can_expand) {
                dirs.push({ kind: 'dir', id: c.media_content_id, file: c.title });
            } else if (c.can_play && (c.media_class === 'music' || /^audio\//i.test(c.media_content_type || ''))) {
                tracks.push({ kind: 'track', id: c.media_content_id, file: c.title, mime: c.media_content_type || '', dir: here });
            } else if (!art && c.media_class === 'image' && MUS_ART.test(c.title || '')) {
                art = c.media_content_id;
            }
        });
        function byName(a, b) { var x = musSortKey(a.file), y = musSortKey(b.file); return x < y ? -1 : x > y ? 1 : 0; }
        dirs.sort(byName);
        tracks.sort(byName);
        var playable = [];
        each(tracks, function (t) { t.ok = musCanPlay(t.mime); if (t.ok) { playable.push(t); } });
        if (art) { mus.dirArt[here] = art; } else { delete mus.dirArt[here]; }
        mus.items = dirs.concat(tracks);
        mus.playable = playable;
        if (mus.cameFrom) {
            each(mus.items, function (it, i) { if (it.id === mus.cameFrom) { mus.f = { z: 'item', i: i, c: 0 }; } });
            mus.cameFrom = '';
        }
        musFix();
    }

    // ---------------------------------------------------- names

    // "03 - Artist - Song Title.mp3" -> { title: "Song Title", artist: "Artist" }. A number is a track
    // number only with a separator after it or a leading zero, so "12 Days of Christmas" stays whole.
    function musParseName(file) {
        var s = String(file || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
        var m = /^(?:\d{1,3}\s*[-.)]\s*|0\d\s+)(.+)$/.exec(s);
        if (m) { s = m[1]; }
        var parts = s.split(' - ');
        if (parts.length > 1 && parts[0] && parts.slice(1).join(' - ')) {
            return { title: parts.slice(1).join(' - '), artist: parts[0] };
        }
        return { title: s || String(file || ''), artist: '' };
    }

    function musInfo(t) {
        var g = musNames[t.id], p = musParseName(t.file);
        return { title: (g && g.t) || p.title, artist: (g && g.a) || p.artist, album: (g && g.b) || '' };
    }

    function musClock(s) {
        s = Math.max(0, Math.floor(s || 0));
        var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
        return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60);
    }

    // Names and lengths are kept on the TV, at most MUS_KEEP of each.
    function musPersistSoon() {
        if (mus.persistTimer) { return; }
        mus.persistTimer = setTimeout(function () {
            mus.persistTimer = null;
            each([musNames, musDurs], function (o) {
                var k = keys(o);
                for (var i = 0; i < k.length - MUS_KEEP; i++) { delete o[k[i]]; }
            });
            H.set('musNames', musNames);
            H.set('musDurs', musDurs);
        }, 5000);
    }

    // ---------------------------------------------------- MP3 tags (ID3v2.2 to 2.4)
    //
    // Only the start of the file is fetched, with a Range request: 64 KB first, then the whole tag
    // if a large cover picture doesn't fit (up to 3 MB). Anything unexpected means "no tags".

    function musRange(url, from, to) {
        return new Promise(function (ok, bad) {
            var x = new XMLHttpRequest();
            try {
                x.open('GET', url, true);
                x.responseType = 'arraybuffer';
                x.timeout = 10000;
                x.setRequestHeader('Range', 'bytes=' + from + '-' + to);
                x.onload = function () {
                    if ((x.status === 206 || x.status === 200) && x.response) { ok(new Uint8Array(x.response)); }
                    else { bad(new Error('HTTP ' + x.status)); }
                };
                x.onerror = function () { bad(new Error('not reachable')); };
                x.ontimeout = function () { bad(new Error('timed out')); };
                x.send();
            } catch (e) {
                bad(e);
            }
        });
    }

    function musSyncsafe(b, i) { return ((b[i] & 0x7f) << 21) | ((b[i + 1] & 0x7f) << 14) | ((b[i + 2] & 0x7f) << 7) | (b[i + 3] & 0x7f); }
    function musBe32(b, i) { return ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]; }

    // Bytes the tag takes at the start of the file, header included; 0 without one.
    function musId3Size(b) {
        if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33 || b[3] < 2 || b[3] > 4) { return 0; }
        return 10 + musSyncsafe(b, 6) + (b[5] & 0x10 ? 10 : 0);
    }

    function musUnsync(b) {                 // 0xFF 0x00 was written for every 0xFF
        var out = new Uint8Array(b.length), n = 0, i;
        for (i = 0; i < b.length; i++) { out[n++] = b[i]; if (b[i] === 0xff && b[i + 1] === 0x00) { i++; } }
        return out.subarray(0, n);
    }

    function musLatin1(b) {
        var s = '', i;
        for (i = 0; i < b.length; i++) { s += String.fromCharCode(b[i]); }
        return s;
    }

    // ID3 text: 0 = ISO-8859-1, 1 = UTF-16 with BOM, 2 = UTF-16BE, 3 = UTF-8. The first value only.
    function musDecode(b, enc) {
        var s = '', i, le = false;
        if (enc === 1 || enc === 2) {
            i = 0;
            if (enc === 1 && b.length > 1) {
                if (b[0] === 0xff && b[1] === 0xfe) { le = true; i = 2; } else if (b[0] === 0xfe && b[1] === 0xff) { i = 2; }
            }
            for (; i + 1 < b.length; i += 2) {
                var c = le ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1];
                if (!c) { break; }
                s += String.fromCharCode(c);
            }
        } else {
            var end = 0;
            while (end < b.length && b[end]) { end++; }
            s = musLatin1(b.subarray(0, end));
            if (enc === 3) { try { s = decodeURIComponent(escape(s)); } catch (e) { /* not valid UTF-8: keep the bytes */ } }
        }
        return s.replace(/^\s+|\s+$/g, '');
    }

    function musFrame(id, d, out) {
        var key = { TIT2: 't', TT2: 't', TPE1: 'a', TP1: 'a', TPE2: 'aa', TP2: 'aa', TALB: 'b', TAL: 'b' }[id];
        if (key) {
            if (!out[key] && d.length > 1) { out[key] = musDecode(d.subarray(1), d[0]); }
            return;
        }
        if ((id !== 'APIC' && id !== 'PIC') || d.length < 8) { return; }
        var enc = d[0], p = 1, mime, q;
        if (id === 'PIC') {
            mime = musLatin1(d.subarray(1, 4)).toLowerCase();
            p = 4;
        } else {
            q = 1;
            while (q < d.length && d[q]) { q++; }
            mime = musLatin1(d.subarray(1, q)).toLowerCase();
            p = q + 1;
        }
        if (mime.indexOf('/') < 0) { mime = 'image/' + mime; }
        mime = mime.replace('/jpg', '/jpeg');
        var type = d[p];
        p++;
        q = p;
        if (enc === 1 || enc === 2) { while (q + 1 < d.length && (d[q] || d[q + 1])) { q += 2; } q += 2; }
        else { while (q < d.length && d[q]) { q++; } q++; }
        if (q >= d.length || !/^image\/(jpeg|png|gif|webp|bmp)$/.test(mime)) { return; }
        if (out.pic && (out.pic.type === 3 || type !== 3)) { return; }      // the front cover wins
        out.pic = { mime: mime, type: type, data: d.subarray(q) };
    }

    function musId3(all) {
        var size = musId3Size(all);
        if (!size) { return null; }
        var ver = all[3], flags = all[5], b = all.subarray(10, Math.min(all.length, size)), i = 0, out = {};
        if (ver < 4 && (flags & 0x80)) { b = musUnsync(b); }
        if (ver > 2 && (flags & 0x40) && b.length > 4) { i = ver === 3 ? 4 + musBe32(b, 0) : musSyncsafe(b, 0); }
        var idLen = ver === 2 ? 3 : 4, hdr = ver === 2 ? 6 : 10;
        while (i + hdr <= b.length) {
            var id = musLatin1(b.subarray(i, i + idLen));
            if (!/^[A-Z0-9]+$/.test(id)) { break; }                      // padding
            var len = ver === 2 ? (b[i + 3] << 16) | (b[i + 4] << 8) | b[i + 5] : ver === 4 ? musSyncsafe(b, i + 4) : musBe32(b, i + 4);
            var ff = ver === 2 ? 0 : b[i + 9], start = i + hdr, end = start + len;
            if (end > b.length) { break; }                               // cut off: the rest wasn't fetched
            var d = b.subarray(start, end);
            var skip = ver === 3 ? (ff & 0xc0) : ver === 4 ? (ff & 0x0c) : 0;   // compressed or encrypted
            if (ver === 4 && (ff & 0x40)) { d = d.subarray(1); }               // group byte
            if (ver === 4 && (ff & 0x01)) { d = d.subarray(4); }               // data length
            if (ver === 4 && (ff & 0x02)) { d = musUnsync(d); }
            if (!skip && d.length) { musFrame(id, d, out); }
            i = end;
        }
        if (!out.a && out.aa) { out.a = out.aa; }
        delete out.aa;
        return out;
    }

    // Tags for a song: its names are kept for the list, its cover becomes a blob URL. At most 6
    // covers are held; older ones are let go.
    function musTags(t) {
        if (!t || mus.tags[t.id]) { return; }
        mus.tags[t.id] = { art: '', done: false };
        mus.tagOrder.push(t.id);
        while (mus.tagOrder.length > 6) {
            var old = mus.tagOrder.shift(), cur = musCur();
            if (cur && cur.id === old) { mus.tagOrder.push(old); break; }
            if (mus.tags[old] && mus.tags[old].art) { try { URL.revokeObjectURL(mus.tags[old].art); } catch (e) { /* gone */ } }
            delete mus.tags[old];
        }
        function done(tag) {
            var slot = mus.tags[t.id];
            if (!slot) { return; }
            slot.done = true;
            if (tag && (tag.t || tag.a || tag.b)) {
                musNames[t.id] = { t: tag.t || '', a: tag.a || '', b: tag.b || '' };
                musPersistSoon();
            }
            if (tag && tag.pic) {
                try { slot.art = URL.createObjectURL(new Blob([tag.pic.data], { type: tag.pic.mime })); } catch (e) { slot.art = ''; }
            }
            var c = musCur();
            if (c && c.id === t.id) { musArt(); musRenderNow(); musMini(); }
            musRenderList();
        }
        if (!/mpeg|mp3/i.test(t.mime || '')) { done(null); return; }
        musResolve(t.id).then(function (url) {
            return musRange(url, 0, 65535).then(function (b) {
                var need = musId3Size(b);
                if (!need || need <= b.length || need > 3 * 1048576) { return b; }
                return musRange(url, 0, need - 1).then(null, function () { return b; });
            });
        }).then(function (b) { done(musId3(b)); }, function () { done(null); });
    }

    // The card's picture: the song's own cover, else cover.jpg / folder.jpg in its folder.
    function musArt() {
        var t = musCur(), want = '', tag = t && mus.tags[t.id];
        if (tag && tag.art) { want = tag.art; }
        if (want || !t || !mus.dirArt[t.dir]) { musShowArt(t ? t.id : '', want); return; }
        if (tag && !tag.done) { return; }                          // the song's own cover may still come
        musResolve(mus.dirArt[t.dir]).then(function (url) {
            var c = musCur();
            if (c && c.id === t.id && !(mus.tags[t.id] && mus.tags[t.id].art)) { musShowArt(t.id, url); }
        }, function () { /* no picture */ });
    }

    function musShowArt(id, url) {
        mus.art = { id: id, url: url };
        var el = $('musArt');
        if (!el) { return; }
        el.style.backgroundImage = url ? 'url("' + url + '")' : '';
        el.className = url ? 'pic' : '';
    }

    // ---------------------------------------------------- playing

    function musCur() { return mus.qi >= 0 && mus.qi < mus.order.length ? mus.queue[mus.order[mus.qi]] || null : null; }

    function musShuffled(n, first) {
        var o = [], i, j, x;
        for (i = 0; i < n; i++) { if (i !== first) { o.push(i); } }
        for (i = o.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); x = o[i]; o[i] = o[j]; o[j] = x; }
        if (first >= 0) { o.unshift(first); }
        return o;
    }

    function musLinear(n) { var o = []; for (var i = 0; i < n; i++) { o.push(i); } return o; }

    // start: index in the playable songs of this folder, -1 = any (shuffled) or the first
    function musPlayFolder(start, shuffle) {
        if (!mus.playable.length) { return; }
        if (shuffle !== undefined && cfg.musShuffle !== shuffle) { cfg.musShuffle = shuffle; save('musShuffle'); }
        mus.queue = mus.playable.slice(0);
        var n = mus.queue.length;
        if (cfg.musShuffle) {
            mus.order = musShuffled(n, start >= 0 ? start : Math.floor(Math.random() * n));
            mus.qi = 0;
        } else {
            mus.order = musLinear(n);
            mus.qi = Math.max(0, start);
        }
        mus.fails = 0;
        musStart(0);
    }

    function musStart(at) {
        var t = musCur(), tok = ++mus.tok, a = $('musAudio');
        if (!t) { musStop(); return; }
        mus.active = true;
        mus.held = null;
        mus.playing = true;
        mus.buffering = true;
        mus.pos = at || 0;
        mus.startAt = at || 0;
        mus.dur = musDurs[t.id] || 0;
        mus.lastSec = -1;
        musAwake(true);
        musShowArt(t.id, '');
        musTags(t);
        musArt();
        musRenderNow();
        musRenderList();
        musMini();
        musSave();
        musResolve(t.id).then(function (url) {
            if (tok !== mus.tok) { return; }
            a.src = url;
            musPlayEl();
        }, function (e) {
            if (tok === mus.tok) { musFail(e.message); }
        });
    }

    function musPlayEl() {
        var a = $('musAudio'), tok = mus.tok, p;
        try { p = a.play(); } catch (e) { musFail(e.message || String(e)); return; }
        if (p && p.then) {
            p.then(null, function (e) {
                if (tok !== mus.tok || (e && e.name === 'AbortError')) { return; }
                if (e && e.name === 'NotAllowedError') {               // a desktop browser wants a key press first
                    mus.playing = false;
                    musAwake(false);
                    musRenderNow();
                    musMini();
                    toast('Press Play to start the music', 4000);
                    return;
                }
                musFail((e && (e.message || e.name)) || 'play refused');
            });
        }
    }

    // Lets go of the file, so the TV's decoder is free for a camera or a film.
    function musRelease() {
        var a = $('musAudio');
        try { a.pause(); } catch (e) { /* not playing */ }
        if (a.getAttribute('src')) {
            a.removeAttribute('src');
            try { a.load(); } catch (e) { /* nothing loaded */ }
        }
    }

    function musToggle() {
        if (!mus.active) { musResume(); return; }
        if (mus.held && mus.held !== 'hidden') { return; }
        if (mus.held) { mus.held = null; }
        var a = $('musAudio');
        if (mus.playing) {
            mus.pos = a.currentTime || mus.pos;
            try { a.pause(); } catch (e) { /* already */ }
            mus.playing = false;
            musAwake(false);
            musSave();
        } else if (a.getAttribute('src')) {
            mus.playing = true;
            musAwake(true);
            musPlayEl();
        } else {
            musStart(mus.pos);
            return;
        }
        musRenderNow();
        musRenderList();
        musMini();
    }

    // manual: Next on the remote or the card, which wraps even with Repeat off
    function musNext(manual) {
        if (!mus.active) { return; }
        var n = mus.order.length;
        if (mus.qi < n - 1) {
            mus.qi++;
        } else if (cfg.musRepeat === 'off' && !manual) {
            mus.qi = 0;                              // the end: back to the first song, waiting
            mus.pos = 0;
            mus.tok++;
            musRelease();
            mus.playing = false;
            musAwake(false);
            musSave();
            musRenderNow();
            musRenderList();
            musMini();
            return;
        } else {
            if (cfg.musShuffle && n > 2) {           // a new order for the next round, not starting with the song just heard
                var last = mus.order[mus.qi];
                do { mus.order = musShuffled(n, -1); } while (mus.order[0] === last);
            }
            mus.qi = 0;
        }
        musStart(0);
    }

    function musPrev() {
        if (!mus.active) { return; }
        var a = $('musAudio');
        if ((a.currentTime || mus.pos) > 4 && a.getAttribute('src')) {
            try { a.currentTime = 0; } catch (e) { /* not seekable */ }
            mus.pos = 0;
            if (!mus.playing) { musToggle(); }
            return;
        }
        mus.qi = mus.qi > 0 ? mus.qi - 1 : mus.order.length - 1;
        musStart(0);
    }

    function musEnded() {
        if (cfg.musRepeat === 'one') { musStart(0); } else { musNext(false); }
    }

    // Stop ends the session; Resume (or Play on the remote) picks it up again.
    function musStop() {
        if (mus.active) { mus.pos = $('musAudio').currentTime || mus.pos; musSave(); }
        mus.tok++;
        musRelease();
        mus.active = false;
        mus.playing = false;
        mus.buffering = false;
        mus.held = null;
        musAwake(false);
        musShowArt('', '');
        musFix();
        musRenderNow();
        musRenderList();
        musMini();
        applyFocus();
    }

    function musFail(msg) {
        var t = musCur(), title = t ? musInfo(t).title : 'this song';
        H.set('musLast', { at: Date.now(), title: title, error: msg });
        mus.fails++;
        if (mus.fails >= mus.order.length) {
            musStop();
            toast('The music stopped: ' + title + ' wouldn\'t play (' + msg + ')', 7000);
            return;
        }
        toast('Skipped ' + title + ': ' + msg, 5000);
        musNext(true);
    }

    function musSetShuffle(on) {
        cfg.musShuffle = on;
        save('musShuffle');
        if (mus.active && mus.order.length > 1) {
            var cur = mus.order[mus.qi];
            if (on) { mus.order = musShuffled(mus.order.length, cur); mus.qi = 0; }
            else { mus.order = musLinear(mus.queue.length); mus.qi = cur; }
            musSave();
        }
        musRenderNow();
    }

    function musCycleRepeat() {
        var o = ['all', 'one', 'off'];
        cfg.musRepeat = o[(o.indexOf(cfg.musRepeat) + 1) % o.length];
        save('musRepeat');
        musRenderNow();
    }

    // A camera, a film or leaving Haven: the file is let go and the spot remembered.
    function musHold(reason) {
        if (!mus.active) { return; }
        if (!mus.held) { mus.resumeAfterHold = mus.playing; }
        mus.held = reason;
        var a = $('musAudio');
        if (a.getAttribute('src')) { mus.pos = a.currentTime || mus.pos; }
        mus.tok++;
        musRelease();
        mus.playing = false;
        mus.buffering = false;
        musAwake(false);
        musSave();
        musRenderNow();
        musRenderList();
        musMini();
    }

    // play: carry on if it was playing (after a camera or a film); after leaving Haven it waits for Play.
    function musUnhold(reason, play) {
        if (!mus.active || mus.held !== reason) { return; }
        if (play && mus.resumeAfterHold) { musStart(mus.pos); return; }
        mus.held = null;
        musRenderNow();
        musMini();
    }

    // The shell applies a downloaded design update after 20 s without a key press, which would cut
    // the music off. While it plays, Haven tells the shell it's in use, as during a film.
    function musAwake(on) {
        clearInterval(mus.awake);
        mus.awake = null;
        if (!on) { return; }
        mus.awake = setInterval(function () {
            try {
                var ev = document.createEvent('Event');
                ev.initEvent('keydown', true, true);
                document.dispatchEvent(ev);
            } catch (e) { /* nothing to do */ }
        }, 10000);
    }

    function musSave() {
        var t = musCur();
        if (!t) { return; }
        var q = mus.queue, order = mus.order, qi = mus.qi;
        if (q.length > MUS_KEEP) {                   // a very long queue: the songs from here on
            q = [];
            for (var i = qi; i < order.length && q.length < MUS_KEEP; i++) { q.push(mus.queue[order[i]]); }
            order = musLinear(q.length);
            qi = 0;
        }
        var inf = musInfo(t), list = [];
        each(q, function (s) { list.push({ id: s.id, file: s.file, mime: s.mime, dir: s.dir }); });
        musSaved = { at: Date.now(), queue: list, order: order, qi: qi, pos: Math.floor(mus.pos || 0), title: inf.title, artist: inf.artist };
        mus.savedAt = Date.now();
        H.set('musState', musSaved);
    }

    function musResume() {
        var s = musSaved;
        if (!s || !s.queue || !s.queue.length) { return; }
        mus.queue = [];
        each(s.queue, function (t) { mus.queue.push({ kind: 'track', id: t.id, file: t.file, mime: t.mime, dir: t.dir, ok: musCanPlay(t.mime) }); });
        var n = mus.queue.length;
        mus.order = s.order && s.order.length === n ? s.order.slice(0) : musLinear(n);
        mus.qi = s.qi >= 0 && s.qi < n ? s.qi : 0;
        mus.fails = 0;
        musStart(s.pos || 0);
        applyFocus();
    }

    function musTick() {
        var a = $('musAudio');
        if (mus.held || !a.getAttribute('src')) { return; }
        mus.pos = a.currentTime || 0;
        var sec = Math.floor(mus.pos);
        if (sec === mus.lastSec) { return; }
        mus.lastSec = sec;
        var pct = mus.dur > 0 ? Math.min(100, mus.pos / mus.dur * 100) : 0;
        var fill = $('musFill');
        if (fill) { fill.style.width = pct + '%'; }
        var p = $('musPos');
        if (p) { p.textContent = musClock(mus.pos); }
        $('musMiniFill').style.width = pct + '%';
        if (mus.playing && Date.now() - mus.savedAt > 15000) { musSave(); }
    }

    function musInit() {
        var a = $('musAudio');
        a.preload = 'auto';
        a.addEventListener('loadedmetadata', function () {
            var t = musCur();
            if (mus.startAt > 1) { try { a.currentTime = mus.startAt; } catch (e) { /* from the start */ } }
            mus.startAt = 0;
            if (t && isFinite(a.duration) && a.duration > 0) {
                mus.dur = a.duration;
                if (musDurs[t.id] !== Math.round(a.duration)) { musDurs[t.id] = Math.round(a.duration); musPersistSoon(); }
                var d = $('musDur');
                if (d) { d.textContent = musClock(mus.dur); }
            }
        });
        a.addEventListener('playing', function () {
            if (!a.getAttribute('src')) { return; }
            mus.buffering = false;
            mus.fails = 0;
            musRenderNow();
            var n = mus.qi + 1 < mus.order.length ? mus.queue[mus.order[mus.qi + 1]] : null;
            if (n) { musResolve(n.id).then(function () { musTags(n); }, function () { /* tried again when it's on */ }); }
        });
        a.addEventListener('waiting', function () {
            if (!a.getAttribute('src') || mus.buffering) { return; }
            mus.buffering = true;
            musRenderNow();
        });
        a.addEventListener('timeupdate', musTick);
        a.addEventListener('ended', function () { if (a.getAttribute('src')) { musEnded(); } });
        a.addEventListener('error', function () {
            if (!a.getAttribute('src') || !mus.active || mus.held) { return; }
            var code = a.error ? a.error.code : 0;
            musFail(code === 4 ? 'the file is missing, or this TV can\'t play it' : code === 2 ? 'network error' : code === 3 ? 'the file is damaged' : 'player error ' + code);
        });
        musDirOptions();
        musMini();
    }

    // ---------------------------------------------------- remote

    // Media keys on every page (not in the film or camera player, which use their own).
    function musMediaKey(k) {
        var pp = k === KEY.PLAYPAUSE || (k === KEY.SPACE && !H.isTV);
        if (!(pp || k === KEY.PLAY || k === KEY.PAUSE || k === KEY.STOP || k === KEY.FF || k === KEY.RW)) { return false; }
        if (!mus.active) {
            if ((pp || k === KEY.PLAY) && musSaved && screenOn(P_MUS)) { musResume(); return true; }
            return false;
        }
        if (pp) { musToggle(); }
        else if (k === KEY.PLAY) { if (!mus.playing) { musToggle(); } }
        else if (k === KEY.PAUSE) { if (mus.playing) { musToggle(); } }
        else if (k === KEY.STOP) { musStop(); }
        else if (k === KEY.FF) { musNext(true); }
        else if (k === KEY.RW) { musPrev(); }
        return true;
    }

    // Focus on the page: the card's buttons ('ctl'), Play all / Shuffle ('act'), or a row of the list ('item').
    function musCtl() {
        if (mus.active) { return ['prev', 'pp', 'next', 'shuffle', 'repeat']; }
        return musSaved && musSaved.queue && musSaved.queue.length ? ['resume'] : [];
    }

    function musZones() {
        var z = [];
        if (musCtl().length) { z.push('ctl'); }
        if (mus.playable.length) { z.push('act'); }
        return z;
    }

    function musHasFocus() { return musZones().length > 0 || mus.items.length > 0; }

    function musFix() {
        var zones = musZones(), f = mus.f;
        if (!f) {      // arriving: Play / Pause, else Resume, else Play all, else the first row
            f = mus.f = { z: zones.length ? zones[0] : 'item', i: 0, c: mus.active ? 1 : 0 };
        }
        if (f.z === 'item' && !mus.items.length) { f.z = zones[zones.length - 1] || 'item'; }
        if (f.z !== 'item' && zones.indexOf(f.z) < 0) { f.z = mus.items.length ? 'item' : zones[0] || 'item'; }
        f.i = Math.max(0, Math.min(f.i, mus.items.length - 1));
        var n = f.z === 'ctl' ? musCtl().length : f.z === 'act' ? 2 : 1;
        f.c = Math.max(0, Math.min(f.c, n - 1));
    }

    function musMoveV(dir) {
        var zones = musZones(), f = mus.f;
        if (f.z === 'item') {
            if (dir > 0) { if (f.i < mus.items.length - 1) { f.i++; } }
            else if (f.i > 0) { f.i--; }
            else if (zones.length) { f.z = zones[zones.length - 1]; f.c = f.z === 'ctl' && mus.active ? 1 : 0; }
            else { toTabs(); return; }
        } else {
            var at = zones.indexOf(f.z) + dir;
            if (at < 0) { toTabs(); return; }
            if (at >= zones.length) {
                if (!mus.items.length) { return; }
                f.z = 'item';
            } else {
                f.z = zones[at];
                f.c = f.z === 'ctl' && mus.active ? 1 : 0;
            }
        }
        musScroll();
        applyFocus();
    }

    function musMoveH(dir) {
        var f = mus.f, n = f.z === 'ctl' ? musCtl().length : f.z === 'act' ? 2 : 0;
        if (f.z === 'item' || (dir < 0 && f.c === 0) || (dir > 0 && f.c >= n - 1)) { toEdge(dir < 0 ? 'l' : 'r'); return; }
        f.c += dir;
        applyFocus();
    }

    function musOk() {
        var f = mus.f;
        if (f.z === 'ctl') {
            var b = musCtl()[f.c];
            if (b === 'prev') { musPrev(); }
            else if (b === 'pp') { musToggle(); }
            else if (b === 'next') { musNext(true); }
            else if (b === 'shuffle') { musSetShuffle(!cfg.musShuffle); }
            else if (b === 'repeat') { musCycleRepeat(); }
            else if (b === 'resume') { musResume(); f.c = 1; }
        } else if (f.z === 'act') {
            musPlayFolder(-1, f.c === 1);            // Play all: in order; Shuffle all: shuffled
            f.z = 'ctl';                             // the card's buttons come next
            f.c = 1;
        } else {
            var it = mus.items[f.i];
            if (!it) { return; }
            if (it.kind === 'dir') { musOpen(it); return; }
            if (!it.ok) { toast('This TV can\'t play ' + (it.mime || 'this kind of file') + ' files.', 4000); return; }
            musPlayFolder(mus.playable.indexOf(it));
        }
        musFix();
        applyFocus();
    }

    function musOpen(dir) {
        mus.path.push({ id: dir.id, title: dir.file });
        mus.f = { z: 'item', i: 0, c: 0 };
        mus.scrollY = 0;
        mus.gen++;
        mus.loading = false;
        mus.items = [];
        mus.playable = [];
        mus.loadedAt = 0;
        musLoad(true);
    }

    // Back in a folder: up one level, with the focus on the folder you were in.
    function musUp() {
        var from = mus.path.pop();
        mus.gen++;
        mus.loading = false;
        mus.loadedAt = 0;
        mus.items = [];
        mus.playable = [];
        mus.f = { z: 'item', i: 0, c: 0 };
        mus.cameFrom = from ? from.id : '';
        mus.scrollY = 0;
        musLoad(true);
    }

    function onMusKey(k) {
        if (!musHasFocus()) {
            if (k === KEY.LEFT) { toEdge('l'); return true; }
            if (k === KEY.RIGHT) { toEdge('r'); return true; }
            if (k === KEY.UP) { toTabs(); return true; }
            if (isBack(k)) { if (mus.path.length > 1) { musUp(); } else { showPage(startPage()); } return true; }
            return k === KEY.DOWN || k === KEY.ENTER;
        }
        musFix();
        var f = mus.f;
        if (k === KEY.UP) { musMoveV(-1); }
        else if (k === KEY.DOWN) { musMoveV(1); }
        else if (k === KEY.LEFT) { musMoveH(-1); }
        else if (k === KEY.RIGHT) { musMoveH(1); }
        else if (k === KEY.ENTER) { musOk(); }
        else if (k === KEY.CH_UP || k === KEY.PAGE_UP || k === KEY.CH_DOWN || k === KEY.PAGE_DOWN) {
            if (!mus.items.length) { return true; }
            var dir = k === KEY.CH_UP || k === KEY.PAGE_UP ? 1 : -1;
            if (f.z !== 'item') { if (dir > 0) { f.z = 'item'; f.i = 0; } }
            else { f.i = Math.max(0, Math.min(mus.items.length - 1, f.i + dir * MUS_PAGE_ROWS)); }
            musScroll();
            applyFocus();
        } else if (isBack(k)) {
            if (mus.path.length > 1) { musUp(); } else { showPage(startPage()); }
        } else { return false; }
        return true;
    }

    // ---------------------------------------------------- on screen

    function musRender() {
        var area = $('musArea');
        if (!area) { return; }
        var msg = '';
        if (!H.ha().token) { msg = 'Add a long-lived access token to shell-config.js (see the README) to play music from Home Assistant.'; }
        else if (!ha.connected && !mus.loadedAt) { msg = ha.authFailed ? 'Home Assistant rejected the token.' : 'Connecting to Home Assistant...'; }
        else if (mus.error) { msg = mus.error; }
        else if (!mus.loadedAt) { msg = 'Loading your music...'; }
        else if (!mus.items.length) {
            msg = 'No songs in ' + (mus.path.length ? mus.path[mus.path.length - 1].title : musRootTitle()) + ' yet. Copy MP3s to the media folder on Home Assistant ' +
                '(/media/Music, the "media" folder on the Samba share).';
        }
        area.innerHTML =
            '<div id="musNow"><div id="musArt">' + MUS_ICON.note + '</div><div class="minfo">' +
                '<div class="mkick" id="musKick"></div><div class="mtitle" id="musTitle"></div><div class="msub" id="musSub"></div>' +
                '<div class="mbar" id="musBar"><b id="musFill"></b></div><div class="mtimes" id="musTimes"><span id="musPos"></span><span id="musDur"></span></div>' +
                '<div class="mctl" id="musCtl"></div></div></div>' +
            '<div id="musHead"><h3 id="musPath"></h3><div class="mact" id="musAct"></div></div>' +
            '<div id="musList"><div id="musTrack"></div></div>' +
            (msg ? '<div class="empty">' + esc(msg) + '</div>' : '');
        if (mus.art.url) { musShowArt(mus.art.id, mus.art.url); }
        musRenderNow();
        musRenderHead();
        musScroll();
    }

    function musFocusOn() { return page === P_MUS && sel[P_MUS] === 'mus' && tabFocus === null && mode === 'dock'; }

    function musBtn(b, focused) {
        var cls = 'mbtn', inner;
        if (b === 'prev' || b === 'next') { cls += ' round'; inner = MUS_ICON[b]; }
        else if (b === 'pp') { cls += ' round big'; inner = mus.playing ? MUS_ICON.pause : MUS_ICON.play; }
        else if (b === 'shuffle') { cls += ' chip' + (cfg.musShuffle ? ' on' : ''); inner = 'Shuffle'; }
        else if (b === 'repeat') { cls += ' chip' + (cfg.musRepeat !== 'off' ? ' on' : ''); inner = cfg.musRepeat === 'one' ? 'Repeat one' : cfg.musRepeat === 'all' ? 'Repeat all' : 'Repeat off'; }
        else { cls += ' chip wide'; inner = MUS_ICON.play + '<span>Resume</span>'; }
        return '<span class="' + cls + (focused ? ' focused' : '') + '">' + inner + '</span>';
    }

    function musRenderNow() {
        var kick = $('musKick');
        if (!kick) { return; }
        var t = musCur(), on = musFocusOn() && mus.f && mus.f.z === 'ctl', html = '', title, sub, k;
        if (mus.active && t) {
            var inf = musInfo(t);
            k = mus.held ? MUS_HELD[mus.held] : mus.buffering && mus.playing ? 'Loading...' : mus.playing ? 'Now playing' : 'Paused';
            title = inf.title;
            sub = [inf.artist, inf.album].join(' · ').replace(/^ · | · $/g, '');
            if (mus.order.length > 1) { sub += (sub ? '   ' : '') + (mus.qi + 1) + ' of ' + mus.order.length; }
        } else if (musSaved && musSaved.queue && musSaved.queue.length) {
            k = 'Last played';
            title = musSaved.title || 'Your last song';
            sub = (musSaved.artist ? musSaved.artist + '   ' : '') + 'Resume where you left off, or pick a song below';
        } else {
            k = 'Music';
            title = 'Nothing playing';
            sub = mus.playable.length ? 'Pick a song below, or Play all' : '';
        }
        kick.textContent = k;
        $('musTitle').textContent = title;
        $('musSub').textContent = sub;
        var live = mus.active && !!t;
        $('musBar').style.visibility = live ? 'visible' : 'hidden';
        $('musTimes').style.visibility = live ? 'visible' : 'hidden';
        if (live) {
            $('musFill').style.width = (mus.dur > 0 ? Math.min(100, mus.pos / mus.dur * 100) : 0) + '%';
            $('musPos').textContent = musClock(mus.pos);
            $('musDur').textContent = mus.dur ? musClock(mus.dur) : '';
        }
        each(musCtl(), function (b, i) {
            if (b === 'shuffle') { html += '<span class="sep"></span>'; }
            html += musBtn(b, on && mus.f.c === i);
        });
        $('musCtl').innerHTML = html;
        if (!live && !mus.art.url) { musShowArt('', ''); }
    }

    function musRenderHead() {
        var p = $('musPath');
        if (!p) { return; }
        var names = [];
        each(mus.path.length ? mus.path : [{ title: musRootTitle() }], function (x) { names.push(esc(x.title)); });
        var dirs = mus.items.length - mus.items.filter(function (it) { return it.kind === 'track'; }).length, songs = mus.items.length - dirs;
        var count = [];
        if (songs) { count.push(songs + (songs === 1 ? ' song' : ' songs')); }
        if (dirs) { count.push(dirs + (dirs === 1 ? ' folder' : ' folders')); }
        p.innerHTML = names.join(' <i>&rsaquo;</i> ') + (count.length ? '<span>' + count.join(', ') + '</span>' : '');
        var on = musFocusOn() && mus.f && mus.f.z === 'act', html = '';
        if (mus.playable.length) {
            html = '<span class="mbtn chip wide' + (on && mus.f.c === 0 ? ' focused' : '') + '">' + MUS_ICON.play + '<span>Play all</span></span>' +
                '<span class="mbtn chip wide' + (on && mus.f.c === 1 ? ' focused' : '') + '">Shuffle all</span>';
        }
        $('musAct').innerHTML = html;
    }

    function musRowHtml(it, i, focused) {
        var cls = 'mrow' + (focused ? ' focused' : ''), n, t, a, d = '';
        if (it.kind === 'dir') {
            cls += ' dir';
            n = MUS_ICON.folder;
            t = esc(it.file);
            a = 'Folder';
        } else {
            var cur = musCur(), inf = musInfo(it);
            if (mus.active && cur && cur.id === it.id) {
                cls += ' cur';
                n = '<span class="eq' + (mus.playing && !mus.buffering ? '' : ' still') + '"><i></i><i></i><i></i></span>';
            } else {
                n = String(mus.playable.indexOf(it) + 1 || '');
            }
            if (!it.ok) { cls += ' no'; n = ''; }
            t = esc(inf.title);
            a = it.ok ? esc(inf.artist) : 'This TV can\'t play this file';
            d = musDurs[it.id] ? musClock(musDurs[it.id]) : '';
        }
        return '<div class="' + cls + '" style="top:' + (i * MUS_ROW_H) + 'px"><span class="n">' + n + '</span><span class="t">' + t +
            '</span><span class="a">' + a + '</span><span class="d">' + d + '</span></div>';
    }

    // Only the rows near the screen are in the page, so a big folder stays light on the TV.
    function musRenderList() {
        var track = $('musTrack');
        if (!track) { return; }
        var on = musFocusOn() && mus.f && mus.f.z === 'item';
        var first = Math.max(0, Math.floor(mus.scrollY / MUS_ROW_H) - 1);
        var last = Math.min(mus.items.length - 1, Math.ceil((mus.scrollY + MUS_LIST_H) / MUS_ROW_H) + 1), html = '';
        for (var i = first; i <= last; i++) { html += musRowHtml(mus.items[i], i, on && mus.f.i === i); }
        track.innerHTML = html;
        track.style.height = (mus.items.length * MUS_ROW_H) + 'px';
        track.style.transform = 'translate3d(0,' + (-mus.scrollY) + 'px,0)';
        var more = mus.items.length * MUS_ROW_H > mus.scrollY + MUS_LIST_H + 4;
        $('musList').className = (mus.scrollY > 0 ? 'fade-t' : '') + (more ? ' fade-b' : '');
    }

    function musScroll() {
        var f = mus.f;
        if (f && f.z === 'item') {
            var top = f.i * MUS_ROW_H;
            if (top < mus.scrollY) { mus.scrollY = top; }
            else if (top + MUS_ROW_H > mus.scrollY + MUS_LIST_H) { mus.scrollY = top + MUS_ROW_H - MUS_LIST_H; }
        }
        mus.scrollY = Math.max(0, Math.min(mus.scrollY, Math.max(0, mus.items.length * MUS_ROW_H - MUS_LIST_H)));
        musRenderList();
    }

    function musApplyFocus() {
        var on = musFocusOn();
        if (!on && !mus.focusShown) { return; }
        mus.focusShown = on;
        if (mus.f) { musFix(); }
        musRenderNow();
        musRenderHead();
        musRenderList();
    }

    // The small player at the top left, on every page but Music.
    function musMini() {
        var el = $('musMini');
        if (!el) { return; }
        var t = musCur(), show = mus.active && !!t && page !== P_MUS;
        el.hidden = !show;
        if (!show) { return; }
        var inf = musInfo(t);
        el.className = mus.playing && !mus.buffering ? '' : 'still';
        $('musMiniText').textContent = inf.title + (inf.artist ? ' · ' + inf.artist : '');
        $('musMiniFill').style.width = (mus.dur > 0 ? Math.min(100, mus.pos / mus.dur * 100) : 0) + '%';
    }

    function musOnConnect() {
        if (pos(P_MUS) >= 0 && (page === P_MUS || !mus.loadedAt)) { musLoad(true); }
        else if (!mus.dirs && mode === 'settings') { musLoadDirs().then(null, function () { /* tried again later */ }); }
    }

    function musStatus() {
        var parts = [screenOn(P_MUS) ? 'shown' : 'hidden (Settings > Screens)', musRootTitle()];
        if (mus.loadedAt) { parts.push(mus.playable.length + ' songs here'); }
        if (mus.error) { parts.push('problem: ' + mus.error); }
        var t = musCur();
        if (mus.active && t) { parts.push((mus.playing ? 'playing ' : 'paused at ') + musInfo(t).title); }
        parts.push('plays ' + musFormats());
        var l = H.get('musLast', null);
        if (l && l.error) { parts.push('last problem: ' + l.title + ', ' + l.error + ' (' + hhmm(new Date(l.at)) + ')'); }
        return parts.join(' · ');
    }

    // For checking from a browser console or the tests; signed links stay inside.
    window.HavenMusic = {
        state: function () {
            var t = musCur();
            return { active: mus.active, playing: mus.playing, held: mus.held, buffering: mus.buffering, pos: mus.pos, dur: mus.dur,
                     song: t ? musInfo(t) : null, index: mus.qi, queue: mus.order.length, shuffle: cfg.musShuffle, repeat: cfg.musRepeat,
                     folder: mus.path.length ? mus.path[mus.path.length - 1].title : '', items: mus.items.length, playable: mus.playable.length,
                     error: mus.error, focus: mus.f, art: !!mus.art.url, saved: !!musSaved };
        },
        formats: musFormats, parseName: musParseName, id3: musId3, browse: musBrowse, status: musStatus,
        tags: function (id) { return { names: musNames[id] || null, length: musDurs[id] || 0, cover: !!(mus.tags[id] && mus.tags[id].art) }; }
    };

    // ---------------------------------------------------- brightness
    //
    // CH + / CH - on a dimmable light: 10 % steps, down to 1 %, then off. The tile shows the
    // level as you press; HA gets one update 350 ms after the last press.

    var dim = { eid: null, pct: 0, timer: null, idle: null };

    function canDim(eid) {
        if (!eid) { return false; }
        if (runOf(eid)) { toast(runOf(eid).label + 's can\'t be dimmed'); return false; }
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

    // Scenes, scripts and buttons: always run, never switched off. No pretend state: Home Assistant's
    // own update moves the "Activated" time. While a press is on its way, more presses on the same
    // tile are ignored; the tile pulses so you see it landed.
    var runBusy = {}, ranUntil = {};

    function runEid(eid) {
        var r = runOf(eid), st = ha.states[eid];
        if (!ha.connected) { toast(ha.authFailed ? 'Home Assistant rejected the token' : 'Home Assistant is not connected'); return; }
        if (!st || st.state === 'unavailable') { toast(displayName(eid) + ' is unavailable'); return; }
        if (runBusy[eid]) { return; }
        runBusy[eid] = true;
        var started = Date.now();
        ranUntil[eid] = started + 1200;
        renderControls(!ha.connected);
        // the press-in goes on this element only, so a redraw when HA answers doesn't play it twice
        var el = document.querySelector('#ctlTrack .ctl[data-key="eid:' + eid + '"]');
        if (el) { el.className += ' press'; }
        setTimeout(function () { renderControls(!ha.connected); }, 1250);
        haSend('call_service', { domain: domainOf(eid), service: r.service, target: { entity_id: eid } }, function (ok, res, err) {
            setTimeout(function () { delete runBusy[eid]; }, Math.max(0, 600 - (Date.now() - started)));
            if (ok) { return; }
            delete ranUntil[eid];
            renderControls(!ha.connected);
            toast('Couldn\'t ' + r.verb + ' ' + displayName(eid) + ': ' + ((err && err.message) || 'error'), 4000);
        });
    }

    function toggleEid(eid) {
        if (!eid) { return; }
        if (runOf(eid)) { runEid(eid); return; }
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
        $('pickHint').innerHTML = 'OK to show or hide &middot; ' + (cfg.senLoc === 'controls' ? 'Sensors, lights, switches and scenes on Controls'
            : 'Sensors on Home, lights, switches and scenes on Controls') + ', cameras on Cameras &middot; Back to close';
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
                li.children[2].textContent = (kind === 'button' ? (runOf(eid) ? runOf(eid).label : isDimmable(eid) ? 'Dimmable light' : eid.indexOf('light.') === 0 ? 'Light' : 'Switch')
                    : kind === 'camera' ? 'Camera' : 'Sensor') + ' · ' + eid;
                li.children[3].textContent = runOf(eid) ? ctlState(eid) : kind === 'camera' ? (f.dim ? '–' : cap((ha.states[eid] || {}).state || ''))
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
    var dockSignature = '', dockSig0 = null;
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
        each(tiles, function (t, i) { setFocused(t, page === 0 && tabFocus === null && sel[0] === 'dock' && i === focus); });
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

    // Your apps in order (Settings is the gear in the toolbar). Rebuilt only when that list changes.
    function buildDock() {
        var items = [];
        each(dockApps(), function (entry) {
            var def = appDef(entry);
            items.push({ app: entry, label: def.name, glyph: def.glyph });
        });
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
        homeHtml = '';                                 // the sensor area changes size with the dock
        if (dockSig0 !== (items.length > 0)) { dockSig0 = items.length > 0; renderHome(!ha.connected); applyFocus(); }
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
                avObject($('player'));
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
        musHold('camera');
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
        musUnhold('camera', true);
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

    // ------------------------------------------------------------------ Settings > Screens
    //
    // Which screens you slide between, and their order. OK shows or hides one; Right picks it up,
    // Up / Down move it, OK drops it. Home is a screen like the others: hidden, the app dock goes
    // with it. The first screen shown is where Haven opens and where Back leads. At least one
    // screen stays on.

    var scr = { row: 0, moving: null };

    function openScreens() {
        mode = 'screens';
        scr.row = 0;
        scr.moving = null;
        $('settings').hidden = true;
        $('screens').hidden = false;
        renderScreens();
    }

    function closeScreens() {
        scr.moving = null;
        $('screens').hidden = true;
        $('settings').hidden = false;
        mode = 'settings';
        renderSettings();
    }

    function renderScreens() {
        var list = screensList(), html = '';
        each(list, function (p, i) {
            var note = p === startPage() ? 'opens first, Back leads here'
                : p === P_LIB && !jfSignedIn() ? 'appears once you sign in to Jellyfin'
                : p === P_HOME && !screenOn(p) ? 'hidden with its app dock'
                : p === P_MUS ? 'songs from Home Assistant\'s media folder' : '';
            html += '<li class="item' + (screenOn(p) ? ' checked' : '') + (scr.moving === p ? ' moving' : '') + (scr.row === i ? ' focused' : '') +
                '" data-screen="' + PAGE_KEYS[p] + '"><span class="box"></span><span class="name">' + PAGE_NAMES[p] + '</span>' +
                '<span class="where">' + note + '</span><span class="val">' + (scr.moving === p ? '↕ ' : '') + (i + 1) + '</span></li>';
        });
        $('scrList').innerHTML = html;
        $('scrHint').innerHTML = scr.moving !== null ? 'Up / Down to move &middot; OK to drop it here'
            : 'OK to show or hide &middot; Right to move it &middot; Back to close';
    }

    function saveScreens(list, off) {
        cfg.screens = list.map(function (p) { return PAGE_KEYS[p]; });
        cfg.screensOff = off;
        save('screens');
        save('screensOff');
        libPagesUpdate();
    }

    function onScreensKey(k) {
        var list = screensList(), off = (cfg.screensOff || []).slice(0);
        if (scr.moving !== null) {
            if (k === KEY.UP || k === KEY.DOWN) {
                var i = list.indexOf(scr.moving), j = i + (k === KEY.UP ? -1 : 1);
                if (j >= 0 && j < list.length) { list[i] = list[j]; list[j] = scr.moving; scr.row = j; saveScreens(list, off); }
            } else if (k === KEY.ENTER || k === KEY.LEFT || isBack(k)) { scr.moving = null; }
            renderScreens();
            return true;
        }
        if (k === KEY.UP) { scr.row = Math.max(0, scr.row - 1); }
        else if (k === KEY.DOWN) { scr.row = Math.min(list.length - 1, scr.row + 1); }
        else if (k === KEY.ENTER) {
            var key = PAGE_KEYS[list[scr.row]], at = off.indexOf(key), left = 0;
            if (at >= 0) { off.splice(at, 1); } else { off.push(key); }
            each(list, function (p) { if (screenShows(p, off)) { left++; } });
            if (!left) { toast('At least one screen stays on.', 3000); return true; }
            saveScreens(list, off);
        } else if (k === KEY.RIGHT) { scr.moving = list[scr.row]; }
        else if (isBack(k)) { closeScreens(); return true; }
        else { return false; }
        renderScreens();
        return true;
    }

    // ------------------------------------------------------------------ settings panel

    var mode = 'dock';      // dock | settings | picker | apps | screens | dim | editor | diag | camera | video
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
        if (def.action === 'jellyfin') { return jfSettingsValue(); }
        if (def.action === 'apps') { return dockApps().length + (dockApps().length === 1 ? ' app' : ' apps'); }
        if (def.action === 'screens') {
            var names = [];
            each(screensList(), function (p) { if (screenOn(p)) { names.push(PAGE_NAMES[p]); } });
            return names.length ? names.join(', ') : 'Home';
        }
        if (def.action === 'address') { return shortBase(); }
        if (def.action === 'update') { return updateText || 'Check now'; }
        if (def.action === 'diag') { return 'Open'; }
        if (def.key === 'senLoc') { return def.options[optionIndex(def)][1] + (screenShows(cfg.senLoc === 'controls' ? P_CTL : P_HOME) ? '' : ' (screen hidden)'); }
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
        if (!mus.dirs && ha.connected) { musLoadDirs().then(null, function () { /* Settings shows Automatic until then */ }); }
    }

    function closeOverlays() {
        jfStopQc();
        jfBlurInput();
        each(['settings', 'picker', 'apps', 'screens', 'editor', 'diag', 'jf'], function (id) { $(id).hidden = true; });
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
        if (def.key === 'senLoc') { renderWidgets(); }
        if (def.key === 'musDir') {
            cfg.musDirName = cfg.musDir ? def.options[i][1] : '';
            save('musDirName');
            musFolderChanged();
        }
        if (def.key === 'theme') {
            applyTheme();
            if (before === 'auto' || cfg.theme === 'auto') { haSubscribe(); }
        }
        renderSettings();
    }

    function runAction(action) {
        if (action === 'widgets') { openPicker(); }
        else if (action === 'apps') { openApps(); }
        else if (action === 'screens') { openScreens(); }
        else if (action === 'address') { openEditor(); }
        else if (action === 'diag') { openDiag(); }
        else if (action === 'jellyfin') { jfOpen(); }
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
            ['Jellyfin', jfStatus()],
            ['Jellyfin player', vpStatus()],
            ['Music', musStatus()],
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
        if (!k) { return; }

        if (!trk.open && mode !== 'video' && mode !== 'camera' && mode !== 'editor' && mode !== 'jfinput' && musMediaKey(k)) {
            if (e.preventDefault) { e.preventDefault(); }
            return;
        }

        if (trk.open) {
            trkKey(k);
        } else if (mode === 'video') {
            onVideoKey(k);
        } else if (mode === 'camera') {
            if (isBack(k) || k === KEY.EXIT) { closeCamera(); }
            else if (k === KEY.LEFT) { switchCamera(-1); }
            else if (k === KEY.RIGHT) { switchCamera(1); }
            else { showCamHint(); }
        } else if (mode === 'editor') {
            if (k === KEY.ENTER || k === KEY.IME_DONE) { closeEditor(true); }
            else if (k === KEY.IME_CANCEL || isBack(k)) { closeEditor(false); }
            else { handled = false; } // let the keyboard type
        } else if (mode === 'jfinput') {
            if (k === KEY.ENTER || k === KEY.IME_DONE) { jfInputDone(true); }
            else if (k === KEY.IME_CANCEL || k === KEY.BACK || k === KEY.ESC) { jfInputDone(false); }
            else { handled = false; } // let the keyboard type
        } else if (mode === 'jf') {
            handled = onJfKey(k);
        } else if (mode === 'apps') {
            handled = onAppsKey(k);
        } else if (mode === 'screens') {
            handled = onScreensKey(k);
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
            musHold('hidden');                     // first, so closing a camera or film doesn't restart it
            if (mode === 'camera') { closeCamera(); }
            if (mode === 'video') { vpClose(); }   // saves the resume point; the details view offers Resume
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
            musUnhold('hidden', false);             // waits, paused, for Play
        }
    }

    function init() {
        build();
        musInit();
        focus = cfg.focus || 0;
        page = -1;                 // no screen yet: pagesUpdate opens the first one
        pagesUpdate();
        buildDock();
        H.registerKey('ColorF2Yellow');
        H.registerKey('ChannelUp');
        H.registerKey('ChannelDown');
        each(['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaFastForward', 'MediaRewind'], function (n) { H.registerKey(n); });
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
        libPagesUpdate();
        if (jfSignedIn()) {
            setTimeout(function () { jfVerify().then(null, function () { if (!jfSignedIn()) { jfOnSessionChange(); } }); }, 1500);
        }
    }

    init();
}());
