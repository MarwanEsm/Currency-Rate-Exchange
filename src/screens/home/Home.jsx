import React from "react";
import Header from "../../components/layout/header/Header";
import Logo from "../../components/elements/Logo/Logo";
import Button from "../../components/elements/button/Button"
import Link from "../../components/elements/link/Link";
import Container from "../../components/layout/container/Container";
import styles from "./Home.module.scss"
import { useNavigate } from "react-router-dom";


const Home = () => {

    const navigate = useNavigate()

    return (
        <div>
            <div>
                <Container></Container>
            </div>
            <div className={styles.container}>
                <Header />
                <Logo />
                <Button onClick={() => navigate("/sign")}>Log in</Button>
                <Link />
            </div>
        </div >
    );
}


export default Home;
