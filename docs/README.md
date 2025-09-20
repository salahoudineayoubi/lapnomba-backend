# Marketplace Backend

This is a backend service for a marketplace application built using Node.js, Express, Mongoose, Docker, and Kubernetes.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Models](#models)
- [Business Logic](#business-logic)
- [OTP Verification](#otp-verification)
- [Docker](#docker)
- [Kubernetes](#kubernetes)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd marketplace-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the necessary configuration:
   ```
   PORT=4000
   DB_URI=mongodb://localhost:27017/marketplace
   SSL_SMS_USER=
   SSL_SMS_SID=
   SSL_SMS_PASSWORD=
   SSL_SMS_URL=http://sms.sslwireless.com/pushapi/dynamic/server.php
   ```

## Usage

To start the application, run:
```
npm start
```
The server will be running on `http://localhost:4000`.

## API Documentation

### Customers
- `GET /api/users/customers` – Get all customers
- `GET /api/users/customers/:id` – Get customer by ID
- `DELETE /api/users/customers/:id` – Delete customer

### Suppliers
- `POST /api/users/suppliers` – Create supplier (upgrade customer)
- `GET /api/users/suppliers` – Get all suppliers
- `DELETE /api/users/suppliers/:id` – Delete supplier

### Forwarders
- `POST /api/users/forwarders` – Create forwarder (upgrade customer)
- `GET /api/users/forwarders` – Get all forwarders
- `PATCH /api/users/forwarders/:id/verify` – Verify forwarder (admin)
- `DELETE /api/users/forwarders/:id` – Delete forwarder

### OTP (SSL Wireless)
- `POST /api/users/forwarders/otp/send-otp` – Send OTP by SMS
- `POST /api/users/forwarders/otp/verify-otp` – Verify OTP

## Models

### User
- `firstName`, `lastName`, `email`, `password`, `roles`, `phone` (object), `address`
- `phone` is optional at registration, required for upgrade

### Forwarder
- `userId`, `companyName`, `city`, `address`, `postalCode`, `phone`, `licenseNumber`, `region`, `activitiesDocument`, `taxDocument`, `status` (`pending`, `verified`, `rejected`)

### Supplier
- `userId`, `companyName`, `contact`, `region`, `phone`

## Business Logic

- **Upgrade customer to forwarder/supplier:**  
  - Phone number must be Turkish (`countryCode: "tr"`)
  - OTP verification required before upgrade
  - Role added to user
  - Forwarder/Supplier created with status `pending`
  - Admin can verify (`status: "verified"`)
- **OTP:**  
  - 6-digit code generated and sent by SMS (SSL Wireless)
  - Temporary storage in memory (use Redis/DB in production)
  - Verification required before account upgrade

## Docker

To build and run the application using Docker, execute:
```
docker-compose up --build
```

## Kubernetes

To deploy the application on Kubernetes, apply the configurations:
```
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.