/**
 * @file Meross API Server
 * @module MerossManagerApp
 * @version 1.0.0
 * @description
 *   TypeScript-based Express API server for managing Meross smart devices
 *   via the Meross Cloud. Supports device synchronization, control (toggle),
 *   and RESTful API endpoints for device management.
 *
 * @author Munir Mardinli <munir@mardinli.de>
 * @copyright 2025 Munir Mardinli
 * @license MIT
 * @see {@link https://developer.meross.com|Meross Developer Documentation}
 * @since 1.0.0
 */
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import MerossCloud, {type DeviceDefinition, MerossCloudDevice } from "meross-cloud";
import axios from "axios";
import crypto from "crypto";
import "dotenv/config";
import {
	type ErrorResponse,
	type SuccessResponse,
	type ToggleRequest,
	type MerossDevice,
} from "./types";

/**
 * MerossManager class manages connection to Meross Cloud,
 * device initialization, synchronization and control operations.
 *
 * @remarks
 * Uses meross-cloud SDK for device interaction and axios for REST API calls.
 *
 * @public
 * @class
 * @example
 * const manager = new MerossManager();
 * await manager.connect();
 * console.log(manager.devices); // List all discovered devices
 */
export class MerossManager {
	/**
	 * Instance of the MerossCloud SDK.
	 *
	 * @readonly
	 * @private
	 */
	private meross: MerossCloud;
	/**
	 * List of known Meross devices.
	 *
	 * @public
	 * @type {MerossDevice[]}
	 */
	public devices: MerossDevice[] = [];

	/**
	 * Creates an instance of MerossManager.
	 * Initializes the MerossCloud instance and sets up event listeners.
	 *
	 * @constructor
	 * @public
	 * @throws {Error} When MEROSS_EMAIL or MEROSS_PASSWORD environment variables are missing
	 * @example
	 * // Requires MEROSS_EMAIL and MEROSS_PASSWORD in .env
	 * const manager = new MerossManager();
	 */
	constructor() {
		this.meross = new MerossCloud({
			email: process.env.MEROSS_EMAIL!,
			password: process.env.MEROSS_PASSWORD!,
			logger: (msg: string) => console.info(`[Meross] ${msg}`),
			localHttpFirst: false,
			timeout: 10000,
		});

		this.setupEventHandlers();
	}

	/**
	 * Sets up internal event handlers for the MerossCloud SDK events.
	 *
	 * @private
	 * @returns {void}
	 */
	private setupEventHandlers() {
		this.meross.on(
			"deviceInitialized",
			(
				deviceId: string,
				deviceDef: DeviceDefinition,
				device: MerossCloudDevice
			) => {
				this.handleDeviceInitialized(deviceDef, device);
			}
		);
	}

	/**
	 * Handles device initialization event.
	 *
	 * Adds new devices to the internal device list.
	 *
	 * @private
	 * @param {DeviceDefinition} deviceDef - Definition of the initialized device.
	 * @param {MerossCloudDevice} device - Meross device instance.
	 * @returns {void}
	 * @example
	 * // Internal usage example when device is discovered
	 * handleDeviceInitialized(deviceDef, device);
	 */
	private handleDeviceInitialized(
		deviceDef: DeviceDefinition,
		device: MerossCloudDevice
	) {
		const existing = this.devices.find((d) => d.uuid === deviceDef.uuid);

		if (!existing) {
			const newDevice: MerossDevice = {
				uuid: deviceDef.uuid,
				devName: deviceDef.devName,
				deviceType: deviceDef.deviceType,
				onlineStatus: deviceDef.onlineStatus,
				/**
				 * Toggles device channel.
				 *
				 * @param {number} [channel=0] - Channel index to toggle.
				 * @returns {Promise<void>} Resolves on success.
				 * @throws {Error} When toggle operation fails
				 * @example
				 * await device.toggle(); // Toggle channel 0
				 * await device.toggle(1); // Toggle channel 1
				 */
				toggle: async (channel = 0) => {
					return new Promise((resolve, reject) => {
						device.controlToggleX(channel, true, (error) => {
							if (error) {
								console.error(`Error toggling ${deviceDef.devName}:`, error);
								reject(error);
							} else {
								console.log(`✅ ${deviceDef.devName} toggled successfully`);
								resolve();
							}
						});
					});
				},
			};

			this.devices.push(newDevice);
			console.info(
				`✅ ${newDevice.devName} initialized (${deviceDef.deviceType})`
			);
		}
	}

