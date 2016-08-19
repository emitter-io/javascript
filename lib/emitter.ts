const mqtt = require('mqtt');

class Emitter {
    private _mqtt: any;
    private _callbacks: Object;

    /**
     * Occurs when connection is established.
     */
    private _onConnect() : void {
        this._tryInvoke('connect', this);
    }
    
    /**
     * Occurs when the connection was lost.
     */
    private _onDisconnect() : void {
        this._tryInvoke('disconnect', this);
    }
    
    /**
     * Occurs when the client went offline.
     */
    private _onOffline() : void {
        this._tryInvoke('offline', this);
    }
    
    /**
     * Occurs when the client went offline.
     */
    private _onError(error) : void {
        this._tryInvoke('error', error);
    }
    
    /**
     * Invokes the callback with a specific
     */
    private _tryInvoke(name: string, args: any) {
        var callback = this._callbacks[name];
        if(typeof(callback) !== 'undefined' && callback !== null){
            callback(args);
            return;
        }
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
    private _endsWith(text: string, suffix: string) : boolean {
        return text.indexOf(suffix, text.length - suffix.length) !== -1;
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
    private _formatChannel(key: string, channel: string, options: Option[]) {
        // Prefix with the key
        var formatted = this._endsWith(key, "/")
            ? key + channel
            : key + "/" + channel;

        // Add trailing slash
        if (!this._endsWith(formatted, "/"))
            formatted += "/";

        // Add options
        if (options != null && options.length > 0)
        {
            formatted += "?";
            for (var i: number = 0; i < options.length; ++i)
            {
                formatted += options[i].key + "=" + options[i].value;
                if (i + 1 < options.length)
                    formatted += "&";
            }
        }

        // We're done compiling the channel name
        return formatted;
    }
    
    /**
     * Connects to the emitter service.
     */
    public connect(request?: ConnectRequest) {
        request = request || {};
        
        // auto-resolve the security level
        if (request.secure == null) {
            if (typeof window !== 'undefined' && window != null && window.location != null && window.location.protocol != null){
                request.secure = (window.location.protocol == 'https:') ? true : false;    
            } else {
                request.secure = false;
            }
        }
        
        // default options
        var defaultConnectOptions = {
            host: "api.emitter.io",
            port: request.secure ? 8443 : 8080,
            keepalive: 30,
            secure: false
        }
            
        // apply defaults
        for (var k in defaultConnectOptions) {
            request[k] = ('undefined' === typeof request[k])
                ? defaultConnectOptions[k]
                : request[k];
        }

        request.host = request.host.replace(/.*?:\/\//g, "");
        var brokerUrl = (request.secure ? 'wss://' : 'ws://') + request.host + ':' + request.port;

        this._callbacks = {};
        this._mqtt = mqtt.connect(brokerUrl, request);
        this._mqtt.on('connect', () => {
            this._onConnect(); 
        });
        
        this._mqtt.on('close', () => {
            this._onDisconnect()
        });
        
        this._mqtt.on('offline', () => {
            this._onOffline()
        });
        
        this._mqtt.on('error', (error) => {
            this._onError(error)
        });
        
        this._mqtt.on('message', (topic, msg, packet) => {
            var message = new EmitterMessage(packet);
            if(this._startsWith(message.channel, 'emitter/keygen')) {
                // This is keygen message
                this._tryInvoke('keygen', message.asObject())
            }
            else if(this._startsWith(message.channel, 'emitter/presence')) {
                // This is presence message
                this._tryInvoke('presence', message.asObject())
            }
            else
            {
                // Do we have a message callback
                this._tryInvoke('message', message);
            }
        });
    }
    
    /**
     * Disconnects the client.
     */
    public disconnect(){
        this._mqtt.end();
    }
    
    /**
    * Publishes a message to the currently opened endpoint.
    */
    public publish (request: PublishRequest) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.publish: request object does not contain a 'key' string.");
        if (typeof (request.channel) !== "string")
            this.logError("emitter.publish: request object does not contain a 'channel' string.");
        if (typeof (request.message) !== "object" && typeof (request.message) !== "string")
            this.logError("emitter.publish: request object does not contain a 'message' object.");

        var options = new Array<Option>();
        if (request.ttl){
            options.push({ key: "ttl", value: request.ttl.toString() });
        }

        if (request.presence && request.presence == true){
            options.push({ key: "presence", value: "1" });
        }
        
        var topic = this._formatChannel(request.key, request.channel, options);
        this._mqtt.publish(topic, request.message);
    }
    
    /**
    * Subscribes to a particular channel.
    */
    public subscribe (request: SubscriptionRequest) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.subscribe: request object does not contain a 'key' string.");
        if (typeof (request.channel) !== "string")
            this.logError("emitter.subscribe: request object does not contain a 'channel' string.");

        var options = new Array<Option>();
        if (request.last != null){
            options.push({ key: "last", value: request.last.toString() });
        }
        
        // Send MQTT subscribe
        var topic = this._formatChannel(request.key, request.channel, options);
        this._mqtt.subscribe(topic);
    }

    /**
    * Unsubscribes from a particular channel.
    */
    public unsubscribe (request: SubscriptionRequest) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.unsubscribe: request object does not contain a 'key' string.")
        if (typeof (request.channel) !== "string")
            this.logError("emitter.unsubscribe: request object does not contain a 'channel' string.")

        // Send MQTT unsubscribe
        var topic = this._formatChannel(request.key, request.channel, []);
        this._mqtt.unsubscribe(topic);
    }
    
