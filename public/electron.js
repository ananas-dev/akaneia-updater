const electron = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const Store = require("electron-store");

// Make the store accessible from the renderer
Store.initRenderer();

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
  //if (!isDev) mainWindow.setMenu(null);

  mainWindow.on("closed", () => (mainWindow = null));

  electron.ipcMain.on("select-dirs", async (event, arg) => {
    const result = await electron.dialog.showOpenDialog(electron.mainWindow, {
      properties: ["openDirectory"],
    });
    if (result.filePaths.length === 0) return;
    mainWindow.webContents.send("dir-selected-" + arg, result.filePaths);
  });
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

const sendStatusToWindow = (text) => {
  log.info(text);
  if (mainWindow) {
    mainWindow.webContents.send("message", text);
  }
};

autoUpdater.on("checking-for-update", () => {
  log.info("Checking for update...");
});

autoUpdater.on("update-available", (info) => {
  sendStatusToWindow("Update available, dowloading...");
});

autoUpdater.on("update-not-available", (info) => {
  log.info("Update not available.");
});

autoUpdater.on("error", (err) => {
  sendStatusToWindow(`Error in auto-updater: ${err.toString()}`);
});

autoUpdater.on("update-downloaded", (info) => {
  sendStatusToWindow("Updater downloaded; will install now");
});

autoUpdater.on("update-downloaded", (info) => {
  autoUpdater.quitAndInstall();
});
