# 🧪 Data Alchemist

**Transform messy spreadsheet data into clean, validated datasets for resource allocation**

[![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![AI-Powered](https://img.shields.io/badge/AI-Google%20Gemini%202.0-green)](https://ai.google.dev/)

Data Alchemist is an AI-enhanced web application that solves the common problem of messy, inconsistent spreadsheet data in resource allocation and workforce management. Upload your CSV/XLSX files and get production-ready, validated datasets with intelligent error correction and business rule automation.

## 🌟 Key Features

### 📊 **Intelligent Data Processing**
- **AI-Powered Header Mapping**: Automatically maps your column headers to standardized fields
- **Multi-Format Support**: CSV and XLSX (Excel) file processing
- **Real-Time Validation**: 12+ validation rules with instant feedback
- **Auto-Save**: Never lose your work with automatic data persistence

### 🔍 **AI-Enhanced Search & Discovery**
- **Natural Language Search**: Query your data with plain English
  - *"Show me high priority clients with JavaScript tasks"*
  - *"Available workers with Senior qualification"*
- **Complex Query Support**: Cross-entity relationships and filtering
- **Confidence Scoring**: AI results with reliability indicators

### ⚡ **Advanced Error Resolution**
- **Automatic Error Fixing**: One-click resolution for common data issues
- **Bulk Operations**: Fix multiple errors simultaneously
- **Smart Suggestions**: AI-powered recommendations for data improvements
- **Visual Error Tracking**: Color-coded validation with detailed explanations

### 🎯 **Business Rules Engine**
Create sophisticated allocation rules with multiple approaches:
- **Visual Rule Builder**: Drag-and-drop interface for rule creation
- **Natural Language Rules**: *"Database tasks must run before API tasks"*
- **Rule Templates**: Pre-built rules for common scenarios
- **AI Rule Assistant**: Intelligent rule suggestions based on your data

### 📈 **Prioritization System**
- **Weight Sliders**: Adjust criteria importance
- **AHP Matrix**: Analytic Hierarchy Process for complex decisions
- **Preset Profiles**: Expert-designed prioritization strategies
- **Real-Time Visualization**: See the impact of your choices

### 📦 **Production-Ready Export**
- **Clean CSV Files**: Standardized output for all entity types
- **Rules Configuration**: Complete business logic export (rules.json)
- **Bulk Download**: ZIP packages with all files
- **Export Preview**: Review data before download

## 🏗️ Technology Stack

### **Frontend**
- **Framework**: Next.js 15.3.4 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Data Grids**: AG-Grid Community for high-performance editing
- **State Management**: Zustand stores with persistence

### **Backend & AI**
- **API Routes**: Next.js serverless functions
- **AI Integration**: Google Gemini 2.0 Flash API
- **Validation**: Zod schemas with custom validators
- **File Processing**: XLSX library for Excel handling

### **Data Flow**
```
CSV/XLSX Upload → AI Header Mapping → Data Validation → 
Rule Processing → Prioritization → Clean Export
```

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18.0.0 or higher
- npm, yarn, pnpm, or bun package manager
- Google Gemini API key (for AI features)

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/your-username/data-alchemist.git
cd data-alchemist
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Google Gemini AI API Key (required for AI features)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Custom model configuration
GEMINI_MODEL=gemini-2.0-flash-exp
```

4. **Start the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. **Open the application**
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### **Step 1: Upload Your Data**
1. Go to the **Upload** tab
2. Drag & drop your CSV/XLSX files or click to browse
3. AI automatically maps column headers to expected fields
4. Review the data summary and processing results

### **Step 2: Validate & Fix Data**
1. Check the **Validation** tab for data quality issues
2. Review errors by category (Clients, Workers, Tasks, Cross-Entity)
3. Use **Auto-fix** buttons for automatic error resolution
4. Manually review and fix complex business logic issues

### **Step 3: Edit Your Data** *(Optional)*
- **Clients Tab**: Manage client information and task assignments
- **Workers Tab**: Update worker skills, capacity, and qualifications  
- **Tasks Tab**: Modify task definitions and requirements

### **Step 4: Search & Explore** *(Optional)*
- Use natural language search: *"Workers with Python skills"*
- Perform complex queries across multiple entity types
- Filter and discover data patterns

### **Step 5: Create Business Rules** *(Optional)*
Choose from 7 rule creation methods:
- **Co-run Rules**: Tasks that must execute together
- **Slot Restrictions**: Limit workers per task group
- **Load Limits**: Control workload distribution
- **Phase Windows**: Time-based task constraints
- **Pattern Matching**: Rules based on data patterns
- **Precedence Overrides**: Priority system modifications
- **AI Assistant**: Natural language rule creation

### **Step 6: Set Prioritization** *(Optional)*
- **Weight Sliders**: Adjust criteria importance
- **Ranking Interface**: Drag-and-drop priority ordering
- **AHP Matrix**: Systematic pairwise comparisons
- **Preset Profiles**: Expert-designed strategies
- **Visualization**: Real-time impact analysis

### **Step 7: Export Clean Data**
1. Go to the **Export** tab
2. Ensure validation shows "Ready" status (no errors)
3. Preview your cleaned data
4. Download individual CSV files or bulk ZIP package
5. Generate rules.json for downstream systems

## 📁 Project Structure

```
data-alchemist/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main application layout
│   └── api/                      # API routes
│       └── ai/search/            # AI search endpoint
├── components/                   # React components
│   ├── auto-save/               # Auto-save functionality
│   ├── data-grids/              # AG-Grid components
│   ├── export/                  # Export system
│   ├── prioritization/          # Prioritization interfaces
│   ├── rules/                   # Business rules UI
│   ├── search/                  # AI search interface
│   ├── ui/                      # Shadcn/ui components
│   ├── upload/                  # File upload system
│   └── validation/              # Validation display
├── lib/                         # Core business logic
│   ├── ai/                      # AI integration
│   ├── export/                  # Export utilities
│   ├── parsers/                 # File processing
│   ├── rules/                   # Business rules engine
│   ├── stores/                  # Zustand state management
│   ├── types/                   # TypeScript definitions
│   ├── utils/                   # Utility functions
│   └── validation/              # Validation engine
├── samples/                     # Sample CSV files
```

## 🔧 Development

### **Available Scripts**

```bash
# Development
npm run dev          # Start development server
npm run build        # Create production build
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript compilation check

# Testing (when configured)
npm test             # Run test suite
npm test:watch       # Run tests in watch mode
```


### **Key Development Guidelines**

- **State Management**: Use Zustand stores for different concerns
- **Validation**: Integrate with the validation engine for all data operations
- **AI Integration**: Always provide fallback mechanisms
- **Performance**: Target 1,000+ row datasets with sub-2-second response
- **UI Patterns**: Follow existing component patterns and styling

## 🌍 Deployment

### **Vercel (Recommended)**

1. **Connect repository** to Vercel dashboard
2. **Configure environment variables** in Vercel settings:
   ```
   GOOGLE_GEMINI_API_KEY=your_api_key
   ```
3. **Deploy** automatically on git push

### **Other Platforms**

The application can be deployed on any platform supporting Next.js:
- **Netlify**: Use `@netlify/plugin-nextjs`
- **Railway**: Direct deployment support
- **Docker**: Create Dockerfile for containerization

### **Environment Configuration**

**Required Variables:**
- `GOOGLE_GEMINI_API_KEY`: Google Gemini API key for AI features

**Optional Variables:**
- `GEMINI_MODEL`: Custom model specification (default: gemini-2.0-flash-exp)
- `NODE_ENV`: Environment mode (development/production)

## 📊 Sample Data

The `samples/` directory contains test datasets for development:

- **clients.csv**: Sample client data with various priority levels
- **workers.csv**: Worker data with skills and qualifications
- **tasks.csv**: Task definitions with requirements and categories

Use these files to test the complete workflow from upload to export.

## 🔍 API Reference

### **AI Search Endpoint**

```typescript
POST /api/ai/search
Content-Type: application/json

{
  "query": "high priority clients with JavaScript tasks",
  "entities": {
    "clients": [...],
    "workers": [...], 
    "tasks": [...]
  },
  "options": {
    "entityType": "client" | "worker" | "task",
    "limit": 10
  }
}
```

**Response:**
```typescript
{
  "results": SearchResult[],
  "confidence": number,
  "fallbackUsed": boolean
}
```


## 🐛 Troubleshooting

### **Common Issues**

**AI features not working:**
- Verify `GOOGLE_GEMINI_API_KEY` is set correctly
- Check API key permissions and quotas
- Review network connectivity

**File upload failures:**
- Ensure files are valid CSV/XLSX format
- Check file size limits (typically 10MB max)
- Verify column headers match expected patterns

**Validation errors:**
- Use auto-fix buttons for common issues
- Check cross-entity relationships (task references)
- Review data types and required fields

**Performance issues:**
- Limit datasets to 1,000 rows for optimal performance
- Use browser dev tools to identify bottlenecks
- Clear browser cache and localStorage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


Transform your spreadsheet chaos into organized, validated datasets ready for production use.

[📧 Report Issues](https://github.com/tharanithar-r/data-alchemist/issues) | [💡 Request Features](https://github.com/tharanithar-r/data-alchemist/discussions)
