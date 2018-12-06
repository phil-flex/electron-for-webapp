const argv = require('minimist')(process.argv);
const electron = require('electron');
const {session, globalShortcut} = require('electron');
const webContentsHandler = require('./webcontents-handler');
const PDFWindow = require('electron-pdf-browser-window');
const electronLocalshortcut = require('electron-localshortcut');

let mainWindow = null;
let currentSession = null;
let targetUrl = null;
let isFullScreen = false;

const windowStateKeeper = require('electron-window-state');

if (argv['profile']) {
  electron.app.setPath('userData', `${electron.app.getPath('userData')}-${argv['profile']}`);
} else {
  //electron.app.setPath('userData', 'd:/Tools/electron2/resources/userData/');
  electron.app.setPath('userData', `${electron.app.getPath('userData')}-default`);
}

process.on('uncaughtException', function(error) {
    console.log('Unhandled exception', error);
});

electron.app.commandLine.appendSwitch('--enable-usermedia-screen-capturing');

electron.ipcMain.on('loudNotification', function() {
    if (process.platform === 'win32' && mainWindow && !mainWindow.isFocused() && !focusHandlerAttached) {
        mainWindow.flashFrame(true);
        mainWindow.once('focus', () => {
            mainWindow.flashFrame(false);
            focusHandlerAttached = false;
        });
        focusHandlerAttached = true;
    }
});

let powerSaveBlockerId;
electron.ipcMain.on('app_onAction', function(ev, payload) {
    switch (payload.action) {
        case 'call_state':
            if (powerSaveBlockerId && electron.powerSaveBlocker.isStarted(powerSaveBlockerId)) {
                if (payload.state === 'ended') {
                    electron.powerSaveBlocker.stop(powerSaveBlockerId);
                }
            } else {
                if (payload.state === 'connected') {
                    powerSaveBlockerId = electron.powerSaveBlocker.start('prevent-display-sleep');
                }
            }
            break;
    }
});


electron.app.on('ready', () => {
    //if (argv.devtools) {
        try {
            const { default: installExtension } = require('electron-devtools-installer');
        } catch(e) {
          console.log(e);
        }
    //}

    electronLocalshortcut.register('CommandOrControl+Shift+I', () => {
        mainWindow.webContents.openDevTools();
    })

    electronLocalshortcut.register('F11', () => {
      isFullScreen = !isFullScreen;
      mainWindow.setFullScreen(isFullScreen);
    })

    sesName=`${process.argv[1]}`
    targetUrl=`${process.argv[1]}`
    if (targetUrl.indexOf("://") === -1) {
       targetUrl = `https://flexhk.sky-computers.com/${targetUrl}`
    };
    favicon = `${targetUrl}/favicon.ico`

    isLoadingPDF = !(targetUrl.indexOf(".pdf") === -1) //Still not work

    //currentSession = session.fromPartition(`persist:${sesName}`);
    //currentSession = session.fromPartition(`persist:name`);

    // var expiration = new Date();
    // var hour = expiration.getHours();
    // hour = hour + 10;
    // expiration.setHours(hour);
    // currentSession.cookies.set({
    //   url: targetUrl,
    //   name: sesName,
    //   value
    // })
     //console.dir(`persist:${sesName}`);
     //console.dir(currentSession);


    // Load the previous window state with fallback to defaults
    const mainWindowState = windowStateKeeper({
        defaultWidth: 1024,
        defaultHeight: 768,
    });

    mainWindow = global.mainWindow = new electron.BrowserWindow({
        title: targetUrl,
        icon: favicon,
        autoHideMenuBar: true,
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        webPreferences: {
          nodeIntegration: false,
          webSecurity: false,
        },
        show: true,
    });
    mainWindow.loadURL(targetUrl)

//    console.log(electron.app.getLocale())

    if (isLoadingPDF) { //Only enable PDF when loading PDF file, otherwise display it for REDMINE
       PDFWindow.addSupport(mainWindow) //This line preventing login to REDMINE
    }

    webContentsHandler(mainWindow.webContents);

    mainWindow.once('ready-to-show', () => {
        mainWindowState.manage(mainWindow);
        mainWindow.show();
        mainWindow.focus();
    });
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = global.mainWindow = null;
    });

    if (process.platform === 'win32') {
        // Handle forward/backward mouse buttons in Windows
        mainWindow.on('app-command', (e, cmd) => {
            if (cmd === 'browser-backward') {
                mainWindow.webContents.goBack();
            } else if (cmd === 'browser-forward') {
                mainWindow.webContents.goForward();
            }
        });
    };


});

electron.app.on('window-all-closed', () => {
    electron.app.quit();
});

electron.app.on('activate', () => {
    mainWindow.show();
});
