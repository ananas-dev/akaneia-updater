const electron = require("electron");
const isDev = require("electron-is-dev");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const Store = require("electron-store");
const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs");

// Configure logging

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info("App starting...");

// Module to control application life.
const app = electron.app;

// Module to control native browser window.
const BrowserWindow = electron.BrowserWindow;

// Window object
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    minWidth: 600,
    minHeight: 620,
    icon: __dirname + "/icon.png",
    title: "Akaneia Updater",
    backgroundColor: "#303030", // avoid white corners when resizing
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "/../build/index.html")}`
  );

  // Hide menu on prod
  if (!isDev) mainWindow.setMenu(null);

  mainWindow.on("closed", () => (mainWindow = null));

  // File saver
  electron.ipcMain.on("save-file", async (_event, key, fileFormatName, extensions, defaultName) => {
    if (!Array.isArray(extensions)) {
      mainWindow.webContents.send("saving-file-failed" + key);
      log.error(
        `extensions should be an array but his type is ${typeof extensions}`
      );
      return;
    } else {
      const result = await electron.dialog.showSaveDialogSync(mainWindow, {
        defaultPath: `${defaultName}.${extensions[0]}`,
        filters: [
          {
            name: fileFormatName,
            extensions: extensions,
          },
        ],
      });
      if (!result) return;
      mainWindow.webContents.send("file-saved-" + key, result);
    }
  });

  // Temp file downloader
  electron.ipcMain.on(
    "download-tempfile",
    async (_event, key, url, options, name) => {
      const savePath = path.join(
        app.getPath("temp"),
        `${app.getName()}-${name}`
      );
      const res = await fetch(url, options);
      res.arrayBuffer().then((buffer) =>
        fs.writeFile(savePath, new Uint8Array(buffer), () => {
          mainWindow.webContents.send("downloaded-tempfile-" + key, savePath);
        })
      );
    }
  );
}

app.on("ready", createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Auto Updates
app.on("ready", function () {
  autoUpdater.checkForUpdatesAndNotify();
});

// Make the store accessible by the renderer
Store.initRenderer();
