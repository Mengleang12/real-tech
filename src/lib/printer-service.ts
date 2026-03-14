import { LPAPIFactory } from "lpapi-dtpweb";

// Singleton LPAPI instance
let api: any = null;
let serviceAvailable = false;

export interface PrinterStatus {
  available: boolean;
  printerName?: string;
  printers: string[];
}

/**
 * Initialize the lpapi-dtpweb print service.
 * Requires the Detonger/Dothantech printer driver (which includes the dtpweb print helper) installed on Windows.
 */
export async function initPrinterService(): Promise<PrinterStatus> {
  try {
    api = LPAPIFactory.getInstance({ logLevel: 0 });

    const resp = await api.checkPlugin();
    if (resp.statusCode === 0) {
      serviceAvailable = true;

      // Get list of available printers
      const devices = api.getPrinters() || [];
      const printerNames = devices.map((d: any) => d.name || d.printerName || d.deviceId || '').filter(Boolean);

      return {
        available: true,
        printerName: printerNames[0] || undefined,
        printers: printerNames,
      };
    } else {
      serviceAvailable = false;
      return { available: false, printers: [] };
    }
  } catch {
    serviceAvailable = false;
    return { available: false, printers: [] };
  }
}

export function isPrinterServiceAvailable(): boolean {
  return serviceAvailable && api !== null;
}

export function getApi(): any {
  return api;
}

export interface LabelData {
  name: string;
  variant: string;
  barcode: string;
  serial: string;
  price: number;
}

export interface PrintOptions {
  printerName: string;
  labelWidth: number;  // mm
  labelHeight: number; // mm
  labels: LabelData[];
}

/**
 * Print labels directly to the Detonger printer via lpapi-dtpweb SDK.
 * No browser print dialog is shown.
 */
export async function printLabels(options: PrintOptions): Promise<{ success: boolean; printed: number; error?: string }> {
  if (!api) {
    return { success: false, printed: 0, error: "Print service not initialized. Please check the printer connection first." };
  }

  const { printerName, labelWidth, labelHeight, labels } = options;

  try {
    // Open the printer
    const openResp = await api.openPrinter(printerName);
    if (openResp.statusCode !== 0) {
      return { success: false, printed: 0, error: `Failed to connect to printer "${printerName}": ${openResp.errMsg || 'Unknown error'}` };
    }

    let printed = 0;

    for (const label of labels) {
      // Start a new label job
      api.startJob({ width: labelWidth, height: labelHeight });

      // Layout calculations (all in mm)
      const padding = 1.5;
      const contentWidth = labelWidth - padding * 2;
      const isLarge = labelHeight >= 30;

      let yPos = padding;

      // Product name
      const nameFontHeight = isLarge ? 2.5 : 2;
      api.drawText({
        text: label.name,
        x: padding,
        y: yPos,
        width: contentWidth,
        height: nameFontHeight + 1,
        fontHeight: nameFontHeight,
        fontStyle: 1, // Bold
        horizontalAlignment: 1, // Center
      });
      yPos += nameFontHeight + 0.8;

      // Variant
      if (label.variant) {
        const varFontHeight = isLarge ? 2 : 1.8;
        api.drawText({
          text: label.variant,
          x: padding,
          y: yPos,
          width: contentWidth,
          height: varFontHeight + 0.5,
          fontHeight: varFontHeight,
          horizontalAlignment: 1, // Center
        });
        yPos += varFontHeight + 0.5;
      }

      // Barcode
      const barcodeHeight = isLarge ? labelHeight * 0.28 : labelHeight * 0.25;
      api.draw1DBarcode({
        text: label.barcode,
        x: padding,
        y: yPos,
        width: contentWidth,
        height: barcodeHeight,
        textHeight: isLarge ? 2 : 1.5,
        horizontalAlignment: 1, // Center
      });
      yPos += barcodeHeight + 1;

      // Price
      const priceFontHeight = isLarge ? 4 : 3.5;
      api.drawText({
        text: `$${label.price.toFixed(2)}`,
        x: padding,
        y: yPos,
        width: contentWidth,
        height: priceFontHeight + 0.5,
        fontHeight: priceFontHeight,
        fontStyle: 1, // Bold
        horizontalAlignment: 1, // Center
      });
      yPos += priceFontHeight + 0.5;

      // Serial number
      const serialFontHeight = isLarge ? 1.8 : 1.5;
      api.drawText({
        text: label.serial,
        x: padding,
        y: yPos,
        width: contentWidth,
        height: serialFontHeight + 0.5,
        fontHeight: serialFontHeight,
        horizontalAlignment: 1, // Center
      });

      // Commit (print) this label
      const commitResult = await api.commitJob();
      if (commitResult?.statusCode === 0) {
        printed++;
      }
    }

    // Close printer after all labels
    await api.closePrinter();

    return { success: printed > 0, printed, error: printed === 0 ? "No labels were printed" : undefined };
  } catch (err: any) {
    try { await api.closePrinter(); } catch {}
    return { success: false, printed: 0, error: err?.message || "Print failed" };
  }
}
