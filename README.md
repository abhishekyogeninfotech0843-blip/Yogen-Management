# Yogen Office OS

## Run locally

1. Configure `MONGO_URI` in `server/.env`.
2. If this is an existing MongoDB deployment, back up the database before the first authenticated startup. The API adds `users` and `sessions` collections and authentication indexes; it does not delete office data.
3. In the project root, run `npm run dev:server` and `npm run dev` in separate terminals.
4. Open the Vite URL. Sign up with email or phone (include the country code) to create the first workspace administrator.

The first account is the only administrator. Later members must enter `AUTH_INVITE_CODE`, configured in the ignored `server/.env` file, to register. Keep that code private and share it only with workspace members. All authenticated members currently share the same office workspace data.

For a production deployment, set a long, random `AUTH_SETUP_CODE` before making the app public. Only the first administrator can use it, and it is not needed for local development. Rotate/configure `AUTH_INVITE_CODE` to allow additional accounts.

Passwords are stored as salted scrypt hashes. Sign-in uses an HttpOnly session cookie; logout revokes the session. The office data API requires a valid session. No sample/default account or password is created.

Forgot-password and forgot-email screens currently report that account recovery needs a configured email/SMS delivery provider. Password reset codes are not sent until that service is configured. Run `npm --prefix server test` for authentication utility tests.

## Salary and employee exit documents

Use **Salary Slips** to select an employee and month, enter the earning and deduction components, paid/LOP days, and employee details, then save the slip and print it or choose **Save as PDF** in the browser print dialog. The payslip uses the Yogen logo and shows the employee-pay summary, net pay, earnings, deductions, and totals. YTD columns remain blank until cumulative year-to-date payroll data is available. A saved slip captures the employee and pay details for that month; saving again for the same employee and month updates that slip.

Use **Resignation & Exit** to save resignation and last-working dates, notice period, settlement amount, and signatory details. The saved record can generate a resignation acceptance letter, relieving letter, experience certificate, and full-and-final settlement statement. Review the entered details and applicable company/legal requirements before issuing a document. Saving exit details does not delete or change the employee record or payroll automatically.

Salary slips and exit records are stored separately from the existing employee data and sync to MongoDB when it is available. If MongoDB is offline, changes remain in the current browser's local storage.
