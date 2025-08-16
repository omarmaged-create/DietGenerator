# DietGenerator - Enhanced AI-Powered Nutrition & Fitness App

A comprehensive React + TypeScript application that combines professional nutrition planning with advanced AI capabilities for precise diet and workout management.

## 🚀 Enhanced AI Service Features

### **Mathematical Precision & Exact Calculations**
The AI service now provides **100% accurate** calculations with zero tolerance for deviation:

- **Exact Calorie Calculations**: Follows your TDEE and deficit/surplus requirements precisely
- **Precise Macro Distribution**: Calculates exact grams for protein, carbs, and fat based on your percentages
- **Mathematical Verification**: Shows step-by-step calculations and verifies totals
- **Smart Deficit/Surplus Handling**: Properly applies calorie adjustments for weight loss/gain

### **Example: Your Exact Requirements**
If your TDEE is 3000 kcal and you want a 400 calorie deficit with 40% protein, 35% carbs, 25% fat:

```
Base TDEE: 3000 kcal
Calorie Adjustment: -400 kcal (deficit for weight loss)
Final Target: 2600 kcal

Exact Macro Calculations:
- Protein: 40% × 2600 = 1040 kcal ÷ 4 = 260g protein
- Carbs: 35% × 2600 = 910 kcal ÷ 4 = 227.5g carbs  
- Fat: 25% × 2600 = 650 kcal ÷ 9 = 72.2g fat

Verification: 1040 + 910 + 650 = 2600 kcal ✓
```

### **AI Capabilities**
- **Smart Diet Planning**: Generates personalized meal plans with exact macro adherence
- **YouTube Video Analysis**: Analyzes fitness/nutrition videos and creates actionable plans
- **Enhanced Food Search**: AI-powered food recommendations with database compatibility
- **Professional Nutrition Guidance**: Expert-level advice from registered dietitian perspective
- **Mathematical Verification**: All calculations shown step-by-step for transparency

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI Service**: Google Generative AI (Gemini 2.0 Flash)
- **Nutrition APIs**: Nutritionix + FatSecret
- **State Management**: React Hooks + Local Storage
- **Build Tool**: Vite with hot reload

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Google AI API key

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd DietGenerator

# Install dependencies
npm install

# Set up environment variables
# Create .env file with your Google AI API key
VITE_GOOGLE_AI_API_KEY=your_api_key_here

# Start development server
npm run dev
```

### Environment Variables
```env
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key
```

## 🎯 Core Features

### **Nutrition Planning**
- **TDEE Calculator**: Mifflin-St Jeor + Harris-Benedict equations
- **Precise Macro Calculations**: Exact adherence to your specified percentages
- **Meal Builder**: Create and customize meal plans
- **Food Database**: Search 800,000+ foods with nutritional data
- **AI-Generated Plans**: Personalized diet plans with mathematical precision

### **Fitness Tracking**
- **Workout Builder**: Create custom workout routines
- **Exercise Library**: Comprehensive exercise database
- **YouTube Integration**: Analyze fitness videos for workout plans
- **Progress Tracking**: Monitor your fitness journey

### **AI Assistant**
- **Smart Chat**: Context-aware nutrition and fitness advice
- **Video Analysis**: Extract actionable content from YouTube videos
- **Diet Optimization**: AI-powered meal plan improvements
- **Mathematical Precision**: Exact calculations for all nutritional targets

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 📱 App Structure

```
src/
├── components/          # React components
│   ├── AIChat.tsx      # Enhanced AI chat interface
│   ├── MealBuilder.tsx # Meal planning interface
│   ├── WorkoutBuilder.tsx # Workout planning interface
│   └── ...
├── services/           # API services
│   ├── googleAiService.ts # Enhanced AI service
│   ├── nutritionixApi.ts # Nutrition data API
│   └── fatsecretApi.ts   # Alternative nutrition API
├── utils/              # Utility functions
│   ├── calculations.ts # Precise macro calculations
│   └── ...
└── ...
```

## 🎨 Key Components

### **Enhanced AI Service** (`googleAiService.ts`)
- **Precise Calculations**: Mathematical accuracy for all nutritional targets
- **Smart Context Understanding**: Remembers your goals and preferences
- **Professional Guidance**: Expert-level nutrition and fitness advice
- **Mathematical Verification**: Shows all calculations step-by-step

### **Precise Calculations** (`calculations.ts`)
- **Exact Macro Calculations**: 100% accurate macro distribution
- **TDEE Adjustments**: Proper deficit/surplus handling
- **Mathematical Utilities**: Helper functions for precise calculations
- **Validation**: Ensures macro percentages add up to 100%

## 🔍 AI Service Examples

### **Precise Diet Planning**
```typescript
// Generate diet plan with exact specifications
const dietPlan = await generateDietPlan(
  clientData,
  3000, // Base TDEE
  {
    proteinPercent: 40,
    carbsPercent: 35,
    fatPercent: 25,
    calorieAdjustment: -400, // 400 calorie deficit
    mealCount: 4,
    dietType: 'balanced',
    goals: 'weight-loss'
  }
);
```

### **Smart Chat with Context**
```typescript
// AI chat with full context awareness
const response = await chatWithAI(
  "Create a 500 calorie deficit diet with 40% protein",
  {
    clientData,
    targetCalories: 3000,
    deficitSurplus: -500,
    dietSettings: { proteinPercent: 40, carbsPercent: 35, fatPercent: 25 }
  }
);
```

## 🚀 Advanced Features

### **Mathematical Precision**
- **Zero Tolerance**: No deviation from specified targets
- **Step-by-Step Calculations**: All math shown for transparency
- **Verification**: Automatic verification of all calculations
- **Rounding Control**: Precise control over decimal places

### **Smart Context Understanding**
- **Goal Recognition**: Understands weight loss, gain, and maintenance
- **Preference Learning**: Remembers dietary restrictions and preferences
- **Progress Tracking**: Monitors adherence to targets
- **Adaptive Recommendations**: Adjusts advice based on current status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include your environment details and error messages

---

**Built with ❤️ using React, TypeScript, and Google AI**
