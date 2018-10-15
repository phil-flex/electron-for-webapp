const {clipboard, nativeImage, Menu, MenuItem, shell, BrowserWindow} = require('electron');
const electron = require('electron');
const PDFWindow = require('electron-pdf-browser-window');

const url = require('url');


const PERMITTED_URL_SCHEMES = [
    'http:',
    'https:',
    'mailto:',
    'file:',
    'ftp:',
];

function safeOpenURL(target) {
    // openExternal passes the target to open/start/xdg-open,
    // so put fairly stringent limits on what can be opened
    // (for instance, open /bin/sh does indeed open a terminal
    // with a shell, albeit with no arguments)
    const parsedUrl = url.parse(target);
    if (PERMITTED_URL_SCHEMES.indexOf(parsedUrl.protocol) > -1) {
        // explicitly use the URL re-assembled by the url library,
        // so we know the url parser has understood all the parts
        // of the input string
        const newTarget = url.format(parsedUrl);
          let win = new BrowserWindow({
            autoHideMenuBar: true,
          });
          win.on('closed', () => {
            win = null;
          });
          // Load a remote URL
          win.webContents.on('new-window', onWindowOrNavigate);
          win.webContents.on('context-menu', function(ev, params) {
              if (params.linkURL || params.srcURL) {
                  onLinkContextMenu(ev, params);
              } else if (params.selectionText) {
                  onSelectedContextMenu(ev, params);
              } else if (params.isEditable) {
                  onEditableContextMenu(ev, params);
              }
          });
          PDFWindow.addSupport(win)
          win.loadURL(newTarget)
    }
}


function onWindowOrNavigate(ev, target) {
    // always prevent the default: if something goes wrong,
    // we don't want to end up opening it in the electron
    // app, as we could end up opening any sort of random
    // url in a window that has node scripting access.
    safeOpenURL(target);
    ev.preventDefault();
    //global.mainWindow.loadURL(target);
}

function onLinkContextMenu(ev, params) {
    const url = params.linkURL || params.srcURL;

    const popupMenu = new Menu();
    // No point trying to open blob: URLs in an external browser: it ain't gonna work.
    if (!url.startsWith('blob:')) {
        popupMenu.append(new MenuItem({
            label: url,
            enabled: false,
            //click() {
            //    safeOpenURL(url);
            //},
        }));
        popupMenu.append(new MenuItem({
            type: 'separator'
        }));
        popupMenu.append(new MenuItem({
            label: 'Open Url using Default Program',
            click() {
                shell.openExternal(url);
            },
        }));
    }

    if (params.mediaType && params.mediaType === 'image' && !url.startsWith('file://')) {
        popupMenu.append(new MenuItem({
            type: 'separator'
        }));
        popupMenu.append(new MenuItem({
            label: 'Copy Image',
            click() {
                if (url.startsWith('data:')) {
                    clipboard.writeImage(nativeImage.createFromDataURL(url));
                } else {
                    ev.sender.copyImageAt(params.x, params.y);
                }
            },
        }));
        popupMenu.append(new MenuItem({
            label: 'Open Image using Default Program',
            click() {
                shell.openExternal(url);
            },
        }));
        popupMenu.append(new MenuItem({
            label: 'Open Image using new window',
            click() {
                safeOpenURL(url);
            },
        }));
    }

    // No point offerring to copy a blob: URL either
    if (!url.startsWith('blob:')) {
        popupMenu.append(new MenuItem({
            type: 'separator'
        }));
        popupMenu.append(new MenuItem({
            label: 'Copy Link Address',
            click() {
                clipboard.writeText(url);
            },
        }));
        popupMenu.append(new MenuItem({
            label: 'Open Link using Default Program',
            click() {
                shell.openExternal(url);
            },
        }));
        popupMenu.append(new MenuItem({
            label: 'Open Link using new window',
            click() {
                safeOpenURL(url);
            },
        }));
    }
    // popup() requires an options object even for no options
    popupMenu.popup({});
    ev.preventDefault();
}

function _CutCopyPasteSelectContextMenus(params) {
    return [{
        role: 'cut',
        enabled: params.editFlags.canCut,
    }, {
        role: 'copy',
        enabled: params.editFlags.canCopy,
    }, {
        role: 'paste',
        enabled: params.editFlags.canPaste,
    }, {
        role: 'pasteandmatchstyle',
        enabled: params.editFlags.canPaste,
    }, {
        role: 'selectall',
        enabled: params.editFlags.canSelectAll,
    }];
}

function _OtherContextMenu(params) {
    const url = params.linkURL || params.srcURL;
    return [
    {
      label: 'Backward',
      click: function() {
        global.mainWindow.webContents.goBack();
      }
    },
    {
      label: 'Forward',
      click: function() {
        global.mainWindow.webContents.goForward();
      }
    },
    {role: 'redo', enabled: true},
    {role: 'undo', enabled: true},
    {role: 'reload', enabled: true},
    {role: 'forceReload', enabled: true},
    {role: 'toggleDevTools', enabled: true},
    {role: 'resetZoom', enabled: true},
    {role: 'zoomIn', enabled: true},
    {role: 'zoomOut', enabled: true},
    {
      label: 'Open external',
      click: function() {
        //global.mainWindow.webContents.goForward();
        shell.openExternal(url);
      }
    },
    ];
}

function onOtherContextMenu(ev, params) {
    const items = _OtherContextMenu(params);
    const popupMenu = Menu.buildFromTemplate(items);
    //console.log(params);
    popupMenu.popup({});
    //ev.preventDefault();
}


function onSelectedContextMenu(ev, params) {
    const items = _CutCopyPasteSelectContextMenus(params);
    const popupMenu = Menu.buildFromTemplate(onOtherContextMenuitems);

    // popup() requires an options object even for no options
    popupMenu.popup({});
    ev.preventDefault();
}

function onEditableContextMenu(ev, params) {
    const items = [
        { role: 'undo' },
        { role: 'redo', enabled: params.editFlags.canRedo },
        { type: 'separator' },
    ].concat(_CutCopyPasteSelectContextMenus(params));

    const popupMenu = Menu.buildFromTemplate(items);

    // popup() requires an options object even for no options
    popupMenu.popup({});
    ev.preventDefault();
}

function onContextMenu(ev, params) {
    if (params.selectionText) {
        onSelectedContextMenu(ev, params);
    } else if (params.isEditable) {
        onEditableContextMenu(ev, params);
    } else {
        onOtherContextMenu(ev, params);
    }
}

//module.exports = (webContents) => {
//    webContents.on('new-window', onWindowOrNavigate);
//    //webContents.on('navigate-in-page', onWindowOrNavigate);
//    //webContents.on('will-navigate', onWindowOrNavigate);
//    webContents.on('context-menu', onContextMenu);
//};


module.exports = (webContents) => {
    webContents.on('new-window', onWindowOrNavigate);
    //webContents.on('will-navigate', onWindowOrNavigate);
    webContents.on('context-menu', function(ev, params) {
        if (params.linkURL || params.srcURL) {
            onLinkContextMenu(ev, params);
        } else if (params.selectionText) {
            onSelectedContextMenu(ev, params);
        } else if (params.isEditable) {
            onEditableContextMenu(ev, params);
        }
    });
};
