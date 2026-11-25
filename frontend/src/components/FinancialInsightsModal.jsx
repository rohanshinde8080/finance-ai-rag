import React, { useState } from "react";
import {
  X,
  TrendingUp,
  Calculator,
  PieChart,
  Percent,
  Landmark,
  ShieldCheck,
  ArrowRight,
  Info
} from "lucide-react";

export const FinancialInsightsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("tax");

  // --- 1. Tax Calculator State ---
  const [annualIncome, setAnnualIncome] = useState(1200000); // 12 Lakhs
  const [deduction80C, setDeduction80C] = useState(150000);
  const [deduction80D, setDeduction80D] = useState(25000);
  const [hraDeduction, setHraDeduction] = useState(100000);

  // --- 2. SIP Calculator State ---
  const [monthlySip, setMonthlySip] = useState(10000);
  const [sipReturnRate, setSipReturnRate] = useState(12);
  const [sipYears, setSipYears] = useState(10);

  // --- 3. EMI Calculator State ---
  const [loanAmount, setLoanAmount] = useState(3000000); // 30 Lakhs
  const [interestRate, setInterestRate] = useState(8.5);
  const [loanTenureYears, setLoanTenureYears] = useState(20);

  if (!isOpen) return null;

  // Compute Income Tax (FY 2026-27)
  // New Regime: Standard Deduction ₹75,000. Slabs: 0-3L (0%), 3-7L (5%), 7-10L (10%), 10-12L (15%), 12-15L (20%), >15L (30%)
  // Section 87A rebate: If taxable income <= 7,00,000, tax is 0.
  const computeNewRegimeTax = (income) => {
    const stdDeduction = 75000;
    const taxable = Math.max(0, income - stdDeduction);
    if (taxable <= 700000) return 0;

    let tax = 0;
    if (taxable > 300000) tax += Math.min(taxable - 300000, 400000) * 0.05; // 3L to 7L @ 5%
    if (taxable > 700000) tax += Math.min(taxable - 700000, 300000) * 0.10; // 7L to 10L @ 10%
    if (taxable > 1000000) tax += Math.min(taxable - 1000000, 200000) * 0.15; // 10L to 12L @ 15%
    if (taxable > 1200000) tax += Math.min(taxable - 1200000, 300000) * 0.20; // 12L to 15L @ 20%
    if (taxable > 1500000) tax += (taxable - 1500000) * 0.30; // Above 15L @ 30%

    const cess = tax * 0.04;
    return Math.round(tax + cess);
  };

  // Old Regime: Std deduction ₹50,000 + 80C + 80D + HRA. Slabs: 0-2.5L (0%), 2.5-5L (5%), 5-10L (20%), >10L (30%)
  // Section 87A rebate: If taxable income <= 5,00,000, tax is 0.
  const computeOldRegimeTax = (income, c80, d80, hra) => {
    const stdDeduction = 50000;
    const totalDeductions = stdDeduction + Math.min(Number(c80) || 0, 150000) + (Number(d80) || 0) + (Number(hra) || 0);
    const taxable = Math.max(0, income - totalDeductions);
    if (taxable <= 500000) return 0;

    let tax = 0;
    if (taxable > 250000) tax += Math.min(taxable - 250000, 250000) * 0.05;
    if (taxable > 500000) tax += Math.min(taxable - 500000, 500000) * 0.20;
    if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;

    const cess = tax * 0.04;
    return Math.round(tax + cess);
  };

  const newTax = computeNewRegimeTax(Number(annualIncome) || 0);
  const oldTax = computeOldRegimeTax(Number(annualIncome) || 0, deduction80C, deduction80D, hraDeduction);
  const taxSavings = Math.abs(oldTax - newTax);
  const recommendedRegime = newTax <= oldTax ? "New Tax Regime" : "Old Tax Regime";

  // Compute SIP
  // M = P * ({[1 + i]^n - 1} / i) * (1 + i)
  const i = (Number(sipReturnRate) || 0) / 12 / 100;
  const n = (Number(sipYears) || 0) * 12;
  const P = Number(monthlySip) || 0;
  const investedAmount = P * n;
  const maturityValue = i > 0 && n > 0 ? Math.round(P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i)) : investedAmount;
  const estimatedReturns = Math.max(0, maturityValue - investedAmount);

  // Compute EMI
  // E = P * r * (1+r)^n / ((1+r)^n - 1)
  const emiRate = (Number(interestRate) || 0) / 12 / 100;
  const emiMonths = (Number(loanTenureYears) || 0) * 12;
  const emiP = Number(loanAmount) || 0;
  const emi =
    emiRate > 0 && emiMonths > 0
      ? Math.round((emiP * emiRate * Math.pow(1 + emiRate, emiMonths)) / (Math.pow(1 + emiRate, emiMonths) - 1))
      : 0;
  const totalLoanRepayment = emi * emiMonths;
  const totalInterestPayable = Math.max(0, totalLoanRepayment - emiP);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "880px",
          height: "650px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border-color)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-main)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--accent-green)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>Financial Insights & Calculators</h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Indian financial planning tools grounded in FY 2026-27 regulations and RBI rate policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "6px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-card)",
            padding: "0 24px",
          }}
        >
          {[
            { id: "tax", label: "Income Tax FY 2026-27", icon: Calculator },
            { id: "sip", label: "SIP Wealth Growth", icon: PieChart },
            { id: "emi", label: "Loan EMI Calculator", icon: Percent },
            { id: "regulatory", label: "Regulatory Highlights", icon: Landmark },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 18px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
                  borderBottom: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
                  background: "transparent",
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* TAB 1: TAX CALCULATOR */}
          {activeTab === "tax" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
                    Annual Salary & Deductions
                  </h4>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Gross Annual Income (₹)
                    </label>
                    <input
                      type="number"
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(Number(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-main)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Section 80C Deductions (Max ₹1.5L for Old Regime)
                    </label>
                    <input
                      type="number"
                      value={deduction80C}
                      onChange={(e) => setDeduction80C(Number(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-main)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        Section 80D (Health)
                      </label>
                      <input
                        type="number"
                        value={deduction80D}
                        onChange={(e) => setDeduction80D(Number(e.target.value))}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-main)",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        HRA Exemption (₹)
                      </label>
                      <input
                        type="number"
                        value={hraDeduction}
                        onChange={(e) => setHraDeduction(Number(e.target.value))}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-main)",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tax Comparison Card */}
                <div
                  style={{
                    background: "var(--bg-main)",
                    borderRadius: "var(--radius-md)",
                    padding: "20px",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "12px" }}>
                      Regime Comparison (FY 2026-27)
                    </div>

                    {/* New Regime */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>New Tax Regime (Default)</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Std. Deduction: ₹75,000</div>
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--accent-blue)" }}>
                        ₹{newTax.toLocaleString("en-IN")}
                      </div>
                    </div>

                    {/* Old Regime */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Old Tax Regime</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Includes 80C, 80D, HRA</div>
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>
                        ₹{oldTax.toLocaleString("en-IN")}
                      </div>
                    </div>

                    {/* Recommendation banner */}
                    <div
                      style={{
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 12px",
                        color: "var(--accent-green)",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      💡 Recommended: <strong>{recommendedRegime}</strong>. You save ₹{taxSavings.toLocaleString("en-IN")} in taxes!
                    </div>
                  </div>

                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Info size={13} /> Surcharge & 4% Health & Education cess included.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SIP CALCULATOR */}
          {activeTab === "sip" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
                  SIP Parameters
                </h4>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Monthly Investment: ₹{Number(monthlySip).toLocaleString("en-IN")}
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="100000"
                    step="500"
                    value={monthlySip}
                    onChange={(e) => setMonthlySip(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Expected Annual Return Rate (%): {sipReturnRate}%
                  </label>
                  <input
                    type="range"
                    min="6"
                    max="20"
                    step="0.5"
                    value={sipReturnRate}
                    onChange={(e) => setSipReturnRate(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Investment Period: {sipYears} Years
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="35"
                    step="1"
                    value={sipYears}
                    onChange={(e) => setSipYears(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {/* SIP Output */}
              <div
                style={{
                  background: "var(--bg-main)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "14px" }}>
                  Maturity Wealth Projection
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total Amount Invested</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                    ₹{investedAmount.toLocaleString("en-IN")}
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Estimated Wealth Gain (Returns)</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-green)" }}>
                    +₹{estimatedReturns.toLocaleString("en-IN")}
                  </div>
                </div>

                <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total Maturity Value</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent-blue)" }}>
                    ₹{maturityValue.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMI CALCULATOR */}
          {activeTab === "emi" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
                  Loan Details
                </h4>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Loan Amount (₹): ₹{Number(loanAmount).toLocaleString("en-IN")}
                  </label>
                  <input
                    type="range"
                    min="100000"
                    max="10000000"
                    step="50000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Interest Rate (% p.a.): {interestRate}%
                  </label>
                  <input
                    type="range"
                    min="6"
                    max="18"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Tenure (Years): {loanTenureYears} Years
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={loanTenureYears}
                    onChange={(e) => setLoanTenureYears(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {/* EMI Output */}
              <div
                style={{
                  background: "var(--bg-main)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "14px" }}>
                  Repayment Breakdown
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Monthly EMI Payment</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent-blue)" }}>
                    ₹{emi.toLocaleString("en-IN")} / mo
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total Interest Payable</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-red)" }}>
                    ₹{totalInterestPayable.toLocaleString("en-IN")}
                  </div>
                </div>

                <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total Amount Payable (P + I)</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                    ₹{totalLoanRepayment.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REGULATORY HIGHLIGHTS */}
          {activeTab === "regulatory" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ background: "var(--bg-main)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--accent-blue)", marginBottom: "4px" }}>
                  <Landmark size={18} /> Reserve Bank of India (RBI) Repo Rate Stance: 6.50%
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  The Monetary Policy Committee (MPC) maintained the policy repo rate under the liquidity adjustment facility (LAF) at 6.50% to align inflation with the 4% target while sustaining economic growth.
                </p>
              </div>

              <div style={{ background: "var(--bg-main)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--accent-green)", marginBottom: "4px" }}>
                  <ShieldCheck size={18} /> SEBI Index Derivatives & F&O Framework
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  SEBI has introduced increased minimum contract values (₹15 Lakhs to ₹20 Lakhs) and mandatory upfront option premium collection to protect retail investors from excessive speculative leverage.
                </p>
              </div>

              <div style={{ background: "var(--bg-main)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "4px" }}>
                  <Percent size={18} /> Income Tax & GST Rationalization
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  Under the New Tax Regime (Section 115BAC), standard deduction has been enhanced to ₹75,000 for salaried employees and pensioners. Pure term life insurance is exempted from standard 18% GST levies.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
