const path = require('path');
const exec = require('../../utils/exec').execWithRetriesAndLogs;
const spawn = require('child-process-promise').spawn;
const _ = require('lodash');
const log = require('npmlog');
const fs = require('fs');
const Environment = require('../../utils/environment');
const Tail = require('tail').Tail;

class Emulator {
  constructor() {
    this.emulatorBin = path.join(Environment.getAndroidSDKPath(), 'tools', 'emulator');
  }

  async listAvds() {
    const output = await this.exec(`-list-avds --verbose`);
    const avds = output.trim().split('\n');
    return avds;
  }

  async exec(cmd) {
    return (await exec(`${this.emulatorBin} ${cmd}`)).stdout;
  }

  async boot(emulatorName) {
    const cmd = `-verbose -gpu host -no-audio @${emulatorName}`;
    log.verbose(this.emulatorBin, cmd);
    const tempLog = `./${emulatorName}.log`;
    const stdout = fs.openSync(tempLog, 'a');
    const stderr = fs.openSync(tempLog, 'a');
    const tail = new Tail(tempLog);
    const promise = spawn(this.emulatorBin, _.split(cmd, ' '), {detached: true, stdio: ['ignore', stdout, stderr]});

    const childProcess = promise.childProcess;
    childProcess.unref();

    tail.on("line", function(line) {
      if (line.includes('Adb connected, start proxing data')) {
        detach(false);
      }
    });

    promise.catch(function(err) {
      if (log.level === 'verbose') {
          log.error('Error', '%j', err);
      } else {
          log.error('Error', '%s', err.message);
      }
      detach(true);
    });

    function detach(shouldLogOutput) {
      tail.unwatch();
      fs.closeSync(stdout);
      fs.closeSync(stderr);

      if (shouldLogOutput) {
          log.error('stdout', '%s', fs.readFileSync(tempLog, 'utf8'));
      }

      fs.unlink(tempLog, () => {});
      promise._cpResolve();
    }

    return promise;
  }
}

module.exports = Emulator;
