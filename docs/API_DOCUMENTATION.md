# API Documentation with Scalar

This project uses [Scalar](https://scalar.com/) for API documentation instead of Swagger UI. Scalar provides a modern, beautiful, and feature-rich interface for exploring your API.

## Accessing the Documentation

When the API server is running, you can access the documentation at:

- **Interactive Documentation**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **OpenAPI Specification**: [http://localhost:3000/docs/openapi.json](http://localhost:3000/docs/openapi.json)

## Features

### ✨ What Scalar Provides

- **Modern UI**: Clean, responsive design with dark mode support
- **Interactive Exploration**: Test API endpoints directly from the documentation
- **Real-time Updates**: Documentation updates automatically when you modify your code
- **OpenAPI 3.0 Support**: Full compatibility with OpenAPI specifications
- **Multiple Themes**: Currently configured with the "Kepler" theme
- **Organized by Tags**: Endpoints are grouped by functional areas for easy navigation

### 📋 API Endpoints

The API includes the following endpoint groups:

#### **App**

- `GET /` - Get application information

#### **Assets**

- `POST /assets` - Create a new asset
- `GET /assets` - Get all assets (with optional filtering by YNAB account ID)
- `GET /assets/{id}` - Get an asset by ID
- `PATCH /assets/{id}` - Update an asset
- `DELETE /assets/{id}` - Delete an asset

#### **Market Data**

- `POST /market-data/asset-prices` - Get current asset prices for multiple symbols

#### **Sync**

- `POST /sync/manual` - Trigger manual synchronization to YNAB

#### **User Settings**

- `POST /settings` - Create user settings
- `GET /settings` - Get current user settings
- `PATCH /settings` - Update user settings

#### **YNAB Integration**

- `POST /ynab/budgets` - Get YNAB budgets
- `POST /ynab/accounts` - Get YNAB accounts
- `POST /ynab/accounts/update-balance` - Update YNAB account balance
- `POST /ynab/accounts/reconcile-balance` - Reconcile YNAB account balance
- `POST /ynab/sync` - Trigger portfolio sync (legacy endpoint)

### 🏗️ Implementation Details

The Scalar documentation is implemented in `/apps/api/src/documentation.ts`:

1. **OpenAPI Configuration**: Uses `@nestjs/swagger` to generate the OpenAPI specification
2. **Custom HTML**: Generates a custom HTML page with Scalar's JavaScript library
3. **Theme Customization**: Configured with a dark theme and custom styling
4. **Route Setup**: Exposes both the interactive docs and raw JSON specification

### 📖 Adding Documentation to Your Endpoints

To add documentation to your API endpoints, use OpenAPI decorators:

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('assets')
@Controller('assets')
export class AssetController {
  @Get(':id')
  @ApiOperation({ summary: 'Get an asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset retrieved successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async findOne(@Param('id') id: string) {
    // Implementation
  }
}
```

### 🎨 Customizing the Documentation

You can customize the Scalar documentation by modifying the configuration in `documentation.ts`:

- **Theme**: Change the `theme` property (options: kepler, mars, saturn, etc.)
- **Layout**: Modify the `layout` property (modern, classic)
- **Styling**: Update the `customCss` to match your brand
- **Features**: Toggle features like `hideDownloadButton`, `showSidebar`

### 🚀 Benefits Over Swagger UI

1. **Better Performance**: Faster loading and rendering
2. **Modern Design**: More visually appealing and user-friendly
3. **Better Mobile Support**: Responsive design works well on all devices
4. **Improved Developer Experience**: Better search, filtering, and navigation
5. **Customization**: More theming and styling options

## Development

The documentation is automatically available when you start the development server:

```bash
pnpm nx serve api
```

The server will log the documentation URL when it starts:

```log
📚 API Documentation is available at: http://localhost:3000/docs
```
