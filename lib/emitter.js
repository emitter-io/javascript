"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mqtt = require('mqtt');
var Emitter = (function () {
    function Emitter() {
    }
    /**
     * Occurs when connection is established.
     */
    Emitter.prototype._onConnect = function () {
        this._tryInvoke('connect', this);
    };
    /**
     * Occurs when the connection was lost.
     */
    Emitter.prototype._onDisconnect = function () {
        this._tryInvoke('disconnect', this);
    };
    /**
     * Occurs when the client went offline.
     */
    Emitter.prototype._onOffline = function () {
        this._tryInvoke('offline', this);
    };
    /**
     * Occurs when the client went offline.
     */
    Emitter.prototype._onError = function (error) {
        this._tryInvoke('error', error);
    };
    /**
     * Invokes the callback with a specific
     */
    Emitter.prototype._tryInvoke = function (name, args) {
        var callback = this._callbacks[name];
        if (typeof (callback) !== 'undefined' && callback !== null) {
            callback(args);
            return;
        }
    };
    /**
     * Checks if a string starts with a prefix.
     */
    Emitter.prototype._startsWith = function (text, prefix) {
        return text.slice(0, prefix.length) == prefix;
    };
    /**
     * Checks whether a string ends with a suffix.
     */
    Emitter.prototype._endsWith = function (text, suffix) {
        return text.indexOf(suffix, text.length - suffix.length) !== -1;
    };
    ;
    /**
     * Formats a channel for emitter.io protocol.
     *
     * @private
     * @param {string} key The key to use.
     * @param {string} channel The channel name.
     * @param {...Option[]} options The list of options to apply.
     * @returns
     */
    Emitter.prototype._formatChannel = function (key, channel, options) {
        // Prefix with the key
        var formatted = this._endsWith(key, "/")
            ? key + channel
            : key + "/" + channel;
        // Add trailing slash
        if (!this._endsWith(formatted, "/"))
            formatted += "/";
        // Add options
        if (options != null && options.length > 0) {
            formatted += "?";
            for (var i = 0; i < options.length; ++i) {
                formatted += options[i].key + "=" + options[i].value;
                if (i + 1 < options.length)
                    formatted += "&";
            }
        }
        // We're done compiling the channel name
        return formatted;
    };
    /**
     * Connects to the emitter service.
     */
    Emitter.prototype.connect = function (request, handler) {
        var _this = this;
        request = request || {};
        // auto-resolve the security level
        if (request.secure == null) {
            if (typeof window !== 'undefined' && window != null && window.location != null && window.location.protocol != null) {
                request.secure = (window.location.protocol == 'https:') ? true : false;
            }
            else {
                request.secure = false;
            }
        }
        // default options
        var defaultConnectOptions = {
            host: "api.emitter.io",
            port: request.secure ? 443 : 8080,
            keepalive: 30,
            secure: false
        };
        // apply defaults
        for (var k in defaultConnectOptions) {
            request[k] = ('undefined' === typeof request[k])
                ? defaultConnectOptions[k]
                : request[k];
        }
        request.host = request.host.replace(/.*?:\/\//g, "");
        var brokerUrl = (request.secure ? 'wss://' : 'ws://') + request.host + ':' + request.port;
        this._callbacks = { "connect": handler };
        this._mqtt = mqtt.connect(brokerUrl, request);
        this._mqtt.on('connect', function () {
            _this._onConnect();
        });
        this._mqtt.on('close', function () {
            _this._onDisconnect();
        });
        this._mqtt.on('offline', function () {
            _this._onOffline();
        });
        this._mqtt.on('error', function (error) {
            _this._onError(error);
        });
        this._mqtt.on('message', function (topic, msg, packet) {
            var message = new EmitterMessage(packet);
            if (_this._startsWith(message.channel, 'emitter/keygen')) {
                // This is keygen message.
                _this._tryInvoke('keygen', message.asObject());
            }
            else if (_this._startsWith(message.channel, 'emitter/presence')) {
                // This is presence message.
                _this._tryInvoke('presence', message.asObject());
            }
            else if (_this._startsWith(message.channel, 'emitter/me')) {
                // This is a message requesting info on the connection.
                _this._tryInvoke('me', message.asObject());
            }
            else {
                // Do we have a message callback
                _this._tryInvoke('message', message);
            }
        });
    };
    /**
     * Disconnects the client.
     */
    Emitter.prototype.disconnect = function () {
        this._mqtt.end();
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
        var options = new Array();
        if (request.ttl) {
            options.push({ key: "ttl", value: request.ttl.toString() });
        }
        var topic = this._formatChannel(request.key, request.channel, options);
        this._mqtt.publish(topic, request.message);
    };
    /**
    * Subscribes to a particular channel.
    */
    Emitter.prototype.subscribe = function (request) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.subscribe: request object does not contain a 'key' string.");
        if (typeof (request.channel) !== "string")
            this.logError("emitter.subscribe: request object does not contain a 'channel' string.");
        var options = new Array();
        if (request.last != null) {
            options.push({ key: "last", value: request.last.toString() });
        }
        // Send MQTT subscribe
        var topic = this._formatChannel(request.key, request.channel, options);
        this._mqtt.subscribe(topic);
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
        var topic = this._formatChannel(request.key, request.channel, []);
        this._mqtt.unsubscribe(topic);
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
        this._mqtt.publish("emitter/keygen/", JSON.stringify(request));
    };
    /**
     * Sends a presence request to the server.
     */
    Emitter.prototype.presence = function (request) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.presence: request object does not contain a 'key' string.");
        if (typeof (request.channel) !== "string")
            this.logError("emitter.presence: request object does not contain a 'channel' string.");
        // Publish the request
        this._mqtt.publish("emitter/presence/", JSON.stringify(request));
    };
    /**
     * Request information about the connection to the server.
     */
    Emitter.prototype.me = function () {
        // Publish the request
        this._mqtt.publish("emitter/me/", "");
    };
    ;
    /**
     * Hooks an event to the client.
     */
    Emitter.prototype.on = function (event, callback) {
        // Validate the type
        switch (event) {
            case "connect":
            case "disconnect":
            case "message":
            case "offline":
            case "error":
            case "keygen":
            case "presence":
			case "me":
                break;
            default:
                this.logError("emitter.on: unknown event type, supported values are 'connect', 'disconnect', 'message' and 'keygen'.");
        }
        // Set the callback
        this._callbacks[event] = callback;
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
exports.Emitter = Emitter;
/**
 * Represents a message send througn emitter.io
 *
 * @class EmitterMessage
 */
var EmitterMessage = (function () {
    /**
     * Creates an instance of EmitterMessage.
     *
     * @param {*} m The message
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
        var object = {};
        try {
            object = JSON.parse(this.asString());
        }
        catch (err) {
            console.error(err);
        }
        return object;
    };
    return EmitterMessage;
}());
exports.EmitterMessage = EmitterMessage;
/**
 * Connect creates a new instance of emitter client and connects to it.
 */
function connect(request, connectCallback) {
    var client = new Emitter();
    client.connect(request, connectCallback);
    return client;
}
exports.connect = connect;
//# sourceMappingURL=emitter.js.map