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

export interface CustomerLabelData {
  senderText: string;
  address: string;
  phone: string;
}

export interface CustomerLabelPrintOptions {
  printerName: string;
  labelWidth: number;  // mm
  labelHeight: number; // mm
  label: CustomerLabelData;
}

/**
 * Print product labels directly to the Detonger printer via lpapi-dtpweb SDK.
 * No browser print dialog is shown.
 */
export async function printLabels(options: PrintOptions): Promise<{ success: boolean; printed: number; error?: string }> {
  if (!api) {
    return { success: false, printed: 0, error: "Print service not initialized. Please check the printer connection first." };
  }

  const { printerName, labelWidth, labelHeight, labels } = options;

  try {
    const openResp = await api.openPrinter(printerName);
    if (openResp.statusCode !== 0) {
      return { success: false, printed: 0, error: `Failed to connect to printer "${printerName}": ${openResp.errMsg || 'Unknown error'}` };
    }

    let printed = 0;

    for (const label of labels) {
      api.startJob({ width: labelWidth, height: labelHeight });

      const padding = 1.5;
      const contentWidth = labelWidth - padding * 2;
      const isLarge = labelHeight >= 30;

      const nameFontHeight = isLarge ? 2.5 : 2;
      const varFontHeight = isLarge ? 2 : 1.8;
      const barcodeHeight = isLarge ? labelHeight * 0.28 : labelHeight * 0.25;
      const barcodeTextHeight = isLarge ? 2 : 1.5;
      const priceFontHeight = isLarge ? 4 : 3.5;
      const serialFontHeight = isLarge ? 1.8 : 1.5;

      let totalHeight = 0;
      totalHeight += nameFontHeight + 0.8;
      if (label.variant) totalHeight += varFontHeight + 0.5;
      totalHeight += barcodeHeight + 1;
      totalHeight += priceFontHeight + 0.5;
      totalHeight += serialFontHeight;

      let yPos = Math.max(padding, (labelHeight - totalHeight) / 2);

      // Product name
      api.drawText({
        text: label.name,
        x: padding, y: yPos, width: contentWidth,
        height: nameFontHeight + 1, fontHeight: nameFontHeight,
        fontStyle: 1, horizontalAlignment: 1,
      });
      yPos += nameFontHeight + 0.8;

      // Variant
      if (label.variant) {
        api.drawText({
          text: label.variant,
          x: padding, y: yPos, width: contentWidth,
          height: varFontHeight + 0.5, fontHeight: varFontHeight,
          horizontalAlignment: 1,
        });
        yPos += varFontHeight + 0.5;
      }

      // Barcode
      api.draw1DBarcode({
        text: label.barcode,
        x: padding, y: yPos, width: contentWidth,
        height: barcodeHeight, textHeight: barcodeTextHeight,
        horizontalAlignment: 1,
      });
      yPos += barcodeHeight + 1;

      // Price
      api.drawText({
        text: `$${label.price.toFixed(2)}`,
        x: padding, y: yPos, width: contentWidth,
        height: priceFontHeight + 0.5, fontHeight: priceFontHeight,
        fontStyle: 1, horizontalAlignment: 1,
      });
      yPos += priceFontHeight + 0.5;

      // Serial number
      api.drawText({
        text: label.serial,
        x: padding, y: yPos, width: contentWidth,
        height: serialFontHeight + 0.5, fontHeight: serialFontHeight,
        horizontalAlignment: 1,
      });

      const commitResult = await api.commitJob();
      if (commitResult?.statusCode === 0) {
        printed++;
      }
    }

    await api.closePrinter();
    return { success: printed > 0, printed, error: printed === 0 ? "No labels were printed" : undefined };
  } catch (err: any) {
    try { await api.closePrinter(); } catch {}
    return { success: false, printed: 0, error: err?.message || "Print failed" };
  }
}

/**
 * Print a customer/shipping label directly to the Detonger printer via lpapi-dtpweb SDK.
 * Layout: sender text (top), dashed line, address (middle), phone (bottom, bold).
 */
export async function printCustomerLabel(options: CustomerLabelPrintOptions): Promise<{ success: boolean; error?: string }> {
  if (!api) {
    return { success: false, error: "Print service not initialized. Please check the printer connection first." };
  }

  const { printerName, labelWidth, labelHeight, label } = options;

  try {
    const openResp = await api.openPrinter(printerName);
    if (openResp.statusCode !== 0) {
      return { success: false, error: `Failed to connect to printer "${printerName}": ${openResp.errMsg || 'Unknown error'}` };
    }

    api.startJob({ width: labelWidth, height: labelHeight });

    const paddingLeft = 1;
    const paddingRight = 3;
    const contentWidth = labelWidth - paddingLeft - paddingRight;
    const usableHeight = labelHeight - paddingLeft * 2;

    // Count how many sections we have
    const sections: { text: string; weight: number }[] = [];
    if (label.senderText) sections.push({ text: label.senderText, weight: 1 });
    if (label.address) sections.push({ text: label.address, weight: 1.4 });
    if (label.phone) sections.push({ text: label.phone, weight: 1.2 });

    const totalWeight = sections.reduce((s, sec) => s + sec.weight, 0);
    const gap = sections.length > 1 ? 1 : 0;
    const availableForText = usableHeight - gap * (sections.length - 1);

    let yPos = paddingLeft;

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const sectionHeight = (sec.weight / totalWeight) * availableForText;
      const fontHeight = sectionHeight * 0.7;

      api.drawText({
        text: sec.text,
        x: padding, y: yPos, width: contentWidth,
        height: sectionHeight, fontHeight: fontHeight,
        fontStyle: 1, horizontalAlignment: 1, verticalAlignment: 1,
      });
      yPos += sectionHeight + gap;
    }

    const commitResult = await api.commitJob();
    await api.closePrinter();

    if (commitResult?.statusCode === 0) {
      return { success: true };
    } else {
      return { success: false, error: "Print command failed" };
    }
  } catch (err: any) {
    try { await api.closePrinter(); } catch {}
    return { success: false, error: err?.message || "Print failed" };
  }
}
