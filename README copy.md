# Meross API Server

![GitHub](https://img.shields.io/github/license/munirmardinli/meross-api-server)
![GitHub package.json version](https://img.shields.io/github/package-json/v/munirmardinli/meross-api-server)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
[![Documentation](https://img.shields.io/badge/docs-gh--pages-blue)](https://munirmardinli.github.io/meross-api-server/)

A TypeScript-powered Express API server for managing Meross smart devices via the Meross Cloud. Built for seamless IoT automation and smart control integration.

## 🧭 Architecture Overview

```text
┌───────────────────────────────────────────────────────────────────────┐
│                            Meross API Server                          │
│                                                                       │
│  ┌───────────────────┐    ┌───────────────────┐    ┌───────────────┐  │
│  │    Express App    │    │  MerossManager    │    │  MerossCloud  │  │
│  │                   │    │                   │    │    (SDK)      │  │
│  │ - REST Endpoints  │◄──►│ - Device Mgmt     │◄──►│ - Cloud Comm  │  │
│  │ - Middlewares     │    │ - Sync            │    │ - Auth        │  │
│  └───────────────────┘    └───────────────────┘    └───────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```


## ✨ Features

- 🔌 Connect to Meross Cloud service
- 📋 List all available Meross devices
- 🔄 Synchronize devices between local and cloud
- 🔘 Toggle device channels (on/off)
- 🚀 RESTful API endpoints for device management
- 🔒 Secure authentication with Meross Cloud
- 📝 Comprehensive TypeScript typings

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/munirmardinli/meross-api-server.git
cd meross-api-server
```
2. Install dependencies
```bash
npm install
```
3. Create a `.env` file with your Meross credentials:

```dotenv
MEROSS_EMAIL=your@email.com
MEROSS_PASSWORD=yourpassword
```

## 🚀 Usage
Running the Server

```bash
npm run dev  # Development mode with hot-reload
npm start    # Production mode
```
The server will start on port 3000 by default.

## 📡 API Endpoints
`GET /devices`

List all discovered Meross devices.

**Example Response:**

```json
[
  {
    "uuid": "1234567890",
    "name": "Smart Plug",
    "type": "mss110",
    "online": true,
    "controllable": true
  }
]
```

`POST /devices/:uuid/toggle`

Toggle a device's channel state.

**Request Body:**
```json
{
  "channel": 0
}
```

**Success Response:**
```json
{
  "status": "success",
  "device": "Smart Plug",
  "action": "toggle",
  "channel": 0
}
```

**Error Response:**
```json
{
  "error": "Device not controllable",
  "solution": "Check synchronization"
}
```

## 🛠 Development
Building the Project

```bash
npm run build
```

## ⚙️ Configuration

| Environment Variable | Required | Description                              |
|----------------------|----------|------------------------------------------|
| `MEROSS_EMAIL`      | ✅       | Your Meross account email                |
| `MEROSS_PASSWORD`   | ✅       | Your Meross account password             |
| `PORT`              | ❌       | Server port (default: `3000`)            |

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📬 Contact

Munir Mardinli

📧 munir@mardinli.de

[🔗 GitHub Repository](https://github.com/munirmardinli/meross-api-server)

## 🙌 Acknowledgments

- [Meross Cloud SDK](https://www.npmjs.com/package/meross-cloud)
- [Express](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
