# TxCo - Retail Media Creative Tool

Professional-grade design editor built for advertisers, marketers, and creative teams. Create brand-compliant, multi-format creatives with AI-powered assistance.

## Overview

TxCo is a Retail Media Creative Tool that empowers advertisers to autonomously create guideline-compliant, professional-quality creatives. Built to solve the challenge of resource-intensive creative production for retail media campaigns.

## Problem Statement

Booking retail media campaigns requires creative assets that meet both retailer and brand guidelines. Creatives come in multiple formats and sizes for diverse media: in-store point-of-sale, online display, social media, etc. The process is resource-intensive with lack of agency support for smaller advertisers.

## Core Features

### Canvas Editor
- Drag and drop interface
- Multi-page design support
- Professional templates
- Real-time editing with visual feedback
- Undo/Redo functionality
- Keyboard shortcuts (Ctrl+Z, Ctrl+C, Ctrl+V, Delete, etc.)

### Element Support
- Text with custom fonts and styling
- Shapes (rectangles, circles, triangles, stars, polygons)
- Images with filters and transformations
- Icons and custom graphics
- Drawing tools (pen, lines, arrows)
- Layer management

### Design Tools
- Background removal
- Image resize and rotate
- Color palette management
- Element alignment and snapping
- Lock and visibility controls
- Custom canvas dimensions

### Export Capabilities
- Download as PNG, JPG, PDF
- Multi-format export (Instagram, Facebook, Twitter sizes)
- Image optimization (target: <500KB)
- Batch export support

### AI Integration (In Development)
- Real-time HTML/CSS serialization
- Design compliance checking
- Automated guideline validation
- AI-driven creative suggestions
- Multi-format adaptive resizing

## Tech Stack

### Frontend
- React.js 18
- Redux Toolkit (State Management)
- Ant Design (UI Components)
- Konva.js (Canvas Rendering)
- React Router DOM (Navigation)
- Vite (Build Tool)

### Planned Backend
- Python + FastAPI (API Server)
- Claude AI / OpenAI (Design Analysis)
- MongoDB (Database)
- Pillow (Image Processing)

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file in the root directory:

```
VITE_GOOGLE_FONTS_KEY=your_google_fonts_api_key
```

Get your Google Fonts API key from: https://developers.google.com/fonts/docs/developer_api

## Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── assets/          # Images, banners, templates
├── components/      # Reusable UI components
├── editing/         # Shape editing controls
├── pages/           # Page components (Home, Editor, Dashboard)
├── react-konva/     # Canvas elements (Text, Shapes, Images)
├── redux/           # State management
└── utils/           # Utility functions
```

## Key Features in Detail

### Real-time HTML/CSS Console
The editor serializes canvas state to HTML/CSS code in real-time, enabling AI agents to analyze and improve designs programmatically.

### Compliance Engine (Planned)
Validates creatives against:
- Retailer guidelines
- Brand identity constraints
- Platform specifications
- Visual standards

### Multi-Format Generation (Planned)
Automatically adapts designs for:
- Instagram Story (1080x1920)
- Instagram Post (1080x1080)
- Facebook Post (1200x630)
- Twitter Post (1200x675)
- Custom dimensions

## Keyboard Shortcuts

- `Ctrl+Z` / `Cmd+Z` - Undo
- `Ctrl+Y` / `Cmd+Y` - Redo
- `Ctrl+C` / `Cmd+C` - Copy element
- `Ctrl+V` / `Cmd+V` - Paste element
- `Ctrl+X` / `Cmd+X` - Cut element
- `Ctrl+D` / `Cmd+D` - Duplicate element
- `Ctrl+S` / `Cmd+S` - Save template
- `Delete` / `Backspace` - Delete element
- `Arrow Keys` - Move element (1px)
- `Shift + Arrow Keys` - Move element (10px)
- `Escape` - Deselect element

## Evaluation Criteria Met

- Innovation in leveraging Generative AI
- Alignment with creative guidelines challenge
- Scalable multi-format, multi-channel generation
- User experience for non-expert advertisers
- Clear technical implementation

## Roadmap

### Phase 1 (Current)
- Core canvas editor
- Element manipulation
- Template system
- Export functionality

### Phase 2 (In Progress)
- Backend API development
- AI integration
- Compliance checking
- Multi-format generation

### Phase 3 (Planned)
- Background removal AI
- Collaborative editing
- Performance optimization
- Campaign analytics

## Contributing

This project was built for the Retail Media Creative Tool Hackathon.

## License

MIT

## Repository

https://github.com/CroWzblooD/TxCo

## Acknowledgments

Built with focus on user experience, compliance automation, and AI-driven creative optimization.
