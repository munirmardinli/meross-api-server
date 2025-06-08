interface ErrorResponse {
	error: string;
	solution?: string;
	details?: string;
}

interface SuccessResponse {
	status: string;
	device: string;
	action: string;
	channel?: number;
}

interface ToggleRequest {
	channel?: number;
}

interface MerossDevice {
	uuid: string;
	devName: string;
	deviceType: string;
	onlineStatus: number;
	toggle: (channel?: number) => Promise<void>;
}

export {
	type ErrorResponse,
	type ToggleRequest,
	type MerossDevice,
	type SuccessResponse
}
