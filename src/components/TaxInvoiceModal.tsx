import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReceiptResponse } from '@/types/api';
import { printReceipt, shareReceiptPDF } from '@/services/pdfService';
import { Palette, Shadows } from '@/theme/designSystem';
import { numberToWordsINR } from '@/utils/numberToWords';
import { AuthContext } from '@/context/AuthContext';
import { formatImageUri } from '@/utils/imageUtils';

interface TaxInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  receipt: ReceiptResponse | null;
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({
  visible,
  onClose,
  receipt,
}) => {
  const auth = React.useContext(AuthContext) as { activeStore?: any } | undefined;
  const activeStore = auth?.activeStore || null;
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  if (!receipt) return null;

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

  // Received & Balance calculation strictly matching POS transaction & payment method
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

  const storeName = store.store_name || activeStore?.name || 'MY SAVE SHOP';
  const storeAddress =
    store.address || activeStore?.address || 'Boinchigram GT Road More, Boinchigram, Pandua, Hooghly, 712134';
  const storePhone = store.phone_number || activeStore?.phone_number || '8001387240';
  const storeEmail = store.email || activeStore?.email || 'mysaveshop2025@gmail.com';
  const storeState = store.state || activeStore?.state || '19-West Bengal';

  // Fallback to activeStore for logo and signature if not present on receipt
  const activeLogo =
    activeStore && activeStore.store_id === store.store_id
      ? activeStore.logo_base64 || activeStore.logo_url
      : null;
  const logoUri = formatImageUri(store.logo_base64 || store.logo_url || activeLogo);

  const activeSig =
    activeStore && activeStore.store_id === store.store_id
      ? activeStore.authorized_signature_base64
      : null;
  const signatureUri = formatImageUri(
    store.authorized_signature_base64 || (store as any).signature_url || activeSig
  );

  const getEnrichedReceipt = (): ReceiptResponse => {
    return {
      ...receipt,
      store: {
        ...store,
        store_name: storeName,
        address: storeAddress,
        phone_number: storePhone,
        email: storeEmail,
        state: storeState,
        logo_base64:
          store.logo_base64 ||
          (activeStore?.store_id === store.store_id ? activeStore.logo_base64 : undefined),
        logo_url:
          store.logo_url ||
          (activeStore?.store_id === store.store_id ? activeStore.logo_url : undefined),
        authorized_signature_base64:
          store.authorized_signature_base64 ||
          (activeStore?.store_id === store.store_id
            ? activeStore.authorized_signature_base64
            : undefined),
      },
    };
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printReceipt(getEnrichedReceipt());
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Could not print bill.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await shareReceiptPDF(getEnrichedReceipt());
    } catch (err: any) {
      Alert.alert('PDF Export', err?.message || 'Could not share PDF.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {/* Top Control Bar */}
        <View
          style={styles.topControlBar}
          className="no-print"
          {...({ 'data-no-print': 'true' } as any)}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
            <Ionicons name="close" size={24} color={Palette.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Tax Invoice</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Invoice Canvas */}
        <ScrollView style={styles.scrollCanvas} contentContainerStyle={styles.scrollContent}>
          <View style={styles.paperSheet}>
            {/* Header Title: Tax Invoice */}
            <View style={styles.taxTitleContainer}>
              <Text style={styles.taxTitleLine}>Tax</Text>
              <Text style={styles.taxTitleLine}>Invoice</Text>
            </View>

            {/* Store Information Box */}
            <View style={styles.storeBox}>
              {/* Circular Store Logo or Gold Seal Badge */}
              {logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={styles.storeLogoImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.goldSealBadge}>
                  <Text style={styles.goldSealTop}>MY</Text>
                  <Text style={styles.goldSealMiddle}>SAVE</Text>
                  <Text style={styles.goldSealBottom}>SHOP</Text>
                  <Text style={styles.goldSealStars}>★★★★★</Text>
                </View>
              )}

              {/* Store Details Right Side */}
              <View style={styles.storeDetailsContainer}>
                <Text style={styles.storeNameText}>{storeName}</Text>
                <Text style={styles.storeAddressText}>{storeAddress}</Text>
                <View style={styles.storeContactRow}>
                  <Text style={styles.storeContactItem}>
                    Phone: <Text style={styles.boldText}>{storePhone}</Text>
                  </Text>
                  <Text style={[styles.storeContactItem, { marginLeft: 8 }]}>
                    Email: <Text style={styles.boldText}>{storeEmail}</Text>
                  </Text>
                </View>
                <Text style={styles.storeStateText}>
                  State: <Text style={styles.boldText}>{storeState}</Text>
                </Text>
              </View>
            </View>

            {/* Bill To & Invoice Details Box */}
            <View style={styles.billMetaBox}>
              {/* Left Column: Bill To */}
              <View style={styles.billMetaColLeft}>
                <View style={styles.metaHeaderStrip}>
                  <Text style={styles.metaHeaderStripText}>Bill To:</Text>
                </View>
                <View style={styles.metaBody}>
                  <Text style={styles.customerNameText}>{customer_name || 'Walk-in Customer'}</Text>
                  <Text style={styles.metaDetailText}>
                    Contact No: <Text style={styles.boldText}>{customer_phone || 'N/A'}</Text>
                  </Text>
                </View>
              </View>

              {/* Right Column: Invoice Details */}
              <View style={styles.billMetaColRight}>
                <View style={styles.metaHeaderStrip}>
                  <Text style={styles.metaHeaderStripText}>Invoice Details:</Text>
                </View>
                <View style={styles.metaBody}>
                  <Text style={styles.metaDetailText}>
                    No: <Text style={styles.boldText}>{shortInvoiceNo}</Text>
                  </Text>
                  <Text style={styles.metaDetailText}>
                    Date: <Text style={styles.boldText}>{formattedDate}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Itemized Table - Fits 100% of Screen Width with Zero Clipping */}
            <View style={styles.tableWrapper}>
              {/* Table Header Row */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.cell, styles.colIndex]}>
                  <Text style={styles.thText}>#</Text>
                </View>
                <View style={[styles.cell, styles.colItemName]}>
                  <Text style={[styles.thText, { textAlign: 'left', paddingLeft: 2 }]}>
                    Item Name
                  </Text>
                </View>
                <View style={[styles.cell, styles.colCashback]}>
                  <Text style={styles.thText}>Cashback</Text>
                </View>
                <View style={[styles.cell, styles.colQty]}>
                  <Text style={styles.thText}>Qty</Text>
                </View>
                <View style={[styles.cell, styles.colUnit]}>
                  <Text style={styles.thText}>Unit</Text>
                </View>
                <View style={[styles.cell, styles.colPrice]}>
                  <Text style={[styles.thText, { textAlign: 'right' }]}>Price (₹)</Text>
                </View>
                <View style={[styles.cell, styles.colDiscount]}>
                  <Text style={[styles.thText, { textAlign: 'right' }]}>Disc (₹)</Text>
                </View>
                <View style={[styles.cell, styles.colAmount, { borderRightWidth: 0 }]}>
                  <Text style={[styles.thText, { textAlign: 'right' }]}>Amount (₹)</Text>
                </View>
              </View>

              {/* Data Rows */}
              {items.map((item, index) => {
                const cbAmt = Number(item.cashback_amount || 0);
                const cbFormatted =
                  cbAmt > 0 ? (cbAmt % 1 === 0 ? cbAmt.toFixed(0) : cbAmt.toFixed(2)) : '-';

                const discAmt = Number(item.discount_amount || item.line_discount_amount || 0);
                const discPct = Number(item.discount_pct || item.item_discount_pct || 0);

                return (
                  <View key={item.item_id || String(index)} style={styles.tableDataRow}>
                    <View style={[styles.cell, styles.colIndex]}>
                      <Text style={styles.tdTextCenter}>{index + 1}</Text>
                    </View>
                    <View style={[styles.cell, styles.colItemName]}>
                      <Text style={styles.itemNameText} numberOfLines={2}>
                        {item.product_name}
                      </Text>
                    </View>
                    <View style={[styles.cell, styles.colCashback]}>
                      <Text style={styles.cashbackLargeText}>{cbFormatted}</Text>
                    </View>
                    <View style={[styles.cell, styles.colQty]}>
                      <Text style={styles.tdTextCenter}>{Number(item.quantity)}</Text>
                    </View>
                    <View style={[styles.cell, styles.colUnit]}>
                      <Text style={styles.tdTextCenter}>{item.unit || 'Pcs'}</Text>
                    </View>
                    <View style={[styles.cell, styles.colPrice]}>
                      <Text style={styles.tdTextRight}>
                        ₹ {Number(item.unit_price).toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.cell, styles.colDiscount]}>
                      <Text style={styles.tdTextRight}>₹ {discAmt.toFixed(2)}</Text>
                      {discAmt > 0 && (
                        <Text style={styles.discountSubPct}>({discPct.toFixed(1)}%)</Text>
                      )}
                    </View>
                    <View style={[styles.cell, styles.colAmount, { borderRightWidth: 0 }]}>
                      <Text style={[styles.tdTextRight, { fontWeight: '700' }]}>
                        ₹ {Number(item.line_total).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Totals Row - Strict 8-Cell Grid Aligning 100% with Columns Above */}
              <View style={styles.tableTotalsRow}>
                <View style={[styles.cell, styles.colIndex, { borderRightColor: 'transparent' }]} />
                <View style={[styles.cell, styles.colItemName]}>
                  <Text style={styles.totalsLabelText}>Total</Text>
                </View>
                <View style={[styles.cell, styles.colCashback]}>
                  <Text style={styles.cashbackLargeText}>{totalCashbackFormatted}</Text>
                </View>
                <View style={[styles.cell, styles.colQty]}>
                  <Text style={styles.tdTextCenter}>{totalQtyFormatted}</Text>
                </View>
                <View style={[styles.cell, styles.colUnit]} />
                <View style={[styles.cell, styles.colPrice]} />
                <View style={[styles.cell, styles.colDiscount]}>
                  <Text style={[styles.tdTextRight, { fontWeight: '800' }]}>
                    ₹ {totalDiscount.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.cell, styles.colAmount, { borderRightWidth: 0 }]}>
                  <Text style={[styles.tdTextRight, { fontWeight: '900', fontSize: 10.5 }]}>
                    ₹ {Number(final_total).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Bottom Summary Row - Perfectly Grid-Aligned with the 5 Left and 3 Right Columns */}
              <View style={styles.tableBottomSummaryRow}>
                {/* 5 Left Columns: Clean Blank Space with Solid Right Border on Unit Column */}
                <View style={[styles.cell, styles.colIndex, styles.bottomBlankCellTransparent]} />
                <View style={[styles.cell, styles.colItemName, styles.bottomBlankCellTransparent]} />
                <View style={[styles.cell, styles.colCashback, styles.bottomBlankCellTransparent]} />
                <View style={[styles.cell, styles.colQty, styles.bottomBlankCellTransparent]} />
                <View style={[styles.cell, styles.colUnit, styles.bottomBlankCellDivider]} />

                {/* 3 Right Columns: Summary Box */}
                <View style={styles.bottomSummaryContent}>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Sub Total</Text>
                    <Text style={styles.sumColon}>:</Text>
                    <Text style={styles.sumValue}>₹ {Number(subtotal).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.sumRow, { marginVertical: 1 }]}>
                    <Text style={styles.sumLabelBold}>Total</Text>
                    <Text style={styles.sumColonBold}>:</Text>
                    <Text style={styles.sumValueBold}>₹ {Number(final_total).toFixed(2)}</Text>
                  </View>
                  <View style={styles.wordsContainer}>
                    <Text style={styles.wordsHeading}>Invoice Amount In Words :</Text>
                    <Text style={styles.wordsValue}>{wordsText}</Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Received</Text>
                    <Text style={styles.sumColon}>:</Text>
                    <Text style={styles.sumValue}>₹ {receivedAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Balance</Text>
                    <Text style={styles.sumColon}>:</Text>
                    <Text style={styles.sumValue}>₹ {balanceAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>You Saved</Text>
                    <Text style={styles.sumColon}>:</Text>
                    <Text style={styles.sumValue}>₹ {savedAmount.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Authorized Signatory Box (Aligned to Bottom Right) */}
            <View style={styles.signatoryOuterWrapper}>
              <View style={styles.signatoryCard}>
                <Text style={styles.signatoryStoreText}>For {storeName}:</Text>
                <View style={styles.signatoryMiddle}>
                  {signatureUri ? (
                    <Image
                      source={{ uri: signatureUri }}
                      style={styles.signatureImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.signatureDraw}>
                      <Ionicons name="pencil" size={16} color="#475569" style={{ opacity: 0.3 }} />
                    </View>
                  )}
                </View>
                <Text style={styles.signatoryBottomLabel}>Authorized Signatory</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View
            style={styles.actionButtonsContainer}
            className="no-print"
            {...({ 'data-no-print': 'true' } as any)}
          >
            <TouchableOpacity
              onPress={handlePrint}
              style={[styles.primaryButton, { flex: 1, marginRight: 8 }]}
              disabled={isPrinting}
            >
              {isPrinting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="print-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryButtonText}>Print Bill</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={[styles.secondaryButton, { flex: 1, marginLeft: 8 }]}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color={Palette.bluePrimary} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color={Palette.bluePrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryButtonText}>Share PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.doneButton}
            className="no-print"
            {...({ 'data-no-print': 'true' } as any)}
          >
            <Text style={styles.doneButtonText}>Done / New Sale</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderLight,
    ...Shadows.sm,
  },
  closeIconButton: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  scrollCanvas: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 48,
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderRadius: 2,
    maxWidth: 794,
    alignSelf: 'center',
    width: '100%',
    ...Shadows.md,
  },

  // Tax Invoice Header
  taxTitleContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  taxTitleLine: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    lineHeight: 26,
    letterSpacing: 0.5,
  },

  // Store Info Box
  storeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    padding: 8,
  },
  storeLogoImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 10,
  },
  goldSealBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: '#D4AF37',
    backgroundColor: '#0055A5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  goldSealTop: {
    color: '#FFE885',
    fontSize: 6.5,
    fontWeight: '800',
    lineHeight: 8,
  },
  goldSealMiddle: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
    lineHeight: 10,
  },
  goldSealBottom: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '900',
    lineHeight: 9,
  },
  goldSealStars: {
    color: '#FFD700',
    fontSize: 5,
    marginTop: 1,
  },
  storeDetailsContainer: {
    flex: 1,
  },
  storeNameText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  storeAddressText: {
    fontSize: 10,
    color: '#1E293B',
    lineHeight: 13,
  },
  storeContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  storeContactItem: {
    fontSize: 10,
    color: '#1E293B',
  },
  storeStateText: {
    fontSize: 10,
    color: '#1E293B',
    marginTop: 2,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },

  // Bill To & Invoice Details Box
  billMetaBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#475569',
  },
  billMetaColLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#475569',
  },
  billMetaColRight: {
    flex: 1,
  },
  metaHeaderStrip: {
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  metaHeaderStripText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
  },
  metaBody: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  customerNameText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  metaDetailText: {
    fontSize: 10,
    color: '#1E293B',
    lineHeight: 14,
  },

  // Itemized Table
  tableWrapper: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#475569',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#FFFFFF',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#475569',
  },
  tableTotalsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#FFFFFF',
  },
  tableBottomSummaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  cell: {
    borderRightWidth: 1,
    borderRightColor: '#475569',
    paddingHorizontal: 2,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  thText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 11,
  },
  tdTextCenter: {
    fontSize: 10,
    color: '#1E293B',
    textAlign: 'center',
    fontWeight: '600',
  },
  tdTextRight: {
    fontSize: 9.5,
    color: '#1E293B',
    textAlign: 'right',
    paddingRight: 2,
  },
  itemNameText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
    paddingLeft: 2,
    lineHeight: 12,
  },
  cashbackLargeText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  discountSubPct: {
    fontSize: 8,
    color: '#475569',
    textAlign: 'right',
    paddingRight: 2,
  },
  totalsLabelText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#0F172A',
    paddingLeft: 2,
  },

  // Responsive Column Flex Ratios - Strict 10.0 Total Flex
  colIndex: { flex: 0.5 },
  colItemName: { flex: 2.7 },
  colCashback: { flex: 1.2 },
  colQty: { flex: 0.85 },
  colUnit: { flex: 1.0 },
  colPrice: { flex: 1.2 },
  colDiscount: { flex: 1.25 },
  colAmount: { flex: 1.3 },

  // Bottom Summary Layout (5 cols blank left, 3 cols summary right)
  bottomBlankCellTransparent: {
    borderRightWidth: 1,
    borderRightColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  bottomBlankCellDivider: {
    borderRightWidth: 1,
    borderRightColor: '#475569',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  bottomSummaryContent: {
    flex: 3.75,
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
  },
  sumLabel: {
    flex: 1.2,
    fontSize: 9,
    color: '#1E293B',
  },
  sumColon: {
    fontSize: 9,
    color: '#1E293B',
    marginRight: 2,
  },
  sumValue: {
    fontSize: 9,
    color: '#1E293B',
    textAlign: 'right',
    fontWeight: '600',
  },
  sumLabelBold: {
    flex: 1.2,
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  sumColonBold: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0F172A',
    marginRight: 2,
  },
  sumValueBold: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
  },
  wordsContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#94A3B8',
    marginVertical: 3,
    paddingVertical: 2,
  },
  wordsHeading: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 1,
  },
  wordsValue: {
    fontSize: 8.5,
    color: '#0F172A',
    lineHeight: 11,
    fontWeight: '600',
  },

  // Signatory Box
  signatoryOuterWrapper: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  signatoryCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#475569',
  },
  signatoryStoreText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1E293B',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
  },
  signatoryMiddle: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureImage: {
    width: 100,
    height: 36,
  },
  signatureDraw: {
    width: 100,
    height: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatoryBottomLabel: {
    fontSize: 8.5,
    color: '#475569',
    textAlign: 'center',
    paddingVertical: 3,
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    maxWidth: 794,
    alignSelf: 'center',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: Palette.bluePrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    ...Shadows.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.bluePrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    ...Shadows.sm,
  },
  secondaryButtonText: {
    color: Palette.bluePrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  doneButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    maxWidth: 794,
    alignSelf: 'center',
    width: '100%',
  },
  doneButtonText: {
    color: Palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
