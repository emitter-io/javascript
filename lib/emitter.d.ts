export declare class Emitter {
    private _mqtt;
    private _callbacks;
    private _reqCallbacks;
    /**
     * Connects to the emitter service.
     */
    connect(request?: ConnectRequest, handler?: () => void): Emitter;
    /**
     * Disconnects the client.
     */
    disconnect(): Emitter;
    /**
     * Publishes a message to the currently opened endpoint.
     */
    publish(request: PublishRequest): Emitter;
    /**
     * Publishes a message througth a link.
     */
    publishWithLink(request: PublishWithLinkRequest): Emitter;
    /**
     * Subscribes to a particular channel.
     */
    subscribe(request: SubscribeRequest): Emitter;
    /**
     * Create a link to a particular channel.
     */
    link(request: LinkRequest): Emitter;
    /**
     * Unsubscribes from a particular channel.
     */
    unsubscribe(request: UnsubscribeRequest): Emitter;
    /**
     * Sends a key generation request to the server.
     */
    keygen(request: KeyGenRequest, callback: (args?: any) => void): Emitter;
    /**
     * Sends a key ban/unban request to the server.
     */
    keyban(request: KeyBanRequest, callback: (args?: any) => void): Emitter;
    /**
     * Sends a presence request to the server.
     */
    presence(request: PresenceRequest): Emitter;
    /**
     * Request information about the connection to the server.
     */
    me(callback: (args?: any) => void): Emitter;
    /**
     * Hooks an event to the client.
     */
    on(event: EmitterEvents | string, callback: (args?: any) => void): Emitter;
    /**
     * Unhooks an event from the client.
     */
    off(event: EmitterEvents | string, callback: (args?: any) => void): Emitter;
    private _checkEvent;
    /**
     * Invokes the callback with a specific name.
     */
    private _tryInvoke;
    private _tryInvokeResponse;
    /**
     * Formats a channel for emitter.io protocol.
     *
     * @private
     * @param {string} key The key to use.
     * @param {string} channel The channel name.
     * @param {...Option[]} options The list of options to apply.
     * @returns
     */
    private _formatChannel;
    /**
     * Checks if a string starts with a prefix.
     */
    private _startsWith;
    /**
     * Checks whether a string ends with a suffix.
     */
    private _endsWith;
    /**
     * Logs the error and throws it
     */
    private _throwError;
}
/**
 * Represents a message send througn emitter.io
 *
 * @class EmitterMessage
 */
export declare class EmitterMessage {
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
 * Represents the available events.
 */
export declare enum EmitterEvents {
    connect = "connect",
    disconnect = "disconnect",
    message = "message",
    offline = "offline",
    error = "error",
    presence = "presence"
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
export interface KeyBanRequest {
    secretKey: string;
    targetKey: string;
    banned: boolean;
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
export declare function connect(request?: ConnectRequest, connectCallback?: any): Emitter;
