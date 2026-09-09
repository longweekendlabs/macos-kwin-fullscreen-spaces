var sessions = [];
var overviewEdgesRegistered = false;

// KWin can preserve a script-owned edge callback across a package upgrade. Clear
// this script's old top-edge callback before rebuilding sessions below, so a
// blue edge affordance can never survive after the last Space has gone away.
unregisterScreenEdge(KWin.ElectricTop);

function updateOverviewEdges() {
    if (sessions.length > 0 && !overviewEdgesRegistered) {
        registerScreenEdge(KWin.ElectricTop, showOverviewFromFullscreenEdge);
        overviewEdgesRegistered = true;
    } else if (sessions.length === 0 && overviewEdgesRegistered) {
        unregisterScreenEdge(KWin.ElectricTop);
        overviewEdgesRegistered = false;
    }
}

function getSession(window) {
    for (var i = 0; i < sessions.length; i++) {
        if (sessions[i].window === window) {
            return sessions[i];
        }
    }
    return null;
}

function removeSession(session) {
    var index = sessions.indexOf(session);
    if (index !== -1) {
        sessions.splice(index, 1);
    }
}

function desktopContainsOtherWindows(desktop, exceptWindow) {
    if (!desktop) {
        return false;
    }
    var windows = workspace.stackingOrder;

    for (var i = 0; i < windows.length; i++) {
        var w = windows[i];

        if (!w || w === exceptWindow || w.deleted) {
            continue;
        }

        var desktops = w.desktops;
        if (!desktops) {
            continue;
        }

        for (var j = 0; j < desktops.length; j++) {
            if (desktops[j] && desktops[j].id === desktop.id) {
                return true;
            }
        }
    }

    return false;
}

function isBrowserWindow(window) {
    if (!window) {
        return false;
    }

    var identity = ((window.resourceClass || "") + " " +
        (window.resourceName || "")).toLowerCase();
    return identity.indexOf("firefox") !== -1 ||
        identity.indexOf("chrom") !== -1 ||
        identity.indexOf("microsoft-edge") !== -1 ||
        identity.indexOf("brave") !== -1 ||
        identity.indexOf("vivaldi") !== -1 ||
        identity.indexOf("opera") !== -1 ||
        identity.indexOf("zen") !== -1 ||
        identity.indexOf("dolphin") !== -1;
}

function isManagedSpaceWindow(session, window) {
    return !!window && (window.fullScreen || session.browserChromeMode);
}

function leaveFullscreenSpaceNormally(session, windowClosed) {
    if (!session || session.cleaningUp) {
        return;
    }
    session.cleaningUp = true;
    removeSession(session);
    updateOverviewEdges();

    var window = session.window;

    if (!windowClosed && window && !window.deleted) {
        session.internalFullscreenChange = true;
        if (window.fullScreen) {
            window.fullScreen = false;
        }
        session.internalFullscreenChange = false;

        if (session.browserChromeMode) {
            window.noBorder = session.originalNoBorder;
        }

        session.internalDesktopMove = true;
        if (session.originalOnAllDesktops) {
            window.desktops = [];
        } else {
            var validDesktops = [];
            var currentDesktops = workspace.desktops;
            for (var i = 0; i < session.originalDesktops.length; i++) {
                var origDesk = session.originalDesktops[i];
                for (var d = 0; d < currentDesktops.length; d++) {
                    if (currentDesktops[d].id === origDesk.id) {
                        validDesktops.push(currentDesktops[d]);
                        break;
                    }
                }
            }
            if (validDesktops.length > 0) {
                window.desktops = validDesktops;
            } else if (currentDesktops.length > 0) {
                window.desktops = [currentDesktops[0]];
            }
        }
        session.internalDesktopMove = false;

        window.setMaximize(false, false);
    }

    if (workspace.currentDesktop &&
        session.fullscreenDesktop &&
        workspace.currentDesktop.id === session.fullscreenDesktop.id) {
        if (session.returnDesktop) {
            workspace.currentDesktop = session.returnDesktop;
        }
    }

    if (session.fullscreenDesktop &&
        !desktopContainsOtherWindows(session.fullscreenDesktop, window)) {
        workspace.removeDesktop(session.fullscreenDesktop);
    }
}

