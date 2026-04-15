import React, { useState } from "react";
import Button from "../../elements/button/Button";
import styles from "./ResetPassword.module.scss";

const ResetPassword = ({ onPasswordReset }) => {

    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const enterEmail = (event) => setEmail(event.target.value);

    const normalizedEmail = email.trim();
    const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    const hasEmailFormatError = normalizedEmail !== "" && !isEmailFormatValid;
    const invalid = normalizedEmail === "" || hasEmailFormatError || isSubmitting;

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (normalizedEmail === "") return;

        if (!isEmailFormatValid) {
            setErrorMessage("Enter a valid email address.");
            setStatusMessage("");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");
        setStatusMessage("");

        try {
            const resetEmailWasSent = await onPasswordReset(normalizedEmail);

            if (resetEmailWasSent) {
                setStatusMessage("Reset email sent. Check your inbox.");
                setErrorMessage("");
                setEmail("");
                return;
            }

            setErrorMessage("Could not send reset email. Please try again.");
        } catch (error) {
            setErrorMessage("Could not send reset email. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return <div className={styles.container}>
        <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <div className={styles.formContainer}>
                <label htmlFor="reset-email">Email</label>
                <input
                    id="reset-email"
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={enterEmail}
                    autoComplete="email"
                    inputMode="email"
                    required
                    spellCheck={false}
                    aria-required="true"
                    aria-invalid={hasEmailFormatError}
                    aria-describedby="reset-email-help reset-email-error reset-email-status"
                />
                <p id="reset-email-help" className={styles.helperText}>
                    Enter the email linked to your account.
                </p>
                <p
                    id="reset-email-error"
                    className={styles.errorText}
                    role={errorMessage ? "alert" : undefined}
                    aria-live="assertive"
                >
                    {errorMessage}
                </p>
                <p
                    id="reset-email-status"
                    className={styles.successText}
                    role="status"
                    aria-live="polite"
                >
                    {statusMessage}
                </p>

                <Button type="submit" disabled={invalid}>
                    {isSubmitting ? "Sending..." : "Reset Password"}
                </Button>
            </div>
        </form>
    </div>

};

export default ResetPassword;