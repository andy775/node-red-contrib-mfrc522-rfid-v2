# node-red-contrib-rc522-extra

A [Node-Red][1] node that allows you to read NFC tags with an RC522 card reader. 
Tested the node on a Raspberry Pi.

This is a fork of:
https://github.com/LennartHennigs/node-red-contrib-rc522

I needed to be able to configure the Chip Select (SDA) pin and to read a block of data, so I have added these options ;)

You need to connect to RC522 card reader to the following pins:

```
SDA(CS)	24 (BCM 8) (default, can be configured)
SCK	23 (BCM 11)
MOSI	19 (BCM 10)
MISO	21 (BCM 9)
IRQ	-
GND	20 
RST	22 (BCM 25)
VCC	17 (3v3 PWR)
```
See [pinout.xyz][2] to identify the proper pins.

The node ist based on the [mfrc522-rpi][3] node package.


[1]:	https://nodered.org
[2]:	https://pinout.xyz/
[3]:  https://github.com/firsttris/mfrc522-rpi
