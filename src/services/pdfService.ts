import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ReceiptResponse } from '@/types/api';
import { numberToWordsINR } from '@/utils/numberToWords';

export function buildReceiptHTML(receipt: ReceiptResponse): string {
  const {
    store,
    invoice_number,
    date,
    customer_name,
    customer_phone,
    items,
    subtotal,
    total_discount_amount,
    total_cashback_amount,
    final_total,
    amount_in_words,
    you_saved_amount,
  } = receipt;

  const d = new Date(date);
  const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

  const totalQty = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  const totalQtyFormatted = totalQty % 1 === 0 ? totalQty.toFixed(0) : totalQty.toFixed(2);

  const itemsTotalCashback = items.reduce((acc, it) => acc + Number(it.cashback_amount || 0), 0);
  const totalCashback =
    Number(total_cashback_amount || 0) > 0
      ? Number(total_cashback_amount)
      : itemsTotalCashback;
  const totalCashbackFormatted =
    totalCashback % 1 === 0 ? totalCashback.toFixed(0) : totalCashback.toFixed(2);

  const itemsTotalDiscount = items.reduce(
    (acc, it) => acc + Number(it.discount_amount || it.line_discount_amount || 0),
    0
  );
  const totalDiscount =
    Number(total_discount_amount || 0) > 0
      ? Number(total_discount_amount)
      : itemsTotalDiscount;

  const savedAmount =
    Number(you_saved_amount || 0) > 0
      ? Number(you_saved_amount)
      : Math.max(totalDiscount, Number(subtotal || 0) - Number(final_total || 0));

  const wordsText = amount_in_words || numberToWordsINR(final_total);

  const receivedAmount =
    receipt.received_amount !== undefined && receipt.received_amount !== null
      ? Number(receipt.received_amount)
      : receipt.payment_method === 'CREDIT'
      ? 0
      : Number(final_total);

  const balanceAmount =
    receipt.balance_amount !== undefined && receipt.balance_amount !== null
      ? Number(receipt.balance_amount)
      : Math.max(0, Number(final_total) - receivedAmount);

  const seqNum =
    receipt.invoice_seq !== undefined && receipt.invoice_seq !== null
      ? receipt.invoice_seq
      : invoice_number.includes('-')
      ? parseInt(invoice_number.split('-').pop() || '', 10)
      : parseInt(invoice_number, 10);

  const shortInvoiceNo =
    !isNaN(Number(seqNum)) && Number(seqNum) > 0
      ? String(seqNum)
      : invoice_number.includes('-')
      ? invoice_number.split('-').pop() || invoice_number
      : invoice_number;

  const storeName = store.store_name || 'MY SAVE SHOP';
  const storeAddress = store.address || 'Boinchigram GT Road More, Boinchigram, Pandua, Hooghly, 712134';
  const storePhone = store.phone_number || '8001387240';
  const storeEmail = store.email || 'mysaveshop2025@gmail.com';
  const storeState = store.state || '19-West Bengal';

  const itemsRows = items
    .map((item, index) => {
      const cbAmt = Number(item.cashback_amount || 0);
      const cbStr = cbAmt > 0 ? (cbAmt % 1 === 0 ? cbAmt.toFixed(0) : cbAmt.toFixed(2)) : '-';

      const discAmt = Number(item.discount_amount || item.line_discount_amount || 0);
      const discPct = Number(item.discount_pct || item.item_discount_pct || 0);
      const discStr =
        discAmt > 0
          ? `₹ ${discAmt.toFixed(2)}<br/><span style="font-size: 8.5px; color: #475569;">(${discPct.toFixed(1)}%)</span>`
          : '₹ 0.00';

      return `
        <tr class="item-row">
          <td style="text-align: center; vertical-align: middle; border: 1px solid #475569; padding: 5px 2px; font-weight: bold;">${index + 1}</td>
          <td style="text-align: left; vertical-align: middle; border: 1px solid #475569; padding: 5px 6px; font-weight: 700; word-break: break-word;">${item.product_name}</td>
          <td style="text-align: center; vertical-align: middle; border: 1px solid #475569; padding: 5px 2px; font-weight: 900; font-size: 13px;">${cbStr}</td>
          <td style="text-align: center; vertical-align: middle; border: 1px solid #475569; padding: 5px 2px;">${Number(item.quantity)}</td>
          <td style="text-align: center; vertical-align: middle; border: 1px solid #475569; padding: 5px 2px;">${item.unit || 'Pcs'}</td>
          <td style="text-align: right; vertical-align: middle; border: 1px solid #475569; padding: 5px 6px;">₹ ${Number(item.unit_price).toFixed(2)}</td>
          <td style="text-align: right; vertical-align: middle; border: 1px solid #475569; padding: 5px 6px; line-height: 1.2;">${discStr}</td>
          <td style="text-align: right; vertical-align: middle; border: 1px solid #475569; padding: 5px 6px; font-weight: 700;">₹ ${Number(item.line_total).toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  // Circular Gold Seal Logo
  const logoSrc = store.logo_base64
    ? store.logo_base64.startsWith('data:')
      ? store.logo_base64
      : `data:image/png;base64,${store.logo_base64}`
    : null;

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" style="width: 58px; height: 58px; border-radius: 29px; object-fit: contain; margin-right: 12px;" alt="Logo" />`
    : `
      <div style="width: 58px; height: 58px; border-radius: 50%; border: 3px solid #D4AF37; background: #005B94; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; margin-right: 12px; box-shadow: inset 0 0 4px #002244; flex-shrink: 0;">
        <div style="font-size: 7px; color: #FFE885; letter-spacing: 0.5px; font-weight: bold; line-height: 8px;">MY</div>
        <div style="font-size: 8.5px; font-weight: 900; letter-spacing: 0.3px; line-height: 10px; color: #FFF;">SAVE</div>
        <div style="font-size: 8px; font-weight: 900; letter-spacing: 0.3px; line-height: 9px; color: #FFF;">SHOP</div>
        <div style="font-size: 6px; color: #FFD700; margin-top: 1px;">★★★★★</div>
      </div>
    `;

  // Signature image or stylish fallback SVG
  const signatureSrc = store.authorized_signature_base64
    ? store.authorized_signature_base64.startsWith('data:')
      ? store.authorized_signature_base64
      : `data:image/png;base64,${store.authorized_signature_base64}`
    : null;

  const signatureHtml = signatureSrc
    ? `<img src="${signatureSrc}" style="max-height: 40px; max-width: 130px; display: block; margin: auto;" alt="Signature" />`
    : `
      <svg width="120" height="40" viewBox="0 0 120 40" style="display: block; margin: auto;">
        <path d="M 15 25 C 25 12, 30 8, 38 15 C 45 22, 40 32, 55 26 C 65 20, 75 10, 85 16 C 95 24, 90 30, 105 24 M 22 29 Q 50 8 92 20 Q 70 32 35 26" stroke="#1E293B" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Tax Invoice</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 8mm 12mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0F172A;
            margin: 0;
            padding: 8px;
            font-size: 11px;
            background: #fff;
          }
          .tax-header {
            text-align: center;
            font-size: 22px;
            font-weight: 900;
            color: #2D3748;
            margin-bottom: 12px;
            line-height: 1.2;
            letter-spacing: 0.5px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .invoice-box {
            width: 100%;
            max-width: 680px;
            margin: auto;
          }
          .store-box {
            border: 1px solid #475569;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .store-content {
            flex: 1;
          }
          .store-title {
            font-size: 16px;
            font-weight: 900;
            color: #0F172A;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .store-addr {
            font-size: 10.5px;
            color: #1E293B;
            line-height: 1.35;
          }
          .store-contact-row {
            display: flex;
            font-size: 10.5px;
            color: #1E293B;
            margin-top: 3px;
          }
          .bill-meta-box {
            border: 1px solid #475569;
            border-top: none;
            display: flex;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .bill-meta-left {
            width: 50%;
            border-right: 1px solid #475569;
          }
          .bill-meta-right {
            width: 50%;
          }
          .meta-header-strip {
            background: #F1F5F9;
            border-bottom: 1px solid #475569;
            padding: 4px 8px;
            font-weight: 800;
            font-size: 10.5px;
            color: #1E293B;
          }
          .meta-body {
            padding: 6px 8px;
            font-size: 11px;
            color: #1E293B;
            line-height: 1.45;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #475569;
            border-top: none;
            table-layout: fixed;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .items-table th {
            border: 1px solid #475569;
            padding: 5px 2px;
            font-size: 9.5px;
            font-weight: 800;
            color: #1E293B;
            text-align: center;
            background: #F8FAFC;
            line-height: 1.15;
            vertical-align: middle;
          }
          .item-row td {
            border: 1px solid #475569;
            padding: 5px 4px;
            vertical-align: middle;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .totals-row {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: avoid;
            break-after: avoid;
          }
          .totals-row td {
            border: 1px solid #475569;
            padding: 6px 4px;
            font-weight: 900;
            background: #FFF;
            vertical-align: middle;
          }
          .summary-row {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .blank-left-box {
            border: 1px solid #475569;
            border-top: none;
            vertical-align: top;
            background: #FFF;
          }
          .summary-right-cell {
            border: 1px solid #475569;
            border-top: none;
            vertical-align: top;
            padding: 6px 8px;
            background: #FFF;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .summary-inner-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            font-size: 10.5px;
            table-layout: fixed;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .summary-inner-table td {
            border: none;
            padding: 2.5px 0;
            color: #1E293B;
          }
          .summary-line-bold {
            font-weight: 900;
            color: #0F172A;
          }
          .words-block-td {
            border-top: 1px solid #94A3B8 !important;
            border-bottom: 1px solid #94A3B8 !important;
            padding: 4px 0 !important;
          }
          .words-title {
            font-size: 9px;
            font-weight: 800;
            color: #334155;
            margin-bottom: 2px;
          }
          .words-content {
            font-size: 10px;
            color: #1E293B;
            line-height: 1.3;
            font-weight: 500;
          }
          .signatory-container {
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-before: auto;
          }
          .signatory-card {
            width: 48%;
            border: 1px solid #475569;
            text-align: center;
            background: #FFF;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .signatory-top-text {
            font-size: 10px;
            font-weight: 800;
            color: #1E293B;
            text-align: left;
            padding: 4px 6px;
            border-bottom: 1px solid #475569;
          }
          .signatory-middle {
            height: 46px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2px;
          }
          .signatory-bottom-label {
            font-size: 9.5px;
            color: #475569;
            padding: 4px;
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
              background: #fff;
            }
            .invoice-box {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            thead {
              display: table-header-group !important;
            }
            tfoot {
              display: table-footer-group !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .tax-header, .store-box, .bill-meta-box {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .totals-row {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .summary-row {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .blank-left-box, .summary-right-cell {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .signatory-container {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <!-- Centered Tax Invoice Title -->
          <div class="tax-header">
            Tax<br/>Invoice
          </div>

          <!-- Store Info Box -->
          <div class="store-box">
            ${logoHtml}
            <div class="store-content">
              <div class="store-title">${storeName}</div>
              <div class="store-addr">
                <div>${storeAddress}</div>
              </div>
              <div class="store-contact-row">
                <span style="margin-right: 14px;">Phone: <strong>${storePhone}</strong></span>
                <span>Email: <strong>${storeEmail}</strong></span>
              </div>
              <div style="margin-top: 2px; font-size: 10.5px;">State: <strong>${storeState}</strong></div>
            </div>
          </div>

          <!-- Bill To & Invoice Details Box -->
          <div class="bill-meta-box">
            <div class="bill-meta-left">
              <div class="meta-header-strip">Bill To:</div>
              <div class="meta-body">
                <div style="font-weight: 800; font-size: 12px; margin-bottom: 2px;">${customer_name || 'Walk-in Customer'}</div>
                <div>Contact No: <strong>${customer_phone || 'N/A'}</strong></div>
              </div>
            </div>
            <div class="bill-meta-right">
              <div class="meta-header-strip">Invoice Details:</div>
              <div class="meta-body">
                <div>No: <strong>${shortInvoiceNo}</strong></div>
                <div>Date: <strong>${formattedDate}</strong></div>
              </div>
            </div>
          </div>

          <!-- Items Table (Locked Table-Layout Fixed for Perfect Grid Alignment) -->
          <table class="items-table">
            <colgroup>
              <col style="width: 5%;">
              <col style="width: 27%;">
              <col style="width: 12%;">
              <col style="width: 8.5%;">
              <col style="width: 10%;">
              <col style="width: 12%;">
              <col style="width: 12.5%;">
              <col style="width: 13%;">
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th style="text-align: left; padding-left: 6px;">Item Name</th>
                <th>Cash<br/>back</th>
                <th>Quantit<br/>y</th>
                <th>Unit</th>
                <th style="text-align: right; padding-right: 6px;">Price/<br/>Unit (₹)</th>
                <th style="text-align: right; padding-right: 6px;">Discou<br/>nt (₹)</th>
                <th style="text-align: right; padding-right: 6px;">Amoun<br/>t(₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
              <tr class="totals-row">
                <td style="border-right: none;"></td>
                <td style="border-left: none; text-align: left; padding-left: 6px; font-weight: bold;">Total</td>
                <td style="text-align: center; font-size: 14.5px; font-weight: 900;">${totalCashbackFormatted}</td>
                <td style="text-align: center; font-weight: bold;">${totalQtyFormatted}</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td style="text-align: right; padding-right: 6px; font-weight: bold;">₹ ${totalDiscount.toFixed(2)}</td>
                <td style="text-align: right; padding-right: 6px; font-weight: bold; line-height: 1.1;">
                  <div style="font-size: 9px; font-weight: bold;">₹</div>
                  <div style="font-size: 12.5px; font-weight: 900;">${Number(final_total).toFixed(2)}</div>
                </td>
              </tr>
              <!-- Bottom Summary Directly Inside Table for 100% Guaranteed Alignment -->
              <tr class="summary-row">
                <td colspan="5" class="blank-left-box"></td>
                <td colspan="3" class="summary-right-cell">
                  <table class="summary-inner-table">
                    <colgroup>
                      <col style="width: 44%;">
                      <col style="width: 56%;">
                    </colgroup>
                    <tr>
                      <td>Sub Total</td>
                      <td style="text-align: right;">: &nbsp; ₹ ${Number(subtotal).toFixed(2)}</td>
                    </tr>
                    <tr class="summary-line-bold">
                      <td>Total</td>
                      <td style="text-align: right;">: &nbsp; ₹ ${Number(final_total).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colspan="2" class="words-block-td">
                        <div class="words-title">Invoice Amount In Words :</div>
                        <div class="words-content">${wordsText}</div>
                      </td>
                    </tr>
                    <tr>
                      <td>Received</td>
                      <td style="text-align: right;">: &nbsp; ₹ ${receivedAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>Balance</td>
                      <td style="text-align: right;">: &nbsp; ₹ ${balanceAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>You Saved</td>
                      <td style="text-align: right;">: &nbsp; ₹ ${savedAmount.toFixed(2)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Signatory Box on Bottom Right -->
          <div class="signatory-container">
            <div class="signatory-card">
              <div class="signatory-top-text">For ${storeName}:</div>
              <div class="signatory-middle">
                ${signatureHtml}
              </div>
              <div class="signatory-bottom-label">Authorized Signatory</div>
            </div>
          </div>

          <div style="margin-top: 14px; text-align: center; font-size: 8.5px; color: #64748B;">
            This is a computer generated invoice. No signature required if electronically stamped.
          </div>
        </div>
      </body>
    </html>
  `;
}

export const printReceipt = async (receipt: ReceiptResponse): Promise<void> => {
  const html = buildReceiptHTML(receipt);
  await Print.printAsync({ html });
};

export const shareReceiptPDF = async (receipt: ReceiptResponse): Promise<void> => {
  const html = buildReceiptHTML(receipt);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  try {
    const { uri } = await Print.printToFileAsync({ html });
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Tax Invoice ${receipt.invoice_number}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ html });
    }
  } catch (error: any) {
    console.warn('Sharing error, fallback to print dialog:', error);
    await Print.printAsync({ html });
  }
};
