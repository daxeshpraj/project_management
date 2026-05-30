import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getPdfBrand } from "@/config/brand";
import { HK_TECH_LOGO_DATA_URL } from "@/config/hkTechLogoBase64";

const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount || 0));
  return `${amount < 0 ? '-' : ''}Rs. ${formatted}`;
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const addHeader = (doc, title, company) => {
  const brand = getPdfBrand(company);
  const [tr, tg, tb] = brand.colors.tealRgb;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 48, "F");

  try {
    doc.addImage(HK_TECH_LOGO_DATA_URL, "PNG", 12, 6, 52, 16);
  } catch (e) {
    doc.setTextColor(tr, tg, tb);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(brand.platformName, 14, 16);
  }

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const contactX = 118;
  doc.text(`Phone: ${brand.phone}`, contactX, 10);
  doc.text(`Email: ${brand.email}`, contactX, 14);
  doc.setFont("helvetica", "bold");
  doc.text("Corporate Office:", contactX, 19);
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(brand.address, 88);
  doc.text(addressLines, contactX, 23);

  doc.setDrawColor(tr, tg, tb);
  doc.setLineWidth(0.6);
  doc.line(12, 32, 198, 32);

  doc.setTextColor(tr, tg, tb);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, 12, 40);

  if (brand.clientName) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Client: ${brand.clientName}`, 12, 45);
  }

  doc.setTextColor(0, 0, 0);
};

const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `HK Tech | Generated on ${new Date().toLocaleString("en-IN")} | Page ${i} of ${pageCount}`,
      14,
      290
    );
  }
};

// Project Profitability Report
export const generateProjectProfitabilityPDF = (project, analytics, vendorPayments, customerPayments, vendors, company) => {
  const doc = new jsPDF();
  addHeader(doc, "Project Profitability Report", company);

  let y = 56;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(project.name, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Client: ${project.client_name}`, 14, y);
  y += 5;
  doc.text(`Type: ${project.project_type} | Status: ${project.status}`, 14, y);
  y += 5;
  doc.text(`Start Date: ${formatDate(project.start_date)}`, 14, y);
  y += 10;

  // Summary Box
  doc.setFillColor(243, 244, 246);
  doc.rect(14, y, 182, 45, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Summary", 18, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryData = [
    ["Contract Amount:", formatCurrency(analytics.contract_amount)],
    ["Total Received:", formatCurrency(analytics.total_received)],
    ["Outstanding Balance:", formatCurrency(analytics.outstanding_balance)],
    ["Total Vendor Payments:", formatCurrency(analytics.total_vendor_paid)],
    ["Total Staff Expenses:", formatCurrency(analytics.total_staff_paid)],
    ["Net Profit:", formatCurrency(analytics.profit)],
  ];
  summaryData.forEach((row, i) => {
    doc.text(row[0], 18, y + 15 + i * 6);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], 120, y + 15 + i * 6);
    doc.setFont("helvetica", "normal");
  });
  y += 55;

  // Customer Payments Table
  if (customerPayments.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Payments Received", 14, y);
    y += 3;
    autoTable(doc, {
      startY: y + 2,
      head: [["Date", "Mode", "Receipt No.", "Description", "Amount"]],
      body: customerPayments.map((p) => [
        formatDate(p.payment_date),
        p.payment_mode,
        p.receipt_number || "-",
        p.description || "-",
        formatCurrency(p.amount),
      ]),
      theme: "grid",
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 9 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Vendor Payments Table
  if (vendorPayments.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Vendor Payments Made", 14, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Date", "Vendor", "Type", "Mode", "Invoice", "Amount"]],
      body: vendorPayments.map((p) => {
        const v = vendors.find((v) => v.id === p.vendor_id);
        return [
          formatDate(p.payment_date),
          v?.name || "-",
          v?.vendor_type || "-",
          p.payment_mode,
          p.invoice_number || "-",
          formatCurrency(p.amount),
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 9 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Loose Expenses Table
  if (analytics.loose_expenses && analytics.loose_expenses.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Miscellaneous / Loose Expenses", 14, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Date", "Vendor / Particulars", "Category", "Mode", "Amount"]],
      body: analytics.loose_expenses.map((e) => [
        formatDate(e.date),
        e.vendor_name,
        e.category,
        e.payment_mode,
        formatCurrency(e.amount),
      ]),
      theme: "grid",
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 9 },
    });
  }

  addFooter(doc);
  doc.save(`${project.name.replace(/\s+/g, "_")}_Profitability_Report.pdf`);
};

