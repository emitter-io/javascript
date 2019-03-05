"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mqtt = require('mqtt');
var Emitter = /** @class */ (function () {
    function Emitter() {
    }
    /**
     * Connects to the emitter service.
     */
    Emitter.prototype.connect = function (request, handler) {
        var _this = this;
        request = request || {};
        // auto-resolve the security level
        if (request.secure == null) {
            if (typeof window !== "undefined" && window != null && window.location != null && window.location.protocol != null) {
                request.secure = window.location.protocol == "https:";
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
            request[k] = "undefined" === typeof request[k] ? defaultConnectOptions[k] : request[k];
        }
        request.host = request.host.replace(/.*?:\/\//g, "");
        var brokerUrl = "" + (request.secure ? "wss://" : "ws://") + request.host + ":" + request.port;
        this._callbacks = { "connect": [handler] };
        this._mqtt = mqtt.connect(brokerUrl, request);
        this._mqtt.on(EmitterEvents.connect, function () { return _this._tryInvoke(EmitterEvents.connect, _this); });
        this._mqtt.on("close", function () { return _this._tryInvoke(EmitterEvents.disconnect, _this); });
        this._mqtt.on("offline", function () { return _this._tryInvoke(EmitterEvents.offline, _this); });
        this._mqtt.on("error", function (error) { return _this._tryInvoke(EmitterEvents.error, error); });
        this._mqtt.on("message", function (topic, msg, packet) {
            var message = new EmitterMessage(packet);
            if (_this._startsWith(message.channel, "emitter/keygen")) {
                // This is keygen message.
                _this._tryInvoke(EmitterEvents.keygen, message.asObject());
            }
            else if (_this._startsWith(message.channel, "emitter/presence")) {
                // This is presence message.
                _this._tryInvoke(EmitterEvents.presence, message.asObject());
            }
            else if (_this._startsWith(message.channel, "emitter/me")) {
                // This is a message requesting info on the connection.
                _this._tryInvoke(EmitterEvents.me, message.asObject());
            }
            else {
                // Do we have a message callback?
                _this._tryInvoke(EmitterEvents.message, message);
            }
        });
        return this;
    };
    /**
     * Disconnects the client.
     */
    Emitter.prototype.disconnect = function () {
        this._mqtt.end();
        return this;
    };
    /**
     * Publishes a message to the currently opened endpoint.
     */
    Emitter.prototype.publish = function (request) {
        if (typeof request.key !== "string")
            this._throwError("emitter.publish: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.publish: request object does not contain a 'channel' string.");
        if (typeof request.message !== "object" && typeof request.message !== "string")
            this._throwError("emitter.publish: request object does not contain a 'message' object.");
        var options = new Array();
        // The default server's behavior when 'me' is absent, is to send the publisher its own messages.
        // To avoid any ambiguity, this parameter is always set here.
        if (request.me == null || request.me == true) {
            options.push({ key: "me", value: '1' });
        }
        else {
            options.push({ key: "me", value: '0' });
        }
        if (request.ttl) {
            options.push({ key: "ttl", value: request.ttl.toString() });
        }
        var topic = this._formatChannel(request.key, request.channel, options);
        this._mqtt.publish(topic, request.message);
        return this;
    };
    /**
     * Publishes a message througth a link.
     */
    Emitter.prototype.publishWithLink = function (request) {
        if (typeof request.link !== "string")
            this._throwError("emitter.publishWithLink: request object does not contain a 'link' string.");
        if (typeof request.message !== "object" && typeof request.message !== "string")
            this._throwError("emitter.publishWithLink: request object does not contain a 'message' object.");
        this._mqtt.publish(request.link, request.message);
        return this;
    };
    /**
     * Subscribes to a particular channel.
     */
    Emitter.prototype.subscribe = function (request) {
        if (typeof request.key !== "string")
            this._throwError("emitter.subscribe: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.subscribe: request object does not contain a 'channel' string.");
        var options = new Array();
        if (request.last != null) {
            options.push({ key: "last", value: request.last.toString() });
        }
        // Send MQTT subscribe
        var topic = this._formatChannel(request.key, request.channel, options);
        this._mqtt.subscribe(topic);
        return this;
    };
    /**
     * Create a link to a particular channel.
     */
    Emitter.prototype.link = function (request) {
        if (typeof request.key !== "string")
            this._throwError("emitter.link: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.link: request object does not contain a 'channel' string.");
        if (typeof request.name !== "string")
            this._throwError("emitter.link: request object does not contain a 'name' string.");
        if (typeof request.private !== "boolean")
            this._throwError("emitter.link: request object does not contain 'private'.");
        if (typeof request.subscribe !== "boolean")
            this._throwError("emitter.link: request object does not contain 'subscribe'.");
        var options = new Array();
        // The default server's behavior when 'me' is absent, is to send the publisher its own messages.
        // To avoid any ambiguity, this parameter is always set here.
        if (request.me == null || request.me == true) {
            options.push({ key: "me", value: '1' });
        }
        else {
            options.push({ key: "me", value: '0' });
        }
        if (request.ttl != null) {
            options.push({ key: "ttl", value: request.ttl.toString() });
        }
        var formattedChannel = this._formatChannel(null, request.channel, options);
        request = {
            "key": request.key,
            "channel": formattedChannel,
            "name": request.name,
            "private": request.private,
            "subscribe": request.subscribe
        };
        console.log(JSON.stringify(request));
        this._mqtt.publish('emitter/link/', JSON.stringify(request));
        return this;
    };
    /**
     * Unsubscribes from a particular channel.
     */
    Emitter.prototype.unsubscribe = function (request) {
        if (typeof request.key !== "string")
            this._throwError("emitter.unsubscribe: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.unsubscribe: request object does not contain a 'channel' string.");
        // Send MQTT unsubscribe
        var topic = this._formatChannel(request.key, request.channel, []);
        this._mqtt.unsubscribe(topic);
        return this;
    };
    /**
     * Sends a key generation request to the server.
     */
    Emitter.prototype.keygen = function (request) {
        if (typeof request.key !== "string")
            this._throwError("emitter.keygen: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.keygen: request object does not contain a 'channel' string.");
        // Publish the request
        this._mqtt.publish("emitter/keygen/", JSON.stringify(request));
        return this;
    };
    /**
     * Sends a presence request to the server.
     */
    Emitter.prototype.presence = function (request) {
        if (typeof request.key !== "string")
            this._throwError("emitter.presence: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.presence: request object does not contain a 'channel' string.");
        // Publish the request
        this._mqtt.publish("emitter/presence/", JSON.stringify(request));
        return this;
    };
    /**
     * Request information about the connection to the server.
     */
    Emitter.prototype.me = function () {
        // Publish the request
        this._mqtt.publish("emitter/me/", "");
        return this;
    };
    /**
     * Hooks an event to the client.
     */
    Emitter.prototype.on = function (event, callback) {
        this._checkEvent('off', event);
        if (!this._callbacks) {
            this._throwError("emitter.on: called before connecting");
        }
        // Set the callback
        if (!this._callbacks[event]) {
            this._callbacks[event] = [];
        }
        if (this._callbacks[event].indexOf(callback) === -1) {
            this._callbacks[event].push(callback);
        }
        return this;
    };
    /**
     * Unhooks an event from the client.
     */
    Emitter.prototype.off = function (event, callback) {
        this._checkEvent('off', event);
        if (!this._callbacks) {
            this._throwError("emitter.off: called before connecting");
        }
        var eventCallbacks = this._callbacks[event];
        if (eventCallbacks) {
            var index = eventCallbacks.indexOf(callback);
            if (index >= 0) {
                eventCallbacks.splice(index, 1);
            }
        }
        return this;
    };
    Emitter.prototype._checkEvent = function (method, event) {
        if (!EmitterEvents[event]) {
            var names = Object.keys(EmitterEvents);
            var values = names
                .map(function (name, index) { return (index === names.length - 1 ? 'or ' : '') + "'" + name + "'"; })
                .join(", ");
            this._throwError("emitter." + method + ": unknown event type, supported values are " + values + ".");
        }
    };
    /**
     * Invokes the callback with a specific name.
     */
    Emitter.prototype._tryInvoke = function (name, args) {
        var callbacks = this._callbacks[name];
        if (callbacks) {
            callbacks
                .filter(function (callback) { return callback; })
                .forEach(function (callback) { return callback(args); });
        }
    };
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
        // Prefix with the key if any
        var formatted = channel;
        if (key && key.length > 0)
            formatted = this._endsWith(key, "/") ? key + channel : key + "/" + channel;
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
    /**
     * Logs the error and throws it
     */
    Emitter.prototype._throwError = function (message) {
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
var EmitterMessage = /** @class */ (function () {
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
 * Represents the available events.
 */
var EmitterEvents;
(function (EmitterEvents) {
    EmitterEvents["connect"] = "connect";
    EmitterEvents["disconnect"] = "disconnect";
    EmitterEvents["message"] = "message";
    EmitterEvents["offline"] = "offline";
    EmitterEvents["error"] = "error";
    EmitterEvents["keygen"] = "keygen";
    EmitterEvents["presence"] = "presence";
    EmitterEvents["me"] = "me";
})(EmitterEvents = exports.EmitterEvents || (exports.EmitterEvents = {}));
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