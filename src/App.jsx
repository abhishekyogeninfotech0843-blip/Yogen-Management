import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import AuthPage from "./AuthPage.jsx";

const getTodayDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentMonth = () => getTodayDate().slice(0, 7);

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
    { name: "Office Expenses", icon: "🧾" },
    { name: "Clients & Payments", icon: "🤝" },
    { name: "Reports", icon: "📈" },
  ];

  const pageTitle = {
    Dashboard: "Dashboard",
    Employees: "Employees Management",
    Attendance: "Attendance Management",
    "Salary & Payroll": "Salary & Payroll",
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
