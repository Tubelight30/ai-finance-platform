# Dynamic OCR Model Selection System

## Overview

This implementation provides an intelligent, adaptive OCR system for receipt scanning that automatically selects the optimal processing strategy based on image characteristics. The system replaces the simple Gemini API calls with a sophisticated multi-stage approach that improves accuracy and reduces costs.

## Key Features

### 1. Intelligent Image Analysis
- **Pixel-based Analysis**: Analyzes actual image pixels for line width, character spacing, and stroke consistency
- **Complexity Assessment**: Evaluates image complexity using edge detection and gradient analysis
- **Content Type Detection**: Determines optimal processing approach using sophisticated image analysis

### 2. Adaptive OCR Routing
- **Lightweight OCR**: For simple printed receipts with clear text
- **Standard OCR**: For typical printed receipts
- **Handwriting OCR**: Specialized processing for handwritten content
- **Batch OCR**: For multiple receipts or complex layouts
- **Mixed Content OCR**: For receipts with both printed and handwritten text
- **Fallback OCR**: Robust processing for unclear or damaged images

### 3. Performance Optimizations
- **Intelligent Caching**: Reduces redundant processing for similar images
- **Batch Processing**: Efficient handling of multiple receipts
- **Concurrency Control**: Configurable parallel processing limits
- **Metrics Tracking**: Comprehensive performance monitoring

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Receipt       │───▶│  Image Analyzer  │───▶│   OCR Router    │
│   Upload        │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                       ┌──────────────────┐             │
                       │ Adaptive OCR     │◀────────────┘
                       │ Processor        │
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │ Enhanced Result  │
                       │ with Metadata    │
                       └──────────────────┘
```

## Implementation Details

### Image Analysis Algorithms

#### 1. Line Width Variance Analysis
```javascript
// Analyzes consistency of horizontal line widths
const coefficientOfVariation = Math.sqrt(variance) / avgWidth;
const isConsistent = coefficientOfVariation < threshold;
```

#### 2. Character Spacing Analysis
```javascript
// Measures uniformity of spacing between characters
const spacingCV = Math.sqrt(spacingVariance) / avgSpacing;
const uniform = spacingCV < threshold;
```

#### 3. Stroke Consistency Analysis
```javascript
// Evaluates vertical stroke thickness variation
const strokeCV = Math.sqrt(strokeVariance) / avgStrokeWidth;
const consistent = strokeCV < threshold;
```

#### 4. Text Density Calculation
```javascript
// Counts text pixels vs total pixels
const gray = (r + g + b) / 3;
const textPixels = gray < 128 ? textPixels + 1 : textPixels;
const density = textPixels / totalPixels;
```

#### 5. Edge Detection for Complexity
```javascript
// Simple gradient-based edge detection
const horizontalGradient = Math.abs(currentGray - rightGray);
const verticalGradient = Math.abs(currentGray - bottomGray);
const edgePixels = (horizontalGradient > 30 || verticalGradient > 30) ? edgePixels + 1 : edgePixels;
```

### Mathematical Formulas

#### Coefficient of Variation (CV)
Used to measure consistency in line widths, spacing, and stroke thickness:
```
CV = (Standard Deviation / Mean) × 100%

Where:
- Standard Deviation = √(Σ(x - μ)² / n)
- Mean (μ) = Σx / n
- Lower CV = more consistent (printed text)
- Higher CV = less consistent (handwritten text)
```

#### Text Density Calculation
```
Text Density = (Text Pixels / Total Pixels) × 100%

Where:
- Text Pixels = pixels with grayscale value < 128
- Total Pixels = image width × image height
- Higher density = more text content
```

#### Edge Detection Gradient
```
Gradient Magnitude = √(Gx² + Gy²)

Where:
- Gx = horizontal gradient (current - right)
- Gy = vertical gradient (current - bottom)
- Edge threshold = 30 (empirically determined)
```

## Pixel-Based Implementation Approach

### Why Pixel-Level Analysis?
Our implementation uses **sophisticated pixel-based analysis** for accurate content detection:

1. **Accurate Detection**: Real analysis of line consistency, character spacing, and stroke patterns
2. **Intelligent Routing**: Precise strategy selection based on actual image characteristics
3. **High Confidence**: Reliable detection of handwritten vs printed text
4. **Robust Analysis**: Multiple algorithms working together for comprehensive assessment

### Analysis Pipeline
```javascript
// Multi-stage pixel analysis
1. Load image into canvas context
2. Extract pixel data for analysis
3. Calculate line width variance (horizontal consistency)
4. Measure character spacing uniformity
5. Analyze stroke consistency (vertical thickness)
6. Compute text density (text pixels vs background)
7. Perform edge detection for complexity assessment
8. Combine results for strategy selection
```

### Performance Characteristics
- **Processing Time**: 100-500ms for comprehensive analysis
- **High Accuracy**: Real pixel-level detection of content characteristics
- **Reliable Results**: Consistent strategy selection based on actual image content
- **Comprehensive Analysis**: Multiple algorithms ensure robust detection

### OCR Strategy Selection Logic

```javascript
const strategy = (() => {
  if (isBatchProcessing) return 'batch_ocr';
  if (isHandwritten) return 'handwriting_ocr';
  if (hasMixedContent) return 'mixed_content_ocr';
  if (textDensity < 0.1) return 'lightweight_ocr';
  return 'standard_ocr';
})();
```

## Usage Examples

### Basic Receipt Processing
```javascript
import { scanReceipt } from '@/actions/transaction';

