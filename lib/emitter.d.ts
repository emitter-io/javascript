declare const mqtt: any;
declare class Emitter {
    private _mqtt;
    private _callbacks;
    /**
     * Occurs when connection is established.
     */
    private _onConnect();
    /**
     * Occurs when the connection was lost.
     */
    private _onDisconnect();
    /**
     * Occurs when the client went offline.
     */
    private _onOffline();
    /**
     * Occurs when the client went offline.
     */
    private _onError(error);
    /**
     * Invokes the callback with a specific
     */
    private _tryInvoke(name, args);
    /**
     * Checks if a string starts with a prefix.
     */
    private _startsWith(text, prefix);
    /**
     * Checks whether a string ends with a suffix.
     */
    private _endsWith(text, suffix);
    /**
     * Formats a channel for emitter.io protocol.
     *
     * @private
     * @param {string} key The key to use.
     * @param {string} channel The channel name.
     * @param {...Option[]} options The list of options to apply.
     * @returns
     */
    private _formatChannel(key, channel, options);
    /**
     * Connects to the emitter service.
     */
    connect(request?: ConnectRequest): void;
    /**
     * Disconnects the client.
     */
    disconnect(): void;
    /**
    * Publishes a message to the currently opened endpoint.
    */
    publish(request: PublishRequest): void;
    /**
    * Subscribes to a particular channel.
    */
    subscribe(request: SubscriptionRequest): void;
    /**
    * Unsubscribes from a particular channel.
    */
    unsubscribe(request: SubscriptionRequest): void;
    /**
     * Sends a key generation request to the server.
     */
    keygen(request: KeyGenRequest): void;
    /**
     * Hooks an event to the client.
     */
    on(event: string, callback: any): void;
    /**
     * Logs the error and throws it
     */
    private logError(message);
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
/**
 * Represents a message send througn emitter.io
 *
 * @class EmitterMessage
 */
declare class EmitterMessage {
    channel: string;
    binary: any;
    /**
     * Creates an instance of EmitterMessage.
     *
     * @param {*} m The message
     */
    constructor(m: IMqttMessage);
    /**
     * Returns the payload as string.
     */
    asString(): string;
    /**
     * Returns the payload as binary.
     */
    asBinary(): any;
    /**
     * Returns the payload as JSON-deserialized object.
     */
    asObject(): any;
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
