import React, { useState, useContext } from "react";
import { useRouter } from "next/router";
import Header from "@/components/layout/header/Header";
import Logo from "@/components/elements/logo/Logo";
import Link from "@/components/elements/link/Link";
import Container from "@/components/layout/container/Container";
import styles from "./Home.module.scss";
import Modal from "@/components/layout/modal/Modal";
import SignUp from "@/components/forms/registration/SignUp";
import Login from "@/components/forms/login/Login";
import ResetPassword from "@/components/forms/resetPassword/ResetPassword";
import SuccessMessage from "@/components/messages/successMessage/SuccessMessage";
import ErrorMessage from "@/components/messages/errorMessage/ErrorMessage";
import { AuthContext, AUTH_ERROR_CODES, AUTH_SUCCESS_CODES } from "@/firebase/authContext";
import { canAccessFiatCryptoAdminUi } from "@/utils/fiatCryptoAdminAccess";

const Home = () => {

    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

    const [errorCode, setErrorCode] = useState(null);
    const [successCode, setSuccessCode] = useState(null);


    const { login, register, resetPassword, user, isAuthenticated } = useContext(AuthContext);
    const showAdminNav = canAccessFiatCryptoAdminUi(user, isAuthenticated);

    const router = useRouter();

    const handleLogin = async (loginCredentials) => {
        await login(
            loginCredentials,
            (errorMessage) => {
                setErrorCode(errorMessage);
                setShowLoginModal(false);
            });
    };

    const handleRegistration = (e, credential) => {
        e.preventDefault();
        register(credential, (message) => {
            setSuccessCode(message);
        },
            (message) => {
                setErrorCode(message);
            });
    };

    const handlePasswordReset = async (email) => {
        const hasResetPassword = await resetPassword(email);
        if (hasResetPassword) {
            setShowForgotPasswordModal(false);
            setShowLoginModal(true);
        }
        return hasResetPassword;
    };


    return (
        <Container>
            {showRegistrationModal && successCode === null && errorCode === null &&
                <Modal
                    onClose={() => setShowRegistrationModal(false)}
                    isOpen={showRegistrationModal}
                    title="Create account"
                    className={styles.modal}
                >
                    <SignUp onRegistration={(e, credential) => handleRegistration(e, credential)} />
                </Modal>
            }

            {
                showLoginModal &&
                <Modal
                    onClose={() => setShowLoginModal(false)}
                    isOpen={showLoginModal}
                    title="Log in"
                    className={styles.modal}
                >
                    <Login
                        onPasswordReset={() => {
                            setShowForgotPasswordModal(true);
                            setShowLoginModal(false);
                        }}
                        onLogin={handleLogin}
                    />
                </Modal>
            }

            {
                showForgotPasswordModal &&
                <Modal
                    onClose={() => setShowForgotPasswordModal(false)}
                    isOpen={showForgotPasswordModal}
                    title="Reset password"
                    className={styles.modal}
                >
                    <ResetPassword onPasswordReset={handlePasswordReset} />
                </Modal>
            }

            {
                successCode === AUTH_SUCCESS_CODES.REGISTRATION_SUCCESSFUL &&
                <Modal
                    onClose={() => { setSuccessCode(null); setShowRegistrationModal(false); }}
                    isOpen={successCode === AUTH_SUCCESS_CODES.REGISTRATION_SUCCESSFUL}
                    title="Registration successful"
                    className={styles.modal}
                >
                    <SuccessMessage />
                </Modal>
            }

            {
                errorCode !== null &&
                <Modal
                    onClose={() => {
                        const isLoginError = errorCode === AUTH_ERROR_CODES.INVALID_CREDENTIALS || errorCode === AUTH_ERROR_CODES.UNKNOWN;
                        setErrorCode(null);
                        setShowRegistrationModal(false);
                        setShowForgotPasswordModal(false);
                        if (isLoginError) setShowLoginModal(true);
                    }}
                    isOpen={errorCode !== null}
                    title="Authentication error"
                    className={styles.modal}
                >
                    <ErrorMessage errorCode={errorCode} onPasswordResetRequest={() => {
                        setErrorCode(null);
                        setShowRegistrationModal(false);
                        setShowLoginModal(false);
                        setShowForgotPasswordModal(true);
                    }} />
                </Modal>
            }
            <div className={styles.container}>
                <Header />
                <Logo onClick={() => router.push("/currencies")} />
                <div className={styles.navStack}>
                    <button
                        type="button"
                        className={styles.navSecondary}
                        onClick={() => router.push("/currencies")}
                    >
                        Fiat exchange rates
                    </button>
                    <button
                        type="button"
                        className={styles.navPrimary}
                        onClick={() => router.push("/orders/new")}
                    >
                        Buy crypto with fiat
                    </button>
                    {showAdminNav ? (
                        <button
                            type="button"
                            className={styles.navSecondary}
                            onClick={() => router.push("/admin/orders")}
                        >
                            Admin: new requests
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className={styles.navSecondary}
                        onClick={() => setShowLoginModal(true)}
                    >
                        Log in
                    </button>
                </div>
                <Link onClick={() => setShowRegistrationModal(true)} />
            </div>

        </Container >
    );
};


export default Home;
