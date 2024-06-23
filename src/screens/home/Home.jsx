import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
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

    const { login, register, isAuthenticated } = useContext(AuthContext)

    const navigate = useNavigate()


    const handleLogin = (e, loginCredentials) => {
        e.preventDefault();
        login(
            loginCredentials,
            (errorMessage) => {
                setErrorCode(errorMessage);
            })
        isAuthenticated && navigate("/currencies")
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
                        onLogin={(credential) => handleLogin(credential)}
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
                    <ResetPassword />
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
                errorCode === 1 &&
                <Modal
                    onClose={() => { setErrorCode(null); setShowRegistrationModal(false) }}
                    isOpen={errorCode === 1}
                    className={styles.modal}
                >
                    <ErrorMessage />
                </Modal>
            }
            <div className={styles.container}>
                <Header />
                <Logo onClick={() => navigate("/currencies")} />
                <Button onClick={() => setShowLoginModal(true)}>Log in</Button>
                <Link onClick={() => setShowRegistrationModal(true)} />
            </div>
        </Container >
    );
}


export default Home
