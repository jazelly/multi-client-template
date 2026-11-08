const { contextBridge } = require('electron');

// What the web app may know about the desktop shell. Add IPC calls here when it needs native features.
contextBridge.exposeInMainWorld('desktop', { platform: process.platform });