function leaveFullscreenSpaceAfterManualMove(session, movedDesktops) {
    if (!session || session.cleaningUp) {
        return;
    }
    session.cleaningUp = true;
    removeSession(session);
    updateOverviewEdges();

    var window = session.window;
    var destinationDesktops = movedDesktops && movedDesktops.length > 0
        ? movedDesktops
        : (session.returnDesktop ? [session.returnDesktop] : []);

    if (window && !window.deleted) {
        session.internalFullscreenChange = true;
        if (window.fullScreen) {
            window.fullScreen = false;
        }
        session.internalFullscreenChange = false;

        if (session.browserChromeMode) {
            window.noBorder = session.originalNoBorder;
        }

        window.setMaximize(false, false);

        if (destinationDesktops.length > 0) {
            session.internalDesktopMove = true;
            window.desktops = destinationDesktops;
            session.internalDesktopMove = false;
        }
    }

    if (workspace.currentDesktop &&
        session.fullscreenDesktop &&
        workspace.currentDesktop.id === session.fullscreenDesktop.id &&
        destinationDesktops.length > 0) {
        workspace.currentDesktop = destinationDesktops[0];
    }

    if (session.fullscreenDesktop &&
        !desktopContainsOtherWindows(session.fullscreenDesktop, window)) {
        workspace.removeDesktop(session.fullscreenDesktop);
    }

    closeOverviewIfActive();
}

function enterFullscreenSpace(window) {
    if (!window ||
        !window.normalWindow ||
        !window.fullScreenable ||
        window.deleted ||
        getSession(window)) {
        return;
    }

    var returnDesktop = workspace.currentDesktop;

    var originalDesktops = [];
    if (window.desktops) {
        for (var i = 0; i < window.desktops.length; i++) {
            originalDesktops.push(window.desktops[i]);
        }
    }

    var originalOnAllDesktops = window.onAllDesktops;
    var browserChromeMode = isBrowserWindow(window);
    var originalNoBorder = window.noBorder;
    var oldCount = workspace.desktops.length;

    var name = "Fullscreen";
    if (window.caption) {
        name += " — " + window.caption.substring(0, 35);
    }

    workspace.createDesktop(oldCount, name);

    var desktops = workspace.desktops;

    if (desktops.length !== oldCount + 1) {
        return;
    }

    var fullscreenDesktop = desktops[oldCount];

    var session = {
        window: window,
        returnDesktop: returnDesktop,
        fullscreenDesktop: fullscreenDesktop,
        originalDesktops: originalDesktops,
        originalOnAllDesktops: originalOnAllDesktops,
        browserChromeMode: browserChromeMode,
        originalNoBorder: originalNoBorder,
        cleaningUp: false,
        internalDesktopMove: true,
        internalFullscreenChange: false
    };

    sessions.push(session);
    updateOverviewEdges();

    window.desktops = [fullscreenDesktop];
    session.internalDesktopMove = false;

    workspace.currentDesktop = fullscreenDesktop;
    workspace.activeWindow = window;

    if (session.browserChromeMode) {
        // Real KWin fullscreen makes browsers interpret this as F11 and hides
        // their tabs/navigation; it also makes Dolphin lose its normal window
        // controls. Use a borderless maximized window on the dedicated desktop
        // instead, keeping each application's own chrome available.
        window.noBorder = true;
        window.setMaximize(true, true);
    } else {
        session.internalFullscreenChange = true;
        window.fullScreen = true;
        session.internalFullscreenChange = false;
    }
}

function pointerIsOverMaximizeButton(window) {
    if (!window || !window.frameGeometry || !workspace.cursorPos) {
        return false;
    }

    var frame = window.frameGeometry;
    var cursor = workspace.cursorPos;
    var right = frame.x + frame.width;
    var top = frame.y;

    // Breeze-style title bars place maximize immediately to the left of the
    // close button. Keep a generous DPI-independent hit area for other themes.
    return cursor.y >= top && cursor.y <= top + 50 &&
        cursor.x >= right - 95 && cursor.x < right - 35;
}