    /**
     * Sends a key generation request to the server.
     */
    public keygen (request: KeyGenRequest) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.keygen: request object does not contain a 'key' string.")
        if (typeof (request.channel) !== "string")
            this.logError("emitter.keygen: request object does not contain a 'channel' string.")
            
        // Publish the request
        this._mqtt.publish("emitter/keygen/", JSON.stringify(request));
    }

    /**
     * Sends a presence request to the server.
     */
    public presence (request: PresenceRequest) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.presence: request object does not contain a 'key' string.")
        if (typeof (request.channel) !== "string")
            this.logError("emitter.presence: request object does not contain a 'channel' string.")
            
        // Publish the request
        this._mqtt.publish("emitter/presence/", JSON.stringify(request));
    }
    
    /**
     * Hooks an event to the client.
     */
    public on(event: string, callback: any) {
        // Validate the type
        switch(event){
            case "connect": 
            case "disconnect":
            case "message":
            case "offline":
            case "error":
            case "keygen":
            case "presence":
            break;
            default:
                this.logError("emitter.on: unknown event type, supported values are 'connect', 'disconnect', 'message' and 'keygen'.");
        }
        
        // Set the callback
        this._callbacks[event] = callback;
    }
    
    /**
     * Logs the error and throws it
     */
    private logError(message){
        console.error(message);
        throw new Error(message);
    }
}


/**
 * Represents connection options. 
 * 
 * @interface IConnectOptions
 */
interface ConnectRequest {
    
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


interface PublishRequest {
    key: string;
    channel: string;
    message: any;
    ttl?: number;
    presence?: boolean;
}

interface SubscriptionRequest {
    key: string;
    channel: string;
    last: number;
}

interface KeyGenRequest {
    key: string;
    channel: string;
    type: string;
    ttl: number;
}

interface PresenceRequest {
    key: string;
    channel: string;
}


/**
 * Represents a message send througn emitter.io
 * 
 * @class EmitterMessage
 */
class EmitterMessage {
    
    public channel: string;
    public binary: any;
    
    /**
     * Creates an instance of EmitterMessage.
     * 
     * @param {*} m The message
     */
    constructor(m: IMqttMessage){
        this.channel = m.topic;
        this.binary = m.payload;
    }
    
    /**
     * Returns the payload as string.
     */
    public asString(): string{
        return this.binary.toString();
    }
    
    /**
     * Returns the payload as binary.
     */
    public asBinary(): any{
        return this.binary;
    }
    
    /**
     * Returns the payload as JSON-deserialized object.
     */
    public asObject(): any{
        return JSON.parse(this.asString());
    }
}

/**
 * Represents an MQTT message.
 * 
 * @interface IMqttMessage
 */
interface IMqttMessage {
    topic: string;
    payload: any;
}

interface Option {
    key: string;
    value: string;
}

module.exports = {
   connect: function(request?: ConnectRequest) : Emitter{
       var client = new Emitter();
       client.connect(request);
       return client;
   }
};

