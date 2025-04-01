# Mandrake API OpenAPI Documentation

This directory contains the OpenAPI 3.0 specification for the Mandrake API. The OpenAPI specification provides a standardized way to describe the API, including endpoints, request/response formats, and authentication requirements.

## Files

- `openapi.yaml` - The complete OpenAPI 3.0 specification

## Using the OpenAPI Specification

The OpenAPI specification can be used in several ways:

### 1. View with OpenAPI Tools

You can view and explore the API using tools like:

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Redoc](https://redoc.ly/)
- [Stoplight Studio](https://stoplight.io/studio)

Example using Swagger UI with a local HTTP server:

```bash
# Install swagger-ui globally
npm install -g swagger-ui-server

# Serve the OpenAPI spec
swagger-ui-server ./openapi.yaml
```

### 2. Import into API Testing Tools

Import the specification into API testing tools for easier API exploration:

- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [Thunder Client](https://www.thunderclient.com/)

### 3. Generate Client Libraries

Use OpenAPI code generators to create client libraries for various programming languages:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate -i ./openapi.yaml -g typescript-fetch -o ../clients/typescript

# Generate Python client
openapi-generator-cli generate -i ./openapi.yaml -g python -o ../clients/python
```

## Validating the OpenAPI Specification

To ensure the OpenAPI specification remains in sync with the actual API implementation, run the validation test:

```bash
# From the api package root
bun run validate:openapi
```

This test:
1. Loads the OpenAPI spec from the YAML file
2. Compares defined routes with actual API routes
3. Validates schema definitions

## Keeping the Specification Up to Date

When making changes to the API:

1. Update the OpenAPI specification to reflect the changes
2. Run the validation tests to ensure the spec matches the implementation
3. Document any breaking changes in the API changelog

## Schema Definitions

The OpenAPI specification includes schemas for all request and response objects:

- `SystemInfo` - System status and version information
- `WorkspaceInfo` - Workspace metadata and configuration
- `SessionInfo` - Session metadata
- `Message` - Message format for conversations
- `ToolOperation` - Tool operation definition
- `ToolConfig` - Tool configuration format
- `ModelsConfig` - Model configuration and providers
- And more...

## Future Improvements

- [ ] Add authentication details when implemented
- [ ] Include more detailed examples for each endpoint
- [ ] Generate documentation website from the OpenAPI spec
- [ ] Add request/response validation middleware based on the spec