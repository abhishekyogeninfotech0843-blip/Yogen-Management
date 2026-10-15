import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import AuthPage from "./AuthPage.jsx";

const getTodayDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentMonth = () => getTodayDate().slice(0, 7);

const formatSalaryMonth = (month) => {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
};

const daysInSalaryMonth = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return year && monthNumber ? new Date(year, monthNumber, 0).getDate() : 30;
};

const numberBelowThousandInWords = (number) => {
  const ones = [
    "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
    "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
    "Eighty", "Ninety",
  ];
  const words = [];
  if (number >= 100) {
    words.push(`${ones[Math.floor(number / 100)]} Hundred`);
    number %= 100;
  }
  if (number >= 20) {
    words.push(tens[Math.floor(number / 10)]);
    number %= 10;
  }
  if (number > 0) words.push(ones[number]);
  return words.join(" ");
};

const amountInWords = (amount) => {
  const totalPaise = Math.round(Math.max(0, Number(amount) || 0) * 100);
  let rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  if (rupees >= 10000000000) return `${formatMoney(amount)} only`;

  const sections = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
  ];
  const words = [];
  for (const [value, label] of sections) {
    const count = Math.floor(rupees / value);
    if (count) {
      words.push(`${numberBelowThousandInWords(count)} ${label}`);
      rupees %= value;
    }
  }
  if (rupees) words.push(numberBelowThousandInWords(rupees));
  const rupeeWords = words.length ? words.join(" ") : "Zero";
  const paiseWords = paise
    ? ` and ${numberBelowThousandInWords(paise)} Paise`
    : "";
  return `Indian Rupees ${rupeeWords}${paiseWords} Only`;
};

const loadLocalData = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDocumentDate = (date) => {
  if (!date) return "—";
  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
};

const readApiResponse = async (response) => {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`API returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(result.error || `Could not load data (${response.status}).`);
  }

  return result;
};

const loadOfficeData = async () => {
  const response = await fetch("/api/data");
  const result = await readApiResponse(response);
  return result.data || {};
};

const saveOfficeData = async (key, data) => {
  const response = await fetch(`/api/data/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  await readApiResponse(response);
};

const initialEmployees = [
  { id: 1, name: "Abhishek Chauhan", salary: 40000, role: "Admin" },
  { id: 2, name: "Nikhil", salary: 100000, role: "Employee" },
  { id: 3, name: "Aditya", salary: 25000, role: "Employee" },
  { id: 4, name: "Prachi", salary: 22000, role: "Employee" },
  { id: 5, name: "Anju", salary: 21500, role: "Employee" },
  { id: 6, name: "Anil", salary: 22000, role: "Employee" },
  { id: 7, name: "Chandan", salary: 70000, role: "Employee" },
  { id: 8, name: "CP", salary: 12000, role: "Employee" },
];

const attendanceStatuses = [
  "Present",
  "Absent",
  "WFH",
  "Casual Leave",
  "Sick Leave",
  "Holiday",
];

const expenseCategories = [
  "Rent",
  "Internet",
  "Electricity",
  "Food",
  "Travel",
  "Office Supplies",
  "Software",
  "Maintenance",
  "Other",
];