function watchWindow(window) {
    if (!window || !window.normalWindow) {
        return;
    }

    var pendingFullMaximize = false;
    var suppressMaximize = false;
    var preserveButtonMaximize = false;

    window.maximizedAboutToChange.connect(function(mode) {
        if (suppressMaximize) {
            return;
        }

        if ((mode & 3) === 3 && pointerIsOverMaximizeButton(window)) {
            pendingFullMaximize = false;
            preserveButtonMaximize = true;
            return;
        }

        pendingFullMaximize = ((mode & 3) === 3);
    });

    window.maximizedChanged.connect(function() {
        if (suppressMaximize) {
            return;
        }

        var existingSession = getSession(window);
        if (existingSession) {
            // Browser Spaces intentionally keep browser chrome visible by using a
            // borderless maximized window instead of KWin's real fullscreen.
            // A second title-bar double-click therefore arrives as an unmaximize
            // event. Treat it exactly like leaving a macOS fullscreen Space.
            if (existingSession.browserChromeMode &&
                !window.maximizedVertically && !window.maximizedHorizontally) {
                leaveFullscreenSpaceNormally(existingSession, false);
            }
            return;
        }

        if (preserveButtonMaximize) {
            preserveButtonMaximize = false;
            pendingFullMaximize = false;
            return;
        }

        var isFullMax = pendingFullMaximize || (window.maximizedVertically && window.maximizedHorizontally);
        pendingFullMaximize = false;

        if (!isFullMax) {
            return;
        }

        if (!window.normalWindow || !window.fullScreenable || window.deleted) {
            return;
        }

        suppressMaximize = true;
        window.setMaximize(false, false);
        suppressMaximize = false;

        enterFullscreenSpace(window);
    });

    window.fullScreenChanged.connect(function() {
        var session = getSession(window);
        if (!session || session.cleaningUp || session.internalFullscreenChange) {
            return;
        }

        if (!window.fullScreen) {
            leaveFullscreenSpaceNormally(session, false);
        }
    });

    window.desktopsChanged.connect(function() {
        var session = getSession(window);
        if (!session || session.cleaningUp || session.internalDesktopMove) {
            return;
        }

        var movedDesktops = [];
        var movedAwayFromFullscreenDesktop = false;

        if (window.desktops) {
            for (var i = 0; i < window.desktops.length; i++) {
                var d = window.desktops[i];
                if (session.fullscreenDesktop && d.id === session.fullscreenDesktop.id) {
                    continue;
                }
                movedDesktops.push(d);
                movedAwayFromFullscreenDesktop = true;
            }
        }

        if (!movedAwayFromFullscreenDesktop) {
            return;
        }

        leaveFullscreenSpaceAfterManualMove(session, movedDesktops);
    });

    window.closed.connect(function() {
        var session = getSession(window);
        if (session) {
            leaveFullscreenSpaceNormally(session, true);
        }
    });
}

// Rebuild in-memory state when KWin reloads the script. Without this, an
// already-running macOS Space remains fullscreen but the exit shortcut cannot
// find its session anymore.
function restoreExistingFullscreenSpaces() {
    var desktops = workspace.desktops;
    for (var i = 0; i < desktops.length; i++) {
        var fullscreenDesktop = desktops[i];
        if (!fullscreenDesktop.name ||
            fullscreenDesktop.name.indexOf("Fullscreen") !== 0) {
            continue;
        }

        var returnDesktop = i > 0 ? desktops[i - 1] : null;
        var originalDesktops = [];
        for (var d = 0; d < i; d++) {
            originalDesktops.push(desktops[d]);
        }

        var windows = workspace.stackingOrder;
        for (var w = 0; w < windows.length; w++) {
            var window = windows[w];
            if (!window || window.deleted || !window.desktops ||
                (!window.fullScreen &&
                    !(isBrowserWindow(window) && window.maximizedVertically && window.maximizedHorizontally))) {
                continue;
            }

            var belongsToSpace = false;
            for (var wd = 0; wd < window.desktops.length; wd++) {
                if (window.desktops[wd].id === fullscreenDesktop.id) {
                    belongsToSpace = true;
                    break;
                }
            }
            if (!belongsToSpace || getSession(window)) {
                continue;
            }

            sessions.push({
                window: window,
                returnDesktop: returnDesktop,
                fullscreenDesktop: fullscreenDesktop,
                originalDesktops: originalDesktops,
                originalOnAllDesktops: false,
                browserChromeMode: isBrowserWindow(window) && !window.fullScreen,
                originalNoBorder: false,
                cleaningUp: false,
                internalDesktopMove: false,
                internalFullscreenChange: false
            });
            updateOverviewEdges();
            break;
        }
    }
}

