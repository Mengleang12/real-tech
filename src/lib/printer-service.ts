import { DTPWeb } from "dtpweb";

// Singleton printer API instance
let printerApi: DTPWeb | null = null;
let serviceAvailable = false;

export interface PrinterStatus {
  available: boolean;
  printerName?: string;
  printers: string[];
}

/**
 * Initialize the dtpweb print service.
 * Must be called once before printing. The service requires the
 * Detonger Windows driver (which includes the dtpweb print helper) to be installed.
 */
export function initPrinterService(): Promise<PrinterStatus> {
  return new Promise((resolve) => {
    try {
      DTPWeb.checkServer({
        callback: (resp: any, api: any) => {
          if (resp.statusCode === 0) {
            printerApi = api;
            serviceAvailable = true;

            // Get list of available printers
            const devices = api.getPrinters({ onlyLocal: true, onlySupported: true }) || [];
            const printerNames = devices.map((d: any) => d.name || d.printerName || '');

            resolve({
              available: true,
              printerName: printerNames[0] || undefined,
              printers: printerNames,
            });
          } else {
            serviceAvailable = false;
            resolve({ available: false, printers: [] });
          }
        },
      });

      // Timeout after 3 seconds
      setTimeout(() => {
        if (!serviceAvailable) {
          resolve({ available: false, printers: [] });
        }
      }, 3000);
    } catch {
      resolve({ available: false, printers: [] });
    }
  });
}

export function isPrinterServiceAvailable(): boolean {
  return serviceAvailable && printerApi !== null;
}

export function getApi(): DTPWeb | null {
  return printerApi;
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
 * Print labels directly to the Detonger printer via dtpweb SDK.
 * No browser print dialog is shown.
 */
export function printLabels(options: PrintOptions): Promise<{ success: boolean; printed: number; error?: string }> {
  return new Promise((resolve) => {
    const api = printerApi;
    if (!api) {
      resolve({ success: false, printed: 0, error: "Print service not available. Please install the Detonger printer driver." });
      return;
    }

    const { printerName, labelWidth, labelHeight, labels } = options;

    try {
      api.openPrinter(printerName, (success: boolean) => {
        if (!success) {
          resolve({ success: false, printed: 0, error: `Failed to connect to printer "${printerName}"` });
          return;
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
          api.commitJob((result: any) => {
            if (result) printed++;
          });
        }

        // Close printer after all labels
        setTimeout(() => {
          api.closePrinter();
          resolve({ success: true, printed: labels.length });
        }, 500);
      });
    } catch (err: any) {
      resolve({ success: false, printed: 0, error: err?.message || "Print failed" });
    }
  });
}
