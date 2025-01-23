# Mandrake

Mandrake is a monorepo containing an LLM-powered chat interface with tool execution capabilities.

## Current Status

### Completed

- ✅ Project structure and monorepo setup
- ✅ Package dependencies and build configuration
- ✅ Basic test setup with Jest
- ✅ Next.js web application with Turbopack
- ✅ Basic UI layout and navigation using shadcn/ui
- ✅ Initial page routing for core features

### In Progress

- 🔄 Package implementations
- 🔄 LangChain integration
- 🔄 MCP server connections
- 🔄 Database setup and migrations

### Upcoming

- Frontend test setup with Vitest
- Workspace management implementation
- LLM provider integration
- MCP server configuration
- State management with Zustand

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- Docker Desktop
- A Deepseek API key (sign up at https://deepseek.com)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mandrake
```

2. Install dependencies:
```bash
npm install
```

3. Create necessary environment variables:

Create a `.env` file in the root directory:
```
DATABASE_URL="postgresql://mandrake:devpassword@localhost:5432/mandrake?schema=public"
DEEPSEEK_API_KEY=your_api_key_here
```

Also create a `.env.local` file in `apps/web`:
```
DEEPSEEK_API_KEY=your_api_key_here
```

### Database Setup

The project uses PostgreSQL running in Docker. To set up the database:

```bash
# Start the database
npm run db:start

# If you need to reset the database:
npm run db:stop
npm run db:clean
npm run db:start
```

This will:
- Create a Docker container running PostgreSQL
- Set up the necessary user and permissions
- Create the database and schema
- Run Prisma migrations

### Building the Project

1. Build all packages:
```bash
npm run build
```

2. Build Docker images for MCP services:
```bash
cd packages/mcp
npm run build:test-servers /path/to/servers/repo
```

### Development

To start the development server:

```bash
cd apps/web
npm run dev
```

The application will be available at http://localhost:3000.

## 📦 Project Structure

```
mandrake/
├── apps/
│   └── web/               # Next.js web application
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── langchain/        # LangChain integrations
│   ├── mcp/             # Model Context Protocol implementation
│   └── storage/         # Database and storage functionality
└── scripts/             # Development and utility scripts
```

## 🛠️ Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build all packages
- `npm run clean` - Clean build artifacts
- `npm run db:start` - Start PostgreSQL database
- `npm run db:stop` - Stop PostgreSQL database
- `npm run db:clean` - Clean database data

## 🧪 Environment Variables

### Root `.env`
- `DATABASE_URL` - PostgreSQL connection string
- `DEEPSEEK_API_KEY` - Deepseek API key for LLM access

### Web App `.env.local`
- `DEEPSEEK_API_KEY` - Deepseek API key for LLM access (required for web app)

## 🔧 Troubleshooting

### Database Issues
If you encounter database connection issues:
1. Stop the database: `npm run db:stop`
2. Clean the data: `npm run db:clean`
3. Start fresh: `npm run db:start`

### Build Issues
If you encounter build issues:
1. Clean all builds: `npm run clean`
2. Remove node_modules: `rm -rf node_modules packages/*/node_modules apps/*/node_modules`
3. Reinstall and rebuild: `npm install && npm run build`

## Tech Stack

The project uses:

- TypeScript for type safety
- Next.js 14+ for the web application
- Turbopack for fast development
- shadcn/ui for components
- Jest for package testing
- LangChain for AI orchestration
- MCP for tool integration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.