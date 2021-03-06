const _ = require('lodash');
const path = require('path');
const AAPT = require('./android/AAPT');
const Emulator = require('./android/Emulator');
const EmulatorTelnet = require('./android/EmulatorTelnet');
const Environment = require('../utils/environment');
const AndroidDriver = require('./AndroidDriver');

class EmulatorDriver extends AndroidDriver {

  constructor(client) {
    super(client);

    this.aapt = new AAPT();
    this.emulator = new Emulator();
  }

  async prepare() {

  }

  async boot(deviceId) {
    await this.emulator.boot(deviceId);
  }

  async acquireFreeDevice(name) {
    const avds = await this.emulator.listAvds();
    if (!avds) {
      const avdmanagerPath = path.join(Environment.getAndroidSDKPath(), 'tools', 'bin', 'avdmanager');
      throw new Error(`Could not find any configured Android Emulator. 
      Try creating a device first, example: ${avdmanagerPath} create avd --force --name Nexus_5X_API_24 --abi x86 --package 'system-images;android-24;google_apis_playstore;x86' --device "Nexus 5X"
      or go to https://developer.android.com/studio/run/managing-avds.html for details on how to create an Emulator.`);
    }
    if (_.indexOf(avds, name) === -1) {
      throw new Error(`Can not boot Android Emulator with the name: '${name}', 
      make sure you choose one of the available emulators: ${avds.toString()}`);
    }

    await this.emulator.boot(name);

    const adbDevices = await this.adb.devices();
    const filteredDevices = _.filter(adbDevices, {type: 'emulator', name: name});

    let adbName;
    switch (filteredDevices.length) {
      case 1:
        const adbDevice = filteredDevices[0];
        adbName = adbDevice.adbName;
        break;
      case 0:
        throw new Error(`Could not find '${name}' on the currently ADB attached devices, 
      try restarting adb 'adb kill-server && adb start-server'`);
        break;
      default:
        throw new Error(`Got more than one device corresponding to the name: ${name}`);
    }

    await this.adb.unlockScreen(adbName);
    return adbName;
  }

  async shutdown(deviceId) {
    const port = _.split(deviceId, '-')[1];
    const telnet = new EmulatorTelnet();
    await telnet.connect(port);
    await telnet.kill();
  }
}

module.exports = EmulatorDriver;
