import { useEffect, useState } from "react";
import "./AuthPage.css";

async function readResponse(response) {
  let result;
  try {
    result = await response.json();
  } catch {
    if (response.status === 404) {
      throw new Error(
        "The authentication API was not found. Restart the backend from this project with `npm run dev:server`, then refresh.",
      );
    }
    throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(result.error || `Request failed (HTTP ${response.status}).`);
  }
  return result;
}

export default function AuthPage({ onAuthenticated }) {
  const [screen, setScreen] = useState("signIn");
  const [darkMode, setDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("email");
  const [registerMethod, setRegisterMethod] = useState("email");
  const [message, setMessage] = useState("");
  const [authStatus, setAuthStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/status", { credentials: "include" })
      .then(readResponse)
      .then((status) => {
        if (cancelled) return;
        setAuthStatus(status);
        if (status.authenticated && status.user) onAuthenticated(status.user);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [onAuthenticated]);

  function changeScreen(nextScreen) {
    setScreen(nextScreen);
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (screen === "forgotPassword" || screen === "forgotEmail") {
      setMessage(
        "Account recovery needs an email/SMS delivery provider. Ask your workspace administrator to reset your account.",
      );
      return;
    }

    const formData = new FormData(event.currentTarget);
    const method = screen === "signIn" ? loginMethod : registerMethod;
    const payload = screen === "signIn"
      ? {
          method,
          identifier: formData.get("identifier"),
          password: formData.get("password"),
          rememberMe: formData.get("remember") === "on",
        }
      : {
          method,
          name: formData.get("name"),
          identifier: formData.get("contact"),
          password: formData.get("password"),
          setupCode: formData.get("setupCode"),
          inviteCode: formData.get("inviteCode"),
        };

    setIsSubmitting(true);
    try {
      const result = await readResponse(
        await fetch(`/api/auth/${screen === "signIn" ? "login" : "register"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }),
      );
      onAuthenticated(result.user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const titles = {
    signIn: ["Welcome back", "Sign in to continue to your workspace"],
    createAccount: ["Create your account", "Get started with Yogen Office OS"],
    forgotPassword: ["Reset password", "Choose where to receive recovery instructions"],
    forgotEmail: ["Find your account", "Enter your phone number to recover your email"],
  };

  return (
    <main className={`auth-page${darkMode ? " auth-page-dark" : ""}`}>
      <div className="auth-orb auth-orb-top" aria-hidden="true" />
      <div className="auth-orb auth-orb-bottom" aria-hidden="true" />
      <button
        className="auth-theme-toggle"
        type="button"
        onClick={() => setDarkMode((current) => !current)}
        aria-label={`Switch to ${darkMode ? "light" : "dark"} theme`}
        title={`Switch to ${darkMode ? "light" : "dark"} theme`}
      >
        {darkMode ? "☀" : "☾"}
      </button>

      <section className="auth-card" aria-labelledby="auth-title">
        <header className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true">
            <span>Y</span>
          </div>
          <p>YOGEN INFOTECH</p>
        </header>

        <div className="auth-heading">
          <h1 id="auth-title">{titles[screen][0]}</h1>
          <p>{titles[screen][1]}</p>
        </div>

        {screen === "signIn" && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <fieldset className="auth-method">
              <legend>Sign in with</legend>
              <button
                className={loginMethod === "email" ? "selected" : ""}
                type="button"
                onClick={() => {
                  setLoginMethod("email");
                  setMessage("");
                }}
                aria-pressed={loginMethod === "email"}
              >
                Email
              </button>
              <button
                className={loginMethod === "phone" ? "selected" : ""}
                type="button"
                onClick={() => {
                  setLoginMethod("phone");
                  setMessage("");
                }}
                aria-pressed={loginMethod === "phone"}
              >
                Phone
              </button>
            </fieldset>

            <label className="auth-field">
              <span>{loginMethod === "email" ? "Email address" : "Phone number"}</span>
              <span className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  {loginMethod === "email" ? "✉" : "☎"}
                </span>
                <input
                  key={loginMethod}
                  name="identifier"
                  type={loginMethod === "email" ? "email" : "tel"}
                  autoComplete={loginMethod === "email" ? "email" : "tel"}
                  placeholder={loginMethod === "email" ? "you@company.com" : "+91 98765 43210"}
                  pattern={loginMethod === "phone" ? "\\+?[0-9 ()-]{8,25}" : undefined}
                  required
                />
              </span>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <span className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">♙</span>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>

            <div className="auth-options">
              <label className="auth-remember">
                <input type="checkbox" name="remember" />
                <span>Remember me</span>
              </label>
              <button type="button" onClick={() => changeScreen("forgotPassword")}>
                Forgot password?
              </button>
            </div>

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Signing in..." : "Login"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        {screen === "createAccount" && authStatus?.registrationAvailable !== false && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Full name</span>
              <span className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">♙</span>
                <input name="name" autoComplete="name" placeholder="Your name" required />
              </span>
            </label>
            <fieldset className="auth-method">
              <legend>Create account with</legend>
              <button
                className={registerMethod === "email" ? "selected" : ""}
                type="button"
                onClick={() => {
                  setRegisterMethod("email");
                  setMessage("");
                }}
                aria-pressed={registerMethod === "email"}
              >
                Email
              </button>
              <button
                className={registerMethod === "phone" ? "selected" : ""}
                type="button"
                onClick={() => {
                  setRegisterMethod("phone");
                  setMessage("");
                }}
                aria-pressed={registerMethod === "phone"}
              >
                Phone
              </button>
            </fieldset>
            <label className="auth-field">
              <span>{registerMethod === "email" ? "Email address" : "Phone number"}</span>
              <span className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  {registerMethod === "email" ? "✉" : "☎"}
                </span>
                <input
                  key={registerMethod}
                  name="contact"
                  type={registerMethod === "email" ? "email" : "tel"}
                  autoComplete={registerMethod === "email" ? "email" : "tel"}
                  placeholder={registerMethod === "email" ? "you@company.com" : "+91 98765 43210"}
                    pattern={registerMethod === "phone" ? "\\+?[0-9 ()-]{8,25}" : undefined}
                    required
                  />
              </span>
            </label>
            {authStatus?.bootstrapCodeRequired && (
              <label className="auth-field">
                  <span>Administrator setup code</span>
                  <span className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">⌑</span>
                    <input
                      name="setupCode"
                      type="password"
                      autoComplete="off"
                      placeholder="Enter the code configured by the owner"
                      required
                    />
                  </span>
              </label>
            )}
            {authStatus?.inviteRequired && (
              <label className="auth-field">
                  <span>Workspace invite code</span>
                  <span className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">⌑</span>
                    <input
                      name="inviteCode"
                      type="password"
                      autoComplete="off"
                      placeholder="Enter the code from your administrator"
                      required
                    />
                  </span>
              </label>
            )}
            <label className="auth-field">
              <span>Password</span>
              <span className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">♙</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  required
                />
              </span>
            </label>
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Creating account..." : "Create account"}</span>
              <span aria-hidden="true">→</span>
            </button>
            <p className="auth-service-hint">
              {authStatus?.setupRequired
                ? "The first account will be the workspace administrator."
                : "New accounts need an invite code. Workspace data is shared with members."}
            </p>
          </form>
        )}

        {screen === "createAccount" && authStatus?.registrationAvailable === false && (
          <p className="auth-service-hint" role="status">
            {authStatus.setupBlocked
              ? "Initial admin registration is not configured yet. Ask the server owner to set AUTH_SETUP_CODE."
              : "Account registration is closed until the administrator configures a workspace invite code."}
          </p>
        )}

        {screen === "forgotPassword" && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <fieldset className="auth-method">
              <legend>Send recovery instructions to</legend>
              <button
                className={loginMethod === "email" ? "selected" : ""}
                type="button"
                onClick={() => {
                  setLoginMethod("email");
                  setMessage("");
                }}
                aria-pressed={loginMethod === "email"}
              >
                Email
              </button>
              <button
                className={loginMethod === "phone" ? "selected" : ""}
                type="button"
                onClick={() => {
                  setLoginMethod("phone");
                  setMessage("");
                }}
                aria-pressed={loginMethod === "phone"}
              >
                Phone
              </button>
            </fieldset>
            <label className="auth-field">
              <span>{loginMethod === "email" ? "Email address" : "Phone number"}</span>
              <span className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  {loginMethod === "email" ? "✉" : "☎"}
                </span>
                <input
                  key={loginMethod}
                  name="recoveryIdentifier"
                  type={loginMethod === "email" ? "email" : "tel"}
                  autoComplete={loginMethod === "email" ? "email" : "tel"}
                  placeholder={loginMethod === "email" ? "you@company.com" : "+91 98765 43210"}
                  required
                />
              </span>
            </label>
            <button className="auth-submit" type="submit">
              <span>Continue</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        {screen === "forgotEmail" && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Phone number linked to your account</span>
              <span className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">☎</span>
                <input
                  name="recoveryPhone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  required
                />
              </span>
            </label>
            <button className="auth-submit" type="submit">
              <span>Find my email</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        {message && (
          <p className="auth-message" role="status" aria-live="polite">
            {message}
          </p>
        )}

        <nav className="auth-links" aria-label="Account options">
          {screen === "signIn" ? (
            <>
              <p>
                Forgot your email?{" "}
                <button type="button" onClick={() => changeScreen("forgotEmail")}>
                  Find account
                </button>
              </p>
              <p>
                New to Yogen Office OS?{" "}
                <button type="button" onClick={() => changeScreen("createAccount")}>
                  Create account
                </button>
              </p>
            </>
          ) : (
            <p>
              <button type="button" onClick={() => changeScreen("signIn")}>
                ← Back to login
              </button>
              {screen === "forgotPassword" && (
                <>
                  {" · "}
                  <button type="button" onClick={() => changeScreen("forgotEmail")}>
                    Forgot email?
                  </button>
                </>
              )}
            </p>
          )}
        </nav>

        <div className="auth-divider"><span>YOGEN OFFICE OS</span></div>
        <p className="auth-note">
          Your office workspace is protected by sign-in. Recovery codes need an email or SMS provider.
        </p>
      </section>

      <footer className="auth-footer">
        <span>PLAN</span><i>•</i><span>ORGANIZE</span><i>•</i><span>GROW TOGETHER</span>
      </footer>
    </main>
  );
}
