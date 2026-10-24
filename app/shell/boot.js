/* Haven shell: the part that is installed on the TV and almost never changes.
 *
 * It loads the design (design/style.css + design/design.js) from one of three places:
 *   pending   a new version just downloaded from Home Assistant, on trial
 *   current   the last version from Home Assistant that started cleanly
 *   built-in  the copy packaged in the .wgt (first run, safe mode, or nothing else works)
 *
 * The design must call Haven.ready() once it has drawn itself. If it throws or does not
 * call ready() in time, the shell blocks that version and falls back to the previous one.
 * Pressing Red within a few seconds of launch forces the built-in design (safe mode).
 *
 * window.Haven is the bridge the design uses for everything TV-specific.
 * Plain ES5: Tizen 4.0 runs an old Chromium.
 */
(function () {
    'use strict';

    var SHELL_VERSION = '1.1.0';
    var CFG = window.HAVEN_SHELL_CONFIG || {};
    var IS_TV = typeof window.tizen !== 'undefined' && !!window.tizen.application;
    var START_TIMEOUT_MS = 8000;
    var SAFE_WINDOW_MS = 6000;
    var KEY_RED = 403, KEY_R = 82;
    var bootAt = Date.now();

    // ------------------------------------------------------------------ storage

    function sget(key, fallback) {
        try {
            var v = window.localStorage.getItem('haven.' + key);
            return v === null ? fallback : JSON.parse(v);
        } catch (e) {
            return fallback;
        }
    }

    function sset(key, value) {
        try {
            if (value === null || value === undefined) {
                window.localStorage.removeItem('haven.' + key);
            } else {
                window.localStorage.setItem('haven.' + key, JSON.stringify(value));
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function sessionFlag(key, value) {
        try {
            if (value === undefined) { return window.sessionStorage.getItem('haven.' + key) === '1'; }
            if (value) { window.sessionStorage.setItem('haven.' + key, '1'); } else { window.sessionStorage.removeItem('haven.' + key); }
        } catch (e) { /* no session storage */ }
        return false;
    }

    function hash(s) {
        var h = 5381, i;
        for (i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
        return (h >>> 0).toString(36) + '-' + s.length;
    }

    function timeText(t) {
        if (!t) { return 'never'; }
        var d = new Date(t);
        function p(n) { return n < 10 ? '0' + n : '' + n; }
        return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    // ------------------------------------------------------------------ notices

    var noticeTimer = null;
    function notice(msg, ms) {
        var el = document.getElementById('haven-notice');
        if (!el) { return; }
        el.textContent = msg;
        el.className = 'show';
        clearTimeout(noticeTimer);
        noticeTimer = setTimeout(function () { el.className = ''; }, ms || 6000);
    }

    // ------------------------------------------------------------------ stage scaling

    function fit() {
        var stage = document.getElementById('stage');
        var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
        var x = (window.innerWidth - 1920 * s) / 2;
        var y = (window.innerHeight - 1080 * s) / 2;
        stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
    }

    // ------------------------------------------------------------------ choose what to run

    var safe = sessionFlag('safe');
    var pending = sget('pending', null);
    var current = sget('current', null);
    var blocked = sget('blocked', {});

    // Crash-loop guard: boots that never reached ready() pile up here.
    var boots = sget('boots', []);
    var kept = [];
    for (var bi = 0; bi < boots.length; bi++) { if (bootAt - boots[bi] < 60000) { kept.push(boots[bi]); } }
    kept.push(bootAt);
    sset('boots', kept);
    var crashLoop = kept.length > 4;

    if (pending && blocked[pending.hash]) { pending = null; sset('pending', null); }

    var mode = 'built-in', bundle = null;
    if (!safe && !crashLoop) {
        if (pending && !blocked[pending.hash]) { mode = 'pending'; bundle = pending; }
        else if (current && !blocked[current.hash]) { mode = 'current'; bundle = current; }
    }

    var status = {
        shell: SHELL_VERSION,
        source: 'starting',
        safe: safe,
        lastCheck: null,
        lastResult: 'not checked yet',
        lastError: null
    };

    function activeHash() { return bundle ? bundle.hash : null; }

    function block(h) {
        if (!h) { return; }
        blocked[h] = Date.now();
        var keys = [], k;
        for (k in blocked) { if (blocked.hasOwnProperty(k)) { keys.push(k); } }
        keys.sort(function (a, b) { return blocked[a] - blocked[b]; });
        while (keys.length > 10) { delete blocked[keys.shift()]; }
        sset('blocked', blocked);
    }

    function reload() {
        try { window.location.reload(); } catch (e) { /* nothing else to do */ }
    }

    // ------------------------------------------------------------------ watchdog

    var started = false, failed = false;
    var watchdog = setTimeout(function () { fail('did not start within ' + (START_TIMEOUT_MS / 1000) + ' s'); }, START_TIMEOUT_MS);

    window.onerror = function (msg, src, line) {
        status.lastError = msg + (line ? ' (line ' + line + ')' : '');
        if (!started) { fail(status.lastError); }
        return false;
    };

    function fail(reason) {
        if (started || failed) { return; }
        failed = true;
        clearTimeout(watchdog);
        status.lastError = reason;
        if (mode === 'pending') {
            block(pending.hash);
            sset('pending', null);
            sset('notice', 'The new design from Home Assistant has an error, so Haven kept the previous one. (' + reason + ')');
            reload();
        } else if (mode === 'current') {
            block(current.hash);
            sset('current', null);
            sset('notice', 'The saved design stopped working, so Haven switched to the built-in one. (' + reason + ')');
            reload();
        } else {
            notice('Haven could not start: ' + reason + '. Press Red to retry.', 60000);
        }
    }

    // ------------------------------------------------------------------ loading the design

    function loadBuiltIn() {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'design/style.css';
        document.head.appendChild(link);
        var s = document.createElement('script');
        s.src = 'design/design.js';
        s.onerror = function () { fail('built-in design files are missing'); };
        document.body.appendChild(s);
    }

    function loadBundle(b) {
        var st = document.createElement('style');
        st.textContent = b.css;
        document.head.appendChild(st);
        var s = document.createElement('script');
        s.text = b.js + '\n//# sourceURL=haven-design.js';
        document.body.appendChild(s);
    }

    // ------------------------------------------------------------------ network

    function base() {
        return sget('base', CFG.base || '');
    }

    // Home Assistant API for the widgets: explicit haUrl, else the origin of "base".
    function haInfo() {
        var url = sget('haUrl', null) || CFG.haUrl || '';
        if (!url) {
            var m = /^(https?:\/\/[^\/]+)/i.exec(base());
            url = m ? m[1] : '';
        }
        return {
            url: url.replace(/\/+$/, ''),
            token: sget('haToken', null) || CFG.haToken || ''
        };
    }

    function normaliseBase(input) {
        var b = (input || '').replace(/^\s+|\s+$/g, '');
        if (!b) { return ''; }
        if (!/^https?:\/\//i.test(b)) { b = 'http://' + b; }
        // a bare address like 192.168.1.10 or 192.168.1.10:8123 gets the default port and folder
        if (/^https?:\/\/[^\/]+\/?$/i.test(b)) {
            b = b.replace(/\/$/, '');
            if (!/:\d+$/.test(b)) { b += ':8123'; }
            b += '/local/haven/';
        }
        if (b.charAt(b.length - 1) !== '/') { b += '/'; }
        return b;
    }

    function fetchText(url, timeoutMs, ok, bad) {
        var x = new XMLHttpRequest(), done = false;
        function end(fn, arg) { if (!done) { done = true; fn(arg); } }
        try {
            x.open('GET', url, true);
            x.timeout = timeoutMs || 4000;
            x.onreadystatechange = function () {
                if (x.readyState !== 4) { return; }
                if (x.status >= 200 && x.status < 300) { end(ok, x.responseText); }
                else { end(bad, x.status ? 'HTTP ' + x.status : 'no response'); }
            };
            x.ontimeout = function () { end(bad, 'timed out'); };
            x.send();
        } catch (e) {
            end(bad, e.message);
        }
    }

    // ------------------------------------------------------------------ updates

    var checking = false, lastCheckAt = 0, lastKeyAt = Date.now();
    var downloaded = false, applyWhenVisible = false, applyTimer = null;

    function checkForUpdate(cb) {
        cb = cb || function () {};
        var b = base();
        if (!b) { status.lastResult = 'no Home Assistant address set'; cb(status.lastResult); return; }
        if (checking) { cb('already checking'); return; }
        checking = true;
        lastCheckAt = Date.now();
        var stamp = '?t=' + lastCheckAt, css;

        function done(result) {
            checking = false;
            status.lastCheck = Date.now();
            status.lastResult = result;
            cb(result);
        }

        fetchText(b + 'design/style.css' + stamp, 4000, function (c) {
            css = c;
            fetchText(b + 'design/design.js' + stamp, 4000, function (js) {
                if (!css || !js || js.length < 100) { done('design files on Home Assistant are empty'); return; }
                var h = hash(css + '\u0000' + js);
                if (h === activeHash()) { done('up to date'); return; }
                if (blocked[h]) { done('this version failed before; edit the files to try again'); return; }
                if (pending && pending.hash === h && downloaded) { done('update waiting to be applied'); return; }
                if (!sset('pending', { css: css, js: js, hash: h, fetched: Date.now() })) {
                    done('not enough storage on the TV for the update');
                    return;
                }
                pending = sget('pending', null);
                downloaded = true;
                done('update downloaded');
                scheduleApply();
            }, function (e) { done('Home Assistant unreachable (' + e + ')'); });
        }, function (e) { done('Home Assistant unreachable (' + e + ')'); });
    }

    function scheduleApply() {
        clearTimeout(applyTimer);
        if (!downloaded) { return; }
        if (document.hidden) { applyWhenVisible = true; return; }
        var idleMs = (CFG.applyAfterIdleSeconds || 20) * 1000;
        var wait = idleMs - (Date.now() - lastKeyAt);
        if (wait <= 0) { applyNow(); } else { applyTimer = setTimeout(scheduleApply, wait + 50); }
    }

    function applyNow() {
        if (!downloaded) { return; }
        sset('notice', 'Design updated from Home Assistant.');
        sessionFlag('safe', false);
        reload();
    }

    // ------------------------------------------------------------------ apps

    var installed = null, appWaiters = [];

    function listApps(cb) {
        if (!IS_TV) { cb(null, 'preview mode'); return; }
        if (installed) { cb(installed); return; }
        appWaiters.push(cb);
        if (appWaiters.length > 1) { return; }
        function flush(list, err) {
            var w = appWaiters;
            appWaiters = [];
            for (var i = 0; i < w.length; i++) { w[i](list, err); }
        }
        try {
            tizen.application.getAppsInfo(function (list) { installed = list; flush(list); },
                function (e) { flush(null, e.message); });
        } catch (e) {
            flush(null, e.message);
        }
    }

    // def: {name, ids: [...], match: RegExp}
    function resolveApp(def, list) {
        var i, j;
        if (!list) { return null; }
        for (i = 0; i < (def.ids || []).length; i++) {
            for (j = 0; j < list.length; j++) { if (list[j].id === def.ids[i]) { return list[j]; } }
        }
        if (def.match) {
            for (j = 0; j < list.length; j++) {
                if (list[j].show !== false && def.match.test(list[j].name)) { return list[j]; }
            }
        }
        return null;
    }

    function launchApp(def, cb) {
        cb = cb || function () {};
        if (!IS_TV) { cb(false, 'preview mode'); return; }
        listApps(function (list) {
            var info = resolveApp(def, list);
            var ids = info ? [info.id] : (def.ids || []).slice(0);
            (function attempt(n) {
                if (n >= ids.length) { cb(false, 'not found'); return; }
                try {
                    tizen.application.launch(ids[n], function () { cb(true); }, function () { attempt(n + 1); });
                } catch (e) {
                    attempt(n + 1);
                }
            }(0));
        });
    }

    function registerKey(name) {
        if (!IS_TV) { return; }
        try { tizen.tvinputdevice.registerKey(name); } catch (e) { /* key stays with the system */ }
    }

    // ------------------------------------------------------------------ safe mode

    function enterSafeMode() {
        if (mode !== 'built-in') { block(activeHash()); }
        sset('pending', null);
        sessionFlag('safe', true);
        sset('notice', 'Safe mode: built-in design. Fix the files on Home Assistant, then use Settings > Check for design update.');
        reload();
    }

    // ------------------------------------------------------------------ bridge

    window.Haven = {
        isTV: IS_TV,
        shellVersion: SHELL_VERSION,

        ready: function () {
            if (started || failed) { return; }
            started = true;
            clearTimeout(watchdog);
            sset('boots', []);
            if (mode === 'pending') {
                sset('current', pending);
                sset('pending', null);
                current = pending;
                pending = null;
                status.source = 'Home Assistant, downloaded ' + timeText(current.fetched);
            } else if (mode === 'current') {
                status.source = 'Home Assistant, saved copy from ' + timeText(current.fetched);
            } else {
                status.source = safe ? 'built-in (safe mode)' : (crashLoop ? 'built-in (after repeated errors)' : 'built-in');
            }
            var n = sget('notice', null);
            if (n) { sset('notice', null); notice(n, 8000); }
            setTimeout(function () { checkForUpdate(); }, 1500);
            setInterval(function () { if (!document.hidden) { checkForUpdate(); } },
                (CFG.checkEveryMinutes || 15) * 60000);
        },

        status: function () {
            return {
                shell: status.shell,
                source: status.source,
                safe: status.safe,
                base: base(),
                lastCheck: timeText(status.lastCheck),
                lastResult: status.lastResult,
                lastError: status.lastError
            };
        },

        base: base,
        setBase: function (input) {
            var b = normaliseBase(input);
            sset('base', b || null);
            return base();
        },

        // Manual check from the design's settings: also unblocks versions that failed before.
        checkNow: function (cb) {
            blocked = {};
            sset('blocked', null);
            checkForUpdate(cb);
        },

        // {url, token} for Home Assistant's API. The design must never display the token.
        ha: haInfo,

        fetchText: fetchText,
        registerKey: registerKey,
        notice: notice,
        apps: {
            list: listApps,
            resolve: function (def) { return resolveApp(def, installed); },
            launch: launchApp
        },

        // Design-owned settings, namespaced so they never collide with the shell's.
        get: function (key, fallback) { return sget('design.' + key, fallback); },
        set: function (key, value) { return sset('design.' + key, value); }
    };

    // ------------------------------------------------------------------ events

    document.addEventListener('keydown', function (e) {
        lastKeyAt = Date.now();
        var k = e.keyCode;
        var inSafeWindow = Date.now() - bootAt < SAFE_WINDOW_MS;
        if ((k === KEY_RED || (k === KEY_R && !IS_TV)) && (inSafeWindow || failed)) {
            e.stopPropagation();
            e.preventDefault();
            if (failed && mode === 'built-in') { reload(); } else if (!safe) { enterSafeMode(); }
        }
        if (downloaded) { scheduleApply(); }
    }, true);

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) { return; }
        if (applyWhenVisible) { applyWhenVisible = false; applyNow(); return; }
        if (started && Date.now() - lastCheckAt > 30000) { checkForUpdate(); }
    });

    window.addEventListener('resize', fit);

    // ------------------------------------------------------------------ go

    if (!IS_TV) {
        // Desktop preview against test servers:
        //   ?base=http://localhost:8123/local/haven/  &ha=http://localhost:8124  &token=...
        var q = window.location.search, m;
        m = /[?&]base=([^&]+)/.exec(q);
        if (m) { sset('base', normaliseBase(decodeURIComponent(m[1]))); }
        m = /[?&]ha=([^&]+)/.exec(q);
        if (m) { sset('haUrl', decodeURIComponent(m[1])); }
        m = /[?&]token=([^&]*)/.exec(q);
        if (m) { sset('haToken', decodeURIComponent(m[1]) || null); }
    }
    registerKey('ColorF0Red');
    fit();
    if (mode === 'built-in') { loadBuiltIn(); } else { loadBundle(bundle); }
}());