	/**
	 * Connects to Meross Cloud service.
	 *
	 * @public
	 * @returns {Promise<void>} Resolves on successful connection
	 * @throws {Error} When connection fails
	 * @example
	 * await manager.connect();
	 */
	async connect() {
		return new Promise<void>((resolve, reject) => {
			this.meross.connect((error: Error) => {
				if (error) {
					console.error("❌ Connection error:", error);
					reject(error);
				} else {
					console.info("✅ Connected to Meross Cloud");
					this.handleCloudConnect();
					resolve();
				}
			});
		});
	}

	/**
	 * Handles post-connection authentication and device sync.
	 *
	 * @private
	 * @async
	 * @returns {Promise<void>}
	 */
	private async handleCloudConnect() {
		try {
			const tokenData = this.meross.getTokenData();

			if (!tokenData) {
				throw new Error("Token data not available");
			}

			console.info("🔑 Authentication successful");
			await this.syncCloudDevices(tokenData);
		} catch (error) {
			console.error("❌ Authentication error:", error);
		}
	}

	/**
	 * Synchronizes cloud devices with local device list.
	 *
	 * @private
	 * @async
	 * @param {object} tokenData - Token data with key and token.
	 * @param {string} tokenData.key - API key for signing requests
	 * @param {string} tokenData.token - Authentication token
	 * @returns {Promise<void>}
	 * @throws {Error} When synchronization fails
	 */
	private async syncCloudDevices(tokenData: {
		key: string;
		token: string;
	}): Promise<void> {
		try {
			const timestamp = Math.floor(Date.now() / 1000);
			const nonce = Math.random().toString(36).substring(2, 10);
			const sign = this.createRequestSignature(tokenData.key, "devList", {});

			const response = await axios.post(
				"https://iotx.meross.com/v1/Device/devList",
				{
					params: "e30=",
					sign,
					timestamp,
					nonce,
				},
				{
					headers: {
						Authorization: `Basic ${tokenData.token}`,
						"Content-Type": "application/json",
						"User-Agent": "Meross-Cloud-NodeJS/1.0",
					},
					timeout: 10000,
				}
			);

			const devicesData = response.data?.data || [];
			if (Array.isArray(devicesData)) {
				devicesData.forEach((apiDevice: MerossDevice) => {
					if (!this.devices.some((d) => d.uuid === apiDevice.uuid)) {
						console.info(`☁️ ${apiDevice.devName} added from cloud`);
						this.devices.push(this.createCloudDevice(apiDevice));
					}
				});
				console.info(`🔄 ${devicesData.length} devices synchronized`);
			} else {
				console.warn("⚠️ No device data found in response");
			}
		} catch (error) {
			console.error(
				"❌ Cloud synchronization failed:",
				error instanceof Error ? error.message : error
			);
		}
	}

	/**
	 * Creates HMAC SHA256 signature for Meross API requests.
	 *
	 * @private
	 * @param {string} key - Secret key for signing.
	 * @param {string} method - API method name.
	 * @param {object} payload - Request payload.
	 * @returns {string} Uppercase hexadecimal HMAC signature.
	 * @example
	 * const signature = createRequestSignature('my-key', 'devList', {});
	 */
	private createRequestSignature(
		key: string,
		method: string,
		payload: object
	): string {
		const message = JSON.stringify(payload);
		return crypto
			.createHmac("sha256", key)
			.update(method + message)
			.digest("hex")
			.toUpperCase();
	}

	/**
	 * Converts cloud API device object into controllable MerossDevice.
	 *
	 * @private
	 * @param {MerossDevice} apiDevice - Device data from cloud.
	 * @returns {MerossDevice} Device with control methods.
	 */
	private createCloudDevice(apiDevice: MerossDevice): MerossDevice {
		return {
			uuid: apiDevice.uuid,
			devName: apiDevice.devName,
			deviceType: apiDevice.deviceType,
			onlineStatus: apiDevice.onlineStatus,
			/**
			 * Toggles device channel via cloud.
			 *
			 * @param {number} [channel=0] - Channel index.
			 * @returns {Promise<void>}
			 * @throws {Error} When toggle operation fails
			 */
			toggle: async (channel = 0) => {
				const device = this.meross.getDevice(apiDevice.uuid);
				if (device) {
					await new Promise<void>((resolve, reject) => {
						(device as MerossCloudDevice).controlToggleX(
							channel,
							true,
							(error) => {
								if (error) {
									console.error(
										`Error toggling ${apiDevice.devName} via cloud:`,
										error
									);
									reject(error);
								} else {
									console.info(
										`☁️ ${apiDevice.devName} toggled successfully via cloud`
									);
									resolve();
								}
							}
						);
					});
				}
			},
		};
	}
}

