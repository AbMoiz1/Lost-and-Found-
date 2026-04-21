# API Gateway Property Tests

This directory contains property-based tests for the nginx API Gateway behavior, specifically testing:

- **Property 16: Rate limiting enforcement** - Verifies that rate limiting works correctly
- **Property (from 9.3): Header forwarding** - Verifies that Authorization headers are forwarded properly

## Running the Tests

### Prerequisites

1. Docker and Docker Compose installed
2. Node.js and npm installed

### Setup and Run

1. Install test dependencies:
   ```bash
   npm install
   ```

2. Start the test nginx gateway:
   ```bash
   docker compose -f docker-compose.test.yml up -d
   ```

3. Run the property tests:
   ```bash
   npm test
   ```

4. Clean up after testing:
   ```bash
   docker compose -f docker-compose.test.yml down
   ```

## Test Configuration

- **Gateway URL**: `http://localhost:8081` (configurable via `GATEWAY_URL` environment variable)
- **Test nginx config**: `nginx.test.conf` - A modified version that doesn't require backend services
- **Property test runs**: 25 iterations per property (using fast-check)

## Files

- `gateway.property.test.ts` - Main property-based test file
- `nginx.test.conf` - Test-specific nginx configuration
- `docker-compose.test.yml` - Docker compose for test environment
- `package.json` - Test dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Test Properties

### Property 16: Rate Limiting Enforcement
Tests that nginx rate limiting (100 req/min with burst=20) works correctly by making rapid requests and verifying that 429 responses are returned with proper error format.

### Property (from 9.3): Header Forwarding  
Tests that Authorization headers are processed correctly by the gateway and not stripped or modified at the gateway level.

### Additional Properties
- Gateway routing consistency
- Health endpoint availability
- Invalid route handling (404 responses)

All tests are designed to work in isolation without requiring the full microservices stack to be running.