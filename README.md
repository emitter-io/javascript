[![NPM](https://nodei.co/npm/emitter-io.png)](https://nodei.co/npm/emitter-io/)
[![NPM](https://nodei.co/npm-dl/emitter-io.png)](https://nodei.co/npm/emitter-io/)

Client library for emitter.io platform written in JavaScript for node.js.

* [Installation](#install)
* [Example](#example)
* [API](#api)
* [License](#license)

<a name="install"></a>
## Installation

```
npm install emitter-io --save
```
<a name="example"></a>
## Example

```
// connect to emitter.io and get the client
var emitter = require('emitter-io').connect();

// once we're connected, subscribe to the 'chat' channel
emitter.subscribe({
	key: "<channel key>",
	channel: "chat"
});
    
// on every message, print it out
emitter.on('message', function(msg){
	console.log( msg.asString() );
});

// publish a message to the chat channel
emitter.publish({
	key: "<channel key>",
	channel: "chat/my_name",
	message: "hello, emitter!"
});
```
<a name="api"></a>
## API
  * <a href="#connect"><code><b>connect()</b></code></a>
  * <a href="#client"><code><b>Emitter()</b></code></a>
  * <a href="#publish"><code>Emitter#<b>publish()</b></code></a>
  * <a href="#subscribe"><code>Emitter#<b>subscribe()</b></code></a>
  * <a href="#unsubscribe"><code>Emitter#<b>unsubscribe()</b></code></a>
  * <a href="#disconnect"><code>Emitter#<b>disconnect()</b></code></a>
  * <a href="#message"><code><b>EmitterMessage()</b></code></a>
  * <a href="#asString"><code>EmitterMessage#<b>asString()</b></code></a>
  * <a href="#asBinary"><code>EmitterMessage#<b>asBinary()</b></code></a>
  * <a href="#asObject"><code>EmitterMessage#<b>asObject()</b></code></a>

-------------------------------------------------------
<a name="connect"></a>
### connect(host: string, port: number)

Connects to the emitter api broker specified by the given url and options and returns an [Emitter](#emitter) instance. The URL can be on the following protocols: 'mqtt', 'mqtts', 'tcp', 'tls', 'ws', 'wss'. The URL can also be an object as returned by [`URL.parse()`](http://nodejs.org/api/url.html#url_url_parse_urlstr_parsequerystring_slashesdenotehost), in that case the two objects are merged, i.e. you can pass a single object with both the URL and the connect options.

-------------------------------------------------------
<a name="client"></a>
### Emitter()

The `Emitter` class wraps a client connection to an emitter.io MQTT broker over an arbitrary transport method (TCP, TLS, WebSocket, ecc). It automatically handles the following by with help of MQTT.js client:
* Regular server pings
* QoS flow
* Automatic reconnections
* Start publishing before being connected


#### Event `'connect'`

`function(connack) {}`

Emitted on successful (re)connection (i.e. connack rc=0). 
* `connack` received connack packet. When `clean` connection option is `false` and server has a previous session 
for `clientId` connection option, then `connack.sessionPresent` flag is `true`. When that is the case, 
you may rely on stored session and prefer not to send subscribe commands for the client.

#### Event `'disconnect'`

`function() {}`

Emitted after a disconnection.

#### Event `'offline'`

`function() {}`

Emitted when the client goes offline.

#### Event `'error'`

`function(error) {}`

Emitted when the client cannot connect (i.e. connack rc != 0) or when a parsing error occurs.

### Event `'message'`

`function(message) {}`

Emitted when the client receives a message packet. The message object will be of [EmitterMessage](#message) class, encapsulating the channel and the payload.


-------------------------------------------------------
<a name="publish"></a>
### Emitter#publish({ key: string; channel: string; message: any;  })

Publish a message to a channel
* `key` is security key to use for the operation, `String`
* `channel` is the channel string to publish to, `String`
* `message` is the message to publish, `Buffer` or `String`

-------------------------------------------------------
<a name="subscribe"></a>
### Emitter#subscribe({ key: string; channel: string;  })

Subscribes to a channel
* `key` is security key to use for the operation, `String`
* `channel` is the channel string to subscribe to, `String`

-------------------------------------------------------
<a name="unsubscribe"></a>
### Emitter#unsubscribe({ key: string; channel: string;  })

Unsubscribes from a channel
* `key` is security key to use for the operation, `String`
* `channel` is the channel string to unsubscribe from, `String`

-------------------------------------------------------
<a name="unsubscribe"></a>
### Emitter#keygen({ key: string; channel: string; type: string; ttl: number; })

Sends a key generation request to the server.
* `key` is **master/secret key** to use for the operation, `String`
* `channel` is the channel string to generate a key for, `String`
* `type` the type of the key to generate. Possible options include `r` for read-only, `w` for write-only and `rw` for read-write keys, `String`
* `ttl` is the time-to-live of the key, in seconds.

-------------------------------------------------------
<a name="disconnect"></a>
### Emitter#disconnect()

Disconnects from the remote broker

-------------------------------------------------------
<a name="message"></a>
### EmitterMessage()

The `EmitterMessage` class wraps a message received from the broker. It contains several properties:
* `channel` is channel the message was published to, `String`
* `binary` is the buffer associated with the payload, `Buffer`

-------------------------------------------------------
<a name="asString"></a>
### EmitterMessage#asString()

Returns the payload as a utf-8 `String`.

-------------------------------------------------------
<a name="asBinary"></a>
### EmitterMessage#asBinary()

Returns the payload as the `Buffer`.

-------------------------------------------------------
<a name="asObject"></a>
### EmitterMessage#asObject()

Returns the payload as JSON-deserialized `Object`.

<a name="license"></a>
## License

The MIT License (MIT)
Copyright (c) 2016 Misakai Ltd.
