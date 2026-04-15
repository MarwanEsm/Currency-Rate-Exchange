import React, { useState, useContext } from "react";
import { useRouter } from "next/router";
import Header from "../../components/layout/header/Header";
import Logo from "../../components/elements/logo/Logo";
import Button from "../../components/elements/button/Button"
import Link from "../../components/elements/link/Link";
import Container from "../../components/layout/container/Container";
import styles from "./Home.module.scss";
import Modal from "../../components/layout/modal/Modal";
import SignUp from "../../components/forms/registration/SignUp";
import Login from "../../components/forms/login/Login";
import ResetPassword from "../../components/forms/resetPassword/ResetPassword";
import SuccessMessage from "../../components/messages/successMessage/SuccessMessage";
import ErrorMessage from "../../components/messages/errorMessage/ErrorMessage";
import { AuthContext } from "../../firebase/authContext";

const Home = () => {

    const [showRegistrationModal, setShowRegistrationModal] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [showForgetPasswordModal, setShowForgetPasswordModal] = useState(false)

    const [errorCode, setErrorCode] = useState(null)
    const [successCode, setSuccessCode] = useState(null)


    const { login, register, resetPassword } = useContext(AuthContext)

    const router = useRouter()

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
            setSuccessCode(message)
        },
            (message) => {
                setErrorCode(message)
            });
    };

    const handlePasswordReset = async (email) => {
        const hasResetPassword = await resetPassword(email);
        if (hasResetPassword) {
            setShowForgetPasswordModal(false);
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
                    className={styles.modal}
                >
                    <Login
                        onPasswordReset={() => {
                            setShowForgetPasswordModal(true)
                            setShowLoginModal(false)
                        }}
                        onLogin={handleLogin}
                    />
                </Modal>
            }

            {
                showForgetPasswordModal &&
                <Modal
                    onClose={() => setShowForgetPasswordModal(false)}
                    isOpen={showForgetPasswordModal}
                    className={styles.modal}
                >
                    <ResetPassword onPasswordReset={handlePasswordReset} />
                </Modal>
            }

            {
                successCode === 1 &&
                <Modal
                    onClose={() => { setSuccessCode(null); setShowRegistrationModal(false) }}
                    isOpen={successCode === 1}
                    className={styles.modal}
                >
                    <SuccessMessage />
                </Modal>
            }

            {
                errorCode !== null &&
                <Modal
                    onClose={() => {
                        const isLoginError = errorCode === 5 || errorCode === 0;
                        setErrorCode(null);
                        setShowRegistrationModal(false);
                        setShowForgetPasswordModal(false);
                        if (isLoginError) setShowLoginModal(true);
                    }}
                    isOpen={errorCode !== null}
                    className={styles.modal}
                >
                    <ErrorMessage errorCode={errorCode} onPasswordForget={() => {
                        setErrorCode(null);
                        setShowRegistrationModal(false);
                        setShowLoginModal(false);
                        setShowForgetPasswordModal(true);
                    }} />
                </Modal>
            }
            <div className={styles.container}>
                <Header />
                <Logo onClick={() => router.push("/currencies")} />
                <Button onClick={() => setShowLoginModal(true)}>Log in</Button>
                <Link onClick={() => setShowRegistrationModal(true)} />
            </div>

        </Container >
    );
}


export default Home