// Customer Statement
export const generateCustomerStatementPDF = (project, payments, outstanding, company) => {
  const doc = new jsPDF();
  addHeader(doc, "Customer Statement", company);

  let y = 56;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(project.client_name, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Project: ${project.name}`, 14, y);
  y += 5;
  doc.text(`Contract Amount: ${formatCurrency(project.contract_amount)}`, 14, y);
  y += 10;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  autoTable(doc, {
    startY: y,
    head: [["Date", "Receipt No.", "Mode", "Description", "Amount"]],
    body: payments.map((p) => [
      formatDate(p.payment_date),
      p.receipt_number || "-",
      p.payment_mode,
      p.description || "-",
      formatCurrency(p.amount),
    ]),
    theme: "grid",
    headStyles: { fillColor: [51, 65, 85] },
    foot: [["", "", "", "Total Received:", formatCurrency(totalPaid)]],
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: "bold" },
  });

  y = doc.lastAutoTable.finalY + 10;
  doc.setFillColor(254, 243, 199);
  doc.rect(14, y, 182, 20, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Outstanding Balance:", 18, y + 12);
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(outstanding), 120, y + 12);

  addFooter(doc);
  doc.save(`${project.client_name.replace(/\s+/g, "_")}_Statement.pdf`);
};

// Customer Payment Receipt
export const generateCustomerReceiptPDF = (payment, project, company) => {
  const doc = new jsPDF();
  addHeader(doc, "Payment Receipt", company);

  let y = 56;
  doc.setFillColor(240, 253, 244);
  doc.rect(14, y, 182, 75, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text("PAYMENT RECEIVED", 100, y + 12, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(24);
  doc.text(formatCurrency(payment.amount), 100, y + 25, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const details = [
    ["Receipt No.:", payment.receipt_number || "-"],
    ["Date:", formatDate(payment.payment_date)],
    ["Received From:", project.client_name],
    ["Project:", project.name],
    ["Payment Mode:", payment.payment_mode],
    ["Description:", payment.description || "-"],
  ];
  details.forEach((row, i) => {
    doc.setFont("helvetica", "bold");
    doc.text(row[0], 20, y + 38 + i * 6);
    doc.setFont("helvetica", "normal");
    doc.text(row[1], 70, y + 38 + i * 6);
  });

  y += 85;
  doc.setFontSize(10);
  doc.text("Thank you for your payment!", 100, y, { align: "center" });
  y += 20;
  doc.text("_______________________", 130, y);
  doc.text("Authorized Signature", 138, y + 5);

  addFooter(doc);
  doc.save(`Receipt_${payment.receipt_number || payment.id.slice(0, 8)}.pdf`);
};

// Vendor Payment Voucher
export const generateVendorVoucherPDF = (payment, vendor, project, company) => {
  const doc = new jsPDF();
  addHeader(doc, "Vendor Payment Voucher", company);

  let y = 56;
  doc.setFillColor(254, 242, 242);
  doc.rect(14, y, 182, 85, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text("PAYMENT VOUCHER", 100, y + 12, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(24);
  doc.text(formatCurrency(payment.amount), 100, y + 25, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const details = [
    ["Voucher Date:", formatDate(payment.payment_date)],
    ["Invoice No.:", payment.invoice_number || "-"],
    ["Paid To:", vendor.name],
    ["Vendor Type:", vendor.vendor_type],
    ["Contact:", vendor.contact_number || "-"],
    ["Project:", project.name],
    ["Payment Mode:", payment.payment_mode],
    ["Description:", payment.description || "-"],
  ];
  details.forEach((row, i) => {
    doc.setFont("helvetica", "bold");
    doc.text(row[0], 20, y + 38 + i * 6);
    doc.setFont("helvetica", "normal");
    doc.text(row[1], 70, y + 38 + i * 6);
  });

  y += 95;
  doc.text("_______________________", 30, y);
  doc.text("Received By", 42, y + 5);
  doc.text("_______________________", 130, y);
  doc.text("Authorized Signature", 138, y + 5);

  addFooter(doc);
  doc.save(`Voucher_${payment.invoice_number || payment.id.slice(0, 8)}.pdf`);
};

// All Projects Summary
export const generateAllProjectsReportPDF = (projects, vendorPayments, customerPayments, company) => {
  const doc = new jsPDF();
  addHeader(doc, "All Projects Summary Report", company);

  let y = 56;
  const rows = projects.map((p) => {
    const received = customerPayments.filter((cp) => cp.project_id === p.id).reduce((s, cp) => s + cp.amount, 0);
    const vendorPaid = vendorPayments.filter((vp) => vp.project_id === p.id).reduce((s, vp) => s + vp.amount, 0);
    const outstanding = (p.contract_amount || 0) - received;
    const profit = received - vendorPaid;
    return [
      p.name,
      p.client_name,
      p.project_type === "Turnkey Project" ? "Turnkey" : "Consultation",
      formatCurrency(p.contract_amount || 0),
      formatCurrency(received),
      formatCurrency(outstanding),
      formatCurrency(vendorPaid),
      formatCurrency(profit),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Project", "Client", "Type", "Contract", "Received", "Outstanding", "Vendor Paid", "Profit"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
    styles: { fontSize: 8 },
  });

  addFooter(doc);
  doc.save("All_Projects_Summary.pdf");
};

// General Expenses Report
export const generateGeneralExpensesPDF = (expenses, totalAmount, filters, company) => {
  const doc = new jsPDF();
  addHeader(doc, "General Expenses Report", company);

  let y = 56;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Business Operating Expenses", 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 14, y);
  y += 5;
  doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, 14, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Date", "Title", "Category", "Mode", "Amount"]],
    body: expenses.map((e) => [
      formatDate(e.date),
      e.title,
      e.category,
      e.payment_mode,
      formatCurrency(e.amount),
    ]),
    theme: "striped",
    headStyles: { fillColor: [51, 65, 85], fontSize: 10 },
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: "right", fontStyle: "bold", textColor: [220, 38, 38] },
    },
  });

  addFooter(doc);
  doc.save("General_Expenses_Report.pdf");
};

// Staff Salary Receipt
export const generateStaffSalaryReceiptPDF = (transaction, staff, company) => {
  const doc = new jsPDF();
  addHeader(doc, "Salary Payment Receipt", company);

  let y = 56;
  doc.setFillColor(239, 246, 255); // Light blue for salary
  doc.rect(14, y, 182, 85, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("SALARY PAYMENT RECEIPT", 100, y + 12, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(24);
  doc.text(formatCurrency(transaction.amount), 100, y + 25, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const details = [
    ["Payment Date:", formatDate(transaction.transaction_date)],
    ["Reference No.:", transaction.reference_number || "-"],
    ["Employee Name:", staff.name],
    ["Designation:", staff.designation || "-"],
    ["Staff Type:", staff.staff_type],
    ["Paid By:", transaction.paid_by || "-"],
    ["Monthly Salary:", formatCurrency(staff.monthly_salary)],
    ["Description:", transaction.description || "-"],
  ];
  details.forEach((row, i) => {
    doc.setFont("helvetica", "bold");
    doc.text(row[0], 20, y + 38 + i * 6);
    doc.setFont("helvetica", "normal");
    doc.text(row[1], 70, y + 38 + i * 6);
  });

  y += 95;
  doc.text("_______________________", 30, y);
  doc.text("Employee Signature", 42, y + 5);
  doc.text("_______________________", 130, y);
  doc.text("Authorized Signature", 138, y + 5);

  addFooter(doc);
  doc.save(`Salary_Receipt_${staff.name.replace(/\s+/g, "_")}_${transaction.id.slice(0, 8)}.pdf`);
};

// Project Detailed Ledger Report
export const generateProjectLedgerPDF = (project, ledgerData, filteredLedger, company) => {
  const doc = new jsPDF();
  addHeader(doc, "Project Detailed Ledger", company);

  let y = 56;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(project.name, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Client: ${project.client_name}`, 14, y);
  y += 5;
  doc.text(`Date Range: ${new Date().toLocaleDateString("en-IN")}`, 14, y);
  y += 10;

  // Summary Grid
  const summaryX = 14;
  const colWidth = 60;
  
  // Received
  doc.setFillColor(240, 253, 244);
  doc.rect(summaryX, y, colWidth - 2, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text("Total Received", summaryX + 5, y + 7);
  doc.text(formatCurrency(ledgerData.summary.total_inflow), summaryX + 5, y + 15);

  // Spent
  doc.setFillColor(254, 242, 242);
  doc.rect(summaryX + colWidth, y, colWidth - 2, 20, "F");
  doc.setTextColor(220, 38, 38);
  doc.text("Total Spent", summaryX + colWidth + 5, y + 7);
  doc.text(formatCurrency(ledgerData.summary.total_outflow), summaryX + colWidth + 5, y + 15);

  // Balance
  doc.setFillColor(239, 246, 255);
  doc.rect(summaryX + colWidth * 2, y, colWidth - 2, 20, "F");
  doc.setTextColor(51, 65, 85);
  doc.text("Net Profit", summaryX + colWidth * 2 + 5, y + 7);
  doc.text(formatCurrency(ledgerData.summary.net_balance), summaryX + colWidth * 2 + 5, y + 15);

  y += 30;
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: y,
    head: [["Date", "Particulars", "Category", "Inflow (+)", "Outflow (-)", "Balance"]],
    body: filteredLedger.map((item) => [
      formatDate(item.date),
      item.particulars,
      item.category,
      item.type === "Inflow" ? formatCurrency(item.amount) : "-",
      item.type === "Outflow" ? formatCurrency(item.amount) : "-",
      formatCurrency(item.balance),
    ]),
    theme: "striped",
    headStyles: { fillColor: [51, 65, 85], fontSize: 10 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      3: { halign: "right", textColor: [22, 163, 74] },
      4: { halign: "right", textColor: [220, 38, 38] },
      5: { halign: "right", fontStyle: "bold" },
    },
  });

  addFooter(doc);
  doc.save(`Ledger_${project.name.replace(/\s+/g, "_")}.pdf`);
};

