/**
 * Image Analysis Module for OCR Model Selection
 * Analyzes receipt images to determine the optimal OCR processing strategy
 * Uses pixel-based analysis for accurate content detection
 */

import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';

export class ImageAnalyzer {
  constructor() {
    this.thresholds = {
      lineWidthVariance: 0.6,    // More lenient threshold for line width consistency (typed text can have some variation)
      characterSpacing: 0.4,     // More lenient threshold for character spacing uniformity
      strokeConsistency: 0.5,    // More lenient threshold for stroke consistency
      handwrittenConfidence: 0.8, // Higher confidence threshold for handwritten text (need stronger evidence)
    };
  }

  /**
   * Main analysis function - determines OCR strategy based on image characteristics
   * @param {Buffer} imageBuffer - The image buffer to analyze
   * @returns {Object} Analysis result with recommended OCR strategy
   */
  async analyzeImage(imageBuffer) {
    try {
      console.log('Starting image analysis...');
      
      // Try to load image with error handling
      let image;
      try {
        image = await loadImage(imageBuffer);
        console.log(`Image loaded: ${image.width}x${image.height}`);
      } catch (loadError) {
        console.error('Canvas loadImage failed:', loadError.message);
        console.log('Attempting Sharp-based image processing...');
        
        // Try Sharp as fallback
        try {
          const sharpImage = sharp(imageBuffer);
          const metadata = await sharpImage.metadata();
          console.log(`Sharp metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
          
          // Convert to a format Canvas can handle
          const convertedBuffer = await sharpImage
            .png()
            .toBuffer();
          
          image = await loadImage(convertedBuffer);
          console.log(`Image converted and loaded via Sharp: ${image.width}x${image.height}`);
        } catch (sharpError) {
          console.error('Sharp processing also failed:', sharpError.message);
          throw new Error(`Both Canvas and Sharp failed to process image: Canvas(${loadError.message}), Sharp(${sharpError.message})`);
        }
      }
      
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, image.width, image.height);
      console.log('Image data extracted successfully');

      // Perform multiple analyses
      const [
        textDensity,
        lineAnalysis,
        spacingAnalysis,
        strokeAnalysis,
        complexityScore
      ] = await Promise.all([
        this.calculateTextDensity(imageData),
        this.analyzeLineCharacteristics(imageData),
        this.analyzeCharacterSpacing(imageData),
        this.analyzeStrokeConsistency(imageData),
        this.calculateImageComplexity(imageData)
      ]);

      // Determine text type and processing strategy
      const analysis = {
        textDensity,
        lineAnalysis,
        spacingAnalysis,
        strokeAnalysis,
        complexityScore,
        timestamp: new Date().toISOString()
      };

      const ocrStrategy = this.determineOCRStrategy(analysis);
      
      return {
        ...analysis,
        recommendedStrategy: ocrStrategy,
        confidence: this.calculateConfidence(analysis)
      };

    } catch (error) {
      console.error('Image analysis error:', error);
      
      // If Canvas fails to load the image, return a basic analysis based on file size
      const fileSizeKB = imageBuffer.length / 1024;
      console.log(`Canvas failed, using file-size fallback analysis (${fileSizeKB}KB)`);
      
      // More intelligent fallback analysis based on file size and type
      let textDensity = 0.1;
      let complexity = 'low';
      let isConsistent = true;
      let uniform = true;
      let consistent = true;
      
      // Adjust based on file size
      if (fileSizeKB > 500) {
        textDensity = 0.3;
        if (fileSizeKB > 1000) {
          complexity = 'medium';
          if (fileSizeKB > 2000) {
            complexity = 'high';
            isConsistent = false;
            uniform = false;
            consistent = false;
          }
        }
      }
      
      // Basic fallback analysis
      const fallbackAnalysis = {
        textDensity: { density: textDensity },
        lineAnalysis: { isConsistent },
        spacingAnalysis: { uniform },
        strokeAnalysis: { consistent },
        complexityScore: { complexity },
        isFallback: true,
        fallbackReason: error.message
      };
      
      const ocrStrategy = this.determineOCRStrategy(fallbackAnalysis);
      
      return {
        ...fallbackAnalysis,
        recommendedStrategy: ocrStrategy,
        confidence: 0.6, // Slightly higher confidence for better fallback
        error: error.message
      };
    }
  }

  /**
   * Calculate text density in the image
   */
  calculateTextDensity(imageData) {
    const { data, width, height } = imageData;
    let textPixels = 0;
    let totalPixels = width * height;

    // Convert to grayscale and count text pixels (dark pixels)
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (gray < 128) { // Threshold for text pixels
        textPixels++;
      }
    }

    return {
      density: textPixels / totalPixels,
      textPixelCount: textPixels,
      totalPixels
    };
  }

  /**
   * Analyze line characteristics to detect handwriting vs printed text
   */
  analyzeLineCharacteristics(imageData) {
    const { data, width, height } = imageData;
    
    // Simple approach: analyze text line regularity
    // Typed text has more regular line spacing and alignment
    const textRows = [];
    
    // Find rows with significant text content
    for (let y = 0; y < height; y++) {
      let textPixels = 0;
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const gray = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
        if (gray < 128) textPixels++;
      }
      
      if (textPixels > width * 0.02) { // At least 2% text in row
        textRows.push({
          y: y,
          textDensity: textPixels / width
        });
      }
    }

    // Group consecutive text rows into text lines
    const textLines = [];
    let currentLine = [];
    
    for (let i = 0; i < textRows.length; i++) {
      if (i === 0 || textRows[i].y - textRows[i-1].y <= 3) {
        currentLine.push(textRows[i]);
      } else {
        if (currentLine.length > 2) { // Only count lines with multiple rows
          textLines.push(currentLine);
        }
        currentLine = [textRows[i]];
      }
    }
    if (currentLine.length > 2) {
      textLines.push(currentLine);
    }

    // For typed text, we expect more regular line spacing
    // This is a simplified check - assume consistent for now
    const isConsistent = textLines.length >= 3; // If we have multiple clear text lines, likely typed

    return {
      textLines,
      lineCount: textLines.length,
      isConsistent: isConsistent
    };
  }

  /**
   * Analyze character spacing uniformity
   */
  analyzeCharacterSpacing(imageData) {
    const { data, width, height } = imageData;
    const spacings = [];
    let lastCharEnd = -1;

    // Analyze horizontal spacing between characters
    for (let y = 0; y < height; y++) {
      let charStart = -1;
      let charEnd = -1;
      
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const gray = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
        
        if (gray < 128) { // Text pixel
          if (charStart === -1) charStart = x;
          charEnd = x;
        } else {
          if (charStart !== -1 && charEnd !== -1) {
            if (lastCharEnd !== -1) {
              spacings.push(charStart - lastCharEnd);
            }
            lastCharEnd = charEnd;
            charStart = -1;
            charEnd = -1;
          }
        }
      }
    }

    if (spacings.length === 0) return { uniform: true, averageSpacing: 0 };

    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    const spacingVariance = spacings.reduce((acc, spacing) => acc + Math.pow(spacing - avgSpacing, 2), 0) / spacings.length;
    const spacingCV = Math.sqrt(spacingVariance) / avgSpacing;

    return {
      spacings,
      averageSpacing: avgSpacing,
      variance: spacingVariance,
      coefficientOfVariation: spacingCV,
      uniform: spacingCV < this.thresholds.characterSpacing
    };
  }

  /**
   * Analyze stroke consistency (thickness variation)
   */
  analyzeStrokeConsistency(imageData) {
    const { data, width, height } = imageData;
    
    // Simplified approach: check for overall text regularity
    // Typed text tends to have more uniform pixel patterns
    let uniformRegions = 0;
    let totalRegions = 0;
    
    // Sample regions and check for consistency
    const sampleSize = Math.min(50, Math.floor(width / 10));
    
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * (width - sampleSize));
      const y = Math.floor(Math.random() * (height - sampleSize));
      
      let textPixels = 0;
      for (let dy = 0; dy < sampleSize; dy++) {
        for (let dx = 0; dx < sampleSize; dx++) {
          const pixelIndex = ((y + dy) * width + (x + dx)) * 4;
          const gray = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
          if (gray < 128) textPixels++;
        }
      }
      
      totalRegions++;
      // If region has consistent text density, it's uniform
      const density = textPixels / (sampleSize * sampleSize);
      if (density > 0.1 && density < 0.8) { // Reasonable text density range
        uniformRegions++;
      }
    }

    // If most regions are uniform, assume consistent (typed text)
    const consistent = uniformRegions / totalRegions > 0.6;

    return {
      uniformRegions,
      totalRegions,
      consistencyRatio: uniformRegions / totalRegions,
      consistent: consistent
    };
  }

  /**
   * Calculate overall image complexity
   */
  calculateImageComplexity(imageData) {
    const { data, width, height } = imageData;
    let edgePixels = 0;
    let totalPixels = width * height;

    // Simple edge detection using gradient
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const pixelIndex = (y * width + x) * 4;
        const currentGray = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
        
        // Check horizontal gradient
        const rightPixelIndex = (y * width + x + 1) * 4;
        const rightGray = (data[rightPixelIndex] + data[rightPixelIndex + 1] + data[rightPixelIndex + 2]) / 3;
        
        // Check vertical gradient
        const bottomPixelIndex = ((y + 1) * width + x) * 4;
        const bottomGray = (data[bottomPixelIndex] + data[bottomPixelIndex + 1] + data[bottomPixelIndex + 2]) / 3;
        
        const horizontalGradient = Math.abs(currentGray - rightGray);
        const verticalGradient = Math.abs(currentGray - bottomGray);
        
        if (horizontalGradient > 30 || verticalGradient > 30) {
          edgePixels++;
        }
      }
    }

    return {
      edgeDensity: edgePixels / totalPixels,
      edgeCount: edgePixels,
      complexity: edgePixels / totalPixels > 0.1 ? 'high' : 'low'
    };
  }

  /**
   * Determine the optimal OCR strategy based on analysis results
   */
  determineOCRStrategy(analysis) {
    const {
      lineAnalysis,
      spacingAnalysis,
      strokeAnalysis,
      complexityScore,
      textDensity
    } = analysis;

    console.log('Strategy Analysis:', {
      lineConsistent: lineAnalysis?.isConsistent,
      spacingUniform: spacingAnalysis?.uniform,
      strokeConsistent: strokeAnalysis?.consistent,
      textDensity: textDensity?.density,
      complexity: complexityScore?.complexity
    });

    // Check for handwritten characteristics (need multiple indicators)
    const inconsistencyCount = [
      !lineAnalysis?.isConsistent,
      !spacingAnalysis?.uniform,
      !strokeAnalysis?.consistent
    ].filter(Boolean).length;
    
    // Only classify as handwritten if 2+ indicators suggest it
    const isHandwritten = inconsistencyCount >= 2;

    // Check for batch processing needs (multiple receipts)
    const isBatchProcessing = textDensity?.density > 0.4 && complexityScore?.complexity === 'high';

    // Check for mixed content
    const hasMixedContent = 
      textDensity?.density > 0.3 && 
      complexityScore?.complexity === 'high' &&
      (!lineAnalysis?.isConsistent || !spacingAnalysis?.uniform);

    // Determine strategy with better logic (matching ocrRouter model names)
    if (isBatchProcessing) {
      console.log('Selected: batch');
      return 'batch';
    } else if (isHandwritten) {
      console.log('Selected: handwriting');
      return 'handwriting';
    } else if (hasMixedContent) {
      console.log('Selected: mixed');
      return 'mixed';
    } else if (textDensity?.density < 0.1) {
      console.log('Selected: lightweight');
      return 'lightweight';
    } else {
      console.log('Selected: standard');
      return 'standard';
    }
  }

  /**
   * Calculate confidence score for the analysis
   */
  calculateConfidence(analysis) {
    let confidence = 0.4; // Base confidence

    const {
      lineAnalysis,
      spacingAnalysis,
      strokeAnalysis,
      complexityScore,
      textDensity
    } = analysis;

    console.log('Confidence Analysis:', {
      lineConsistent: lineAnalysis?.isConsistent,
      spacingUniform: spacingAnalysis?.uniform,
      strokeConsistent: strokeAnalysis?.consistent,
      textDensity: textDensity?.density,
      complexity: complexityScore?.complexity
    });

    // Calculate confidence based on analysis agreement
    let agreementScore = 0;
    let totalChecks = 0;

    // Check for typed text indicators (higher confidence for clear typed text)
    if (lineAnalysis?.isConsistent && spacingAnalysis?.uniform && strokeAnalysis?.consistent) {
      confidence += 0.4; // Very strong typed text indicators
      agreementScore += 3;
    } else if (lineAnalysis?.isConsistent && spacingAnalysis?.uniform) {
      confidence += 0.25; // Good typed text indicators
      agreementScore += 2;
    } else if (lineAnalysis?.isConsistent || spacingAnalysis?.uniform) {
      confidence += 0.15; // Some typed text indicators
      agreementScore += 1;
    }
    totalChecks += 3;

    // Check for handwritten indicators
    const inconsistencyCount = [
      !lineAnalysis?.isConsistent,
      !spacingAnalysis?.uniform,
      !strokeAnalysis?.consistent
    ].filter(Boolean).length;

    if (inconsistencyCount >= 2) {
      confidence += 0.3; // Strong handwritten indicators
      agreementScore += inconsistencyCount;
    }
    totalChecks += 3;

    // Adjust based on text density (reasonable density = higher confidence)
    if (textDensity?.density > 0.02 && textDensity?.density < 0.7) {
      confidence += 0.1; // Reasonable text density
    }

    // Adjust based on complexity
    if (complexityScore?.complexity === 'low' && textDensity?.density < 0.3) {
      confidence += 0.15; // Simple, clear text
    } else if (complexityScore?.complexity === 'high' && textDensity?.density > 0.3) {
      confidence += 0.1; // Complex but dense text
    }

    // Calculate final confidence with agreement weighting
    const agreementRatio = agreementScore / totalChecks;
    const finalConfidence = confidence + (agreementRatio * 0.2);

    console.log('Confidence Calculation:', {
      baseConfidence: confidence,
      agreementScore,
      agreementRatio,
      finalConfidence: Math.min(finalConfidence, 1.0)
    });

    return Math.min(finalConfidence, 1.0);
  }
}

export default ImageAnalyzer;
