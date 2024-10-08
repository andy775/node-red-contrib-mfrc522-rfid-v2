module.exports = function(RED) {

  function rc522Node(config) {
    RED.nodes.createNode(this, config);
    this.blockedFor = config.blockedFor;
    const node = this;

    // Import required modules
    const Mfrc522 = require("../mfrc522-rpi/index");
    const SoftSPI = require("../rpi-softspi/index");

    // Initialize SoftSPI with pin configuration
    const softSPI = new SoftSPI({
      clock:  23, // pin number of SCLK
      mosi:   19, // pin number of MOSI
      miso:   21, // pin number of MISO
      client: config.CSpin || 24 // pin number of CS
    });

    // Setup MFRC522 reader with SoftSPI and reset pin
    const mfrc522 = new Mfrc522(softSPI).setResetPin(22);

    let last_uid = "";
    let last_time = 0;
    const refreshRate = 0.5; // in seconds

    // Polling for card every refreshRate seconds
    setInterval(function() {
      const timestamp = Date.now();
      // Clear node status if enough time has passed since the last read
      if (timestamp > (last_time + node.blockedFor * 1000)) {
        node.status({});
      }

      // Reset the reader
      mfrc522.reset();

      // Look for a card, skip if no card found
      let response = mfrc522.findCard();
      if (!response.status) {
        return;
      }

      // Retrieve UID of the card
      const bitSize = response.bitSize;
      response = mfrc522.getUid();
      if (!response.status) {
        return;
      }

      // Format UID as hex string
      const uid_array = response.data;
      let uid = uid_array.map(byte => (byte < 10 ? "0" : "") + byte.toString(16).toUpperCase()).join(":");

      // Check if a new card or enough time has passed since the last read
      if (uid !== last_uid || timestamp > (last_time + node.blockedFor * 1000)) {
        let data = null;

        // If configured, read data from specified block of the card
        if (config.dataBlockAddr && config.dataBlockLength) {
          const addr = parseInt(config.dataBlockAddr, 10);
          data = '';

          // Select the scanned card
          mfrc522.selectCard(uid_array);

          // Use default key for authentication
          const key = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

          // Authenticate to read data from the block
          if (!mfrc522.authenticate(addr, key, uid_array)) {
            node.status({
              fill: "red",
              shape: "dot",
              text: "Authentication error."
            });
            node.error("Authentication Error");
            return;
          }

          // Read data from the card's block
          const len = config.dataBlockLength ? parseInt(config.dataBlockLength, 10) : 4;
          const rawdata = mfrc522.getDataForBlock(addr);
          data = String.fromCharCode(...rawdata.slice(0, len));

          // Stop authentication and de-select the card
          mfrc522.stopCrypto();
        }

        // Update the node status to indicate card read success
        node.status({
          fill: "green",
          shape: "dot",
          text: data || uid
        });

        // Update last read time and UID
        last_time = timestamp;
        last_uid = uid;

        // Send message with UID, optional data, timestamp, and bit size
        node.send({
          payload: {
            uid,
            data,
            timestamp,
            bitSize
          }
        });

        node.log(`New Card detected, CardType: ${bitSize}`);
        node.log(`UID: ${uid}`);
      }
    }, refreshRate * 1000); // Poll every refreshRate seconds
  }

  // Register the custom node type
  RED.nodes.registerType("rc522-extra", rc522Node);
};
