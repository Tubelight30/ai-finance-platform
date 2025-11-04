/**
 * OCR Router - Intelligent routing to different OCR models based on image analysis
 */

import ImageAnalyzer from './imageAnalyzer.js';
import { generateVisionViaOpenRouter } from '@/lib/ai/openrouter';
import { resolveModelForStrategy } from '@/lib/ai/modelRegistry';

export class OCRRouter {
  constructor() {
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
    const prompt = this.prompts[strategy] || this.prompts.fallback;

    try {
      // Convert buffer to base64
      const base64String = imageBuffer.toString('base64');

      // Enhance prompt with analysis data if available
      const enhancedPrompt = this.enhancePromptWithAnalysis(prompt, analysis);

      // Resolve model(s) for the strategy
      const entry = resolveModelForStrategy(strategy);
      let usedModel = entry?.primary?.modelId;
      let params = entry?.primary?.params || {};
      let modelTimeMs = 0;

      // Primary attempt
      const t0 = Date.now();
      let gen = await generateVisionViaOpenRouter({
        modelId: usedModel,
        imageBase64: base64String,
        mimeType,
        prompt: enhancedPrompt,
        temperature: params.temperature,
        timeoutMs: params.timeoutMs,
        contentOrder: params.contentOrder,
      });
      modelTimeMs += (Date.now() - t0);

      let text = gen.text || '';

      // Escalate if empty/malformed
      if (!text || text.trim().length < 2) {
        for (const esc of (entry?.escalate || [])) {
          try {
            usedModel = esc.modelId;
            params = esc.params || {};
            const t1 = Date.now();
            gen = await generateVisionViaOpenRouter({
              modelId: usedModel,
              imageBase64: base64String,
              mimeType,
              prompt: enhancedPrompt,
              temperature: params.temperature,
              timeoutMs: params.timeoutMs,
              contentOrder: params.contentOrder,
            });
            modelTimeMs += (Date.now() - t1);
            text = gen.text || '';
            if (text && text.trim().length > 1) break;
          } catch (e) {
            // try next escalation
          }
        }
      }

      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

      // Parse and validate response
      let parsedData = this.parseAndValidateResponse(cleanedText, strategy);

      // If critical fields are missing/invalid, attempt escalation once more for lightweight/standard
      if ((parsedData.amount == null || isNaN(parsedData.amount) || parsedData.amount <= 0) && ((entry?.escalate?.length || 0) > 0)) {
        for (const esc of (entry.escalate || [])) {
          try {
            usedModel = esc.modelId;
            params = esc.params || {};
            const regen = await generateVisionViaOpenRouter({
              modelId: usedModel,
              imageBase64: base64String,
              mimeType,
              prompt: enhancedPrompt,
              temperature: params.temperature,
              timeoutMs: params.timeoutMs,
            });
            const retryText = (regen.text || '').replace(/```(?:json)?\n?/g, "").trim();
            const retried = this.parseAndValidateResponse(retryText, strategy);
            if (retried && retried.amount && retried.amount > 0) {
              parsedData = retried;
              break;
            }
          } catch (_e) {
            // continue
          }
        }
      }

      const durationMs = Date.now() - startTime;
      return {
        ...parsedData,
        strategy: strategy,
        processingTime: Number((durationMs / 1000).toFixed(2)),
        processingTimeMs: durationMs,
        modelTime: Number((modelTimeMs / 1000).toFixed(2)),
        modelTimeMs: modelTimeMs,
        model: usedModel,
        useCase: strategy
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
      // Try direct parse first, else attempt balanced JSON extraction
      let data;
      const cleanedAll = String(text || '')
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim();
      try {
        data = JSON.parse(cleanedAll);
      } catch (_e) {
        const candidate = this.extractFirstBalancedJson(cleanedAll);
        if (candidate) {
          try {
            data = JSON.parse(candidate);
          } catch (_e2) {
            // fallthrough to fallback below
            return this.extractBasicInfo(text, strategy);
          }
        } else {
          return this.extractBasicInfo(text, strategy);
        }
      }
      
      // Validate required fields
      if (!data.amount || isNaN(parseFloat(data.amount))) {
        // Try to salvage amount from raw text (supports currency and separators)
        const amtMatch =
          String(text).match(/(total|amount|amount due|grand\s*total)[^\d]*(\d{1,3}(?:[\,\s]\d{2,3})*(?:[\.,]\d{2})?|\d+[\.,]?\d*)/i) ||
          String(text).match(/\b(?:[\$€£₹¥]\s*)?(\d{1,3}(?:[\,\s]\d{2,3})*(?:[\.,]\d{2})?|\d+[\.,]?\d*)\b/i);
        const val = (amtMatch && (amtMatch[2] || amtMatch[1])) ? (amtMatch[2] || amtMatch[1]) : null;
        if (val) {
          data.amount = String(val).replace(/[,\s]/g, '');
        } else {
          data.amount = 0;
        }
      }

      // Fallback description if missing: take first meaningful line
      if (!data.description || String(data.description).trim().length < 2) {
        const lines = String(text)
          .replace(/\r/g, '')
          .split('\n')
          .map(l => l.trim())
          .filter(l => l && /[A-Za-z]/.test(l));
        data.description = lines[0] || 'Receipt scan';
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

    } catch (_parseError) {
      // Silent fallback to basic info (avoid noisy stack traces in logs)
      return this.extractBasicInfo(text, strategy);
    }
  }

  /**
   * Extract the first balanced JSON object from a string using brace counting.
   */
  extractFirstBalancedJson(s) {
    const str = String(s || '');
    let depth = 0;
    let start = -1;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          return str.slice(start, i + 1);
        }
      }
    }
    return null;
  }

  /**
   * Fallback extraction for non-JSON responses
   */
  extractBasicInfo(text, strategy) {
    // Prefer totals; support currency and separators
    const amountMatch =
      String(text).match(/(total|amount|amount due|grand\s*total)[^\d]*(\d{1,3}(?:[\,\s]\d{2,3})*(?:[\.,]\d{2})?|\d+[\.,]?\d*)/i) ||
      String(text).match(/\b(?:[\$€£₹¥]\s*)?(\d{1,3}(?:[\,\s]\d{2,3})*(?:[\.,]\d{2})?|\d+[\.,]?\d*)\b/i);
    const dateMatch = String(text).match(/(\d{4}-\d{2}-\d{2})/);
    const desc = String(text)
      .replace(/\r/g, '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && /[A-Za-z]/.test(l))[0] || 'Receipt scan (parsed from text)';
    
    return {
      amount: amountMatch ? parseFloat(String(amountMatch[2] || amountMatch[1]).replace(/[,\s]/g, '')) : 0,
      date: dateMatch ? new Date(dateMatch[1]) : new Date(),
      description: desc,
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