function StatCard({ title, value, detail, icon = "📊", onClick }) {
  const content = (
    <>
      <span className="stat-card-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="stat-card-title">{title}</span>
      <span className="stat-card-value">{value}</span>
      {detail && <span className="stat-card-detail">{detail}</span>}
      {onClick && (
        <span className="stat-card-action">
          View details <span aria-hidden="true">→</span>
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        className="stat-card stat-card-button"
        type="button"
        onClick={onClick}
        aria-label={`${title}: ${value}. Open module`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="stat-card">
      {content}
    </div>
  );
}

function TablePagination({ itemCount, page, pageSize, onPageChange }) {
  const pageCount = Math.ceil(itemCount / pageSize);
  if (pageCount <= 1) return null;

  const firstVisiblePage = Math.max(1, Math.min(page - 2, pageCount - 4));
  const visiblePages = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <nav className="table-pagination" aria-label="Table pagination">
      <span className="pagination-summary">
        Showing {(page - 1) * pageSize + 1}–
        {Math.min(page * pageSize, itemCount)} of {itemCount} records
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-button"
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          Previous
        </button>
        {visiblePages.map((pageNumber) => (
          <button
            className={`pagination-button pagination-number${pageNumber === page ? " active" : ""}`}
            type="button"
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === page ? "page" : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <button
          className="pagination-button"
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function DocumentLetterhead({ title, subtitle }) {
  return (
    <>
      <header className="document-letterhead">
        <strong>Yogen Infotech</strong>
        <img src="/yogen-logo.png" alt="Yogen Infotech logo" />
      </header>
      <div className="document-divider" />
      <div className="document-title-row">
        <h1>{title}</h1>
        {subtitle && <span>{subtitle}</span>}
      </div>
    </>
  );
}

function SalarySlipDocument({ slip }) {
  const basicSalary = Number(slip.basicSalary || 0);
  const houseRentAllowance = Number(slip.houseRentAllowance || 0);
  const conveyanceAllowance = Number(slip.conveyanceAllowance || 0);
  const fixedAllowance = Number(slip.fixedAllowance ?? slip.allowances ?? 0);
  const oneTimeEarning = Number(slip.oneTimeEarning || 0);
  const providentFund = Number(slip.providentFund || 0);
  const professionalTax = Number(slip.professionalTax || 0);
  const tds = Number(slip.tds || 0);
  const otherDeductions = Number(slip.otherDeductions ?? slip.deductions ?? 0);
  const grossEarnings =
    basicSalary +
    houseRentAllowance +
    conveyanceAllowance +
    fixedAllowance +
    oneTimeEarning;
  const totalDeductions =
    slip.totalDeductions !== undefined
      ? Number(slip.totalDeductions)
      : providentFund + professionalTax + tds + otherDeductions;
  const netPay =
    slip.netPay !== undefined ? Number(slip.netPay) : grossEarnings - totalDeductions;
  const earnings = [
    ["Basic", basicSalary],
    ["House Rent Allowance", houseRentAllowance],
    ["Conveyance Allowance", conveyanceAllowance],
    ["Fixed Allowance", fixedAllowance],
    ["One-time Earning", oneTimeEarning],
  ];
  const deductions = [
    ["PF", providentFund],
    ["Professional Tax", professionalTax],
    ["TDS", tds],
    ["Other Deductions", otherDeductions],
  ];

  return (
    <article className="print-document">
      <DocumentLetterhead
        title={`Payslip for the month of ${formatSalaryMonth(slip.month)}`}
      />
      <div className="payslip-summary">
        <div className="payslip-employee-details">
          <h2>Employee Pay Summary</h2>
          <dl>
            <dt>Employee Name</dt><dd>{slip.employeeName}</dd>
            <dt>Employee ID</dt><dd>{slip.employeeCode || slip.employeeId}</dd>
            <dt>Designation</dt><dd>{slip.designation || slip.role || "Employee"}</dd>
            <dt>Date of Joining</dt><dd>{formatDocumentDate(slip.joiningDate)}</dd>
            <dt>Pay Period</dt><dd>{formatSalaryMonth(slip.month)}</dd>
            <dt>Pay Date</dt><dd>{formatDocumentDate(slip.paidOn)}</dd>
          </dl>
          <p className="payslip-attendance">
            Paid Days: <strong>{slip.paidDays ?? 30}</strong>
            <span>|</span>
            LOP Days: <strong>{slip.lopDays ?? 0}</strong>
          </p>
        </div>
        <div className="payslip-net-card">
          <span>Employee Net Pay</span>
          <strong>{formatMoney(netPay)}</strong>
          <small>Paid on {formatDocumentDate(slip.paidOn)}</small>
        </div>
      </div>
      <div className="payslip-breakdown">
        <table className="document-table">
          <thead>
            <tr><th colSpan="3">Earnings</th></tr>
            <tr><th>Component</th><th>Amount</th><th>YTD</th></tr>
          </thead>
          <tbody>
            {earnings.map(([label, amount]) => (
              <tr key={label}>
                <td>{label}</td><td>{formatMoney(amount)}</td><td>—</td>
              </tr>
            ))}
            <tr className="document-total-row">
              <td>Gross Earnings</td><td>{formatMoney(grossEarnings)}</td><td>—</td>
            </tr>
          </tbody>
        </table>
        <table className="document-table">
          <thead>
            <tr><th colSpan="3">Deductions</th></tr>
            <tr><th>Component</th><th>Amount</th><th>YTD</th></tr>
          </thead>
          <tbody>
            {deductions.map(([label, amount]) => (
              <tr key={label}>
                <td>{label}</td><td>{formatMoney(amount)}</td><td>—</td>
              </tr>
            ))}
            <tr className="document-total-row">
              <td>Total Deductions</td><td>{formatMoney(totalDeductions)}</td><td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="payslip-total-banner">
        <strong>Total Net Payable: {formatMoney(netPay)}</strong>
        <span>({amountInWords(netPay)})</span>
      </div>
      <p className="payslip-calculation">
        Total Net Payable = Gross Earnings − Total Deductions
      </p>
      <p className="document-note">
        This is a system-generated payslip; no signature is required.
      </p>
    </article>
  );
}

function ExitDocument({ record, type }) {
  const employee = record.employeeName;
  const issueDate = formatDocumentDate(record.issueDate);
  const lastDay = formatDocumentDate(record.lastWorkingDate);
  const heading = {
    acceptance: "Resignation Acceptance Letter",
    relieving: "Relieving Letter",
    experience: "Experience Certificate",
    settlement: "Full & Final Settlement Statement",
  }[type];

  return (
    <article className="print-document">
      <DocumentLetterhead title={heading} subtitle={`Date: ${issueDate}`} />
      {type === "acceptance" && (
        <>
          <p>To,<br /><strong>{employee}</strong></p>
          <p><strong>Subject: Acceptance of resignation</strong></p>
          <p>Dear {employee},</p>
          <p>
            This is to acknowledge and accept your resignation from your position
            as {record.role || "Employee"} at Yogen Infotech. Your last working
            day will be {lastDay}. Your notice period is {record.noticePeriod || "0"} days.
          </p>
          {record.reason && <p>Reason noted: {record.reason}</p>}
          <p>We thank you for your contributions and wish you success in your future endeavours.</p>
          <p>Sincerely,</p>
        </>
      )}
      {type === "relieving" && (
        <>
          <p><strong>To Whom It May Concern</strong></p>
          <p>
            This is to certify that {employee} was employed with Yogen Infotech
            as {record.role || "Employee"} and has been relieved from their
            duties effective {lastDay}, following acceptance of their resignation.
          </p>
          <p>
            Please complete and verify any handover and exit formalities with
            the company before the effective relieving date.
          </p>
          <p>We wish them the very best in their future endeavours.</p>
        </>
      )}
      {type === "experience" && (
        <>
          <p><strong>To Whom It May Concern</strong></p>
          <p>
            This is to certify that {employee} worked with Yogen Infotech as
            {` ${record.role || "Employee"}`}
            {record.joiningDate
              ? ` from ${formatDocumentDate(record.joiningDate)} through ${lastDay}.`
              : ` until ${lastDay}.`}
          </p>
          <p>
            During their time with us, they carried out the responsibilities of
            their role. We thank them for their service and wish them success.
          </p>
        </>
      )}
      {type === "settlement" && (
        <>
          <p><strong>Employee:</strong> {employee}</p>
          <p><strong>Designation:</strong> {record.role || "Employee"}</p>
          <p><strong>Last working day:</strong> {lastDay}</p>
          <p><strong>Resignation date:</strong> {formatDocumentDate(record.resignationDate)}</p>
          <table className="document-table settlement-table">
            <tbody>
              <tr><td>Full and final settlement amount</td><td>{formatMoney(record.finalSettlement)}</td></tr>
            </tbody>
          </table>
          <p>
            This statement records the settlement amount entered by the
            administrator. Verify all dues, deductions and statutory
            requirements before issuing the final settlement.
          </p>
        </>
      )}
      <p className="document-signoff">Sincerely,</p>
      <footer className="document-signature">
        <span>{record.authorizedBy || "Authorized Signatory"}<br />{record.authorizedRole || "For Yogen Infotech"}</span>
        <span>Signature &amp; company seal</span>
      </footer>
    </article>
  );
}

export default function App() {
  const tablePageSize = 10;
  const [tablePages, setTablePages] = useState({});
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [authActionError, setAuthActionError] = useState("");
  const [activePage, setActivePage] = useState("Dashboard");
  const [databaseStatus, setDatabaseStatus] = useState("connecting");
  const [databaseReady, setDatabaseReady] = useState(false);

  // EMPLOYEES: Existing storage key preserved.
  const [employees, setEmployees] = useState(() =>
    loadLocalData("yogen_employees", initialEmployees),
  );
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeSalary, setEmployeeSalary] = useState("");
  const [employeeRole, setEmployeeRole] = useState("Employee");
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editedEmployeeName, setEditedEmployeeName] = useState("");
  const [editedEmployeeSalary, setEditedEmployeeSalary] = useState("");
  const [editedEmployeeRole, setEditedEmployeeRole] = useState("Employee");

  // SALARY SLIPS: Keep generated monthly statements separate from employee records.
  const [salarySlips, setSalarySlips] = useState(() =>
    loadLocalData("yogen_salary_slips", []),
  );
  const [salarySlipEmployeeId, setSalarySlipEmployeeId] = useState("");
  const [salarySlipMonth, setSalarySlipMonth] = useState(currentMonth());
  const [salarySlipForm, setSalarySlipForm] = useState({
    employeeCode: "",
    joiningDate: "",
    designation: "",
    basicSalary: "",
    houseRentAllowance: "0",
    conveyanceAllowance: "0",
    fixedAllowance: "0",
    oneTimeEarning: "0",
    providentFund: "0",
    professionalTax: "0",
    tds: "0",
    otherDeductions: "0",
    paidDays: String(Math.min(30, daysInSalaryMonth(currentMonth()))),
    lopDays: "0",
    paidOn: getTodayDate(),
  });
  const [selectedSalarySlip, setSelectedSalarySlip] = useState(null);

  // RESIGNATION & EXIT: Store exit details and the generated document snapshot.
  const [exitRecords, setExitRecords] = useState(() =>
    loadLocalData("yogen_exit_records", []),
  );
  const [exitEmployeeId, setExitEmployeeId] = useState("");
  const [exitForm, setExitForm] = useState({
    resignationDate: getTodayDate(),
    lastWorkingDate: "",
    joiningDate: "",
    noticePeriod: "0",
    reason: "",
    finalSettlement: "0",
    issueDate: getTodayDate(),
    authorizedBy: "",
    authorizedRole: "Administrator",
  });
  const [selectedExitDocument, setSelectedExitDocument] = useState(null);

  // ATTENDANCE: Existing storage key preserved.
  const [attendance, setAttendance] = useState(() =>
    loadLocalData("yogen_attendance", {}),
  );
  const [attendanceDate, setAttendanceDate] = useState(getTodayDate());
  const [attendanceReportMonth, setAttendanceReportMonth] =
    useState(currentMonth());
  const [attendanceReportEmployeeId, setAttendanceReportEmployeeId] =
    useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");

  // OFFICE EXPENSES: Existing storage key preserved.
  const [expenses, setExpenses] = useState(() =>
    loadLocalData("yogen_office_expenses", []),
  );
  const [expenseDate, setExpenseDate] = useState(getTodayDate());
  const [expenseCategory, setExpenseCategory] = useState("Office Supplies");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseMonth, setExpenseMonth] = useState(currentMonth());

  // CLIENTS & PAYMENTS: New independent storage.
  const [clients, setClients] = useState(() =>
    loadLocalData("yogen_clients", []),
  );
  const localDataAtStartup = useRef({
    yogen_employees: employees,
    yogen_salary_slips: salarySlips,
    yogen_exit_records: exitRecords,
    yogen_attendance: attendance,
    yogen_office_expenses: expenses,
    yogen_clients: clients,
  });
  const [clientSearch, setClientSearch] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectAmount, setProjectAmount] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [projectDate, setProjectDate] = useState(getTodayDate());
  const [paymentNote, setPaymentNote] = useState("");
  const [clientMonth, setClientMonth] = useState(currentMonth());
  const [paymentClientFilter, setPaymentClientFilter] = useState("All");

  // Save each module separately so adding a feature doesn't overwrite other data.
  useEffect(() => {
    localStorage.setItem("yogen_employees", JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem("yogen_salary_slips", JSON.stringify(salarySlips));
  }, [salarySlips]);

  useEffect(() => {
    localStorage.setItem("yogen_exit_records", JSON.stringify(exitRecords));
  }, [exitRecords]);

  useEffect(() => {
    localStorage.setItem("yogen_attendance", JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem("yogen_office_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("yogen_clients", JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    if (!authenticatedUser) return undefined;

    let cancelled = false;

    const hydrateFromDatabase = async () => {
      try {
        const remoteData = await loadOfficeData();
        const modules = [
          ["yogen_employees", setEmployees],
          ["yogen_salary_slips", setSalarySlips],
          ["yogen_exit_records", setExitRecords],
          ["yogen_attendance", setAttendance],
          ["yogen_office_expenses", setExpenses],
          ["yogen_clients", setClients],
        ];

        for (const [key, setValue] of modules) {
          if (cancelled) return;

          if (Object.prototype.hasOwnProperty.call(remoteData, key)) {
            setValue(remoteData[key]);
          } else {
            await saveOfficeData(key, localDataAtStartup.current[key]);
          }
        }

        if (!cancelled) {
          setDatabaseReady(true);
          setDatabaseStatus("connected");
        }
      } catch (error) {
        console.error("MongoDB data sync failed:", error);
        if (!cancelled) setDatabaseStatus("offline");
      }
    };

    hydrateFromDatabase();
    return () => {
      cancelled = true;
    };
  }, [authenticatedUser]);

  useEffect(() => {
    if (!databaseReady) return;

    saveOfficeData("yogen_employees", employees).catch((error) => {
      console.error("Could not sync employees to MongoDB:", error);
      setDatabaseStatus("offline");
    });
  }, [employees, databaseReady]);

  useEffect(() => {
    if (!databaseReady) return;

    saveOfficeData("yogen_salary_slips", salarySlips).catch((error) => {
      console.error("Could not sync salary slips to MongoDB:", error);
      setDatabaseStatus("offline");
    });
  }, [salarySlips, databaseReady]);

  useEffect(() => {
    if (!databaseReady) return;

    saveOfficeData("yogen_exit_records", exitRecords).catch((error) => {
      console.error("Could not sync employee exit records to MongoDB:", error);
      setDatabaseStatus("offline");
    });
  }, [exitRecords, databaseReady]);

  useEffect(() => {
    if (!databaseReady) return;

    saveOfficeData("yogen_attendance", attendance).catch((error) => {
      console.error("Could not sync attendance to MongoDB:", error);
      setDatabaseStatus("offline");
    });
  }, [attendance, databaseReady]);

  useEffect(() => {
    if (!databaseReady) return;

    saveOfficeData("yogen_office_expenses", expenses).catch((error) => {
      console.error("Could not sync expenses to MongoDB:", error);
      setDatabaseStatus("offline");
    });
  }, [expenses, databaseReady]);

  useEffect(() => {
    if (!databaseReady) return;

    saveOfficeData("yogen_clients", clients).catch((error) => {
      console.error("Could not sync clients to MongoDB:", error);
      setDatabaseStatus("offline");
    });
  }, [clients, databaseReady]);

  const employeePayroll = employees.reduce(
    (sum, employee) => sum + Number(employee.salary || 0),
    0,
  );
  const salarySlipGrossPreview = [
    "basicSalary",
    "houseRentAllowance",
    "conveyanceAllowance",
    "fixedAllowance",
    "oneTimeEarning",
  ].reduce((total, key) => total + Number(salarySlipForm[key] || 0), 0);
  const salarySlipDeductionsPreview = [
    "providentFund",
    "professionalTax",
    "tds",
    "otherDeductions",
  ].reduce((total, key) => total + Number(salarySlipForm[key] || 0), 0);
  const selectedExitEmployee = employees.find(
    (employee) => String(employee.id) === exitEmployeeId,
  );
  const savedExitRecord = exitRecords.find(
    (record) => String(record.employeeId) === exitEmployeeId,
  );

  const attendanceForDate = attendance[attendanceDate] || {};

  const presentCount = employees.filter((employee) =>
    ["Present", "WFH"].includes(attendanceForDate[employee.id]),
  ).length;

  const absentCount = employees.filter(
    (employee) => attendanceForDate[employee.id] === "Absent",
  ).length;
  const attendanceRate = employees.length
    ? Math.round((presentCount / employees.length) * 100)
    : 0;

  function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function getTablePage(items, key) {
    const pageCount = Math.max(1, Math.ceil(items.length / tablePageSize));
    const page = Math.min(tablePages[key] || 1, pageCount);
    return items.slice((page - 1) * tablePageSize, page * tablePageSize);
  }

  function renderTablePagination(items, key) {
    const pageCount = Math.max(1, Math.ceil(items.length / tablePageSize));
    const page = Math.min(tablePages[key] || 1, pageCount);

    return (
      <TablePagination
        itemCount={items.length}
        page={page}
        pageSize={tablePageSize}
        onPageChange={(nextPage) =>
          setTablePages((previous) => ({ ...previous, [key]: nextPage }))
        }
      />
    );
  }

  const monthlyAttendanceReport = useMemo(() => {
    const reportByEmployee = new Map(
      employees.map((employee) => [
        String(employee.id),
        {
          employee,
          present: 0,
          wfh: 0,
          absent: 0,
          casualLeave: 0,
          sickLeave: 0,
          holidays: 0,
          leaveDates: [],
          wfhDates: [],
        },
      ]),
    );
    const monthPrefix = `${attendanceReportMonth}-`;
    const recordedDates = Object.keys(attendance)
      .filter((date) => date.startsWith(monthPrefix))
      .sort();

    for (const date of recordedDates) {
      const dailyAttendance = attendance[date] || {};

      for (const [employeeId, status] of Object.entries(dailyAttendance)) {
        const report = reportByEmployee.get(String(employeeId));
        if (!report) continue;

        if (status === "Present") report.present += 1;
        if (status === "WFH") {
          report.wfh += 1;
          report.wfhDates.push(date);
        }
        if (status === "Absent") report.absent += 1;
        if (status === "Casual Leave" || status === "Sick Leave") {
          if (status === "Casual Leave") report.casualLeave += 1;
          if (status === "Sick Leave") report.sickLeave += 1;
          report.leaveDates.push({ date, status });
        }
        if (status === "Holiday") report.holidays += 1;
      }
    }

    return {
      recordedDates,
      employees: [...reportByEmployee.values()],
    };
  }, [attendance, attendanceReportMonth, employees]);

  const selectedAttendanceReport = useMemo(() => {
    const employee = employees.find(
      (item) => String(item.id) === attendanceReportEmployeeId,
    );
    if (!employee) return null;

    const [year, month] = attendanceReportMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const date = `${attendanceReportMonth}-${String(index + 1).padStart(2, "0")}`;
      const dailyAttendance = attendance[date] || {};
      const status = dailyAttendance[employee.id] || "Not marked";
      const reason = dailyAttendance.__reasons?.[employee.id] || "";

      return {
        date,
        status,
        reason:
          status === "Absent"
            ? reason || "Reason not recorded"
            : status === "Not marked"
              ? "Attendance not recorded"
              : status,
      };
    });

    const counts = days.reduce(
      (result, day) => {
        if (day.status === "Present") result.present += 1;
        if (day.status === "WFH") result.wfh += 1;
        if (day.status === "Absent") result.absent += 1;
        if (day.status === "Casual Leave" || day.status === "Sick Leave") {
          result.leave += 1;
        }
        if (day.status === "Holiday") result.holidays += 1;
        if (day.status === "Not marked") result.notMarked += 1;
        return result;
      },
      { present: 0, wfh: 0, absent: 0, leave: 0, holidays: 0, notMarked: 0 },
    );

    return { employee, days, counts };
  }, [attendance, attendanceReportEmployeeId, attendanceReportMonth, employees]);

  const visibleMonthlyAttendanceReports = monthlyAttendanceReport.employees.filter(
    (report) =>
      !attendanceReportEmployeeId ||
      String(report.employee.id) === attendanceReportEmployeeId,
  );
  const attendanceReportMarkedDays = selectedAttendanceReport
    ? selectedAttendanceReport.days.filter((day) => day.status !== "Not marked")
        .length
    : monthlyAttendanceReport.recordedDates.length;

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(employeeSearch.toLowerCase()),
  );

  const filteredAttendanceEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(attendanceSearch.toLowerCase()),
  );

  const monthlyExpenses = expenses.filter(
    (expense) => (expense.date || "").slice(0, 7) === expenseMonth,
  );

  const monthlyExpenseTotal = monthlyExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );

  const allExpenseTotal = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );

  const filteredExpenses = expenses
    .filter((expense) => (expense.date || "").slice(0, 7) === expenseMonth)
    .filter((expense) => {
      const search = expenseSearch.toLowerCase();
      return (
        (expense.description || "").toLowerCase().includes(search) ||
        (expense.category || "").toLowerCase().includes(search)
      );
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totalProjectValue = clients.reduce(
    (sum, client) => sum + Number(client.projectAmount || 0),
    0,
  );

  const totalReceived = clients.reduce(
    (sum, client) => sum + Number(client.receivedAmount || 0),
    0,
  );

  const totalPending = clients.reduce(
    (sum, client) =>
      sum +
      Math.max(
        0,
        Number(client.projectAmount || 0) - Number(client.receivedAmount || 0),
      ),
    0,
  );

  const monthlyClients = clients.filter(
    (client) => (client.date || "").slice(0, 7) === clientMonth,
  );

  const monthlyClientValue = monthlyClients.reduce(
    (sum, client) => sum + Number(client.projectAmount || 0),
    0,
  );

  const monthlyClientReceived = monthlyClients.reduce(
    (sum, client) => sum + Number(client.receivedAmount || 0),
    0,
  );

  const filteredClients = useMemo(() => {
    const search = clientSearch.toLowerCase().trim();

    return clients
      .filter((client) => {
        const matchesSearch =
          !search ||
          (client.name || "").toLowerCase().includes(search) ||
          (client.company || "").toLowerCase().includes(search) ||
          (client.projectName || "").toLowerCase().includes(search) ||
          (client.phone || "").toLowerCase().includes(search);

        const balance =
          Number(client.projectAmount || 0) -
          Number(client.receivedAmount || 0);

        const status =
          balance <= 0
            ? "Paid"
            : Number(client.receivedAmount || 0) > 0
              ? "Partially Paid"
              : "Pending";

        const matchesStatus =
          paymentClientFilter === "All" || status === paymentClientFilter;

        const matchesMonth =
          clientMonth === "All" ||
          (client.date || "").slice(0, 7) === clientMonth;

        return matchesSearch && matchesStatus && matchesMonth;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [clients, clientSearch, paymentClientFilter, clientMonth]);

  function addEmployee(event) {
    event.preventDefault();

    if (!employeeName.trim() || employeeSalary === "") {
      alert("Employee name aur salary fill karo.");
      return;
    }

    if (Number(employeeSalary) < 0) {
      alert("Salary negative nahi ho sakti.");
      return;
    }

    const employee = {
      id: Date.now(),
      name: employeeName.trim(),
      salary: Number(employeeSalary),
      role: employeeRole,
    };

    setEmployees((previous) => [...previous, employee]);
    setTablePages((previous) => ({
      ...previous,
      employees: 1,
      payroll: 1,
      attendance: 1,
      "attendance-report": 1,
    }));
    setEmployeeName("");
    setEmployeeSalary("");
    setEmployeeRole("Employee");
  }

  function deleteEmployee(id) {
    if (!window.confirm("Kya aap is employee ko delete karna chahte hain?")) {
      return;
    }

    setEmployees((previous) => previous.filter((item) => item.id !== id));
  }

  function startEmployeeEdit(employee) {
    setEditingEmployeeId(employee.id);
    setEditedEmployeeName(employee.name);
    setEditedEmployeeSalary(String(employee.salary ?? ""));
    setEditedEmployeeRole(employee.role || "Employee");
  }

  function cancelEmployeeEdit() {
    setEditingEmployeeId(null);
    setEditedEmployeeName("");
    setEditedEmployeeSalary("");
    setEditedEmployeeRole("Employee");
  }

  function saveEmployeeEdit(id) {
    const name = editedEmployeeName.trim();
    const salary = Number(editedEmployeeSalary);

    if (!name || editedEmployeeSalary.trim() === "") {
      alert("Employee name aur salary fill karo.");
      return;
    }

    if (!Number.isFinite(salary) || salary < 0) {
      alert("Salary valid honi chahiye aur negative nahi ho sakti.");
      return;
    }

    setEmployees((previous) =>
      previous.map((employee) =>
        employee.id === id
          ? { ...employee, name, salary, role: editedEmployeeRole }
          : employee,
      ),
    );
    cancelEmployeeEdit();
  }

  function saveSalarySlip(event) {
    event.preventDefault();
    const employee = employees.find(
      (item) => String(item.id) === salarySlipEmployeeId,
    );
    const amountFields = [
      "basicSalary",
      "houseRentAllowance",
      "conveyanceAllowance",
      "fixedAllowance",
      "oneTimeEarning",
      "providentFund",
      "professionalTax",
      "tds",
      "otherDeductions",
    ];
    const amounts = Object.fromEntries(
      amountFields.map((key) => [key, Number(salarySlipForm[key])]),
    );
    const paidDays = Number(salarySlipForm.paidDays);
    const lopDays = Number(salarySlipForm.lopDays);
    const grossEarnings = [
      amounts.basicSalary,
      amounts.houseRentAllowance,
      amounts.conveyanceAllowance,
      amounts.fixedAllowance,
      amounts.oneTimeEarning,
    ].reduce((total, amount) => total + amount, 0);
    const totalDeductions = [
      amounts.providentFund,
      amounts.professionalTax,
      amounts.tds,
      amounts.otherDeductions,
    ].reduce((total, amount) => total + amount, 0);

    if (
      !employee ||
      !salarySlipMonth ||
      !salarySlipForm.paidOn ||
      !salarySlipForm.employeeCode.trim() ||
      !salarySlipForm.designation.trim()
    ) {
      alert("Employee, employee ID, designation, salary month aur payment date fill karein.");
      return;
    }

    if (
      amountFields.some(
        (key) => !Number.isFinite(amounts[key]) || amounts[key] < 0,
      ) ||
      !Number.isInteger(paidDays) ||
      !Number.isInteger(lopDays) ||
      paidDays < 0 ||
      lopDays < 0 ||
      paidDays + lopDays > daysInSalaryMonth(salarySlipMonth)
    ) {
      alert("Salary amounts aur paid/LOP days valid honi chahiye; days month ke total se zyada nahi ho sakte.");
      return;
    }

    if (totalDeductions > grossEarnings) {
      alert("Total deductions gross earnings se zyada nahi ho sakti.");
      return;
    }

    const slip = {
      id: `${employee.id}-${salarySlipMonth}`,
      employeeId: employee.id,
      employeeCode: salarySlipForm.employeeCode.trim(),
      employeeName: employee.name,
      role: salarySlipForm.designation.trim(),
      designation: salarySlipForm.designation.trim(),
      joiningDate: salarySlipForm.joiningDate,
      month: salarySlipMonth,
      paidOn: salarySlipForm.paidOn,
      paidDays,
      lopDays,
      ...amounts,
      allowances:
        amounts.houseRentAllowance +
        amounts.conveyanceAllowance +
        amounts.fixedAllowance +
        amounts.oneTimeEarning,
      deductions: totalDeductions,
      grossEarnings,
      totalDeductions,
      netPay: grossEarnings - totalDeductions,
      generatedAt: new Date().toISOString(),
    };

    setSalarySlips((previous) => [
      slip,
      ...previous.filter((item) => item.id !== slip.id),
    ]);
    setSelectedSalarySlip(slip);
  }

  function loadSalarySlipDraft(employeeId, month) {
    const employee = employees.find(
      (item) => String(item.id) === employeeId,
    );
    const existingSlip = salarySlips.find(
      (slip) =>
        String(slip.employeeId) === employeeId && slip.month === month,
    );
    const defaultCode = employee
      ? `EMP${String(employee.id).padStart(3, "0")}`
      : "";
    const defaultDays = String(Math.min(30, daysInSalaryMonth(month)));
    const existingAmount = (key, legacyKey) =>
      String(existingSlip?.[key] ?? existingSlip?.[legacyKey] ?? 0);

    setSalarySlipForm({
      employeeCode: existingSlip?.employeeCode || defaultCode,
      joiningDate: existingSlip?.joiningDate || "",
      designation:
        existingSlip?.designation ||
        existingSlip?.role ||
        employee?.role ||
        "Employee",
      basicSalary: String(existingSlip?.basicSalary ?? employee?.salary ?? 0),
      houseRentAllowance: existingAmount("houseRentAllowance"),
      conveyanceAllowance: existingAmount("conveyanceAllowance"),
      fixedAllowance: existingAmount("fixedAllowance", "allowances"),
      oneTimeEarning: existingAmount("oneTimeEarning"),
      providentFund: existingAmount("providentFund"),
      professionalTax: existingAmount("professionalTax"),
      tds: existingAmount("tds"),
      otherDeductions: existingAmount("otherDeductions", "deductions"),
      paidDays: String(existingSlip?.paidDays ?? defaultDays),
      lopDays: String(existingSlip?.lopDays ?? 0),
      paidOn: existingSlip?.paidOn || getTodayDate(),
    });
    setSelectedSalarySlip(null);
  }

  function selectSalarySlipEmployee(employeeId) {
    setSalarySlipEmployeeId(employeeId);
    loadSalarySlipDraft(employeeId, salarySlipMonth);
  }

  function selectSalarySlipMonth(month) {
    setSalarySlipMonth(month);
    loadSalarySlipDraft(salarySlipEmployeeId, month);
  }

  function selectExitEmployee(employeeId) {
    setExitEmployeeId(employeeId);
    setSelectedExitDocument(null);
    const savedRecord = exitRecords.find(
      (record) => String(record.employeeId) === employeeId,
    );
    if (savedRecord) {
      setExitForm({
        resignationDate: savedRecord.resignationDate || "",
        lastWorkingDate: savedRecord.lastWorkingDate || "",
        joiningDate: savedRecord.joiningDate || "",
        noticePeriod: String(savedRecord.noticePeriod ?? "0"),
        reason: savedRecord.reason || "",
        finalSettlement: String(savedRecord.finalSettlement ?? "0"),
        issueDate: savedRecord.issueDate || getTodayDate(),
        authorizedBy: savedRecord.authorizedBy || "",
        authorizedRole: savedRecord.authorizedRole || "Administrator",
      });
    } else {
      setExitForm({
        resignationDate: getTodayDate(),
        lastWorkingDate: "",
        joiningDate: "",
        noticePeriod: "0",
        reason: "",
        finalSettlement: "0",
        issueDate: getTodayDate(),
        authorizedBy: "",
        authorizedRole: "Administrator",
      });
    }
  }

  function saveExitRecord(event) {
    event.preventDefault();
    const employeeId = exitEmployeeId;
    const employee = employees.find(
      (item) => String(item.id) === employeeId,
    );
    const finalSettlement = Number(exitForm.finalSettlement);
    const noticePeriod = Number(exitForm.noticePeriod);

    if (!employee || !exitForm.resignationDate || !exitForm.lastWorkingDate) {
      alert("Employee, resignation date aur last working date fill karein.");
      return;
    }

    if (exitForm.lastWorkingDate < exitForm.resignationDate) {
      alert("Last working date resignation date se pehle nahi ho sakti.");
      return;
    }

    if (exitForm.joiningDate && exitForm.joiningDate > exitForm.lastWorkingDate) {
      alert("Joining date last working date ke baad nahi ho sakti.");
      return;
    }

    if (
      !Number.isFinite(finalSettlement) ||
      finalSettlement < 0 ||
      !Number.isFinite(noticePeriod) ||
      noticePeriod < 0
    ) {
      alert("Notice period aur settlement amount valid, non-negative values honi chahiye.");
      return;
    }

    const record = {
      id: String(employee.id),
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role || "Employee",
      resignationDate: exitForm.resignationDate,
      lastWorkingDate: exitForm.lastWorkingDate,
      joiningDate: exitForm.joiningDate,
      noticePeriod,
      reason: exitForm.reason.trim(),
      finalSettlement,
      issueDate: exitForm.issueDate || getTodayDate(),
      authorizedBy: exitForm.authorizedBy.trim(),
      authorizedRole: exitForm.authorizedRole.trim(),
      updatedAt: new Date().toISOString(),
    };

    setExitRecords((previous) => [
      record,
      ...previous.filter((item) => String(item.employeeId) !== employeeId),
    ]);
    setSelectedExitDocument({ record, type: "acceptance" });
  }

  function printDocuments() {
    window.print();
  }

  function deleteSalarySlip(slip) {
    if (
      !window.confirm(
        `${slip.employeeName} ki ${formatSalaryMonth(slip.month)} salary slip delete karni hai?`,
      )
    ) {
      return;
    }

    setSalarySlips((previous) =>
      previous.filter((item) => item.id !== slip.id),
    );
    if (selectedSalarySlip?.id === slip.id) {
      setSelectedSalarySlip(null);
    }
  }

  function deleteExitRecord(record) {
    if (
      !window.confirm(
        `${record.employeeName} ka saved resignation/exit record delete karna hai?`,
      )
    ) {
      return;
    }

    setExitRecords((previous) =>
      previous.filter((item) => item.id !== record.id),
    );
    if (String(exitEmployeeId) === String(record.employeeId)) {
      setExitEmployeeId("");
      setSelectedExitDocument(null);
    }
  }

  function updateAttendance(employeeId, status) {
    setAttendance((previous) => {
      const currentDay = { ...(previous[attendanceDate] || {}) };
      const reasons = { ...(currentDay.__reasons || {}) };

      if (status) {
        currentDay[employeeId] = status;
      } else {
        delete currentDay[employeeId];
      }

      if (status !== "Absent") {
        delete reasons[employeeId];
      }

      if (Object.keys(reasons).length) {
        currentDay.__reasons = reasons;
      } else {
        delete currentDay.__reasons;
      }

      if (!Object.keys(currentDay).length) {
        const updated = { ...previous };
        delete updated[attendanceDate];
        return updated;
      }

      return { ...previous, [attendanceDate]: currentDay };
    });
  }

  function updateAttendanceReason(employeeId, reason) {
    setAttendance((previous) => {
      const currentDay = { ...(previous[attendanceDate] || {}) };
      const reasons = { ...(currentDay.__reasons || {}) };

      if (reason.trim()) {
        reasons[employeeId] = reason;
      } else {
        delete reasons[employeeId];
      }

      if (Object.keys(reasons).length) {
        currentDay.__reasons = reasons;
      } else {
        delete currentDay.__reasons;
      }

      return { ...previous, [attendanceDate]: currentDay };
    });
  }

  function markAllPresent() {
    setAttendance((previous) => {
      const current = {
        ...(previous[attendanceDate] || {}),
        __reasons: {
          ...(previous[attendanceDate]?.__reasons || {}),
        },
      };

      employees.forEach((employee) => {
        current[employee.id] = "Present";
        if (current.__reasons) delete current.__reasons[employee.id];
      });

      if (current.__reasons && !Object.keys(current.__reasons).length) {
        delete current.__reasons;
      }

      return { ...previous, [attendanceDate]: current };
    });
  }

  function clearAttendance() {
    if (!window.confirm("Is date ki attendance clear karni hai?")) return;

    setAttendance((previous) => {
      const updated = { ...previous };
      delete updated[attendanceDate];
      return updated;
    });
  }

  function addExpense(event) {
    event.preventDefault();

    if (!expenseDate || !expenseAmount || Number(expenseAmount) <= 0) {
      alert("Date aur valid expense amount fill karo.");
      return;
    }

    const expense = {
      id: Date.now(),
      date: expenseDate,
      category: expenseCategory,
      amount: Number(expenseAmount),
      description: expenseDescription.trim(),
    };

    setExpenses((previous) => [expense, ...previous]);
    setTablePages((previous) => ({
      ...previous,
      expenses: 1,
      "monthly-expenses": 1,
    }));
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseMonth(expenseDate.slice(0, 7));
  }

  function deleteExpense(id) {
    if (!window.confirm("Kya aap ye expense delete karna chahte hain?")) {
      return;
    }

    setExpenses((previous) => previous.filter((item) => item.id !== id));
  }

  function addClient(event) {
    event.preventDefault();

    const amount = Number(projectAmount);
    const received = Number(receivedAmount || 0);

    if (!clientName.trim() || !projectName.trim() || projectAmount === "") {
      alert("Client name, project name aur project amount fill karo.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Project amount zero se zyada hona chahiye.");
      return;
    }

    if (!Number.isFinite(received) || received < 0 || received > amount) {
      alert("Received payment 0 se lekar project amount tak hona chahiye.");
      return;
    }

    const client = {
      id: Date.now(),
      name: clientName.trim(),
      company: clientCompany.trim(),
      phone: clientPhone.trim(),
      email: clientEmail.trim(),
      projectName: projectName.trim(),
      projectAmount: amount,
      receivedAmount: received,
      date: projectDate || getTodayDate(),
      paymentNote: paymentNote.trim(),
    };

    setClients((previous) => [client, ...previous]);
    setTablePages((previous) => ({
      ...previous,
      clients: 1,
      "client-payment-summary": 1,
    }));

    setClientName("");
    setClientCompany("");
    setClientPhone("");
    setClientEmail("");
    setProjectName("");
    setProjectAmount("");
    setReceivedAmount("");
    setProjectDate(getTodayDate());
    setPaymentNote("");
    setClientMonth((projectDate || getTodayDate()).slice(0, 7));

    alert("Client aur payment record save ho gaya!");
  }

  function deleteClient(id) {
    if (
      !window.confirm(
        "Kya aap is client/project ka record delete karna chahte hain?",
      )
    ) {
      return;
    }

    setClients((previous) => previous.filter((item) => item.id !== id));
  }

  function recordAdditionalPayment(client) {
    const pending =
      Number(client.projectAmount || 0) - Number(client.receivedAmount || 0);

    if (pending <= 0) {
      alert("Is project ka poora payment receive ho chuka hai.");
      return;
    }

    const entered = window.prompt(
      `Pending balance: ${formatMoney(pending)}\nKitna additional payment receive hua?`,
    );

    if (entered === null || entered.trim() === "") return;

    const payment = Number(entered);

    if (!Number.isFinite(payment) || payment <= 0 || payment > pending) {
      alert(
        `Amount 0 se zyada aur ${formatMoney(pending)} se kam ya barabar hona chahiye.`,
      );
      return;
    }

    setClients((previous) =>
      previous.map((item) =>
        item.id === client.id
          ? {
              ...item,
              receivedAmount: Number(item.receivedAmount || 0) + payment,
              lastPaymentDate: getTodayDate(),
            }
          : item,
      ),
    );

    alert(`Payment update ho gaya: ${formatMoney(payment)}`);
  }

  function getPaymentStatus(client) {
    const total = Number(client.projectAmount || 0);
    const received = Number(client.receivedAmount || 0);

    if (received >= total) return "Paid";
    if (received > 0) return "Partially Paid";
    return "Pending";
  }

  function getPendingAmount(client) {
    return Math.max(
      0,
      Number(client.projectAmount || 0) - Number(client.receivedAmount || 0),
    );
  }

  function downloadClientsCSV() {
    if (!filteredClients.length) {
      alert("Export karne ke liye koi client record nahi hai.");
      return;
    }

    const rows = [
      [
        "Client Name",
        "Company",
        "Phone",
        "Email",
        "Project",
        "Project Amount",
        "Received",
        "Pending",
        "Status",
        "Date",
      ],
      ...filteredClients.map((client) => [
        client.name,
        client.company,
        client.phone,
        client.email,
        client.projectName,
        client.projectAmount,
        client.receivedAmount,
        getPendingAmount(client),
        getPaymentStatus(client),
        client.date,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "yogen-clients-payments.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const navigation = [
    { name: "Dashboard", icon: "📊" },
    { name: "Employees", icon: "👥" },
    { name: "Attendance", icon: "📅" },
    { name: "Salary & Payroll", icon: "💰" },
    { name: "Salary Slips", icon: "🧾" },
    { name: "Resignation & Exit", icon: "📄" },
    { name: "Office Expenses", icon: "🧾" },
    { name: "Clients & Payments", icon: "🤝" },
    { name: "Reports", icon: "📈" },
  ];

  const pageTitle = {
    Dashboard: "Dashboard",
    Employees: "Employees Management",
    Attendance: "Attendance Management",
    "Salary & Payroll": "Salary & Payroll",
    "Salary Slips": "Salary Slips",
    "Resignation & Exit": "Resignation & Exit Documents",
    "Office Expenses": "Office Expenses",
    "Clients & Payments": "Clients & Payments",
    Reports: "Reports & Summary",
  };

  async function signOut() {
    setAuthActionError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      await readApiResponse(response);
      for (const key of [
        "yogen_employees",
        "yogen_salary_slips",
        "yogen_exit_records",
        "yogen_attendance",
        "yogen_office_expenses",
        "yogen_clients",
      ]) {
        localStorage.removeItem(key);
      }
      setDatabaseReady(false);
      setAuthenticatedUser(null);
    } catch (error) {
      console.error("Sign-out failed:", error);
      setAuthActionError(error.message);
    }
  }

  if (!authenticatedUser) {
    return <AuthPage onAuthenticated={setAuthenticatedUser} />;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">Y</div>
          <div>
            <h2>YogenFlow</h2>
            <p>Yogen Infotech</p>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`nav-item ${activePage === item.name ? "active" : ""}`}
              onClick={() => setActivePage(item.name)}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-avatar">
            {authenticatedUser.name
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <strong>{authenticatedUser.name}</strong>
            <p>{authenticatedUser.role === "admin" ? "Administrator" : "Workspace member"}</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>{pageTitle[activePage]}</h1>
            <p>Manage your office operations in one place.</p>
          </div>
          <div className="topbar-actions">
            <div
              className={`database-status ${databaseStatus}`}
              role="status"
              aria-live="polite"
              title={
                databaseStatus === "offline"
                  ? "MongoDB is unavailable. Changes remain saved in this browser."
                  : undefined
              }
            >
              <span className="database-status-dot" />
              {databaseStatus === "connected"
                ? "MongoDB connected"
                : databaseStatus === "connecting"
                  ? "Connecting..."
                  : "MongoDB offline"}
            </div>
            <div className="topbar-date">
              <span>📅</span> {getTodayDate()}
            </div>
            <button className="auth-signout" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>

        {authActionError && (
          <p className="auth-action-error" role="alert">
            {authActionError}
          </p>
        )}

        {activePage === "Dashboard" && (
          <section className="page-content">
            <div className="dashboard-hero">
              <div className="dashboard-window">
                <div className="dashboard-window-bar">
                  <div className="window-controls" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>YogenFlow dashboard</span>
                  <span className="window-live">
                    <span />
                    LIVE
                  </span>
                </div>
                <div className="dashboard-window-content">
                  <p className="welcome-eyebrow">YOGEN INFOTECH</p>
                  <h2>Welcome back, Abhishek! 👋</h2>
                  <p className="dashboard-hero-copy">
                    Your office operations, all in one place.
                  </p>

                  <div className="attendance-orbit-summary">
                    <div
                      className="attendance-ring"
                      style={{ "--attendance-progress": `${attendanceRate}%` }}
                      role="img"
                      aria-label={`${attendanceRate}% attendance today`}
                    >
                      <span>{attendanceRate}%</span>
                    </div>
                    <div className="attendance-summary-copy">
                      <strong>Today's attendance</strong>
                      <span>
                        {presentCount} of {employees.length} employees present
                        or WFH
                      </span>
                    </div>
                  </div>
                  <div className="dashboard-progress-track">
                    <span style={{ width: `${attendanceRate}%` }} />
                  </div>
                </div>
              </div>

              <div className="dashboard-illustration" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="orbit orbit-three" />
                <div className="orbit-dot orbit-dot-one" />
                <div className="orbit-dot orbit-dot-two" />
                <img
                  className="dashboard-rocket"
                  src="/dashboard-rocket.svg"
                  alt=""
                />
                <span className="hero-spark hero-spark-one" />
                <span className="hero-spark hero-spark-two" />
                <span className="hero-spark hero-spark-three" />
              </div>

              <button
                className="hero-float-card hero-employees"
                type="button"
                onClick={() => setActivePage("Employees")}
              >
                <span className="hero-float-icon employee-icon">♟</span>
                <span>
                  <small>Total employees</small>
                  <strong>{employees.length}</strong>
                </span>
              </button>
              <button
                className="hero-float-card hero-payroll"
                type="button"
                onClick={() => setActivePage("Salary & Payroll")}
              >
                <span className="hero-float-icon payroll-icon">₹</span>
                <span>
                  <small>Monthly payroll</small>
                  <strong>{formatMoney(employeePayroll)}</strong>
                </span>
              </button>
              <button
                className="hero-float-card hero-payments"
                type="button"
                onClick={() => setActivePage("Clients & Payments")}
              >
                <span className="hero-float-icon payments-icon">✓</span>
                <span>
                  <small>Payments received</small>
                  <strong>{formatMoney(totalReceived)}</strong>
                </span>
              </button>
              <p className="hero-caption">Yogen Infotech · office operations in one place</p>
            </div>

            <div className="stats-grid">
              <StatCard
                title="Total Employees"
                value={employees.length}
                detail="Active employee records"
                icon="👥"
                onClick={() => setActivePage("Employees")}
              />
              <StatCard
                title="Monthly Payroll"
                value={formatMoney(employeePayroll)}
                detail="Based on current salaries"
                icon="💰"
                onClick={() => setActivePage("Salary & Payroll")}
              />
              <StatCard
                title="Total Clients"
                value={clients.length}
                detail="Client/project records"
                icon="🤝"
                onClick={() => setActivePage("Clients & Payments")}
              />
              <StatCard
                title="Pending Payments"
                value={formatMoney(totalPending)}
                detail="Amount to be collected"
                icon="⏳"
                onClick={() => setActivePage("Clients & Payments")}
              />
              <StatCard
                title="This Month's Expenses"
                value={formatMoney(
                  expenses
                    .filter(
                      (item) =>
                        (item.date || "").slice(0, 7) === currentMonth(),
                    )
                    .reduce((sum, item) => sum + Number(item.amount || 0), 0),
                )}
                detail="Office expenses recorded"
                icon="🧾"
                onClick={() => setActivePage("Office Expenses")}
              />
              <StatCard
                title="Payments Received"
                value={formatMoney(totalReceived)}
                detail="Across all projects"
                icon="✅"
                onClick={() => setActivePage("Clients & Payments")}
              />
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Open a module to manage your office.</p>
                </div>
              </div>
              <div className="quick-actions">
                {navigation.slice(1).map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    className="quick-action"
                    onClick={() => setActivePage(item.name)}
                  >
                    <span>{item.icon}</span>
                    <strong>{item.name}</strong>
                    <span>→</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Payment Collection Overview</h3>
                  <p>All recorded client projects.</p>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setActivePage("Clients & Payments")}
                >
                  + Manage Clients
                </button>
              </div>
              <div className="stats-grid">
                <StatCard
                  title="Project Value"
                  value={formatMoney(totalProjectValue)}
                  icon="📁"
                  onClick={() => setActivePage("Clients & Payments")}
                />
                <StatCard
                  title="Received"
                  value={formatMoney(totalReceived)}
                  icon="✅"
                  onClick={() => setActivePage("Clients & Payments")}
                />
                <StatCard
                  title="Remaining"
                  value={formatMoney(totalPending)}
                  icon="⏳"
                  onClick={() => setActivePage("Clients & Payments")}
                />
              </div>
            </div>
          </section>
        )}

        {activePage === "Employees" && (
          <section className="page-content module-page">
            <div className="stats-grid">
              <StatCard
                title="Total Employees"
                value={employees.length}
                icon="👥"
                onClick={() => scrollToSection("employees-directory")}
              />
              <StatCard
                title="Monthly Payroll"
                value={formatMoney(employeePayroll)}
                icon="💰"
                onClick={() => setActivePage("Salary & Payroll")}
              />
              <StatCard
                title="Annual Payroll Estimate"
                value={formatMoney(employeePayroll * 12)}
                icon="📆"
                onClick={() => setActivePage("Salary & Payroll")}
              />
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Add New Employee</h3>
                  <p>Enter employee details below.</p>
                </div>
              </div>
              <form className="employee-form" onSubmit={addEmployee}>
                <input
                  value={employeeName}
                  onChange={(event) => setEmployeeName(event.target.value)}
                  placeholder="Employee name"
                  required
                />
                <input
                  type="number"
                  min="0"
                  value={employeeSalary}
                  onChange={(event) => setEmployeeSalary(event.target.value)}
                  placeholder="Monthly salary (₹)"
                  required
                />
                <select
                  value={employeeRole}
                  onChange={(event) => setEmployeeRole(event.target.value)}
                >
                  <option>Employee</option>
                  <option>Manager</option>
                  <option>Admin</option>
                  <option>Developer</option>
                  <option>Designer</option>
                </select>
                <button className="primary-button" type="submit">
                  + Add Employee
                </button>
              </form>
            </div>

            <div className="panel" id="employees-directory">
              <div className="panel-header">
                <div>
                  <h3>Employee Directory</h3>
                  <p>{employees.length} employee records</p>
                </div>
                <input
                  className="search-input"
                  value={employeeSearch}
                  onChange={(event) => {
                    setEmployeeSearch(event.target.value);
                    setTablePages((previous) => ({ ...previous, employees: 1 }));
                  }}
                  placeholder="Search employee..."
                />
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Monthly Salary</th>
                      <th>Annual Salary</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td>
                          {editingEmployeeId === employee.id ? (
                            <input
                              className="employee-edit-input"
                              aria-label={`Edit ${employee.name} name`}
                              value={editedEmployeeName}
                              onChange={(event) =>
                                setEditedEmployeeName(event.target.value)
                              }
                            />
                          ) : (
                            <strong>{employee.name}</strong>
                          )}
                        </td>
                        <td>
                          {editingEmployeeId === employee.id ? (
                            <select
                              className="employee-edit-input"
                              aria-label={`Edit ${employee.name} role`}
                              value={editedEmployeeRole}
                              onChange={(event) =>
                                setEditedEmployeeRole(event.target.value)
                              }
                            >
                              <option>Employee</option>
                              <option>Manager</option>
                              <option>Admin</option>
                              <option>Developer</option>
                              <option>Designer</option>
                            </select>
                          ) : (
                            employee.role || "Employee"
                          )}
                        </td>
                        <td>
                          {editingEmployeeId === employee.id ? (
                            <input
                              className="employee-edit-input salary-edit-input"
                              aria-label={`Edit ${employee.name} monthly salary`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={editedEmployeeSalary}
                              onChange={(event) =>
                                setEditedEmployeeSalary(event.target.value)
                              }
                            />
                          ) : (
                            formatMoney(employee.salary)
                          )}
                        </td>
                        <td>
                          {formatMoney(
                            (editingEmployeeId === employee.id
                              ? Number(editedEmployeeSalary)
                              : Number(employee.salary)) * 12 || 0,
                          )}
                        </td>
                        <td>
                          <div className="table-actions employee-row-actions">
                            {editingEmployeeId === employee.id ? (
                              <>
                                <button
                                  className="primary-button"
                                  type="button"
                                  onClick={() => saveEmployeeEdit(employee.id)}
                                >
                                  Save
                                </button>
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={cancelEmployeeEdit}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() => startEmployeeEdit(employee)}
                                  aria-label={`Edit ${employee.name}`}
                                >
                                  Edit
                                </button>
                                <button
                                  className="danger-button"
                                  type="button"
                                  onClick={() => deleteEmployee(employee.id)}
                                  aria-label={`Delete ${employee.name}`}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredEmployees.length && (
                      <tr>
                        <td colSpan="5">No employees found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderTablePagination(filteredEmployees, "employees")}
            </div>
          </section>
        )}

        {activePage === "Attendance" && (
          <section className="page-content module-page">
            <div className="stats-grid">
              <StatCard
                title="Total Employees"
                value={employees.length}
                icon="👥"
                onClick={() => scrollToSection("daily-attendance-records")}
              />
              <StatCard
                title="Present / WFH"
                value={presentCount}
                icon="✅"
                onClick={() => scrollToSection("daily-attendance-records")}
              />
              <StatCard
                title="Absent"
                value={absentCount}
                icon="❌"
                onClick={() => scrollToSection("daily-attendance-records")}
              />
            </div>

            <div className="panel" id="daily-attendance-records">
              <div className="panel-header">
                <div>
                  <h3>Daily Attendance</h3>
                  <p>Select a date and mark employee attendance.</p>
                </div>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                />
              </div>
              <div className="attendance-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={markAllPresent}
                >
                  Mark All Present
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={clearAttendance}
                >
                  Clear This Date
                </button>
                <input
                  className="search-input"
                  value={attendanceSearch}
                  onChange={(event) => {
                    setAttendanceSearch(event.target.value);
                    setTablePages((previous) => ({ ...previous, attendance: 1 }));
                  }}
                  placeholder="Search employee..."
                />
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Attendance Status</th>
                      <th>Reason (when absent)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTablePage(filteredAttendanceEmployees, "attendance").map(
                      (employee) => (
                      <tr key={employee.id}>
                        <td>
                          <strong>{employee.name}</strong>
                        </td>
                        <td>
                          <select
                            className="attendance-select"
                            value={attendanceForDate[employee.id] || ""}
                            onChange={(event) =>
                              updateAttendance(employee.id, event.target.value)
                            }
                          >
                            <option value="">Not Marked</option>
                            {attendanceStatuses.map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {attendanceForDate[employee.id] === "Absent" ? (
                            <input
                              className="attendance-reason-input"
                              value={
                                attendanceForDate.__reasons?.[employee.id] || ""
                              }
                              onChange={(event) =>
                                updateAttendanceReason(
                                  employee.id,
                                  event.target.value,
                                )
                              }
                              placeholder="Reason for absence"
                              aria-label={`${employee.name} absence reason`}
                            />
                          ) : (
                            <span className="attendance-reason-placeholder">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                      ),
                    )}
                    {!filteredAttendanceEmployees.length && (
                      <tr>
                        <td colSpan="3">No employees found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderTablePagination(
                filteredAttendanceEmployees,
                "attendance",
              )}
            </div>
          </section>
        )}

        {activePage === "Salary & Payroll" && (
          <section className="page-content module-page">
            <div className="stats-grid">
              <StatCard
                title="Monthly Payroll"
                value={formatMoney(employeePayroll)}
                icon="💰"
                onClick={() => scrollToSection("salary-overview")}
              />
              <StatCard
                title="Annual Payroll"
                value={formatMoney(employeePayroll * 12)}
                icon="📆"
                onClick={() => scrollToSection("salary-overview")}
              />
              <StatCard
                title="Employees"
                value={employees.length}
                icon="👥"
                onClick={() => setActivePage("Employees")}
              />
            </div>
            <div className="panel" id="salary-overview">
              <div className="panel-header">
                <div>
                  <h3>Salary Overview</h3>
                  <p>Salary estimates based on employee records.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Monthly Salary</th>
                      <th>Annual Estimate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTablePage(employees, "payroll").map((employee) => (
                      <tr key={employee.id}>
                        <td>
                          <strong>{employee.name}</strong>
                        </td>
                        <td>{formatMoney(employee.salary)}</td>
                        <td>
                          {formatMoney(Number(employee.salary || 0) * 12)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <strong>Total</strong>
                      </td>
                      <td>
                        <strong>{formatMoney(employeePayroll)}</strong>
                      </td>
                      <td>
                        <strong>{formatMoney(employeePayroll * 12)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {renderTablePagination(employees, "payroll")}
            </div>
          </section>
        )}

        {activePage === "Salary Slips" && (
          <section className="page-content module-page">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Create Salary Slip</h3>
                  <p>Employee ki monthly salary details save karein; print dialog se PDF download kar sakte hain.</p>
                </div>
              </div>
              {!employees.length ? (
                <div className="empty-state">Pehle Employees section me employee add karein.</div>
              ) : (
                <form className="employee-form document-form" onSubmit={saveSalarySlip}>
                  <label>
                    Employee
                    <select
                      value={salarySlipEmployeeId}
                      onChange={(event) => selectSalarySlipEmployee(event.target.value)}
                      required
                    >
                      <option value="">Select employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={String(employee.id)}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Salary month
                    <input
                      type="month"
                      value={salarySlipMonth}
                      onChange={(event) => selectSalarySlipMonth(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Employee ID / code
                    <input
                      value={salarySlipForm.employeeCode}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, employeeCode: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Designation
                    <input
                      value={salarySlipForm.designation}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, designation: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Date of joining (optional)
                    <input
                      type="date"
                      value={salarySlipForm.joiningDate}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, joiningDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    Pay date
                    <input
                      type="date"
                      value={salarySlipForm.paidOn}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, paidOn: event.target.value }))}
                      required
                    />
                  </label>
                  <div className="document-form-group-title">Earnings (₹)</div>
                  <label>
                    Basic
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salarySlipForm.basicSalary}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, basicSalary: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    House Rent Allowance
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salarySlipForm.houseRentAllowance}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, houseRentAllowance: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Conveyance Allowance
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salarySlipForm.conveyanceAllowance}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, conveyanceAllowance: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Fixed Allowance
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salarySlipForm.fixedAllowance}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, fixedAllowance: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    One-time Earning
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salarySlipForm.oneTimeEarning}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, oneTimeEarning: event.target.value }))}
                      required
                    />
                  </label>
                  <div className="document-form-group-title">Deductions (₹)</div>
                  <label>
                    PF
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salarySlipForm.providentFund}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, providentFund: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Professional Tax
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salarySlipForm.professionalTax}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, professionalTax: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    TDS
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salarySlipForm.tds}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, tds: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Other Deductions
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salarySlipForm.otherDeductions}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, otherDeductions: event.target.value }))}
                      required
                    />
                  </label>
                  <div className="document-form-group-title">Attendance &amp; payment</div>
                  <label>
                    Paid Days
                    <input
                      type="number"
                      min="0"
                      max={daysInSalaryMonth(salarySlipMonth)}
                      step="1"
                      value={salarySlipForm.paidDays}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, paidDays: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    LOP Days
                    <input
                      type="number"
                      min="0"
                      max={daysInSalaryMonth(salarySlipMonth)}
                      step="1"
                      value={salarySlipForm.lopDays}
                      onChange={(event) => setSalarySlipForm((form) => ({ ...form, lopDays: event.target.value }))}
                      required
                    />
                  </label>
                  <p className="document-hint">
                    Gross earnings: {formatMoney(salarySlipGrossPreview)}
                    {" "}· Net pay: {formatMoney(salarySlipGrossPreview - salarySlipDeductionsPreview)}
                    {" "}· Paid/LOP days earnings ko automatically adjust nahi karte; actual payable amounts enter karein.
                  </p>
                  <button className="primary-button" type="submit">
                    Save Salary Slip
                  </button>
                </form>
              )}
            </div>

            {selectedSalarySlip && (
              <div className="panel document-preview-panel">
                <div className="panel-header document-toolbar">
                  <div>
                    <h3>Salary Slip Preview</h3>
                    <p>Browser print window me “Save as PDF” choose karein.</p>
                  </div>
                  <button className="primary-button" type="button" onClick={printDocuments}>
                    Print / Download PDF
                  </button>
                </div>
                <SalarySlipDocument slip={selectedSalarySlip} />
              </div>
            )}

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Saved Salary Slips</h3>
                  <p>{salarySlips.length} monthly record(s) saved.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Month</th><th>Employee</th><th>Net pay</th><th>Payment date</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {[...salarySlips]
                      .sort((first, second) => (second.month || "").localeCompare(first.month || ""))
                      .map((slip) => (
                        <tr key={slip.id}>
                          <td>{formatSalaryMonth(slip.month)}</td>
                          <td>{slip.employeeName}</td>
                          <td>{formatMoney(slip.netPay)}</td>
                          <td>{slip.paidOn}</td>
                          <td>
                            <div className="document-record-actions">
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => setSelectedSalarySlip(slip)}
                              >
                                View / Print
                              </button>
                              <button
                                className="danger-button"
                                type="button"
                                onClick={() => deleteSalarySlip(slip)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {!salarySlips.length && (
                      <tr><td colSpan="5">Salary slips save karne ke baad yahan dikhengi.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activePage === "Resignation & Exit" && (
          <section className="page-content module-page">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Employee Resignation &amp; Exit Documents</h3>
                  <p>Details save karke resignation acceptance, relieving, experience aur full &amp; final documents banayein.</p>
                </div>
              </div>
              {!employees.length ? (
                <div className="empty-state">Pehle Employees section me employee add karein.</div>
              ) : (
                <form className="employee-form document-form" onSubmit={saveExitRecord}>
                  <label>
                    Employee
                    <select
                      value={exitEmployeeId}
                      onChange={(event) => selectExitEmployee(event.target.value)}
                      required
                    >
                      <option value="">Select employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={String(employee.id)}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Resignation date
                    <input
                      type="date"
                      value={exitForm.resignationDate}
                      onChange={(event) => setExitForm((form) => ({ ...form, resignationDate: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Last working date
                    <input
                      type="date"
                      value={exitForm.lastWorkingDate}
                      onChange={(event) => setExitForm((form) => ({ ...form, lastWorkingDate: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Joining date (optional)
                    <input
                      type="date"
                      value={exitForm.joiningDate}
                      onChange={(event) => setExitForm((form) => ({ ...form, joiningDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    Notice period (days)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={exitForm.noticePeriod}
                      onChange={(event) => setExitForm((form) => ({ ...form, noticePeriod: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Resignation reason (optional)
                    <input
                      value={exitForm.reason}
                      onChange={(event) => setExitForm((form) => ({ ...form, reason: event.target.value }))}
                    />
                  </label>
                  <label>
                    Full &amp; final settlement amount (₹)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={exitForm.finalSettlement}
                      onChange={(event) => setExitForm((form) => ({ ...form, finalSettlement: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Document issue date
                    <input
                      type="date"
                      value={exitForm.issueDate}
                      onChange={(event) => setExitForm((form) => ({ ...form, issueDate: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Authorized signatory
                    <input
                      value={exitForm.authorizedBy}
                      onChange={(event) => setExitForm((form) => ({ ...form, authorizedBy: event.target.value }))}
                      placeholder="Name"
                    />
                  </label>
                  <label>
                    Signatory designation
                    <input
                      value={exitForm.authorizedRole}
                      onChange={(event) => setExitForm((form) => ({ ...form, authorizedRole: event.target.value }))}
                    />
                  </label>
                  <p className="document-hint">
                    Exit documents ke liye entered details save honge. Employee record ya payroll automatically delete/change nahi hoga.
                  </p>
                  <button className="primary-button" type="submit">
                    Save Exit Details
                  </button>
                </form>
              )}
            </div>

            {savedExitRecord && (
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Generate Documents for {selectedExitEmployee?.name || savedExitRecord.employeeName}</h3>
                    <p>Document select karein, phir print window se PDF save karein.</p>
                  </div>
                  <button className="primary-button" type="button" onClick={printDocuments} disabled={!selectedExitDocument}>
                    Print / Download PDF
                  </button>
                </div>
                <div className="document-actions">
                  {[
                    ["acceptance", "Resignation Acceptance"],
                    ["relieving", "Relieving Letter"],
                    ["experience", "Experience Certificate"],
                    ["settlement", "Full & Final Statement"],
                  ].map(([type, title]) => (
                    <button
                      className={`secondary-button${selectedExitDocument?.type === type ? " active-document-button" : ""}`}
                      type="button"
                      key={type}
                      onClick={() => setSelectedExitDocument({ record: savedExitRecord, type })}
                    >
                      {title}
                    </button>
                  ))}
                </div>
                {selectedExitDocument && (
                  <ExitDocument
                    record={selectedExitDocument.record}
                    type={selectedExitDocument.type}
                  />
                )}
              </div>
            )}

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Saved Exit Records</h3>
                  <p>{exitRecords.length} employee exit record(s) saved.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Employee</th><th>Resignation date</th><th>Last working day</th><th>Settlement</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {exitRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.employeeName}</td>
                        <td>{record.resignationDate}</td>
                        <td>{record.lastWorkingDate}</td>
                        <td>{formatMoney(record.finalSettlement)}</td>
                        <td>
                          <div className="document-record-actions">
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => selectExitEmployee(String(record.employeeId))}
                            >
                              View / Edit
                            </button>
                            <button
                              className="danger-button"
                              type="button"
                              onClick={() => deleteExitRecord(record)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!exitRecords.length && (
                      <tr><td colSpan="5">Saved employee exit records yahan dikhengi.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activePage === "Office Expenses" && (
          <section className="page-content module-page">
            <div className="stats-grid">
              <StatCard
                title="This Month's Expenses"
                value={formatMoney(monthlyExpenseTotal)}
                icon="🧾"
                onClick={() => scrollToSection("expense-records")}
              />
              <StatCard
                title="All-Time Expenses"
                value={formatMoney(allExpenseTotal)}
                icon="💸"
                onClick={() => scrollToSection("expense-records")}
              />
              <StatCard
                title="Expense Records"
                value={expenses.length}
                icon="📋"
                onClick={() => scrollToSection("expense-records")}
              />
            </div>

            <div className="panel" id="expense-records">
              <div className="panel-header">
                <div>
                  <h3>Add Office Expense</h3>
                  <p>Record office spending.</p>
                </div>
              </div>
              <form className="employee-form" onSubmit={addExpense}>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  required
                />
                <select
                  value={expenseCategory}
                  onChange={(event) => setExpenseCategory(event.target.value)}
                >
                  {expenseCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  placeholder="Amount (₹)"
                  required
                />
                <input
                  value={expenseDescription}
                  onChange={(event) =>
                    setExpenseDescription(event.target.value)
                  }
                  placeholder="Description"
                />
                <button className="primary-button" type="submit">
                  + Add Expense
                </button>
              </form>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Expense Records</h3>
                  <p>Filter and review expenses by month.</p>
                </div>
                <input
                  type="month"
                  value={expenseMonth}
                  onChange={(event) => {
                    setExpenseMonth(event.target.value);
                    setTablePages((previous) => ({
                      ...previous,
                      expenses: 1,
                      "monthly-expenses": 1,
                    }));
                  }}
                />
              </div>
              <div className="attendance-actions">
                <input
                  className="search-input"
                  value={expenseSearch}
                  onChange={(event) => {
                    setExpenseSearch(event.target.value);
                    setTablePages((previous) => ({ ...previous, expenses: 1 }));
                  }}
                  placeholder="Search category or description..."
                />
                <strong>
                  Monthly total: {formatMoney(monthlyExpenseTotal)}
                </strong>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTablePage(filteredExpenses, "expenses").map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.date}</td>
                        <td>{expense.category}</td>
                        <td>{expense.description || "—"}</td>
                        <td>{formatMoney(expense.amount)}</td>
                        <td>
                          <button
                            className="danger-button"
                            type="button"
                            onClick={() => deleteExpense(expense.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filteredExpenses.length && (
                      <tr>
                        <td colSpan="5">No expenses found for this month.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderTablePagination(filteredExpenses, "expenses")}
            </div>
          </section>
        )}

        {activePage === "Clients & Payments" && (
          <section className="page-content module-page">
            <div className="stats-grid">
              <StatCard
                title="Total Clients / Projects"
                value={clients.length}
                detail="All recorded projects"
                icon="🤝"
                onClick={() => scrollToSection("client-payment-records")}
              />
              <StatCard
                title="Total Project Value"
                value={formatMoney(totalProjectValue)}
                detail="Contract/project amounts"
                icon="📁"
                onClick={() => scrollToSection("client-payment-records")}
              />
              <StatCard
                title="Payment Received"
                value={formatMoney(totalReceived)}
                detail="Total amount received"
                icon="✅"
                onClick={() => scrollToSection("client-payment-records")}
              />
              <StatCard
                title="Pending Balance"
                value={formatMoney(totalPending)}
                detail="Amount still to collect"
                icon="⏳"
                onClick={() => scrollToSection("client-payment-records")}
              />
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Add Client & Project</h3>
                  <p>Client, project and initial payment details fill karo.</p>
                </div>
              </div>

              <form className="employee-form" onSubmit={addClient}>
                <input
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Client name *"
                  required
                />
                <input
                  value={clientCompany}
                  onChange={(event) => setClientCompany(event.target.value)}
                  placeholder="Company name"
                />
                <input
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  placeholder="Phone number"
                />
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  placeholder="Email (optional)"
                />
                <input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Project / software name *"
                  required
                />
                <input
                  type="date"
                  value={projectDate}
                  onChange={(event) => setProjectDate(event.target.value)}
                  required
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={projectAmount}
                  onChange={(event) => setProjectAmount(event.target.value)}
                  placeholder="Total project amount (₹) *"
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={receivedAmount}
                  onChange={(event) => setReceivedAmount(event.target.value)}
                  placeholder="Initial payment received (₹)"
                />
                <input
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                  placeholder="Payment note / reference"
                />
                <button className="primary-button" type="submit">
                  + Save Client & Project
                </button>
              </form>

              {projectAmount !== "" && Number(projectAmount) >= 0 && (
                <div className="payment-preview">
                  <div>
                    <span>Project Amount</span>
                    <strong>{formatMoney(projectAmount)}</strong>
                  </div>
                  <div>
                    <span>Received</span>
                    <strong>{formatMoney(receivedAmount || 0)}</strong>
                  </div>
                  <div>
                    <span>Pending Balance</span>
                    <strong>
                      {formatMoney(
                        Math.max(
                          0,
                          Number(projectAmount) - Number(receivedAmount || 0),
                        ),
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="panel" id="client-payment-records">
              <div className="panel-header">
                <div>
                  <h3>Client & Payment Records</h3>
                  <p>
                    Search clients, check balances and record additional
                    payments.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={downloadClientsCSV}
                >
                  Export CSV
                </button>
              </div>

              <div className="attendance-actions">
                <input
                  className="search-input"
                  value={clientSearch}
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    setTablePages((previous) => ({ ...previous, clients: 1 }));
                  }}
                  placeholder="Search name, company, phone, project..."
                />
                <select
                  value={clientMonth}
                  onChange={(event) => {
                    setClientMonth(event.target.value);
                    setTablePages((previous) => ({ ...previous, clients: 1 }));
                  }}
                >
                  <option value="All">All Months</option>
                  {Array.from({ length: 24 }, (_, index) => {
                    const date = new Date();
                    date.setDate(1);
                    date.setMonth(date.getMonth() - index);
                    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                    return (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={paymentClientFilter}
                  onChange={(event) =>
                    {
                      setPaymentClientFilter(event.target.value);
                      setTablePages((previous) => ({
                        ...previous,
                        clients: 1,
                      }));
                    }
                  }
                >
                  <option>All</option>
                  <option>Paid</option>
                  <option>Partially Paid</option>
                  <option>Pending</option>
                </select>
              </div>

              <div className="stats-grid">
                <StatCard
                  title="Filtered Project Value"
                  value={formatMoney(
                    filteredClients.reduce(
                      (sum, client) => sum + Number(client.projectAmount || 0),
                      0,
                    ),
                  )}
                  icon="📁"
                  onClick={() => scrollToSection("client-records-table")}
                />
                <StatCard
                  title="Filtered Received"
                  value={formatMoney(
                    filteredClients.reduce(
                      (sum, client) => sum + Number(client.receivedAmount || 0),
                      0,
                    ),
                  )}
                  icon="✅"
                  onClick={() => scrollToSection("client-records-table")}
                />
                <StatCard
                  title="Filtered Pending"
                  value={formatMoney(
                    filteredClients.reduce(
                      (sum, client) => sum + getPendingAmount(client),
                      0,
                    ),
                  )}
                  icon="⏳"
                  onClick={() => scrollToSection("client-records-table")}
                />
              </div>

              <div className="table-wrapper" id="client-records-table">
                <table>
                  <thead>
                    <tr>
                      <th>Client / Company</th>
                      <th>Project</th>
                      <th>Contact</th>
                      <th>Date</th>
                      <th>Project Amount</th>
                      <th>Received</th>
                      <th>Pending</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTablePage(filteredClients, "clients").map((client) => (
                      <tr key={client.id}>
                        <td>
                          <strong>{client.name}</strong>
                          <br />
                          <small>
                            {client.company || "Company not provided"}
                          </small>
                          {client.email && (
                            <>
                              <br />
                              <small>{client.email}</small>
                            </>
                          )}
                          {client.paymentNote && (
                            <>
                              <br />
                              <small>Note: {client.paymentNote}</small>
                            </>
                          )}
                        </td>
                        <td>{client.projectName}</td>
                        <td>{client.phone || "—"}</td>
                        <td>{client.date || "—"}</td>
                        <td>{formatMoney(client.projectAmount)}</td>
                        <td>{formatMoney(client.receivedAmount)}</td>
                        <td>
                          <strong>
                            {formatMoney(getPendingAmount(client))}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`payment-status ${getPaymentStatus(client).toLowerCase().replaceAll(" ", "-")}`}
                          >
                            {getPaymentStatus(client)}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            {getPendingAmount(client) > 0 && (
                              <button
                                className="primary-button"
                                type="button"
                                onClick={() => recordAdditionalPayment(client)}
                              >
                                + Payment
                              </button>
                            )}
                            <button
                              className="danger-button"
                              type="button"
                              onClick={() => deleteClient(client.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredClients.length && (
                      <tr>
                        <td colSpan="9">
                          No client records found. Add your first client above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderTablePagination(filteredClients, "clients")}
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Monthly Client Summary</h3>
                  <p>
                    Project value and received payment for the selected month.
                  </p>
                </div>
                <input
                  type="month"
                  value={clientMonth === "All" ? currentMonth() : clientMonth}
                  onChange={(event) => {
                    setClientMonth(event.target.value);
                    setTablePages((previous) => ({ ...previous, clients: 1 }));
                  }}
                />
              </div>
              <div className="stats-grid">
                <StatCard
                  title="Projects This Month"
                  value={monthlyClients.length}
                  icon="📁"
                  onClick={() => scrollToSection("client-payment-records")}
                />
                <StatCard
                  title="Monthly Project Value"
                  value={formatMoney(monthlyClientValue)}
                  icon="💼"
                  onClick={() => scrollToSection("client-payment-records")}
                />
                <StatCard
                  title="Monthly Received"
                  value={formatMoney(monthlyClientReceived)}
                  icon="💵"
                  onClick={() => scrollToSection("client-payment-records")}
                />
              </div>
            </div>
          </section>
        )}

        {activePage === "Reports" && (
          <section className="page-content module-page">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Office Summary Report</h3>
                  <p>Current records from all modules.</p>
                </div>
              </div>
              <div className="stats-grid">
                <StatCard
                  title="Total Employees"
                  value={employees.length}
                  icon="👥"
                  onClick={() => setActivePage("Employees")}
                />
                <StatCard
                  title="Monthly Payroll"
                  value={formatMoney(employeePayroll)}
                  icon="💰"
                  onClick={() => setActivePage("Salary & Payroll")}
                />
                <StatCard
                  title="Total Clients / Projects"
                  value={clients.length}
                  icon="🤝"
                  onClick={() => setActivePage("Clients & Payments")}
                />
                <StatCard
                  title="Project Value"
                  value={formatMoney(totalProjectValue)}
                  icon="📁"
                  onClick={() => setActivePage("Clients & Payments")}
                />
                <StatCard
                  title="Payment Received"
                  value={formatMoney(totalReceived)}
                  icon="✅"
                  onClick={() => setActivePage("Clients & Payments")}
                />
                <StatCard
                  title="Pending Payments"
                  value={formatMoney(totalPending)}
                  icon="⏳"
                  onClick={() => setActivePage("Clients & Payments")}
                />
                <StatCard
                  title="All-Time Expenses"
                  value={formatMoney(allExpenseTotal)}
                  icon="🧾"
                  onClick={() => setActivePage("Office Expenses")}
                />
                <StatCard
                  title="Selected Month Expenses"
                  value={formatMoney(monthlyExpenseTotal)}
                  icon="📆"
                  onClick={() => scrollToSection("monthly-expense-report")}
                />
              </div>
            </div>

            <div className="panel">
              <div className="panel-header attendance-report-header">
                <div>
                  <h3>Monthly Attendance Report</h3>
                  <p>
                    Select an employee to filter their monthly totals and view
                    the complete day-by-day attendance history.
                  </p>
                </div>
                <label className="report-month-control">
                  <span>Report month</span>
                  <input
                    type="month"
                    value={attendanceReportMonth}
                    onChange={(event) =>
                      {
                        setAttendanceReportMonth(event.target.value);
                        setTablePages((previous) => ({
                          ...previous,
                          "attendance-report": 1,
                          "employee-attendance-details": 1,
                        }));
                      }
                    }
                  />
                </label>
                <label className="report-employee-control">
                  <span>Filter employee</span>
                  <select
                    value={attendanceReportEmployeeId}
                    onChange={(event) =>
                      {
                        setAttendanceReportEmployeeId(event.target.value);
                        setTablePages((previous) => ({
                          ...previous,
                          "attendance-report": 1,
                          "employee-attendance-details": 1,
                        }));
                      }
                    }
                  >
                    <option value="">Select an employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={String(employee.id)}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="attendance-report-meta">
                {attendanceReportEmployeeId
                  ? `${attendanceReportMarkedDays} marked day${attendanceReportMarkedDays === 1 ? "" : "s"} for ${selectedAttendanceReport?.employee.name || "the selected employee"}`
                  : `${attendanceReportMarkedDays} date${attendanceReportMarkedDays === 1 ? "" : "s"} with saved attendance`}
              </div>
              <div className="table-wrapper">
                <table className="attendance-report-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Present</th>
                      <th>WFH</th>
                      <th>Absent</th>
                      <th>Casual Leave</th>
                      <th>Sick Leave</th>
                      <th>Holiday</th>
                      <th>Leave dates</th>
                      <th>WFH dates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTablePage(
                      visibleMonthlyAttendanceReports,
                      "attendance-report",
                    ).map((report) => (
                      <tr key={report.employee.id}>
                        <td>
                          <strong>{report.employee.name}</strong>
                        </td>
                        <td>{report.present}</td>
                        <td>{report.wfh}</td>
                        <td>{report.absent}</td>
                        <td>{report.casualLeave}</td>
                        <td>{report.sickLeave}</td>
                        <td>{report.holidays}</td>
                        <td>
                          {report.leaveDates.length ? (
                            <div className="attendance-date-list">
                              {report.leaveDates.map(({ date, status }) => (
                                <span
                                  className="attendance-date-chip leave"
                                  key={`${date}-${status}`}
                                >
                                  {date} · {status}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {report.wfhDates.length ? (
                            <div className="attendance-date-list">
                              {report.wfhDates.map((date) => (
                                <span
                                  className="attendance-date-chip wfh"
                                  key={date}
                                >
                                  {date}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                    {!visibleMonthlyAttendanceReports.length && (
                      <tr>
                        <td colSpan="9">No employees available for this report.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderTablePagination(
                visibleMonthlyAttendanceReports,
                "attendance-report",
              )}
            </div>

            {selectedAttendanceReport && (
              <div
                className="panel employee-attendance-detail"
                id="selected-employee-daily-details"
              >
                <div className="panel-header">
                  <div>
                    <h3>{selectedAttendanceReport.employee.name} · Daily Report</h3>
                    <p>
                      {attendanceReportMonth} attendance for every calendar
                      day. Unmarked dates are kept separate from absences.
                    </p>
                  </div>
                  <span className="attendance-report-month-label">
                    {attendanceReportMonth}
                  </span>
                </div>
                <div className="attendance-detail-stats">
                  <div>
                    <strong>{selectedAttendanceReport.counts.present}</strong>
                    <span>Present</span>
                  </div>
                  <div>
                    <strong>{selectedAttendanceReport.counts.wfh}</strong>
                    <span>Work from home</span>
                  </div>
                  <div>
                    <strong>{selectedAttendanceReport.counts.absent}</strong>
                    <span>Absent</span>
                  </div>
                  <div>
                    <strong>{selectedAttendanceReport.counts.leave}</strong>
                    <span>Leave</span>
                  </div>
                  <div>
                    <strong>{selectedAttendanceReport.counts.holidays}</strong>
                    <span>Holiday</span>
                  </div>
                  <div>
                    <strong>{selectedAttendanceReport.counts.notMarked}</strong>
                    <span>Not marked</span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="employee-daily-attendance-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Attendance</th>
                        <th>Reason / Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTablePage(
                        selectedAttendanceReport.days,
                        "employee-attendance-details",
                      ).map((day) => (
                        <tr key={day.date}>
                          <td>{day.date}</td>
                          <td>
                            {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                              "en-IN",
                              { weekday: "long" },
                            )}
                          </td>
                          <td>
                            <span
                              className={`attendance-day-status ${day.status.toLowerCase().replaceAll(" ", "-")}`}
                            >
                              {day.status}
                            </span>
                          </td>
                          <td
                            className={
                              day.status === "Not marked"
                                ? "attendance-unmarked-note"
                                : ""
                            }
                          >
                            {day.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderTablePagination(
                  selectedAttendanceReport.days,
                  "employee-attendance-details",
                )}
              </div>
            )}

            <div className="panel" id="monthly-expense-report">
              <div className="panel-header">
                <div>
                  <h3>Monthly Office Expenses</h3>
                  <p>Select a month to review expenses.</p>
                </div>
                <input
                  type="month"
                  value={expenseMonth}
                  onChange={(event) => {
                    setExpenseMonth(event.target.value);
                    setTablePages((previous) => ({
                      ...previous,
                      "monthly-expenses": 1,
                    }));
                  }}
                />
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTablePage(monthlyExpenses, "monthly-expenses").map(
                      (expense) => (
                      <tr key={expense.id}>
                        <td>{expense.date}</td>
                        <td>{expense.category}</td>
                        <td>{expense.description || "—"}</td>
                        <td>{formatMoney(expense.amount)}</td>
                      </tr>
                      ),
                    )}
                    {!monthlyExpenses.length && (
                      <tr>
                        <td colSpan="4">
                          No expenses recorded for this month.
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan="3">
                        <strong>Monthly Total</strong>
                      </td>
                      <td>
                        <strong>{formatMoney(monthlyExpenseTotal)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {renderTablePagination(monthlyExpenses, "monthly-expenses")}
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Client Payment Summary</h3>
                  <p>Outstanding balances by project.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Project</th>
                      <th>Total</th>
                      <th>Received</th>
                      <th>Pending</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTablePage(clients, "client-payment-summary").map(
                      (client) => (
                      <tr key={client.id}>
                        <td>{client.name}</td>
                        <td>{client.projectName}</td>
                        <td>{formatMoney(client.projectAmount)}</td>
                        <td>{formatMoney(client.receivedAmount)}</td>
                        <td>{formatMoney(getPendingAmount(client))}</td>
                        <td>{getPaymentStatus(client)}</td>
                      </tr>
                      ),
                    )}
                    {!clients.length && (
                      <tr>
                        <td colSpan="6">No client records available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderTablePagination(clients, "client-payment-summary")}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
