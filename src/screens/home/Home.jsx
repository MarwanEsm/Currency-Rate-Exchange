import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/header/Header";
import Logo from "../../components/elements/Logo/Logo";
import Button from "../../components/elements/button/Button"
import Link from "../../components/elements/link/Link";
import Container from "../../components/layout/container/Container";
import styles from "./Home.module.scss";
import { Modal } from 'reactstrap';
import SignUp from "../../components/forms/registration/SignUp";


const Home = () => {
    const [showRegistrationModal, setShowRegistrationModal] = useState(false)

    const navigate = useNavigate()

    return (
        <Container>

            {
                showRegistrationModal &&

                <Modal isOpen={showRegistrationModal}
                    toggle={() => setShowRegistrationModal(false)}
                    className={styles.modal}
                >
                    <SignUp />
                </Modal>
            }
            <div className={styles.container}>
                <Header />
                <Logo />
                <Button onClick={() => navigate("/sign_in")}>Log in</Button>
                <Link onClick={() => setShowRegistrationModal(true)} />
            </div>
        </Container>
    );
}


export default Home;
