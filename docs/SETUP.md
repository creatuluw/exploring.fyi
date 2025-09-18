# Explore.fyi Setup Instructions

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **pnpm**
3. **Google AI API Key** (required for AI features)

## Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy the environment example file:
```bash
cp .env.example .env
```

3. Get your Google AI API key:
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Create a new API key
   - Copy the API key

4. Add your API key to the `.env` file:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Features

### ✅ Currently Working
- **Topic Analysis**: Enter a topic and get an AI-generated mind map
- **URL Analysis**: Analyze web content and create mind maps
- **Interactive Mind Maps**: Click to expand concepts with AI-generated sub-concepts
- **Real-time AI Integration**: Powered by Google's Gemini AI model

### 🚧 Coming Soon
- Content pages with detailed explanations
- Source tracking and credibility analysis
- Progress tracking
- Export functionality

## Usage

1. **Explore Topics**: 
   - Enter any topic on the home page
   - AI will analyze and create an interactive mind map
   - Click on concept nodes to expand them further

2. **Analyze URLs**:
   - Paste any URL to analyze its content
   - AI will extract key concepts and create a mind map
   - Great for learning from articles, documentation, etc.

## Architecture

- **Frontend**: SvelteKit with TypeScript
- **AI Integration**: Google Genkit with Gemini Flash model
- **Visualization**: Svelte Flow for interactive mind maps
- **Styling**: Tailwind CSS with custom design system
- **Schema Validation**: Zod for AI response validation

## Troubleshooting

### AI Features Not Working
- Ensure your `GEMINI_API_KEY` is correctly set in `.env`
- Check the browser console for any API errors
- Verify your API key has sufficient quota

### Development Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check that all dependencies are properly installed
- Ensure you're using Node.js v18 or higher

## Current Status

**Phase 3 Complete**: AI Integration with Genkit (Days 8-12)
- ✅ Real AI content generation with Google AI  
- ✅ Genkit configuration and schema validation
- ✅ Dynamic topic analysis and expansion
- ✅ URL analysis service with validation
- ✅ AI-powered mind map generation and node expansion

**Next**: Phase 4 - Content Pages & Navigation (Days 13-16)
