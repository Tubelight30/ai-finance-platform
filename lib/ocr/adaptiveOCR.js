/**
 * Adaptive OCR Processing Pipeline
 * Orchestrates the entire intelligent receipt scanning process
 */

import OCRRouter from './ocrRouter.js';
import ImageAnalyzer from './imageAnalyzer.js';

export class AdaptiveOCRProcessor {
  constructor() {
    this.router = new OCRRouter();
    this.analyzer = new ImageAnalyzer();
    
    // Performance metrics tracking
    this.metrics = {
      totalProcessed: 0,
      strategyCounts: {},
      averageProcessingTime: 0,
      successRate: 0,
      lastReset: new Date()
    };

    // Cache for similar images (simple hash-based)
    this.cache = new Map();
    this.cacheMaxSize = 100;
  }

  /**
   * Main processing function - intelligent receipt scanning with adaptive routing
   */
  async processReceipt(file, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!file || file.size === 0) {
        throw new Error('Invalid file provided');
      }

      // Check cache first (optional optimization)
      const cacheKey = await this.generateCacheKey(file);
      if (options.useCache && this.cache.has(cacheKey)) {
        console.log('Using cached result');
        return this.cache.get(cacheKey);
      }

      // Convert file to buffer
      const imageBuffer = await this.fileToBuffer(file);
      
      // Step 1: Pre-processing validation
      const preProcessingResult = await this.validateAndPreprocess(imageBuffer, file);
      if (!preProcessingResult.valid) {
        console.warn(`Pre-processing validation failed: ${preProcessingResult.reason}, attempting to continue...`);
        // Don't throw error, try to continue with processing
      }

      // Step 2: Intelligent routing and processing
      const ocrResult = await this.router.processReceipt(
        imageBuffer, 
        file.type,
        options
      );

      // Step 3: Post-processing validation and enhancement
      const enhancedResult = await this.postProcessResult(ocrResult, options);

      // Step 4: Update metrics and cache
      this.updateMetrics(enhancedResult, Date.now() - startTime);
      if (options.useCache) {
        this.updateCache(cacheKey, enhancedResult);
      }

