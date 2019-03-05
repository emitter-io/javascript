const mqtt = require('mqtt');

export class Emitter {

    private _mqtt: any;
    private _callbacks: { [key: string]: ((args?: any) => void)[] };

    /**
     * Connects to the emitter service.
     */
    public connect(request?: ConnectRequest, handler?: () => void): Emitter {
        request = request || {};

        // auto-resolve the security level
        if (request.secure == null) {
            if (typeof window !== "undefined" && window != null && window.location != null && window.location.protocol != null) {
                request.secure = window.location.protocol == "https:";
            } else {
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
        var brokerUrl = `${request.secure ? "wss://" : "ws://"}${request.host}:${request.port}`;

        this._callbacks = {"connect": [handler]};
        this._mqtt = mqtt.connect(brokerUrl, request);

        this._mqtt.on(EmitterEvents.connect, () => this._tryInvoke(EmitterEvents.connect, this));
        this._mqtt.on("close", () => this._tryInvoke(EmitterEvents.disconnect, this));
        this._mqtt.on("offline", () => this._tryInvoke(EmitterEvents.offline, this));
        this._mqtt.on("error", error => this._tryInvoke(EmitterEvents.error, error));
        this._mqtt.on("message", (topic, msg, packet) => {
            var message = new EmitterMessage(packet);
            if (this._startsWith(message.channel, "emitter/keygen")) {
                // This is keygen message.
                this._tryInvoke(EmitterEvents.keygen, message.asObject())
            } else if (this._startsWith(message.channel, "emitter/presence")) {
                // This is presence message.
                this._tryInvoke(EmitterEvents.presence, message.asObject())
            } else if (this._startsWith(message.channel, "emitter/me")) {
                // This is a message requesting info on the connection.
                this._tryInvoke(EmitterEvents.me, message.asObject());
            } else {
                // Do we have a message callback?
                this._tryInvoke(EmitterEvents.message, message);
            }
        });
        return this;
    }

    /**
     * Disconnects the client.
     */
    public disconnect(): Emitter {
        this._mqtt.end();
        return this;
    }

    /**
     * Publishes a message to the currently opened endpoint.
     */
    public publish(request: PublishRequest): Emitter {
        if (typeof request.key !== "string")
            this._throwError("emitter.publish: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.publish: request object does not contain a 'channel' string.");
        if (typeof request.message !== "object" && typeof request.message !== "string")
            this._throwError("emitter.publish: request object does not contain a 'message' object.");

        var options = new Array<Option>();
        // The default server's behavior when 'me' is absent, is to send the publisher its own messages.
		// To avoid any ambiguity, this parameter is always set here.
        if (request.me == null || request.me == true) {
            options.push({key: "me", value: '1'});
        } else {
            options.push({key: "me", value: '0'});
        }
        if (request.ttl) {
            options.push({key: "ttl", value: request.ttl.toString()});
        }

        var topic = this._formatChannel(request.key, request.channel, options);
        this._mqtt.publish(topic, request.message);
        return this;
    }

    /**
     * Publishes a message througth a link.
     */
    public publishWithLink(request: PublishWithLinkRequest): Emitter {
        if (typeof request.link !== "string")
            this._throwError("emitter.publishWithLink: request object does not contain a 'link' string.");
        if (typeof request.message !== "object" && typeof request.message !== "string")
            this._throwError("emitter.publishWithLink: request object does not contain a 'message' object.");

        this._mqtt.publish(request.link, request.message);
        return this;
    }

    /**
     * Subscribes to a particular channel.
     */
    public subscribe(request: SubscribeRequest): Emitter {
        if (typeof request.key !== "string")
            this._throwError("emitter.subscribe: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.subscribe: request object does not contain a 'channel' string.");

        var options = new Array<Option>();
        if (request.last != null) {
            options.push({key: "last", value: request.last.toString()});
        }

        // Send MQTT subscribe
        var topic = this._formatChannel(request.key, request.channel, options);
        this._mqtt.subscribe(topic);
        return this;
    }

    /**
     * Create a link to a particular channel.
     */
    public link(request: LinkRequest): Emitter {
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

        var options = new Array<Option>();
        // The default server's behavior when 'me' is absent, is to send the publisher its own messages.
		// To avoid any ambiguity, this parameter is always set here.
        if (request.me == null || request.me == true) {
            options.push({key: "me", value: '1'});
        } else {
            options.push({key: "me", value: '0'});
        }
        if (request.ttl != null) {
            options.push({key: "ttl", value: request.ttl.toString()});
        }

        var formattedChannel = this._formatChannel(null, request.channel, options);
        request = {
            "key": request.key,
            "channel": formattedChannel,
            "name": request.name,
            "private": request.private, 
            "subscribe": request.subscribe}

        console.log(JSON.stringify(request))
        this._mqtt.publish('emitter/link/', JSON.stringify(request));
        return this;
    }

    /**
     * Unsubscribes from a particular channel.
     */
    public unsubscribe(request: UnsubscribeRequest): Emitter {
        if (typeof request.key !== "string")
            this._throwError("emitter.unsubscribe: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.unsubscribe: request object does not contain a 'channel' string.");

        // Send MQTT unsubscribe
        var topic = this._formatChannel(request.key, request.channel, []);
        this._mqtt.unsubscribe(topic);
        return this;
    }

    /**
     * Sends a key generation request to the server.
     */
    public keygen(request: KeyGenRequest): Emitter {
        if (typeof request.key !== "string")
            this._throwError("emitter.keygen: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.keygen: request object does not contain a 'channel' string.");

        // Publish the request
        this._mqtt.publish("emitter/keygen/", JSON.stringify(request));
        return this;
    }

    /**
     * Sends a presence request to the server.
     */
    public presence(request: PresenceRequest): Emitter {
        if (typeof request.key !== "string")
            this._throwError("emitter.presence: request object does not contain a 'key' string.");
        if (typeof request.channel !== "string")
            this._throwError("emitter.presence: request object does not contain a 'channel' string.");

        // Publish the request
        this._mqtt.publish("emitter/presence/", JSON.stringify(request));
        return this;
    }

    /**
     * Request information about the connection to the server.
     */
    public me(): Emitter {
        // Publish the request
        this._mqtt.publish("emitter/me/", "");
        return this;
    }

    /**
     * Hooks an event to the client.
     */
    public on(event: EmitterEvents | string, callback: (args?: any) => void): Emitter {
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
    }

    /**
     * Unhooks an event from the client.
     */
    public off(event: EmitterEvents | string, callback: (args?: any) => void): Emitter {
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
    }

    private _checkEvent(method: 'on' | 'off', event: EmitterEvents | string) {
        if (!EmitterEvents[event]) {
            var names = Object.keys(EmitterEvents);
            var values = names
                .map((name, index) => `${index === names.length - 1 ? 'or ' : ''}'${name}'`)
                .join(", ");
            this._throwError(`emitter.${method}: unknown event type, supported values are ${values}.`);
        }
    }

    /**
     * Invokes the callback with a specific name.
     */
    private _tryInvoke(name: EmitterEvents, args: any) {
        var callbacks = this._callbacks[name];
        if (callbacks) {
            callbacks
                .filter(callback => callback)
                .forEach(callback => callback(args));
        }
    }

    /**
     * Formats a channel for emitter.io protocol.
     *
     * @private
     * @param {string} key The key to use.
     * @param {string} channel The channel name.
     * @param {...Option[]} options The list of options to apply.
     * @returns
     */
    private _formatChannel(key: string, channel: string, options: Option[]) {
        // Prefix with the key if any
        var formatted = channel
		if (key && key.length > 0)
			formatted = this._endsWith(key, "/") ? key + channel : key + "/" + channel

        // Add trailing slash
        if (!this._endsWith(formatted, "/"))
            formatted += "/";

        // Add options
        if (options != null && options.length > 0) {
            formatted += "?";
            for (var i: number = 0; i < options.length; ++i) {
                formatted += options[i].key + "=" + options[i].value;
                if (i + 1 < options.length)
                    formatted += "&";
            }
        }

        // We're done compiling the channel name
        return formatted;
    }

    /**
     * Checks if a string starts with a prefix.
     */
    private _startsWith(text: string, prefix: string): boolean {
        return text.slice(0, prefix.length) == prefix;
    }

    /**
     * Checks whether a string ends with a suffix.
     */
    private _endsWith(text: string, suffix: string): boolean {
        return text.indexOf(suffix, text.length - suffix.length) !== -1;
    }

    /**
     * Logs the error and throws it
     */
    private _throwError(message) {
        console.error(message);
        throw new Error(message);
    }

}

/**
 * Represents a message send througn emitter.io
 *
 * @class EmitterMessage
 */
export class EmitterMessage {

    public channel: string;
    public binary: any;

    /**
     * Creates an instance of EmitterMessage.
     *
     * @param {*} m The message
     */
    constructor(m: IMqttMessage) {
        this.channel = m.topic;
        this.binary = m.payload;
    }

    /**
     * Returns the payload as string.
     */
    public asString(): string {
        return this.binary.toString();
    }

    /**
     * Returns the payload as binary.
     */
    public asBinary(): any {
        return this.binary;
    }

    /**
     * Returns the payload as JSON-deserialized object.
     */
    public asObject(): any {
        var object = {};
        try {
            object = JSON.parse(this.asString());
        } catch (err) {
            console.error(err);
        }
        return object;
    }
}

/**
 * Represents the available events.
 */
export enum EmitterEvents {
    connect = "connect",
    disconnect = "disconnect",
    message = "message",
    offline = "offline",
    error = "error",
    keygen = "keygen",
    presence = "presence",
    me = "me"
}

/**
 * Represents connection options.
 *
 * @interface IConnectOptions
 */
export interface ConnectRequest {

    /**
     * Whether the connection should be MQTT over TLS or not.
     *
     * @type {boolean}
     */
    secure?: boolean;

    /**
     * The hostname to connect to.
     *
     * @type {string}
     */
    host?: string;

    /**
     * The port number to connect to.
     *
     * @type {number}
     */
    port?: number;

    /**
     * The number of seconts to wait between keepalive packets. Set to 0 to disable.
     *
     * @type {number} Keepalive in seconds.
     */
    keepalive?: number;

    /**
     * The username required by your broker, if any
     *
     * @type {string}
     */
    username?: string;

    /**
     * The password required by your broker, if any
     *
     * @type {string}
     */
    password?: string;
}

export interface PublishRequest {
    key: string;
    channel: string;
    message: any;
    ttl?: number;
    me?: boolean;
}

export interface PublishWithLinkRequest {
    link: string;
    message: any;
}

export interface SubscribeRequest {
    key: string;
    channel: string;
    last?: number;
}

export interface LinkRequest {
    key: string;
    channel: string;
    name: string;
    private: boolean;
    subscribe: boolean;
    ttl?: number;
    me?: boolean;
}

export interface UnsubscribeRequest {
    key: string;
    channel: string;
}

export interface KeyGenRequest {
    key: string;
    channel: string;
    type: string;
    ttl: number;
}

/**
 * Represents a presence request.
 *
 * @interface PresenceRequest
 */
export interface PresenceRequest {
    /**
     * The key to use for this request. The key should match the channel and have presence flag associated.
     *
     * @type {string}
     */
    key: string;

    /**
     * The target channel for the presence request.
     *
     * @type {string}
     */
    channel: string;

    /**
     * Whether a full status should be sent back in the response.
     *
     * @type {boolean}
     */
    status?: boolean;

    /**
     * Whether we should subscribe this client to presence notification events.
     *
     * @type {boolean}
     */
    changes?: boolean;
}

/**
 * Represents a presence response message or a join/leave notification.
 *
 * @interface PresenceEvent
 */
export interface PresenceEvent {
    /**
     * The event, can be "status", "join" or "leave".
     *
     * @type {string}
     */
    event: string;

    /**
     * The channel for this event.
     *
     * @type {string}
     */
    channel: string;

    /**
     * The current channel occupancy (the number of subscribers).
     *
     * @type {number}
     */
    occupancy: number;

    /**
     * The UNIX timestamp of this event.
     *
     * @type {number}
     */
    time: number;

    /**
     * The list of clients or the client id.
     *
     * @type {(Array<PresenceInfo> | PresenceInfo)}
     */
    who: Array<PresenceInfo> | PresenceInfo;
}

export interface PresenceInfo {
    /**
     * The id of the connection.
     *
     * @type {string}
     */
    id: string;

    /**
     * The MQTT username associated with the connection.
     *
     * @type {string}
     */
    username: string;
}

export interface UnsubscribeRequest {
    key: string;
    channel: string;
}

export interface KeyGenEvent {
    key: string;
    channel: string;
    status: number;
}

export interface MeEvent {
    id: string;
    username: string;
}

/**
 * Represents an MQTT message.
 *
 * @interface IMqttMessage
 */
export interface IMqttMessage {
    topic: string;
    payload: any;
}

/**
 * Represents an option (key/value pair) for a subscribe or publish operation.
 */
export interface Option {
    key: string;
    value: string;
}

/**
 * Connect creates a new instance of emitter client and connects to it.
 */
export function connect(request?: ConnectRequest, connectCallback?: any): Emitter {
    var client = new Emitter();
    client.connect(request, connectCallback);
    return client;
}
