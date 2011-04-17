const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

const key = "extensions.appmenu-button-title.option";
const enabled_icon_title = Services.prefs.prefHasUserValue(key) ?
    Services.prefs.getIntPref(key) : 1;

const windowtype = "navigator:browser"
const XHTML = Namespace("html", "http://www.w3.org/1999/xhtml");
const dispose = [];
dispose.__defineSetter__("$push", function (v) this.push(v));

function once(node, eventName, func, useCapture) {
    function _once() {
        node.removeEventListener(eventName, _once, useCapture);
        return func.apply(this, arguments);
    }
    return node.addEventListener(eventName, _once, useCapture);
}

function bind(node, eventName, func, useCapture) {
    node.addEventListener(eventName, func, useCapture);
    return function _unbind() node.removeEventListener(eventName, func, useCapture);
}

function nop() void 0

const aStyle = <![CDATA[
    #appmenu-button-title {
        padding-top: 2px;
        color: CaptionText;
        font-weight: bold;
        text-shadow: 1px  1px  1px black;
        pointer-events: none;
    }
    #appmenu-button-title:-moz-window-inactive {
        color: InactiveCaptionText;
    }
    #main-window[sizemode="maximized"] #appmenu-button-title {
        visibility: collapse;
    }
    #appmenu-button-title label {
        text-align: left;
    }
    #appmenu-button[showicon] image.button-icon,
    #appmenu-button-title[showicon] image {
        height: 17px;
        width: 17px;
    }
    #appmenu-button[showicon] image.button-icon,
    #appmenu-button-title[showicon] image {
        border: 1px solid rgba(0, 0, 0, .4);
        -moz-border-radius: 2px;
        background-color: rgba(255,255,255, .5);
        -moz-box-shadow:
            inset 1px 1px 2px rgba(0, 0, 0, 0.25),
            inset -1px -1px 2px rgba(255, 255, 255, 0.5),
            0px 0px 2px rgba(255, 255, 255, 0.5)
        ;
    }
    #appmenu-button[showicon],
    #appmenu-button-title[showicon] {
        padding-left: 1ex;
        list-style-image:url(chrome://branding/content/icon16.png);
    }
    #appmenu-button[showicon] label{
        padding-left: 1ex;
    }
]]>;

function setup(window) {
    try {
    const document = window.document;

    if (document.documentElement.getAttribute("windowtype") !== windowtype) return;

    const gBrowser = window.getBrowser();
    let localDispose = [];
    localDispose.__defineSetter__("$push", function (v) this.push(v));
    let root = document.documentElement;
    const enabledIcon = enabled_icon_title;
    let appmenuButton = document.getElementById("appmenu-button");
    let spacer = document.getElementById("titlebar-spacer");
    let hbox = document.createElement("hbox");
    let style = document.createElementNS(XHTML, "style");
    style.innerHTML = aStyle.toString();

    root.appendChild(style);
    localDispose.$push = function() root.removeChild(style);

    let label = document.createElement("label");
    label.setAttribute("crop", "end");
    label.setAttribute("flex", "1");

    let image = document.createElement("image");

    hbox.setAttribute("align", "center");
    hbox.appendChild(image);
    hbox.appendChild(label);
    hbox.setAttribute("flex", 1);
    hbox.id = "appmenu-button-title";

    spacer.parentNode.insertBefore(hbox, spacer);
    localDispose.$push = function () let(p = hbox.parentNode) p && p.removeChild(hbox);

    if (enabledIcon & 1)
        appmenuButton.setAttribute("showicon", true);
    if (enabledIcon & 2)
        hbox.setAttribute("showicon", true);
    localDispose.$push = function () {
        appmenuButton.removeAttribute("showicon");
        appmenuButton.removeAttribute("image");
    };

    let node = document.documentElement;

    let prev = {};
    function change(evt) {
        if (evt.target !== gBrowser.selectedTab) return;

        if (prev.title !== (prev.title = gBrowser.selectedTab.label)) {
            label.setAttribute("value", gBrowser.getWindowTitleForBrowser(gBrowser.selectedBrowser));
        }

        let spec = evt.target.image || gBrowser.getIcon();
        if (prev.image !== (prev.image = spec)) {
            if (appmenuButton.hasAttribute("showicon"))
                appmenuButton.setAttribute("image", spec);
            if (hbox.hasAttribute("showicon"))
                image.setAttribute("src", spec);
        }
    }
    change({target: gBrowser.selectedTab});

    //localDispose.$push = bind(gBrowser.tabContainer, "DOMTitleChanged", change, true);
    localDispose.$push = bind(gBrowser.tabContainer, "TabAttrModified", change, false);
    function unset() localDispose.forEach(function(f)f())

    localDispose.$push = bind(window, "unload", function _unload() {
        let index = dispose.indexOf(unset);
        unset();
        dispose[index] = nop;
    }, false);

    dispose.$push = unset;
    } catch (ex) {Cu.reportError(ex);}
}


const observer = {
    observe: function observe(aSubject, aTopic, aData) {
        switch (aTopic) {
            case "chrome-document-global-created":
            case "domwindowopened":
                once(aSubject, "load", function() setup(aSubject), false);
            break;
        }
    },
};

function startup(data, reason) {
    let iter = Services.wm.getEnumerator(windowtype);
    while (iter.hasMoreElements()) {
        setup(iter.getNext());
    }
    Services.ww.registerNotification(observer.observe);
    dispose.$push = function () Services.ww.unregisterNotification(observer.observe);
}

function shutdown(data, reason) {
    dispose.forEach(function (f)f());
}
function install(data, reason) {
}
function uninstall(data, reason) {
}