      return enhancedResult;

    } catch (error) {
      console.error('Adaptive OCR processing error:', error);
      
      // Fallback to basic processing
      return await this.fallbackProcessing(file, error.message);
    }
  }

  /**
   * Batch processing for multiple receipts
   */
  async processBatchReceipts(files, options = {}) {
    const results = [];
    const errors = [];

    console.log(`Processing batch of ${files.length} receipts`);

    // Process files in parallel with concurrency limit
    const concurrency = options.maxConcurrency || 3;
    const chunks = this.chunkArray(files, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file, index) => {
        try {
          const result = await this.processReceipt(file, {
            ...options,
            batchIndex: index,
            isBatch: true
          });
          return { success: true, result, file: file.name };
        } catch (error) {
          return { success: false, error: error.message, file: file.name };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.filter(r => r.success));
      errors.push(...chunkResults.filter(r => !r.success));
    }

    return {
      successful: results,
      failed: errors,
      total: files.length,
      successRate: results.length / files.length,
      processingTime: Date.now() - options.startTime
    };
  }

  /**
   * Convert file to buffer
   */
  async fileToBuffer(file) {
    if (file.arrayBuffer) {
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    throw new Error('File conversion not supported');
  }

  /**
   * Validate and preprocess image
   */
  async validateAndPreprocess(imageBuffer, file) {
    // File size validation
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return { valid: false, reason: 'File too large' };
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, reason: 'Unsupported file type' };
    }

    // Basic image validation (check for valid image headers)
    const isValidImage = this.validateImageHeader(imageBuffer);
    if (!isValidImage) {
      return { valid: false, reason: 'Invalid image format' };
    }

    return { valid: true };
  }

  /**
   * Validate image header
   */
  validateImageHeader(buffer) {
    if (buffer.length < 4) return false;

    try {
      // Check for common image file signatures
      const signatures = [
        { sig: Buffer.from([0xFF, 0xD8, 0xFF]), name: 'JPEG' }, // JPEG
        { sig: Buffer.from([0x89, 0x50, 0x4E, 0x47]), name: 'PNG' }, // PNG
        { sig: Buffer.from([0x52, 0x49, 0x46, 0x46]), name: 'WebP' }, // WebP (RIFF)
        { sig: Buffer.from([0x47, 0x49, 0x46]), name: 'GIF' }, // GIF
        { sig: Buffer.from([0x42, 0x4D]), name: 'BMP' }, // BMP
      ];

      // Check each signature
      for (const { sig, name } of signatures) {
        if (buffer.length >= sig.length && buffer.subarray(0, sig.length).equals(sig)) {
          console.log(`Detected image format: ${name}`);
          return true;
        }
      }

      // If no signature matches, but file size is reasonable, assume it's valid
      // (some images might have slight header variations)
      if (buffer.length > 100 && buffer.length < 50 * 1024 * 1024) { // 100 bytes to 50MB
        console.log('No signature match, but file size suggests valid image');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error validating image header:', error);
      // If validation fails, assume it's valid and let Canvas handle it
      return true;
    }
  }

  /**
   * Post-process OCR result
   */
  async postProcessResult(result, options = {}) {
    // Validate extracted data
    const validation = this.validateExtractedData(result);
    if (!validation.valid) {
      console.warn('Data validation failed:', validation.errors);
    }

    // Enhance result with additional metadata
    const enhanced = {
      ...result,
      processingTimestamp: new Date().toISOString(),
      validation: validation,
      metadata: {
        fileType: options.fileType || 'unknown',
        isBatch: options.isBatch || false,
        batchIndex: options.batchIndex || null,
        processingVersion: '1.0.0'
      }
    };

    // Apply business logic enhancements
    enhanced.suggestedCategory = this.enhanceCategorySuggestion(enhanced);
    enhanced.confidenceScore = this.calculateOverallConfidence(enhanced);

    return enhanced;
  }

  /**
   * Validate extracted data
   */
  validateExtractedData(result) {
    const errors = [];
    const warnings = [];

    // Amount validation
    if (!result.amount || isNaN(result.amount) || result.amount <= 0) {
      errors.push('Invalid or missing amount');
    } else if (result.amount > 1000000) {
      warnings.push('Unusually high amount detected');
    }

    // Date validation
    if (!result.date || isNaN(new Date(result.date).getTime())) {
      errors.push('Invalid or missing date');
    } else {
      const date = new Date(result.date);
      const now = new Date();
      if (date > now) {
        warnings.push('Future date detected');
      }
      if (date < new Date('1900-01-01')) {
        warnings.push('Very old date detected');
      }
    }

    // Description validation
    if (!result.description || result.description.trim().length < 2) {
      warnings.push('Very short or missing description');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Enhance category suggestion based on context
   */
  enhanceCategorySuggestion(result) {
    const { description, merchantName } = result;
    const text = `${description} ${merchantName}`.toLowerCase();

    // Enhanced category mapping
    const categoryKeywords = {
      'groceries': ['grocery', 'supermarket', 'food', 'fresh', 'produce', 'market'],
      'transportation': ['gas', 'fuel', 'taxi', 'uber', 'lyft', 'parking', 'toll'],
      'food': ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'dining'],
      'shopping': ['store', 'shop', 'mall', 'retail', 'clothing', 'electronics'],
      'utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'cable'],
      'healthcare': ['pharmacy', 'medical', 'doctor', 'hospital', 'clinic', 'drug'],
      'entertainment': ['movie', 'theater', 'game', 'music', 'sport', 'gym'],
      'travel': ['hotel', 'flight', 'airline', 'travel', 'vacation', 'booking']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return result.category || 'other-expense';
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(result) {
    let confidence = result.confidence || 0.5;

    // Adjust based on validation
    if (result.validation?.warnings?.length > 0) {
      confidence -= 0.1;
    }
    if (result.validation?.errors?.length > 0) {
      confidence -= 0.3;
    }

    // Adjust based on strategy
    const strategyConfidence = {
      'lightweight': 0.9,
      'standard': 0.8,
      'handwriting': 0.6,
      'batch': 0.7,
      'mixed': 0.6,
      'fallback': 0.4
    };

    const strategyBonus = strategyConfidence[result.strategy] || 0.5;
    confidence = (confidence + strategyBonus) / 2;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Fallback processing for errors
   */
  async fallbackProcessing(file, errorMessage) {
    console.log('Using fallback processing');
    
    try {
      const imageBuffer = await this.fileToBuffer(file);
      const fallbackResult = await this.router.routeToOCR('fallback', imageBuffer, file.type);
      
      return {
        ...fallbackResult,
        isFallback: true,
        fallbackReason: errorMessage,
        confidence: 0.3
      };
    } catch (fallbackError) {
      throw new Error(`Both primary and fallback processing failed: ${fallbackError.message}`);
    }
  }

  /**
   * Update performance metrics
   */
  updateMetrics(result, processingTime) {
    this.metrics.totalProcessed++;
    
    // Update strategy counts
    const strategy = result.strategy || 'unknown';
    this.metrics.strategyCounts[strategy] = (this.metrics.strategyCounts[strategy] || 0) + 1;
    
    // Update average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + processingTime) / 
      this.metrics.totalProcessed;
    
    // Update success rate
    const success = result.confidence > 0.5;
    this.metrics.successRate = 
      (this.metrics.successRate * (this.metrics.totalProcessed - 1) + (success ? 1 : 0)) / 
      this.metrics.totalProcessed;
  }

  /**
   * Generate cache key for file
   */
  async generateCacheKey(file) {
    const buffer = await this.fileToBuffer(file);
    const crypto = await import('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Update cache
   */
  updateCache(key, result) {
    if (this.cache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }

  /**
   * Utility: Chunk array for batch processing
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      uptime: Date.now() - this.metrics.lastReset.getTime()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalProcessed: 0,
      strategyCounts: {},
      averageProcessingTime: 0,
      successRate: 0,
      lastReset: new Date()
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default AdaptiveOCRProcessor;