var existing = workspace.stackingOrder;
for (var i = 0; i < existing.length; i++) {
    watchWindow(existing[i]);
}

workspace.windowAdded.connect(function(window) {
    watchWindow(window);
});

restoreExistingFullscreenSpaces();

registerShortcut(
    "Leave macOS Fullscreen Space",
    "Leave dedicated fullscreen desktop",
    "Meta+Shift+F",
    function() {
        // Global shortcuts can arrive while Overview is changing focus. Do
        // not depend solely on activeWindow; find the managed fullscreen Space.
        restoreExistingFullscreenSpaces();
        var activeWindow = workspace.activeWindow;
        var activeSession = activeWindow ? getSession(activeWindow) : null;
        if (activeSession) {
            leaveFullscreenSpaceNormally(activeSession, false);
            return;
        }

        for (var i = sessions.length - 1; i >= 0; i--) {
            if (isManagedSpaceWindow(sessions[i], sessions[i].window)) {
                leaveFullscreenSpaceNormally(sessions[i], false);
                return;
            }
        }
    }
);

// Overview can update a window's desktop membership without delivering the
// desktopsChanged signal to scripts. Reconcile periodically so a moved window
// is restored to normal windowed mode and its temporary Space is removed.
function reconcileFullscreenSpaces() {
    var currentSessions = sessions.slice();
    for (var i = 0; i < currentSessions.length; i++) {
        var session = currentSessions[i];
        var window = session.window;
        if (!window || window.deleted || session.cleaningUp) {
            continue;
        }

        var hasFullscreenDesktop = false;
        var movedDesktops = [];
        var desktops = window.desktops || [];
        for (var d = 0; d < desktops.length; d++) {
            if (session.fullscreenDesktop &&
                desktops[d].id === session.fullscreenDesktop.id) {
                hasFullscreenDesktop = true;
            } else {
                movedDesktops.push(desktops[d]);
            }
        }

        if (isManagedSpaceWindow(session, window) &&
            (!hasFullscreenDesktop || movedDesktops.length > 0)) {
            leaveFullscreenSpaceAfterManualMove(session, movedDesktops);
        }
    }
}

workspace.currentDesktopChanged.connect(function() {
    reconcileFullscreenSpaces();
});

// Overview commonly activates the moved window only after the desktop change.
// At that point its desktop membership is final and can be cleaned reliably.
workspace.windowActivated.connect(function(window) {
    if (window) {
        var session = getSession(window);
        if (session && isManagedSpaceWindow(session, window) && workspace.currentDesktop &&
            session.fullscreenDesktop &&
            workspace.currentDesktop.id !== session.fullscreenDesktop.id) {
            leaveFullscreenSpaceAfterManualMove(session, [workspace.currentDesktop]);
            return;
        }
    }
    reconcileFullscreenSpaces();
});

// The Overview edge is intentionally owned by this script. This keeps the
// macOS-style top affordance absent on ordinary virtual desktops while still
// making it available inside a managed fullscreen Space.
function showOverviewFromFullscreenEdge() {
    restoreExistingFullscreenSpaces();
    if (sessions.length === 0) {
        return;
    }

    callDBus(
        "org.kde.kglobalaccel",
        "/component/kwin",
        "org.kde.kglobalaccel.Component",
        "invokeShortcut",
        "Overview"
    );
}

function closeOverviewIfActive() {
    callDBus(
        "org.kde.KWin",
        "/Effects",
        "org.freedesktop.DBus.Properties",
        "Get",
        "org.kde.kwin.Effects",
        "activeEffects",
        function(reply) {
            var effects = reply;
            if (reply && reply.value !== undefined) {
                effects = reply.value;
            }
            if (!effects || effects.indexOf === undefined ||
                effects.indexOf("overview") === -1) {
                return;
            }

            callDBus(
                "org.kde.kglobalaccel",
                "/component/kwin",
                "org.kde.kglobalaccel.Component",
                "invokeShortcut",
                "Overview"
            );
        }
    );
}

updateOverviewEdges();
