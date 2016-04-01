var mqtt = require('mqtt');

class Emitter {
    private $mqtt: any;
    private $callbacks: Object;

    /**
     * Occurs when connection is established.
     */
    private $onConnect() : void {
        this.$tryInvoke('connect', this);
    }
    
    /**
     * Occurs when the connection was lost.
     */
    private $onDisconnect() : void {
        this.$tryInvoke('disconnect', this);
    }
    
    /**
     * Occurs when the client went offline.
     */
    private $onOffline() : void {
        this.$tryInvoke('offline', this);
    }
    
    /**
     * Occurs when the client went offline.
     */
    private $onError(error) : void {
        this.$tryInvoke('error', error);
    }
    
    /**
     * Invokes the callback with a specific
     */
    private $tryInvoke(name: string, args: any) {
        var callback = this.$callbacks[name];
        if(typeof(callback) !== 'undefined' && callback !== null){
            callback(args);
            return;
        }
    }
    
    /**
     * Checks if a string starts with a prefix.
     */
    private $startsWith(text: string, prefix: string): boolean {
        return text.slice(0, prefix.length) == prefix;
    }
    
    /**
     * Connects to the emitter service.
     */
    public connect(host: string, port: number) {
        if (host == undefined) host = "api.emitter.io";     
        if (port == undefined) port = 8080;

        this.$callbacks = {};
        this.$mqtt = mqtt.connect({ port: port, host: host, keepalive: 10000 });
        this.$mqtt.on('connect', () => {
            this.$onConnect(); 
        });
        
        this.$mqtt.on('close', () => {
            this.$onDisconnect()
        });
        
        this.$mqtt.on('offline', () => {
            this.$onOffline()
        });
        
        this.$mqtt.on('error', (error) => {
            this.$onError(error)
        });
        
        this.$mqtt.on('message', (topic, msg, packet) => {
            var message = new EmitterMessage(packet);
            if(this.$startsWith(message.channel, 'emitter/keygen')) {
                // This is keygen message
                this.$tryInvoke('keygen', message.asObject())
            }
            else
            {
                // Do we have a message callback
                this.$tryInvoke('message', message);
            }
        });
    }
    
    /**
     * Disconnects the client.
     */
    public disconnect(){
        this.$mqtt.end();
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

        var topic = request.key + "/" + request.channel;
        this.$mqtt.publish(topic, request.message);
    }
    
    /**
    * Subscribes to a particular channel.
    */
    public subscribe (request: SubscriptionRequest) {
        if (typeof (request.key) !== "string")
            this.logError("emitter.subscribe: request object does not contain a 'key' string.");
        if (typeof (request.channel) !== "string")
            this.logError("emitter.subscribe: request object does not contain a 'channel' string.");

        // Send MQTT subscribe
        this.$mqtt.subscribe(request.key + "/" + request.channel);
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
        this.$mqtt.unsubscribe(request.key + "/" + request.channel);
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
        this.$mqtt.publish("emitter/keygen/", JSON.stringify(request));
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
            break;
            default:
                this.logError("emitter.on: unknown event type, supported values are 'connect', 'disconnect', 'message' and 'keygen'.");
        }
        
        // Set the callback
        this.$callbacks[event] = callback;
    }
    
    /**
     * Logs the error and throws it
     */
    private logError(message){
        console.error(message);
        throw new Error(message);
    }
}

interface PublishRequest {
    key: string;
    channel: string;
    message: any;
}

interface SubscriptionRequest {
    key: string;
    channel: string;
}

interface KeyGenRequest {
    key: string;
    channel: string;
    type: string;
    ttl: number;
}

class EmitterMessage {
    
    public channel: string;
    public binary: any;
    
    /**
     * Constructs a new emitter message.
     */
    constructor(m: any){
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

module.exports = {
   connect: function(host: string, port: number) : Emitter{
       var client = new Emitter();
       client.connect(host, port);
       return client;
   }
};