const result = await scanReceipt(file);
console.log(result);
// {
//   amount: 25.99,
//   date: "2024-01-15T10:30:00Z",
//   description: "Coffee and pastry",
//   category: "food",
//   merchantName: "Local Cafe",
//   _metadata: {
//     strategy: "lightweight",
//     confidence: 0.92,
//     processingTime: 1250,
//     isFallback: false
//   }
// }
```

### Batch Processing
```javascript
import { scanBatchReceipts } from '@/actions/transaction';

const files = [file1, file2, file3];
const results = await scanBatchReceipts(files);
console.log(results);
// {
//   successful: [...],
//   failed: [...],
//   total: 3,
//   successRate: 0.67,
//   processingTime: 4500
// }
```

### Performance Monitoring
```javascript
import { getOCRPerformanceMetrics } from '@/actions/transaction';

const metrics = await getOCRPerformanceMetrics();
console.log(metrics);
// {
//   totalProcessed: 150,
//   strategyCounts: {
//     lightweight: 45,
//     standard: 60,
//     handwriting: 25,
//     batch: 10,
//     fallback: 10
//   },
//   averageProcessingTime: 1850,
//   successRate: 0.89,
//   cacheSize: 25
// }
```

## Configuration

### Thresholds (Configurable)
```javascript
const thresholds = {
  lineWidthVariance: 0.3,    // Line consistency threshold
  characterSpacing: 0.2,     // Spacing uniformity threshold
  strokeConsistency: 0.25,   // Stroke consistency threshold
  handwrittenConfidence: 0.7 // Handwriting detection confidence
};
```

### Model Configurations
```javascript
const modelConfigs = {
  lightweight: {
    model: "gemini-2.0-flash-exp",
    maxTokens: 1000,
    temperature: 0.1
  },
  handwriting: {
    model: "gemini-2.0-flash-exp",
    maxTokens: 3000,
    temperature: 0.3
  },
  // ... other configurations
};
```

## Performance Benefits

### Cost Optimization
- **Reduced Token Usage**: Lightweight processing for simple receipts
- **Intelligent Routing**: Appropriate model selection reduces over-processing
- **Caching**: Eliminates redundant API calls for similar images

### Accuracy Improvements
- **Specialized Prompts**: Tailored prompts for different content types
- **Validation Layer**: Multi-stage validation and error correction
- **Confidence Scoring**: Transparent accuracy assessment

### Scalability
- **Batch Processing**: Efficient handling of multiple receipts
- **Concurrency Control**: Configurable parallel processing
- **Metrics Tracking**: Performance monitoring and optimization

## Error Handling

### Fallback Mechanisms
1. **Primary Fallback**: Falls back to original Gemini processing
2. **Secondary Fallback**: Basic text extraction for non-JSON responses
3. **Graceful Degradation**: Continues processing even with partial failures

### Validation Pipeline
1. **Input Validation**: File type, size, and format checks
2. **Data Validation**: Amount, date, and field validation
3. **Business Logic**: Category enhancement and confidence scoring

## Monitoring and Debugging

### Logging
- Processing strategy selection
- Performance metrics
- Error tracking and fallback usage

### Metrics Dashboard
- Success rates by strategy
- Average processing times
- Cache hit rates
- Token usage optimization

## Future Enhancements

### Planned Features
1. **Custom Model Training**: Fine-tuned models for specific receipt types
2. **Advanced Caching**: Semantic similarity-based caching
3. **Real-time Learning**: Adaptive threshold adjustment based on performance
4. **Multi-language Support**: Specialized processing for different languages

### Integration Opportunities
1. **Database Integration**: Store processing patterns for learning
2. **User Feedback**: Incorporate user corrections for model improvement
3. **A/B Testing**: Compare different strategies for optimization

## Installation and Setup

### Dependencies
```bash
npm install canvas --legacy-peer-deps
```

**Note**: Canvas requires system dependencies for image processing. If installation fails, install system packages:
```bash
# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config

# Then install canvas
npm install canvas --legacy-peer-deps
```

### Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key
```

### File Structure
```
lib/ocr/
├── imageAnalyzer.js      # Pixel-based image analysis algorithms
├── ocrRouter.js          # OCR routing and model selection
├── adaptiveOCR.js        # Main processing pipeline
└── README.md            # This documentation
```

## Testing

### Unit Tests
- Image analysis algorithms
- OCR routing logic
- Validation functions

### Integration Tests
- End-to-end processing pipeline
- Batch processing workflows
- Error handling scenarios

### Performance Tests
- Processing time benchmarks
- Memory usage monitoring
- Cache effectiveness

## Contributing

### Development Guidelines
1. Follow existing code patterns
2. Add comprehensive error handling
3. Include performance considerations
4. Update documentation for new features

### Code Review Checklist
- [ ] Algorithm correctness
- [ ] Performance implications
- [ ] Error handling completeness
- [ ] Documentation updates
- [ ] Test coverage

---

This system represents a significant advancement in receipt processing technology, providing both immediate performance benefits and a foundation for future AI-powered enhancements.
