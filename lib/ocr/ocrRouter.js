/**
 * OCR Router - Intelligent routing to different OCR models based on image analysis
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import ImageAnalyzer from './imageAnalyzer.js';

export class OCRRouter {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.imageAnalyzer = new ImageAnalyzer();
    
    // Model configurations for different scenarios
    this.modelConfigs = {
      lightweight: {
        model: "gemini-2.0-flash-exp",
        maxTokens: 1000,
        temperature: 0.1,
        useCase: "Simple printed receipts with clear text"
      },
      standard: {
        model: "gemini-2.0-flash-exp",
        maxTokens: 2000,
        temperature: 0.2,
        useCase: "Standard printed receipts"
      },
      handwriting: {
        model: "gemini-2.0-flash-exp",
        maxTokens: 3000,
        temperature: 0.3,
        useCase: "Handwritten receipts with varied text styles"
      },
      batch: {
        model: "gemini-2.0-flash-exp",
        maxTokens: 4000,
        temperature: 0.1,
        useCase: "Multiple receipts or complex layouts"
      },
      mixed: {
        model: "gemini-2.0-flash-exp",
        maxTokens: 3500,
        temperature: 0.25,
        useCase: "Mixed printed and handwritten content"
      },
      fallback: {
        model: "gemini-2.0-flash-exp",
        maxTokens: 5000,
        temperature: 0.4,
        useCase: "Fallback for complex or unclear images"
      }
    };

    // Specialized prompts for different scenarios
    this.prompts = {
      lightweight: this.createLightweightPrompt(),
      standard: this.createStandardPrompt(),
      handwriting: this.createHandwritingPrompt(),
      batch: this.createBatchPrompt(),
      mixed: this.createMixedPrompt(),
      fallback: this.createFallbackPrompt()
    };
  }

  /**
   * Main routing function - analyzes image and routes to appropriate OCR model
   */
  async processReceipt(imageBuffer, mimeType = 'image/jpeg') {
    try {
      // Step 1: Analyze image characteristics
      const analysis = await this.imageAnalyzer.analyzeImage(imageBuffer);
      
      console.log('Image Analysis Result:', {
        strategy: analysis.recommendedStrategy,
        confidence: analysis.confidence,
        textDensity: analysis.textDensity?.density,
        complexity: analysis.complexityScore?.complexity
      });

      // Step 2: Route to appropriate OCR model
      const result = await this.routeToOCR(analysis.recommendedStrategy, imageBuffer, mimeType, analysis);
      
      return {
        ...result,
        analysis: {
          strategy: analysis.recommendedStrategy,
          confidence: analysis.confidence,
          processingTime: result.processingTime
        }
      };

    } catch (error) {
      console.error('OCR Routing Error:', error);
      
      // Fallback to standard processing
      return await this.routeToOCR('fallback', imageBuffer, mimeType);
    }
  }

  /**
   * Route to specific OCR model based on strategy
   */
  async routeToOCR(strategy, imageBuffer, mimeType, analysis = null) {
    const startTime = Date.now();
    const config = this.modelConfigs[strategy] || this.modelConfigs.fallback;
    const prompt = this.prompts[strategy] || this.prompts.fallback;

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: config.model,
        generationConfig: {
          maxOutputTokens: config.maxTokens,
          temperature: config.temperature,
        }
      });

      // Convert buffer to base64
      const base64String = imageBuffer.toString('base64');

      // Enhance prompt with analysis data if available
      const enhancedPrompt = this.enhancePromptWithAnalysis(prompt, analysis);

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64String,
            mimeType: mimeType,
          },
        },
        enhancedPrompt,
      ]);

      const response = await result.response;
      const text = response.text();
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

      // Parse and validate response
      const parsedData = this.parseAndValidateResponse(cleanedText, strategy);
      
      return {
        ...parsedData,
        strategy: strategy,
        processingTime: Date.now() - startTime,
        model: config.model,
        useCase: config.useCase
      };

    } catch (error) {
      console.error(`Error in ${strategy} OCR processing:`, error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Enhance prompt with analysis data for better context
   */
  enhancePromptWithAnalysis(basePrompt, analysis) {
    if (!analysis) return basePrompt;

    const analysisContext = `
Based on the image analysis:
- Text Type: ${analysis.lineAnalysis?.isConsistent ? 'Printed' : 'Handwritten'} text detected
- Complexity: ${analysis.complexityScore?.complexity || 'unknown'} complexity
- Text Density: ${(analysis.textDensity?.density * 100)?.toFixed(1) || 0}% of image
- Confidence: ${(analysis.confidence * 100)?.toFixed(1) || 0}% analysis confidence

`;

    return analysisContext + basePrompt;
  }

  /**
   * Parse and validate OCR response
   */
  parseAndValidateResponse(text, strategy) {
    try {
      const data = JSON.parse(text);
      
      // Validate required fields
      if (!data.amount || isNaN(parseFloat(data.amount))) {
        throw new Error('Invalid amount field');
      }

      // Set defaults for missing fields
      const result = {
        amount: parseFloat(data.amount),
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description || 'Receipt scan',
        category: data.category || 'other-expense',
        merchantName: data.merchantName || 'Unknown Merchant',
        confidence: data.confidence || 0.8,
        strategy: strategy,
        rawResponse: text
      };

      return result;

    } catch (parseError) {
      console.error('Error parsing OCR response:', parseError);
      
      // Try to extract basic information even if JSON parsing fails
      return this.extractBasicInfo(text, strategy);
    }
  }

  /**
   * Fallback extraction for non-JSON responses
   */
  extractBasicInfo(text, strategy) {
    const amountMatch = text.match(/(\d+\.?\d*)/);
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    
    return {
      amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
      date: dateMatch ? new Date(dateMatch[1]) : new Date(),
      description: 'Receipt scan (parsed from text)',
      category: 'other-expense',
      merchantName: 'Unknown Merchant',
      confidence: 0.5,
      strategy: strategy,
      rawResponse: text,
      note: 'Response parsed from non-JSON format'
    };
  }

  /**
   * Create specialized prompts for different scenarios
   */
  createLightweightPrompt() {
    return `
Analyze this simple receipt image and extract the following information in JSON format:
- Total amount (just the number)
- Date (in ISO format)
- Description or items purchased (brief summary)
- Merchant/store name
- Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense)

Only respond with valid JSON in this exact format:
{
  "amount": number,
  "date": "ISO date string",
  "description": "string",
  "merchantName": "string",
  "category": "string"
}

Focus on clear, printed text. If not a receipt, return an empty object.
    `;
  }

  createStandardPrompt() {
    return `
Analyze this receipt image and extract the following information in JSON format:
- Total amount (just the number)
- Date (in ISO format)
- Description or items purchased (brief summary)
- Merchant/store name
- Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense)
- Confidence score (0-1) for the extraction

Only respond with valid JSON in this exact format:
{
  "amount": number,
  "date": "ISO date string",
  "description": "string",
  "merchantName": "string",
  "category": "string",
  "confidence": number
}

Handle standard printed receipts with good clarity.
    `;
  }

  createHandwritingPrompt() {
    return `
Analyze this receipt image that may contain handwritten text. Extract the following information in JSON format:
- Total amount (just the number, even if handwritten)
- Date (in ISO format)
- Description or items purchased (brief summary)
- Merchant/store name
- Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense)
- Confidence score (0-1) for the extraction
- Notes about any unclear or ambiguous text

Only respond with valid JSON in this exact format:
{
  "amount": number,
  "date": "ISO date string",
  "description": "string",
  "merchantName": "string",
  "category": "string",
  "confidence": number,
  "notes": "string"
}

Pay special attention to handwritten amounts and dates. If text is unclear, provide your best interpretation with lower confidence.
    `;
  }

  createBatchPrompt() {
    return `
Analyze this image that may contain multiple receipts or a complex layout. Extract the following information in JSON format:
- Total amount (just the number)
- Date (in ISO format)
- Description or items purchased (brief summary)
- Merchant/store name
- Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense)
- Confidence score (0-1) for the extraction
- Number of receipts detected

Only respond with valid JSON in this exact format:
{
  "amount": number,
  "date": "ISO date string",
  "description": "string",
  "merchantName": "string",
  "category": "string",
  "confidence": number,
  "receiptCount": number
}

If multiple receipts are detected, focus on the primary or most prominent one.
    `;
  }

  createMixedPrompt() {
    return `
Analyze this receipt image that contains both printed and handwritten text. Extract the following information in JSON format:
- Total amount (just the number, prioritize printed over handwritten)
- Date (in ISO format)
- Description or items purchased (brief summary)
- Merchant/store name
- Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense)
- Confidence score (0-1) for the extraction
- Text type breakdown (printed vs handwritten percentages)

Only respond with valid JSON in this exact format:
{
  "amount": number,
  "date": "ISO date string",
  "description": "string",
  "merchantName": "string",
  "category": "string",
  "confidence": number,
  "textTypeBreakdown": {
    "printed": number,
    "handwritten": number
  }
}

Handle mixed content by prioritizing printed text for amounts and dates.
    `;
  }

  createFallbackPrompt() {
    return `
Analyze this receipt image using advanced processing techniques. Extract the following information in JSON format:
- Total amount (just the number)
- Date (in ISO date format)
- Description or items purchased (brief summary)
- Merchant/store name
- Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense)
- Confidence score (0-1) for the extraction
- Processing notes

Only respond with valid JSON in this exact format:
{
  "amount": number,
  "date": "ISO date string",
  "description": "string",
  "merchantName": "string",
  "category": "string",
  "confidence": number,
  "processingNotes": "string"
}

Use your best judgment for unclear or damaged images. If it's not a receipt, return an empty object.
    `;
  }
}

export default OCRRouter;
