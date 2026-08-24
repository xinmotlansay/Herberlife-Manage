const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

/**
 * Clean number string into pure float/int.
 * Handles Vietnamese formats: "567,421" or "567.421" or "567 421" -> 567421
 */
function parseVietnameseNumber(numStr) {
  if (!numStr) return 0;
  // Remove spaces and percent signs
  let cleaned = numStr.toString().trim().replace(/%/g, '');
  // If format is 567,421 (comma as thousand separator)
  cleaned = cleaned.replace(/\./g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Herbalife & General VAT Invoice Parser
 * Parses lines extracted from PDF or Google Vision API OCR
 */
function parseInvoiceText(fullText) {
  if (!fullText) return { items: [], extractedDate: null };

  const rawLines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];

  // Pre-process lines: merge orphan prefix product code lines with next line ending in numbers & tax
  const mergedLines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (/^[A-Z0-9]{4}\s+(?:P\s+)?/.test(l) && !/\d+%\s+[\d.,]+/.test(l) && i + 1 < rawLines.length) {
      mergedLines.push(l + ' ' + rawLines[i + 1]);
      i++; // Skip next line as it was merged
    } else {
      mergedLines.push(l);
    }
  }

  // Regex pattern for Herbalife invoice product row:
  // Example: "0065 P Herbalifeline EA 5 567,421 2,837,105 8% 226,968 3,064,073"
  // Example: "4T89 P Bo San Pham 4T89 EA 1 1,865,306 1,865,306 8% 149,224 2,014,530"
  // Example: "0006 P Lo Hoi thao moc co dac EA 5 597,171 2,985,855 8% 238,868 3,224,723"
  const lineRegex = /^([A-Z0-9]{4})\s+(?:P\s+)?(.+?)\s+(EA|CAI|HOP|THUNG|CHAI|PAK)\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)(?:\s+(\d+)%)?/i;

  for (let i = 0; i < mergedLines.length; i++) {
    const line = mergedLines[i];
    const match = line.match(lineRegex);

    if (match) {
      const code = match[1].toUpperCase();
      const name = match[2].trim();
      const unit = match[3].toUpperCase();
      const qty = parseInt(match[4], 10) || 1;
      const unitPriceBeforeTax = parseVietnameseNumber(match[5]);
      const taxRate = match[7] ? parseFloat(match[7]) : 8;

      // Skip freight/shipping rows if matched erroneously
      if (code === 'FREI' || name.toLowerCase().includes('phí giao hàng')) {
        continue;
      }

      items.push({
        product_code_raw: code,
        product_name_raw: name,
        unit: unit || 'EA',
        quantity: qty,
        unit_price_before_tax: unitPriceBeforeTax,
        tax_rate: taxRate,
        import_price: Math.round(unitPriceBeforeTax * (1 + taxRate / 100))
      });
    }
  }

  // Extract Invoice Date if present (e.g., "17/ 08/ 2026" or "14/ 08/ 2026")
  let extractedDate = null;
  const dateMatch = fullText.match(/(?:Ngày lập hóa đơn|Ngày đặt hàng)[^\d]*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3];
    extractedDate = `${year}-${month}-${day}T00:00:00.000Z`;
  }

  return { items, extractedDate };
}

/**
 * Call PDF Text Parser or Google Vision API or Fallback OCR Parser
 */
async function processInvoiceImage(imagePath) {
  let fullText = '';

  if (imagePath && fs.existsSync(imagePath)) {
    const ext = path.extname(imagePath).toLowerCase();

    // 1. Parse PDF files directly with PDFParse instance
    if (ext === '.pdf') {
      try {
        const dataBuffer = fs.readFileSync(imagePath);
        const parser = new PDFParse({ data: dataBuffer });
        const pdfData = await parser.getText();
        if (pdfData && pdfData.text) {
          fullText = pdfData.text;
          console.log('[OCR Service] Successfully extracted text dynamically from PDF invoice file.');
        }
      } catch (pdfErr) {
        console.warn('[OCR Service] Failed to extract text from PDF:', pdfErr.message);
      }
    }

    // 2. Call Google Vision API if configured
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!fullText && apiKey && apiKey !== 'your_google_vision_api_key_here') {
      try {
        const client = new vision.ImageAnnotatorClient({ apiKey });
        const [result] = await client.textDetection(imagePath);
        const detections = result.textAnnotations;
        if (detections && detections.length > 0) {
          fullText = detections[0].description;
        }
      } catch (err) {
        console.warn('[OCR Service] Google Vision API call failed, falling back to local invoice parser:', err.message);
      }
    }
  }

  const { items, extractedDate } = parseInvoiceText(fullText);

  return {
    raw_text: fullText,
    items,
    extractedDate
  };
}

module.exports = {
  processInvoiceImage,
  parseInvoiceText
};
