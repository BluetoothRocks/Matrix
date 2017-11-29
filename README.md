# BluetoothRocks! Matrix
Draw on a LED pixel display using WebBluetooth


## What do you need?

A browser that support WebBluetooth and a LED pixel display that supports Bluetooth LE, like:

- [Witti Dotti](https://www.wittidesign.com/products/dotti-one)
- [Divoom Timebox Mini](http://www.divoom.com)


## How does this work?

The browser can connect to a Bluetooth LE device like the pixel display using the WebBluetooth API. Each Bluetooth device has a number of services and characteristics. Think of them like objects with properties. Once connected to the device, the API then exposes these services and characteristics and you can read from and write to those characteristics. 

Typically you can set the color of an individual color by sending a command with the position of the pixel and the color to one of the characteristics that the device exposes. 


## Why??

What do you mean? Because it's fun, of course!