// Staff Account Ledger Report
export const generateStaffLedgerPDF = (staff, ledgerData, filteredTransactions, company) => {
  const doc = new jsPDF();
  addHeader(doc, "Staff Account Ledger", company);

  let y = 56;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(staff.name, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Staff Type: ${staff.staff_type}`, 14, y);
  y += 5;
  doc.text(`Current Balance: ${formatCurrency(ledgerData.current_balance)}`, 14, y);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(ledgerData.current_balance > 0 ? "(Staff owes company)" : "(Company owes staff)", 14, y + 4);
  doc.setTextColor(0);
  y += 12;

  autoTable(doc, {
    startY: y,
    head: [["Date", "Description / Project", "Paid On Account", "Spent (Exp)", "Balance"]],
    body: filteredTransactions.map((tx) => [
      formatDate(tx.transaction_date),
      `${tx.transaction_type}${tx.project_name ? ` - ${tx.project_name}` : ''}`,
      tx.received > 0 ? formatCurrency(tx.received) : "-",
      tx.spent > 0 ? formatCurrency(tx.spent) : "-",
      formatCurrency(tx.balance),
    ]),
    theme: "striped",
    headStyles: { fillColor: [51, 65, 85], fontSize: 10 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      2: { halign: "right", textColor: [249, 115, 22] }, // Orange for received
      3: { halign: "right", textColor: [22, 163, 74] }, // Green for spent
      4: { halign: "right", fontStyle: "bold" },
    },
  });

  addFooter(doc);
  doc.save(`Staff_Ledger_${staff.name.replace(/\s+/g, "_")}.pdf`);
};

// Loan Account Ledger Report
export const generateLoanLedgerPDF = (loan, details, timeline, company) => {
  const doc = new jsPDF();
  addHeader(doc, "Personal Loan Account Ledger", company);

  let y = 56;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(loan.person_name, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Status: ${loan.status} | Total Loan Period From: ${formatDate(loan.given_date)}`, 14, y);
  y += 10;

  // Summary Grid
  const summaryX = 14;
  const colWidth = 60;
  
  // Total Given
  doc.setFillColor(255, 247, 237); // Orange-50
  doc.rect(summaryX, y, colWidth - 2, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(194, 65, 12); // Orange-700
  doc.text("Total Given", summaryX + 5, y + 7);
  doc.text(formatCurrency(details.total_given), summaryX + 5, y + 15);

  // Total Returned
  doc.setFillColor(240, 253, 244); // Green-50
  doc.rect(summaryX + colWidth, y, colWidth - 2, 20, "F");
  doc.setTextColor(21, 128, 61); // Green-700
  doc.text("Total Returned", summaryX + colWidth + 5, y + 7);
  doc.text(formatCurrency(details.total_repaid), summaryX + colWidth + 5, y + 15);

  // Balance Due
  doc.setFillColor(254, 242, 242); // Red-50
  doc.rect(summaryX + colWidth * 2, y, colWidth - 2, 20, "F");
  doc.setTextColor(185, 28, 28); // Red-700
  doc.text("Balance Due", summaryX + colWidth * 2 + 5, y + 7);
  doc.text(formatCurrency(details.outstanding), summaryX + colWidth * 2 + 5, y + 15);

  y += 30;
  doc.setTextColor(0, 0, 0);

  // Calculate running balance for the table
  let runningBalance = 0;
  const tableBody = timeline.map((event) => {
    const isOutflow = event.type === 'GIVEN';
    if (isOutflow) {
      runningBalance += event.amount;
    } else {
      runningBalance -= event.amount;
    }
    
    return [
      formatDate(event.date),
      event.title,
      event.mode,
      isOutflow ? formatCurrency(event.amount) : "-",
      !isOutflow ? formatCurrency(event.amount) : "-",
      formatCurrency(runningBalance)
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Date", "Particulars", "Mode", "Given (+)", "Returned (-)", "Owed Balance"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: [51, 65, 85], fontSize: 10 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      3: { halign: "right", textColor: [194, 65, 12] },
      4: { halign: "right", textColor: [21, 128, 61] },
      5: { halign: "right", fontStyle: "bold" },
    },
  });

  addFooter(doc);
  doc.save(`Loan_Ledger_${loan.person_name.replace(/\s+/g, "_")}.pdf`);
};
