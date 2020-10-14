module.exports = function(RED) {

  function rc522Node(config) {
    RED.nodes.createNode(this, config);
    this.blockedFor = config.blockedFor;
    var node = this;

    const Mfrc522 = require("../mfrc522-rpi/index");
    const SoftSPI = require("../rpi-softspi/index");
    const softSPI = new SoftSPI({
      clock:  23, // pin number of SCLK
      mosi:   19, // pin number of MOSI
      miso:   21, // pin number of MISO
      client: config.CSpin || 24 // pin number of CS
    });
    const mfrc522 = new Mfrc522(softSPI).setResetPin(22);

    let last_uid = "";
    let last_time = 0;
    const refreshRate = 0.5;

    setInterval(function() {
      const timestamp = Date.now();
      if (timestamp > (last_time + node.blockedFor * 1000)) {
        node.status({});
      }
      mfrc522.reset();


      let response = mfrc522.findCard();
      if (!response.status) {
        return;
      }
      const bitSize = response.bitSize;
      response = mfrc522.getUid();
      if (!response.status) {
        return;
      }

      const uid_array = response.data;
      let uid = ""
      for(var i = 0; i < uid_array.length;i++) {
        if (i > 0) {
          uid += ":";
        }
        if (uid_array[i] < 10) {
          uid += "0";
        }
        uid += uid_array[i].toString(16).toUpperCase();
      }

      if (uid != last_uid || timestamp > (last_time + node.blockedFor * 1000)) {
        let data = null;
        if (config.dataBlockAddr) {
          data = '';
          // Select the scanned card
          mfrc522.selectCard(uid_array);
          // This is the default key for authentication
          const key = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
          // Authenticate on Block 8 with key and uid
          if (!mfrc522.authenticate(config.dataBlockAddr, key, uid_array)) {
            node.status({
              fill: "red",
              shape: "dot",
              text: "Authentication error."
            });
            console.log("Authentication Error");
            return;
          }
          const len = config.dataBlockLength || 4;
          const rawdata = mfrc522.getDataForBlock(config.dataBlockAddr);
          for (let i=0; i<len; i++) {
            data += String.fromCharCode(rawdata[i]);
          }
          mfrc522.stopCrypto();
        }

        node.status({
          fill: "green",
          shape: "dot",
          text: uid
        });

        last_time = timestamp;
        last_uid = uid;
        node.send({"payload": {
          uid,
          data,
          timestamp,
          bitSize
        }});

        node.log("New Card detected, CardType: " + bitSize);
        node.log("UID: " + uid);
      }
    }, refreshRate * 1000);
  }
  RED.nodes.registerType("rc522-extra",rc522Node);
}
