"use client"; // Required for @react-pdf/renderer components

import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

// Define the expected props based on fetchInvoiceData return type
// Adjust based on the actual InvoiceData interface in fetch-invoice-data.ts
export interface InvoiceData {
  orderId: string;
  orderNumber: string;
  customerName: string; // Example: Add more customer details if needed
  items: { id: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  // Add other necessary fields like billing address, date, etc.
}

interface InvoiceTemplateProps {
  data: InvoiceData;
}

// Create styles
// See @react-pdf/renderer documentation for styling options
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
    // fontFamily: 'Helvetica', // Specify a font registered with Font.register
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    color: "grey",
  },
  section: {
    marginBottom: 15,
  },
  subheading: {
    fontSize: 14,
    marginBottom: 8,
    // fontWeight: 'bold', // Use fontFamily for bold variants if registered
    textDecoration: "underline",
  },
  text: {
    fontSize: 11,
    marginBottom: 3,
  },
  table: {
    // display: 'table', // Not directly supported, use View structure
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#bfbfbf",
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomColor: "#bfbfbf",
    borderBottomWidth: 1,
    alignItems: "center",
    minHeight: 24,
  },
  tableColHeader: {
    // width: '25%', // Adjust widths as needed
    flex: 1, // Example: Equal width columns
    borderStyle: "solid",
    borderRightColor: "#bfbfbf",
    borderRightWidth: 1,
    backgroundColor: "#f2f2f2",
    padding: 5,
    textAlign: "center",
    // fontWeight: 'bold',
    fontSize: 10,
  },
  tableCol: {
    // width: '25%', // Adjust widths as needed
    flex: 1, // Example: Equal width columns
    borderStyle: "solid",
    borderRightColor: "#bfbfbf",
    borderRightWidth: 1,
    padding: 5,
    fontSize: 10,
  },
  tableCell: {
    // margin: 'auto', // Center content vertically if needed
    textAlign: "center",
  },
  totalSection: {
    marginTop: 20,
    textAlign: "right",
  },
  totalText: {
    fontSize: 12,
    // fontWeight: 'bold',
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "grey",
    fontSize: 9,
  },
});

// Helper to format currency (example)
const formatCurrency = (amount: number) => {
  return `$${amount.toFixed(2)}`; // Adjust currency symbol/format as needed
};

// Create Document Component
export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Invoice</Text>

      <View style={styles.section}>
        <Text style={styles.subheading}>Order Information</Text>
        <Text style={styles.text}>Order ID: {data.orderId}</Text>
        <Text style={styles.text}>Order Number: {data.orderNumber}</Text>
        <Text style={styles.text}>Customer: {data.customerName}</Text>
        {/* Add billing/shipping address if available */}
      </View>

      <View style={styles.section}>
        <Text style={styles.subheading}>Items</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableRow}>
            <View style={[styles.tableColHeader, { flex: 3 }]}>
              <Text>Item Name</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text>Quantity</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text>Unit Price</Text>
            </View>
            <View style={[styles.tableColHeader, { borderRightWidth: 0 }]}>
              <Text>Line Total</Text>
            </View>
          </View>
          {/* Table Body */}
          {data.items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <View style={[styles.tableCol, { flex: 3 }]}>
                <Text style={styles.tableCell}>{item.name}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{item.quantity}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {formatCurrency(item.price)}
                </Text>
              </View>
              <View style={[styles.tableCol, { borderRightWidth: 0 }]}>
                <Text style={styles.tableCell}>
                  {formatCurrency(item.quantity * item.price)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.totalSection}>
        <Text style={styles.totalText}>
          Total Amount: {formatCurrency(data.totalAmount)}
        </Text>
        {/* Add Tax, Discounts, etc. if applicable */}
      </View>

      <Text style={styles.footer}>Thank you for your business! - Trackure</Text>
    </Page>
  </Document>
);
