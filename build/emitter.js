var mqtt = require('mqtt');
var Emitter = (function () {
    function Emitter() {
    }
    /**
     * Generates a new, unique identifier for the client connetion.
     */
    Emitter.prototype.$id = function () {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    };
    /**
     * Occurs when connection is established.
     */
    Emitter.prototype.$onConnect = function () {
        this.$tryInvoke('connect', this);
    };
    /**
     * Occurs when the connection was lost.
     */
    Emitter.prototype.$onDisconnect = function () {
        this.$tryInvoke('disconnect', this);
    };
    /**
     * Invokes the callback with a specific
     */
    Emitter.prototype.$tryInvoke = function (name, args) {
        var callback = this.$callbacks[name];
        if (typeof (callback) !== 'undefined' && callback !== null) {
            callback(args);
            return;
        }
    };
    /**
     * Checks if a string starts with a prefix.
     */
    Emitter.prototype.$startsWith = function (text, prefix) {
        return text.slice(0, prefix.length) == prefix;
    };
    /**
     * Connects to the emitter service.
     */
    Emitter.prototype.connect = function (host, port) {
        var _this = this;
        if (host == undefined)
            host = "api.emitter.io";
        if (port == undefined)
            port = 8080;
        console.log('connecting to ' + host + ':' + port);
        this.$callbacks = {};
        this.$mqtt = mqtt.connect({ port: port, host: host, keepalive: 10000, clientId: this.$id });
        this.$mqtt.on('connect', function () {
            _this.$onConnect();
        });
        this.$mqtt.on('close', function () {
            _this.$onDisconnect();
        });
        this.$mqtt.on('offline', function () {
            _this.$onDisconnect();
        });
        this.$mqtt.on('message', function (topic, msg, packet) {
            var message = new EmitterMessage(packet);
            if (_this.$startsWith(message.channel, 'emitter/keygen')) {
                // This is keygen message
                _this.$tryInvoke('keygen', message.asObject());
            }
            else {
                // Do we have a message callback
                _this.$tryInvoke('message', message);
            }
        });
    };
    /**
     * Disconnects the client.
     */
    Emitter.prototype.disconnect = function () {
        this.$mqtt.end();
    };
    /**
    * Publishes a message to the currently opened endpoint.
    */
    Emitter.prototype.publish = function (request) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.publish: request object does not contain a 'key' string.");
        if (typeof (request.channel) !== "string")
            this.logError("emitter.publish: request object does not contain a 'channel' string.");
        if (typeof (request.message) !== "object" && typeof (request.message) !== "string")
            this.logError("emitter.publish: request object does not contain a 'message' object.");
        var topic = request.key + "/" + request.channel;
        this.$mqtt.publish(topic, request.message);
    };
    /**
    * Subscribes to a particular channel.
    */
    Emitter.prototype.subscribe = function (request) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.subscribe: request object does not contain a 'key' string.");
        if (typeof (request.channel) !== "string")
            this.logError("emitter.subscribe: request object does not contain a 'channel' string.");
        // Send MQTT subscribe
        this.$mqtt.subscribe(request.key + "/" + request.channel);
    };
    /**
    * Unsubscribes from a particular channel.
    */
    Emitter.prototype.unsubscribe = function (request) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.unsubscribe: request object does not contain a 'key' string.");
        if (typeof (request.channel) !== "string")
            this.logError("emitter.unsubscribe: request object does not contain a 'channel' string.");
        // Send MQTT unsubscribe
        this.$mqtt.unsubscribe(request.key + "/" + request.channel);
    };
    /**
     * Sends a key generation request to the server.
     */
    Emitter.prototype.keygen = function (request) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.keygen: request object does not contain a 'key' string.");
        if (typeof (request.channel) !== "string")
            this.logError("emitter.keygen: request object does not contain a 'channel' string.");
        // Publish the request
        this.$mqtt.publish("emitter/keygen/", JSON.stringify(request));
    };
    /**
     * Hooks an event to the client.
     */
    Emitter.prototype.on = function (event, callback) {
        // Validate the type
        switch (event) {
            case "connect":
            case "disconnect":
            case "message":
            case "keygen":
                break;
            default:
                this.logError("emitter.on: unknown event type, supported values are 'connect', 'disconnect', 'message' and 'keygen'.");
        }
        // Set the callback
        this.$callbacks[event] = callback;
    };
    /**
     * Logs the error and throws it
     */
    Emitter.prototype.logError = function (message) {
        console.error(message);
        throw new Error(message);
    };
    return Emitter;
}());
var EmitterMessage = (function () {
    /**
     * Constructs a new emitter message.
     */
    function EmitterMessage(m) {
        this.channel = m.topic;
        this.binary = m.payload;
    }
    /**
     * Returns the payload as string.
     */
    EmitterMessage.prototype.asString = function () {
        return this.binary.toString();
    };
    /**
     * Returns the payload as binary.
     */
    EmitterMessage.prototype.asBinary = function () {
        return this.binary;
    };
    /**
     * Returns the payload as JSON-deserialized object.
     */
    EmitterMessage.prototype.asObject = function () {
        return JSON.parse(this.asString());
    };
    return EmitterMessage;
}());
module.exports = new Emitter();
//# sourceMappingURL=emitter.js.map