/**
 * Express API Server exposing Meross device management endpoints.
 *
 * @public
 * @class
 * @example
 * const app = new App(3000);
 * app.start(); // Starts server on port 3000
 */
export class App {
	/**
	 * Express application instance.
	 *
	 * @private
	 * @readonly
	 */
	private app: Application;
	/**
	 * Server port number.
	 *
	 * @private
	 */
	private port: number;
	/**
	 * HTTP server instance.
	 *
	 * @private
	 */
	private server?: ReturnType<typeof this.app.listen>;

	/**
	 * MerossManager instance.
	 *
	 * @private
	 * @readonly
	 */

	private merossManager: MerossManager;
	/**
	 * Creates an App instance.
	 *
	 * @constructor
	 * @param {number} [port=3000] - HTTP server port.
	 * @example
	 * // Create server on default port 3000
	 * const app = new App();
	 *
	 * // Create server on custom port
	 * const app = new App(8080);
	 */

	constructor(port: number = 3000) {
		this.app = express();
		this.port = port;
		this.merossManager = new MerossManager();
		this.initializeMiddlewares();
		this.initializeRoutes();
	}
	/**
	 * Initializes Express middlewares.
	 *
	 * @private
	 * @returns {void}
	 */
	private initializeMiddlewares(): void {
		this.app.use(express.json());
	}
	/**
	 * Initializes API routes.
	 *
	 * @private
	 * @returns {void}
	 */
	private initializeRoutes(): void {
		this.app.get("/devices", this.getDevicesHandler.bind(this));
		this.app.post("/devices/:uuid/toggle", this.toggleDeviceHandler.bind(this));
	}
	/**
	 * Handles GET /devices request.
	 *
	 * @private
	 * @param {Request} req - Express request object
	 * @param {Response} res - Express response object
	 * @returns {void}
	 * @example
	 * // Response example
	 * [
	 *   {
	 *     "uuid": "1234567890",
	 *     "name": "Smart Plug",
	 *     "type": "mss110",
	 *     "online": true,
	 *     "controllable": true
	 *   }
	 * ]
	 */
	private getDevicesHandler(req: Request, res: Response): void {
		const response = this.merossManager.devices.map((device) => ({
			uuid: device.uuid,
			name: device.devName,
			type: device.deviceType,
			online: device.onlineStatus === 1,
			controllable: typeof device.toggle === "function",
		}));

		res.json(response);
	}

	/**
	 * Handles device toggle requests.
	 *
	 * @private
	 * @async
	 * @param {Request} req - Express request object with UUID parameter
	 * @param {Response} res - Express response object
	 * @returns {Promise<void>}
	 * @example
	 * // Request example
	 * POST /devices/1234567890/toggle
	 * {
	 *   "channel": 0
	 * }
	 *
	 * // Success response
	 * {
	 *   "status": "success",
	 *   "device": "Smart Plug",
	 *   "action": "toggle",
	 *   "channel": 0
	 * }
	 *
	 * // Error response
	 * {
	 *   "error": "Device not controllable",
	 *   "solution": "Check synchronization"
	 * }
	 */
	private async toggleDeviceHandler(
		req: Request<
			{ uuid: string },
			SuccessResponse | ErrorResponse,
			ToggleRequest
		>,
		res: Response<SuccessResponse | ErrorResponse>
	): Promise<void> {
		const device = this.merossManager.devices.find(
			(d) => d.uuid === req.params.uuid
		);
		const channel = req.body.channel ?? 0;

		if (!device || typeof device.toggle !== "function") {
			res.status(400).json({
				error: "Device not controllable",
				solution: "Check synchronization",
			});
			return;
		}

		try {
			await device.toggle(channel);
			res.json({
				status: "success",
				device: device.devName,
				action: "toggle",
				channel,
			});
		} catch (error) {
			res.status(500).json({
				error: "Toggle operation failed",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
	/**
	 * Starts the Express server and connects to Meross Cloud.
	 *
	 * @public
	 * @returns {void}
	 * @example
	 * const app = new App();
	 * app.start();
	 */
	public start(): void {
		this.server = this.app.listen(this.port, () => {
			console.info(`API server started on port ${this.port}`);
			this.merossManager.connect().catch((error) => {
				console.error("Startup error:", error);
				process.exit(1);
			});
		});
	}
	/**
	 * Gracefully shuts down the Express server.
	 *
	 * @public
	 * @async
	 * @returns {Promise<void>} Resolves when server is closed
	 * @throws {Error} If server shutdown fails
	 * @example
	 * await app.close();
	 */
	public async close(): Promise<void> {
		if (this.server) {
			return new Promise((resolve, reject) => {
				this.server?.close((err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		}
	}
}

// Start the application
new App().start();
